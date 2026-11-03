/* Time source for the player. Injectable so tests drive time by hand instead of waiting. */

export interface Clock {
  /** milliseconds on a monotonic timeline */
  now(): number;
  /** calls `cb` repeatedly (every frame or so) until the returned function is called */
  onFrame(cb: () => void): () => void;
}

const g = globalThis as any;

/** performance.now() plus a requestAnimationFrame loop, with a slow timer as backup. */
export const systemClock: Clock = {
  now: () => (g.performance?.now ? g.performance.now() : Date.now()),
  onFrame(cb) {
    let stopped = false;
    let raf = 0;
    const loop = () => {
      if (stopped) return;
      cb();
      raf = g.requestAnimationFrame(loop);
    };
    if (typeof g.requestAnimationFrame === 'function') raf = g.requestAnimationFrame(loop);
    // rAF stops in a hidden tab or under a locked screen; a timer keeps cues coming where the browser allows
    const timer = setInterval(() => { if (!stopped) cb(); }, 250);
    return () => {
      stopped = true;
      if (typeof g.cancelAnimationFrame === 'function') g.cancelAnimationFrame(raf);
      clearInterval(timer);
    };
  },
};

export interface FakeClock extends Clock {
  /** moves time forward; with `frameMs`, fires a frame every `frameMs`, otherwise one frame after the jump */
  advance(ms: number, frameMs?: number): void;
  /** fires a frame without moving time */
  frame(): void;
  readonly listeners: number;
}

/** A clock for tests: time only moves when `advance` is called. */
export function createFakeClock(start = 0): FakeClock {
  let t = start;
  const subs = new Set<() => void>();
  const frame = () => { for (const cb of [...subs]) cb(); };
  return {
    now: () => t,
    onFrame(cb) {
      const wrapped = () => cb();
      subs.add(wrapped);
      return () => { subs.delete(wrapped); };
    },
    advance(ms, frameMs) {
      if (!frameMs) { t += ms; frame(); return; }
      const end = t + ms;
      while (t < end) { t = Math.min(end, t + frameMs); frame(); }
    },
    frame,
    get listeners() { return subs.size; },
  };
}
