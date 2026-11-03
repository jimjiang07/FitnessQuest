/* Offline cache: one visit stores the app, pictures and coach clips so a workout runs with no signal. */
// both lines are rewritten at build time by build/precache-plugin.ts
const VERSION = 'dev';
const PRECACHE = [];

const CACHE = `fq-${VERSION}`;
const isMedia = (url) => /^(voice|exercises)\//.test(url);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const fresh = (url) => new Request(url, {cache: 'reload'});
    // the shell must all land; a missing clip or picture shouldn't block the rest
    await cache.addAll(PRECACHE.filter((u) => !isMedia(u)).map(fresh));
    await Promise.allSettled(PRECACHE.filter(isMedia).map((u) => cache.add(fresh(u))));
    await self.skipWaiting();
  })());
});

// an open page keeps loading its own (old) chunks from the old cache, so drop old caches only when no page uses them
async function dropOldCaches(maxWindows) {
  const windows = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
  if (windows.length > maxWindows) return;
  const names = await caches.keys();
  await Promise.all(names.filter((n) => n.startsWith('fq-') && n !== CACHE).map((n) => caches.delete(n)));
}

self.addEventListener('activate', (event) => {
  // claim only routes fetches through this worker; nothing reloads, so the new version shows on next launch
  event.waitUntil(Promise.all([self.clients.claim(), dropOldCaches(0)]));
});

// audio elements ask for byte ranges (Safari always does); serve them from the cached file
async function sliceRange(response, range) {
  const buf = await response.arrayBuffer();
  const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  const size = buf.byteLength;
  let start = 0, end = size - 1;
  if (m && m[1]) { start = Number(m[1]); if (m[2]) end = Math.min(Number(m[2]), size - 1); }
  else if (m && m[2]) start = Math.max(size - Number(m[2]), 0);
  if (!m || start > end) return new Response(null, {status: 416, headers: {'Content-Range': `bytes */${size}`}});
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes',
    },
  });
}

async function handle(event) {
  const {request} = event;
  if (request.mode === 'navigate' && /\/(index\.html)?$/.test(new URL(request.url).pathname)) {
    // hash routes mean every launch is the same document
    const shell = await caches.match('index.html', {ignoreSearch: true}) || await caches.match('./', {ignoreSearch: true});
    event.waitUntil(dropOldCaches(1));
    if (shell) return shell;
    return fetch(request);
  }
  const cached = await caches.match(request, {ignoreVary: true});
  const range = request.headers.get('range');
  if (cached) return range ? sliceRange(cached, range) : cached;
  const response = await fetch(request);
  if (!range && response.ok && response.status === 200 && response.type === 'basic') {
    const copy = response.clone();
    event.waitUntil(caches.open(CACHE).then((c) => c.put(request, copy)));
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const {request} = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(handle(event));
});
