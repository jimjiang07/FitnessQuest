import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {keepAwake, release, setNowPlaying} from '@/audio/device';

class FakeSentinel {
  released = false;
  release = vi.fn(async () => { this.released = true; });
}

function fakeDocument() {
  const listeners = new Map<string, Set<() => void>>();
  return {
    visibilityState: 'visible',
    addEventListener: (t: string, f: () => void) => { if (!listeners.has(t)) listeners.set(t, new Set()); listeners.get(t)!.add(f); },
    removeEventListener: (t: string, f: () => void) => listeners.get(t)?.delete(f),
    fire(t: string) { for (const f of listeners.get(t) ?? []) f(); },
    count: (t: string) => listeners.get(t)?.size ?? 0,
  };
}

const flush = () => new Promise(r => setTimeout(r, 0));
let doc: ReturnType<typeof fakeDocument>;
let sentinels: FakeSentinel[];
let request: ReturnType<typeof vi.fn>;

beforeEach(() => {
  doc = fakeDocument();
  sentinels = [];
  request = vi.fn(async () => { const s = new FakeSentinel(); sentinels.push(s); return s; });
  vi.stubGlobal('document', doc);
  vi.stubGlobal('navigator', {wakeLock: {request}});
});

afterEach(async () => {
  await release();
  vi.unstubAllGlobals();
});

describe('wake lock', () => {
  it('asks for a screen lock and releases it at the end', async () => {
    await keepAwake();
    expect(request).toHaveBeenCalledWith('screen');
    await release();
    expect(sentinels[0].release).toHaveBeenCalled();
    expect(doc.count('visibilitychange')).toBe(0);
  });

  it('asks again when the page becomes visible after the browser dropped the lock', async () => {
    await keepAwake();
    sentinels[0].released = true;     // the browser lets go when the page is hidden
    doc.visibilityState = 'hidden';
    doc.fire('visibilitychange');
    await flush();
    expect(request).toHaveBeenCalledTimes(1);
    doc.visibilityState = 'visible';
    doc.fire('visibilitychange');
    await flush();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('does not ask again after release', async () => {
    await keepAwake();
    await release();
    doc.fire('visibilitychange');
    await flush();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('tolerates a refused request and a missing API', async () => {
    request.mockRejectedValueOnce(new Error('NotAllowedError'));
    await expect(keepAwake()).resolves.toBeUndefined();
    await release();
    vi.stubGlobal('navigator', {});
    await expect(keepAwake()).resolves.toBeUndefined();
  });
});

describe('now playing', () => {
  it('sets lock-screen metadata and play/pause handlers', () => {
    const handlers: Record<string, unknown> = {};
    const mediaSession = {metadata: null as unknown, setActionHandler: (a: string, h: unknown) => { handlers[a] = h; }};
    vi.stubGlobal('navigator', {mediaSession});
    vi.stubGlobal('MediaMetadata', class { constructor(public init: object) {} });
    const onPlay = () => {}, onPause = () => {};
    setNowPlaying({title: 'Glute bridge', artist: 'Warm-up', onPlay, onPause});
    expect((mediaSession.metadata as any).init).toEqual({title: 'Glute bridge', artist: 'Warm-up'});
    expect(handlers).toEqual({play: onPlay, pause: onPause});
    setNowPlaying(null);
    expect(mediaSession.metadata).toBeNull();
    expect(handlers).toEqual({play: null, pause: null});
  });

  it('does nothing without the Media Session API', () => {
    vi.stubGlobal('navigator', {});
    expect(() => setNowPlaying({title: 'x'})).not.toThrow();
  });
});
