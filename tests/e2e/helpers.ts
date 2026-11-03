import {expect, type Page, type TestInfo} from '@playwright/test';

/** Pass to test.use: the PWA service worker answers cache-first, which would bypass the fakes and slow every run. */
export const NO_SW = {serviceWorkers: 'block'} as const;

export type Panel = 'ready' | 'transition' | 'timed' | 'reps' | 'guided' | 'rest';

/** What the fake audio heard; read with `audio(page)`. */
export interface FqAudio {spoken: string[]; clips: string[]; beeps: ('short' | 'long')[]}

/** book and tabletop show two panes split at the fold; phone and shortWide are one column. */
export const isSplit = (info: TestInfo) => info.project.name === 'duo-landscape' || info.project.name === 'duo-upright';

// Runs in the page before any app code: records speech, clips and beeps instead of making sound.
function fakeAudio() {
  const fq = {spoken: [] as string[], clips: [] as string[], beeps: [] as string[]};
  (window as any).__fq = fq;

  const synth = {
    speaking: false, pending: false, paused: false, onvoiceschanged: null,
    speak(u: SpeechSynthesisUtterance) {
      if (u.text) fq.spoken.push(u.text);
      queueMicrotask(() => u.onend?.(new Event('end') as SpeechSynthesisEvent));
    },
    cancel() {}, pause() {}, resume() {}, getVoices: () => [],
    addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true,
  };
  Object.defineProperty(window, 'speechSynthesis', {configurable: true, get: () => synth});

  HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
    // data: URLs are the silent unlock clip, not the coach
    if (!this.src.startsWith('data:')) fq.clips.push(new URL(this.src).pathname);
    queueMicrotask(() => this.dispatchEvent(new Event('ended')));
    return Promise.resolve();
  };
  HTMLMediaElement.prototype.pause = function () {};

  class FakeAudioContext {
    state = 'running'; currentTime = 0; destination = {};
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
    createBuffer() { return {}; }
    createBufferSource() { return {buffer: null, connect() {}, start() {}}; }
    createGain() { return {gain: {value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}}, connect() {}}; }
    createOscillator() {
      const osc = {
        type: 'sine', frequency: {value: 0}, connect() {}, stop() {},
        start() { fq.beeps.push(osc.frequency.value >= 1000 ? 'long' : 'short'); },
      };
      return osc;
    }
  }
  (window as any).AudioContext = FakeAudioContext;
  (window as any).webkitAudioContext = FakeAudioContext;
}

/** Fake clock and audio; call before the first navigation. */
export async function setup(page: Page): Promise<void> {
  await page.clock.install({time: new Date('2026-03-02T07:00:00')});
  await page.addInitScript(fakeAudio);
  // the app must never use a native dialog (End workout asks in the page)
  page.on('dialog', (d) => { throw new Error(`unexpected native dialog: ${d.message()}`); });
}

/** Navigates, then stops time so only the test moves it. */
export async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 1000);
}

export const audio = (page: Page) => page.evaluate(() => (window as any).__fq as FqAudio);
export const player = (page: Page) => page.locator('.player');
export const timer = (page: Page) => page.getByRole('timer').first();
export const cue = (page: Page) => page.locator('.player [aria-live="polite"]');
export const sheet = (page: Page) => page.getByRole('dialog');

/** Moves time: jumps most of the way (timers fire once, like a phone waking up), then runs the last 100 ms frame by frame. */
export async function advance(page: Page, ms: number): Promise<void> {
  if (ms > 200) await page.clock.fastForward(ms - 100);
  await page.clock.runFor(Math.min(ms, 100));
}

/** Taps Begin on the Tap to begin overlay and waits for the ready countdown. */
export async function begin(page: Page, info: TestInfo): Promise<void> {
  await page.getByRole('button', {name: 'Begin', exact: true}).click();
  await expectPanel(page, info, 'ready', {block: 0});
}

/** Asserts the player's panel (and optionally block and side), then checks the layout. */
export async function expectPanel(page: Page, info: TestInfo, panel: Panel,
  opts: {block?: number; side?: 'left' | 'right' | null} = {}): Promise<void> {
  const root = player(page);
  await expect(root).toHaveAttribute('data-panel', panel);
  if (opts.block !== undefined) await expect(root).toHaveAttribute('data-block', String(opts.block));
  if (opts.side === null) await expect(root).not.toHaveAttribute('data-side');
  else if (opts.side) await expect(root).toHaveAttribute('data-side', opts.side);
  await expectFits(page, info);
}

/** No page scroll either way; on book/tabletop nothing tappable sits across the fold. */
export async function expectFits(page: Page, info: TestInfo): Promise<void> {
  const fold = info.project.name === 'duo-landscape' ? 'x' : info.project.name === 'duo-upright' ? 'y' : null;
  const r = await page.evaluate((axis) => {
    const se = document.scrollingElement!;
    const W = innerWidth, H = innerHeight;
    const crossing: string[] = [];
    if (axis) {
      const mid = (axis === 'x' ? W : H) / 2;
      for (const el of Array.from(document.querySelectorAll('button, a[href], [role="button"], [role="switch"], input, select'))) {
        const b = el.getBoundingClientRect();
        if (!b.width || !b.height || getComputedStyle(el).visibility === 'hidden') continue;
        const [lo, hi] = axis === 'x' ? [b.left, b.right] : [b.top, b.bottom];
        if (lo < mid && hi > mid) crossing.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 30) || el.getAttribute('aria-label')}" ${Math.round(lo)}–${Math.round(hi)}`);
      }
    }
    return {sh: se.scrollHeight, sw: se.scrollWidth, W, H, crossing};
  }, fold);
  expect(r.sh, 'page scrolls vertically').toBeLessThanOrEqual(r.H + 1);
  expect(r.sw, 'page scrolls horizontally').toBeLessThanOrEqual(r.W + 1);
  expect(r.crossing, 'tap targets across the fold').toEqual([]);
}

/** Pauses by tapping empty space (a tag on screen), waits for the sheet. */
export async function pause(page: Page): Promise<void> {
  await player(page).locator('.fq-tag').first().click();
  await expect(sheet(page)).toBeVisible();
  await expect(sheet(page).getByRole('heading', {name: 'Paused'})).toBeVisible();
  // finish the opening animation frame by frame; with time frozen Vue would also skip the sheet's fresh click.stop
  await page.clock.runFor(500);
  await expect(page.locator('.wrap')).toHaveAttribute('class', 'wrap');
}

/** Runs an action that closes the sheet and waits for its closing animation to finish. */
export async function closeSheet(page: Page, action: () => Promise<void>): Promise<void> {
  await action();
  await page.clock.runFor(500);
  await expect(sheet(page)).toBeHidden();
}

export async function resume(page: Page): Promise<void> {
  await closeSheet(page, () => sheet(page).getByRole('button', {name: 'Resume'}).click());
}

/** "1:05 left, of 1:20" → 65 */
export async function remainingSeconds(page: Page): Promise<number> {
  const label = await timer(page).getAttribute('aria-label');
  const m = label?.match(/^(\d+):(\d\d) left/);
  if (!m) throw new Error(`no remaining time in timer label "${label}"`);
  return Number(m[1]) * 60 + Number(m[2]);
}
