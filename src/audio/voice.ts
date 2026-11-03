/* The coach's voice: a recorded clip when the sentence is in public/voice/index.json, else the device voice. */
import type {MusicMode, Voice} from '@/types';
import {clipId, sentences} from './clips';
import {playBeep, type BeepKind} from './beeps';

type AudioCtor = new (src?: string) => HTMLAudioElement;
type CtxCtor = new () => AudioContext;

export interface VoiceOptions {
  /** site base the clips live under; defaults to Vite's BASE_URL ("./") */
  base?: string;
  // injectable for tests; default to the browser globals at call time
  fetch?: typeof fetch;
  Audio?: AudioCtor;
  AudioContext?: CtxCtor;
  speechSynthesis?: SpeechSynthesis;
  Utterance?: typeof SpeechSynthesisUtterance;
}

const g = globalThis as any;

// iOS only lets an audio element play later if it played once inside the tap; a few ms of 8-bit silence does it
function silentWav(): string {
  const n = 80, buf = new Uint8Array(44 + n), v = new DataView(buf.buffer);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  str(36, 'data'); v.setUint32(40, n, true); buf.fill(128, 44);
  return 'data:audio/wav;base64,' + btoa(String.fromCharCode(...buf));
}

export const CLIP_EXT = 'm4a';

// Safari's Audio Session API: 'transient' ducks other apps' music while we play, 'ambient' mixes at full volume
export const SESSION_TYPES: Record<MusicMode, string> = {off: 'auto', duck: 'transient', mix: 'ambient'};
export function applySession(mode: MusicMode): void {
  const session = (globalThis as any).navigator?.audioSession;
  if (!session) return;
  try { session.type = SESSION_TYPES[mode]; } catch { /* unsupported type on this browser */ }
}

export function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const lang = (v: SpeechSynthesisVoice) => (v.lang || '').replace('_', '-').toLowerCase();
  return voices.find(v => lang(v) === 'en-au') ?? voices.find(v => lang(v).startsWith('en'));
}

export function createVoice(opts: VoiceOptions = {}): Voice {
  const base = opts.base ?? import.meta.env?.BASE_URL ?? './';
  const doFetch = () => opts.fetch ?? g.fetch;
  const AudioEl = () => opts.Audio ?? g.Audio as AudioCtor | undefined;
  const Ctx = () => opts.AudioContext ?? g.AudioContext ?? g.webkitAudioContext as CtxCtor | undefined;
  const synth = () => opts.speechSynthesis ?? g.speechSynthesis as SpeechSynthesis | undefined;
  const Utter = () => opts.Utterance ?? g.SpeechSynthesisUtterance as typeof SpeechSynthesisUtterance | undefined;

  let voiceOn = true, beepsOn = true, music: MusicMode = 'off';
  let beepEl: HTMLAudioElement | null = null;   // separate from the voice element so a beep never cuts the coach off
  let ctx: AudioContext | null = null;
  let audio: HTMLAudioElement | null = null;
  let index: Promise<Set<string>> | null = null;
  let token = 0;                       // bumps on every speak/cancel so stale playback stops
  let stopCurrent: (() => void) | null = null;

  // fetched once, lazily; any failure means "no clips" and the device voice does everything
  const clips = () => index ??= (async () => {
    try {
      const f = doFetch();
      if (!f) return new Set<string>();
      const res = await f(`${base}voice/index.json`);
      if (!res.ok) return new Set<string>();
      const data = await res.json();
      return new Set<string>(Array.isArray(data?.clips) ? data.clips : []);
    } catch { return new Set<string>(); }
  })();

  const element = () => {
    const A = AudioEl();
    if (!audio && A) audio = new A();
    return audio;
  };

  /** resolves true when the clip played (or was cancelled), false when it failed and the device voice should say it */
  function playClip(id: string): Promise<boolean> {
    const el = element();
    if (!el) return Promise.resolve(false);
    return new Promise(resolve => {
      let settled = false;
      const done = (ok: boolean) => {
        if (settled) return;    // the element is shared, so a late event must not touch the next clip
        settled = true;
        el.onended = el.onerror = null;
        if (stopCurrent === stop) stopCurrent = null;
        resolve(ok);
      };
      const stop = () => { el.pause(); done(true); };
      stopCurrent = stop;
      el.onended = () => done(true);
      el.onerror = () => done(false);
      el.src = `${base}voice/${id}.${CLIP_EXT}`;
      try {
        const p = el.play();
        if (p && typeof p.catch === 'function') p.catch(() => done(false));
      } catch { done(false); }
    });
  }

  function say(text: string): Promise<void> {
    const s = synth(), U = Utter();
    if (!s || !U) return Promise.resolve();
    return new Promise(resolve => {
      const u = new U(text);
      u.lang = 'en-AU';
      const v = pickVoice(s.getVoices?.() ?? []);
      if (v) u.voice = v;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const done = () => {
        clearTimeout(timer);
        u.onend = u.onerror = null;
        if (stopCurrent === stop) stopCurrent = null;
        resolve();
      };
      const stop = () => { s.cancel(); done(); };
      stopCurrent = stop;
      u.onend = () => done();
      u.onerror = () => done();
      // iOS sometimes never fires onend; don't let the coach hang on it
      timer = setTimeout(done, 2000 + text.length * 120);
      s.speak(u);
    });
  }

  function cancel(): void {
    token++;
    const stop = stopCurrent;
    stopCurrent = null;
    stop?.();
  }

  async function speak(line: string): Promise<void> {
    cancel();
    const mine = token;
    if (!voiceOn || !line.trim()) return;
    const have = await clips();
    for (const s of sentences(line)) {
      if (mine !== token) return;
      const id = clipId(s);
      if (have.has(id) && await playClip(id)) continue;
      if (mine !== token) return;
      await say(s);
    }
  }

  async function unlock(): Promise<void> {
    void clips();
    applySession(music);
    const C = Ctx();
    try {
      if (!ctx && C) ctx = new C();
      if (ctx) {
        if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
        const src = ctx.createBufferSource();
        src.buffer = ctx.createBuffer(1, 1, 22050);
        src.connect(ctx.destination);
        src.start(0);
      }
    } catch { /* no Web Audio: beeps stay silent, the voice still works */ }
    // prime the clip and beep elements and the device voice inside the same tap
    const el = element();
    const A = AudioEl();
    if (!beepEl && A) beepEl = new A();
    for (const e of [el, beepEl]) {
      if (!e) continue;
      try {
        e.src = silentWav();
        const p = e.play();
        if (p && typeof p.catch === 'function') await p.catch(() => {});
      } catch { /* ignore */ }
    }
    const s = synth(), U = Utter();
    if (s && U) {
      try { const u = new U(''); u.volume = 0; s.speak(u); } catch { /* ignore */ }
    }
  }

  // recorded beeps are loud and behave like the voice on iOS; the oscillator is only a fallback
  function beep(kind: BeepKind): void {
    if (!beepsOn) return;
    const oscillator = () => { if (ctx) try { playBeep(ctx, kind); } catch { /* a beep is never worth an error */ } };
    if (!beepEl) return oscillator();
    try {
      beepEl.src = `${base}sounds/beep-${kind}.${CLIP_EXT}`;
      const p = beepEl.play();
      if (p && typeof p.catch === 'function') p.catch(oscillator);
    } catch { oscillator(); }
  }

  function setMusicMode(mode: MusicMode): void {
    music = mode;
    applySession(mode);
  }

  function setEnabled(o: {voice: boolean; beeps: boolean}): void {
    voiceOn = o.voice;
    beepsOn = o.beeps;
    if (!voiceOn) cancel();
  }

  return {unlock, speak, cancel, beep, setEnabled, setMusicMode};
}
