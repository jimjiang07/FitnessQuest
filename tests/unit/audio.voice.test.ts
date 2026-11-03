import {beforeEach, describe, expect, it, vi} from 'vitest';
import {createVoice, pickVoice} from '@/audio/voice';
import {clipId} from '@/audio/clips';

// ── fakes ─────────────────────────────────────────────────────────────────────
class FakeAudio {
  static all: FakeAudio[] = [];
  src = '';
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  played: string[] = [];
  paused = 0;
  failNext = false;
  constructor() { FakeAudio.all.push(this); }
  play() {
    this.played.push(this.src);
    if (this.failNext) { this.failNext = false; return Promise.reject(new Error('NotAllowedError')); }
    return Promise.resolve();
  }
  pause() { this.paused++; }
  end() { this.onended?.(); }
}

class FakeUtterance {
  lang = ''; volume = 1; voice: unknown = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public text: string) {}
}

const voices = [{lang: 'en-US', name: 'Samantha'}, {lang: 'en_AU', name: 'Karen'}] as unknown as SpeechSynthesisVoice[];
function fakeSynth() {
  const spoken: FakeUtterance[] = [];
  return {
    spoken,
    cancelled: 0,
    speak(u: FakeUtterance) { spoken.push(u); },
    cancel() { this.cancelled++; },
    getVoices: () => voices,
    finish() { spoken.at(-1)?.onend?.(); },
  };
}

class FakeCtx {
  static all: FakeCtx[] = [];
  state = 'suspended';
  currentTime = 0;
  destination = {};
  oscillators: {frequency: {value: number}}[] = [];
  constructor() { FakeCtx.all.push(this); }
  resume() { this.state = 'running'; return Promise.resolve(); }
  createBuffer() { return {}; }
  sources: {buffer: any; onended: (() => void) | null; started: boolean}[] = [];
  createBufferSource() {
    const src = {buffer: null as any, onended: null as (() => void) | null, started: false, connect() {}, start() { src.started = true; }, stop() {}};
    this.sources.push(src);
    return src;
  }
  decodeAudioData(data: any, ok: (b: any) => void) { ok({decoded: data.url}); }
  createGain() { return {gain: {setValueAtTime() {}, linearRampToValueAtTime() {}}, connect() {}}; }
  createOscillator() {
    const o = {type: '', frequency: {value: 0}, connect() {}, start() {}, stop() {}};
    this.oscillators.push(o);
    return o;
  }
}

const indexed = (...lines: string[]) =>
  vi.fn(async () => ({ok: true, json: async () => ({voice: 'en-AU-WilliamNeural', rate: '+5%', clips: lines.map(clipId)})}));

const flush = () => new Promise(r => setTimeout(r, 0));

// serves the clip index and, for anything else, a fake audio file tagged with its URL
const files = (...lines: string[]) => vi.fn(async (url: string) => (url.endsWith('index.json')
  ? {ok: true, json: async () => ({clips: lines.map(clipId)})}
  : {ok: true, arrayBuffer: async () => ({url})}));

function setup(fetch: any = indexed()) {
  const synth = fakeSynth();
  const voice = createVoice({
    base: './', fetch, Audio: FakeAudio as any, AudioContext: FakeCtx as any,
    speechSynthesis: synth as any, Utterance: FakeUtterance as any,
  });
  return {voice, synth, fetch};
}

beforeEach(() => { FakeAudio.all = []; FakeCtx.all = []; });

// ── tests ─────────────────────────────────────────────────────────────────────
describe('voice', () => {
  it('plays the recorded clip when the sentence is in the index', async () => {
    const {voice, synth, fetch} = setup(indexed('Switch sides.'));
    const done = voice.speak('Switch sides.');
    await flush();
    const el = FakeAudio.all[0];
    expect(el.played).toEqual([`./voice/${clipId('Switch sides.')}.m4a`]);
    expect(synth.spoken).toHaveLength(0);
    el.end();
    await done;
    expect(fetch).toHaveBeenCalledWith('./voice/index.json');
  });

  it('falls back to the device voice, en-AU first, when there is no clip', async () => {
    const {voice, synth} = setup(indexed('Switch sides.'));
    const done = voice.speak('Halfway.');
    await flush();
    expect(synth.spoken.map(u => u.text)).toEqual(['Halfway.']);
    expect((synth.spoken[0].voice as any).name).toBe('Karen');
    synth.finish();
    await done;
  });

  it('mixes clips and device voice sentence by sentence', async () => {
    const {voice, synth} = setup(indexed('Nice.'));
    const done = voice.speak('Nice. Rest, thirteen seconds.');
    await flush();
    FakeAudio.all[0].end();
    await flush();
    expect(synth.spoken.map(u => u.text)).toEqual(['Rest, thirteen seconds.']);
    synth.finish();
    await done;
  });

  it('treats a missing or failed index as no clips', async () => {
    const {voice, synth} = setup(vi.fn(async () => { throw new Error('offline'); }));
    const done = voice.speak('Switch sides.');
    await flush();
    expect(synth.spoken.map(u => u.text)).toEqual(['Switch sides.']);
    synth.finish();
    await done;

    const notFound = setup(vi.fn(async () => ({ok: false, json: async () => ({})})));
    const done2 = notFound.voice.speak('Go!');
    await flush();
    expect(notFound.synth.spoken.map(u => u.text)).toEqual(['Go!']);
    notFound.synth.finish();
    await done2;
  });

  it('fetches the index only once', async () => {
    const {voice, synth, fetch} = setup();
    const a = voice.speak('Go!'); await flush(); synth.finish(); await a;
    const b = voice.speak('Go!'); await flush(); synth.finish(); await b;
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('falls back to the device voice when a clip fails to play', async () => {
    const {voice, synth} = setup(indexed('Go!'));
    await voice.unlock();
    FakeAudio.all[0].failNext = true;
    const done = voice.speak('Go!');
    await flush(); await flush();
    expect(synth.spoken.map(u => u.text)).toContain('Go!');
    synth.finish();
    await done;
  });

  it('a new line cancels the one still speaking', async () => {
    const {voice, synth} = setup(indexed('Switch sides.'));
    const first = voice.speak('Switch sides.');
    await flush();
    const el = FakeAudio.all[0];
    const second = voice.speak('Halfway.');
    await first;                       // the cancelled line resolves rather than hanging
    expect(el.paused).toBe(1);
    await flush();
    expect(synth.spoken.map(u => u.text)).toEqual(['Halfway.']);
    const third = voice.speak('Ten seconds left.');
    await second;
    expect(synth.cancelled).toBe(1);
    await flush();
    synth.finish();
    await third;
    expect(synth.spoken.map(u => u.text)).toEqual(['Halfway.', 'Ten seconds left.']);
  });

  it('cancel() stops speech and the line resolves', async () => {
    const {voice, synth} = setup();
    const done = voice.speak('Halfway. Ten seconds left.');
    await flush();
    voice.cancel();
    await done;
    expect(synth.spoken.map(u => u.text)).toEqual(['Halfway.']);
  });

  it('is silent when voice is turned off, and turning it off stops the current line', async () => {
    const {voice, synth} = setup(indexed('Go!'));
    const playing = voice.speak('Halfway.');
    await flush();
    voice.setEnabled({voice: false, beeps: true});
    await playing;
    expect(synth.cancelled).toBe(1);
    await voice.speak('Go!');
    await voice.speak('Nice.');
    expect(synth.spoken).toHaveLength(1);
    expect(FakeAudio.all.flatMap(a => a.played)).toEqual([]);
  });

  it('unlock() resumes an AudioContext and primes the clip element and device voice', async () => {
    const {voice, synth} = setup();
    await voice.unlock();
    expect(FakeCtx.all).toHaveLength(1);
    expect(FakeCtx.all[0].state).toBe('running');
    expect(FakeAudio.all[0].played[0]).toMatch(/^data:audio\/wav;base64,/);
    expect(synth.spoken[0]).toMatchObject({text: '', volume: 0});
  });

  it('plays the recorded beeps on their own element, and respects the beeps setting', async () => {
    const {voice} = setup();
    await voice.unlock();
    const beepEl = FakeAudio.all[1];
    voice.beep('short');
    voice.beep('long');
    expect(beepEl.played.slice(1)).toEqual(['./sounds/beep-short.m4a', './sounds/beep-long.m4a']);
    voice.setEnabled({voice: true, beeps: false});
    voice.beep('short');
    expect(beepEl.played).toHaveLength(3);
  });

  it('falls back to an oscillator beep when the beep file fails to play', async () => {
    const {voice} = setup();
    await voice.unlock();
    FakeAudio.all[1].failNext = true;
    voice.beep('long');
    await Promise.resolve(); await Promise.resolve();
    expect(FakeCtx.all[0].oscillators.map(o => o.frequency.value)).toEqual([1320]);
  });

  it('in music mode plays clips and beeps through Web Audio and never touches <audio> or speech', async () => {
    const {voice, synth} = setup(files('Switch sides.'));
    voice.setMusicMode('mix');
    await voice.unlock();
    expect(FakeAudio.all.flatMap(a => a.played)).toEqual([]);
    expect(synth.spoken).toEqual([]);
    const ctx = FakeCtx.all[0];
    const done = voice.speak('Switch sides.');
    for (let i = 0; i < 4; i++) await flush();
    const clip = ctx.sources.find(src => String(src.buffer?.decoded).includes(clipId('Switch sides.')));
    expect(clip?.started).toBe(true);
    clip!.onended?.();
    await done;
    voice.beep('short');
    for (let i = 0; i < 3; i++) await flush();
    expect(ctx.sources.some(src => src.buffer?.decoded === './sounds/beep-short.m4a' && src.started)).toBe(true);
    expect(FakeAudio.all.flatMap(a => a.played)).toEqual([]);
  });

  it('sets the Safari audio session type from the music mode', async () => {
    const session = {type: 'auto'};
    vi.stubGlobal('navigator', {audioSession: session});
    const {voice} = setup();
    voice.setMusicMode('duck');
    expect(session.type).toBe('transient');
    voice.setMusicMode('mix');
    expect(session.type).toBe('ambient');
    voice.setMusicMode('off');
    await voice.unlock();
    expect(session.type).toBe('auto');
    vi.unstubAllGlobals();
  });
});

describe('pickVoice', () => {
  it('prefers en-AU, then any English voice', () => {
    expect(pickVoice(voices)?.name).toBe('Karen');
    expect(pickVoice([{lang: 'fr-FR'}, {lang: 'en-GB', name: 'Daniel'}] as any)?.name).toBe('Daniel');
    expect(pickVoice([{lang: 'fr-FR'}] as any)).toBeUndefined();
  });
});
