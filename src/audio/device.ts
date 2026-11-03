/* Phone integration during a workout: keep the screen on, and show the exercise on the lock screen. */

const g = globalThis as any;

let wanted = false;
let sentinel: WakeLockSentinel | null = null;
let listening = false;

async function requestLock(): Promise<void> {
  const wl = g.navigator?.wakeLock as WakeLock | undefined;
  if (!wl || !wanted) return;
  try {
    const s = await wl.request('screen');
    // released while the request was in flight
    if (!wanted) { void s.release().catch(() => {}); return; }
    sentinel = s;
  } catch { /* denied (low battery, not visible): the workout still runs */ }
}

// the browser drops the lock whenever the page is hidden, so take it again on return
function onVisibility(): void {
  if (wanted && g.document?.visibilityState === 'visible' && (!sentinel || sentinel.released)) void requestLock();
}

export async function keepAwake(): Promise<void> {
  wanted = true;
  if (!listening && g.document?.addEventListener) {
    g.document.addEventListener('visibilitychange', onVisibility);
    listening = true;
  }
  if (!sentinel || sentinel.released) await requestLock();
}

export async function release(): Promise<void> {
  wanted = false;
  if (listening) {
    g.document?.removeEventListener?.('visibilitychange', onVisibility);
    listening = false;
  }
  const s = sentinel;
  sentinel = null;
  try { await s?.release(); } catch { /* already gone */ }
}

export interface NowPlaying {
  title: string;
  artist?: string;
  onPlay?: () => void;
  onPause?: () => void;
}

/** Lock-screen title and play/pause buttons; pass null to clear. No-op without the Media Session API. */
export function setNowPlaying(np: NowPlaying | null): void {
  const ms = g.navigator?.mediaSession as MediaSession | undefined;
  if (!ms) return;
  try {
    ms.metadata = np && typeof g.MediaMetadata === 'function'
      ? new g.MediaMetadata({title: np.title, artist: np.artist ?? 'Fitness Quest'})
      : null;
  } catch { /* ignore */ }
  for (const [action, handler] of [['play', np?.onPlay], ['pause', np?.onPause]] as const) {
    try { ms.setActionHandler(action, handler ?? null); } catch { /* unsupported action */ }
  }
}
