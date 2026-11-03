/* Countdown beeps from a Web Audio oscillator: no files to load, and they play on the context unlocked at Start. */

export type BeepKind = 'short' | 'long';

export const BEEPS: Record<BeepKind, {hz: number; seconds: number}> = {
  short: {hz: 880, seconds: 0.12},   // 3·2·1
  long: {hz: 1320, seconds: 0.45},   // Go
};

export function playBeep(ctx: AudioContext, kind: BeepKind, volume = 0.35): void {
  const {hz, seconds} = BEEPS[kind];
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = hz;
  // quick fade in and out so the beep doesn't click
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + 0.01);
  gain.gain.setValueAtTime(volume, t + seconds - 0.03);
  gain.gain.linearRampToValueAtTime(0, t + seconds);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + seconds + 0.02);
}
