/* The workout player: walks the day's steps on a clock and fires the coach's cues. Implements PlayerApi. */
import {defineStore} from 'pinia';
import {computed, ref, shallowRef, watch} from 'vue';
import type {CoachConfig, Cue, Day, Plan, PlayerApi, PlayerStatus, Step, Voice} from '@/types';
import {buildSteps} from '@/engine/buildSteps';
import {cuesFor, variantFor, type CueContext} from '@/engine/cues';
import {systemClock, type Clock} from '@/engine/clock';
import {createVoice} from '@/audio/voice';
import * as realDevice from '@/audio/device';
import type {NowPlaying} from '@/audio/device';
import {coach as realCoach, getDay as realGetDay, planForDay as realPlanForDay} from '@/plan';
import {useSettingsStore} from './settings';

export interface PlayerDevice {
  keepAwake(): Promise<void> | void;
  release(): Promise<void> | void;
  setNowPlaying(np: NowPlaying | null): void;
}

export interface PlanLookup {
  getDay(dayId: string): Day | undefined;
  planForDay(dayId: string): Plan | undefined;
  coach: CoachConfig;
}

export interface PlayerDeps {
  voice: Voice;
  device: PlayerDevice;
  clock: Clock;
  plans: PlanLookup;
}

/** A line due more than this long ago was missed (sleeping tab); its beep is dropped. */
export const STALE_MS = 1000;
/** Lines due within this window of the latest one are spoken together ("Go! Plank. Thirty seconds."). */
export const JOIN_MS = 250;
/** previous() restarts the current step once it is further in than this. */
export const RESTART_AFTER_MS = 3000;

let overrides: Partial<PlayerDeps> = {};
let defaultVoice: Voice | null = null;

/** Swap dependencies (tests pass fakes); pass nothing to go back to the real modules. */
export function configurePlayer(deps: Partial<PlayerDeps> = {}): void {
  overrides = deps;
}

function deps(): PlayerDeps {
  return {
    voice: overrides.voice ?? (defaultVoice ??= createVoice()),
    device: overrides.device ?? realDevice,
    clock: overrides.clock ?? systemClock,
    plans: overrides.plans ?? {getDay: realGetDay, planForDay: realPlanForDay, coach: realCoach},
  };
}

const stepMs = (s: Step | undefined, extraMs: number): number | null => {
  if (!s || s.type === 'complete') return null;
  return s.seconds === undefined ? null : s.seconds * 1000 + extraMs;
};

function nowPlayingTitle(s: Step): string {
  if (s.type === 'work') return s.side ? `${s.exercise.name} (${s.side})` : s.exercise.name;
  if (s.type === 'rest') return s.next ? `Rest, then ${s.next.exercise.name}` : 'Rest';
  return s.blockName;
}

interface Due {at: number; cue: Cue}

export const usePlayerStore = defineStore('player', () => {
  const settings = useSettingsStore();

  const status = ref<PlayerStatus>('idle');
  const day = shallowRef<Day | null>(null);
  const steps = shallowRef<Step[]>([]);
  const index = ref(0);
  const currentLine = ref<string | null>(null);
  const completed = ref<number[]>([]);   // indices of finished work steps, so a redone set counts once
  const now = ref(0);                    // clock time of the last frame; frozen while paused
  const stepStart = ref(0);              // shifted forward by each pause, so elapsed excludes paused time
  const totalStart = ref(0);
  const extraMs = ref(0);                // addRest on the current step

  let plan: Plan | null = null;
  let cueCtx: CueContext | null = null;
  let cues: Cue[] = [];
  let fired = 0;
  let stopFrames: (() => void) | null = null;
  let run = 0;                           // bumps on start/end so a stale start() doesn't resume

  const step = computed<Step | null>(() => steps.value[index.value] ?? null);
  const stepElapsedMs = computed(() => (step.value ? Math.max(0, now.value - stepStart.value) : 0));
  const stepRemainingMs = computed(() => {
    const d = stepMs(step.value ?? undefined, extraMs.value);
    return d === null ? null : Math.max(0, d - stepElapsedMs.value);
  });
  const totalElapsedMs = computed(() => (day.value ? Math.max(0, now.value - totalStart.value) : 0));
  const setsDone = computed(() => completed.value.length);

  watch(() => [settings.voice, settings.beeps] as const,
    ([voice, beeps]) => deps().voice.setEnabled({voice, beeps}), {immediate: true});
  // with music playing in another app, leave its lock-screen controls alone
  watch(() => settings.music, (mode) => {
    deps().voice.setMusicMode(mode);
    if (mode !== 'off') deps().device.setNowPlaying(null);
    else if (status.value !== 'idle') updateNowPlaying();
  }, {immediate: true});

  const cuesAt = (i: number, extra = 0): Cue[] => {
    const s = steps.value[i];
    if (!s || !cueCtx) return [];
    const ctx = {...cueCtx, variant: variantFor(steps.value, i)};
    return cuesFor(extra && s.type === 'rest' ? {...s, seconds: s.seconds + extra / 1000} : s, ctx);
  };

  function markDone(i: number) {
    if (steps.value[i]?.type === 'work' && !completed.value.includes(i)) completed.value = [...completed.value, i];
  }

  function updateNowPlaying() {
    const s = step.value;
    if (!s || !day.value || settings.music !== 'off') return;
    deps().device.setNowPlaying({title: nowPlayingTitle(s), artist: day.value.title, onPlay: resume, onPause: pause});
  }

  function enter(i: number, at: number) {
    index.value = Math.min(i, steps.value.length - 1);
    stepStart.value = at;
    extraMs.value = 0;
    cues = cuesAt(index.value);
    fired = 0;
    currentLine.value = null;
    if (step.value?.type !== 'complete') updateNowPlaying();
  }

  function stopLoop() {
    stopFrames?.();
    stopFrames = null;
  }

  function startLoop() {
    stopLoop();
    stopFrames = deps().clock.onFrame(tick);
  }

  // Beeps only if fresh; lines: just the latest group, so a catch-up doesn't read out a backlog.
  function emit(due: Due[], t: number) {
    const {voice} = deps();
    for (const d of due) if (d.cue.beep && t - d.at <= STALE_MS) voice.beep(d.cue.beep);
    const lines = due.filter((d) => d.cue.line);
    if (!lines.length) return;
    const latest = lines[lines.length - 1].at;
    const text = lines.filter((d) => latest - d.at <= JOIN_MS).map((d) => d.cue.line).join(' ');
    currentLine.value = text;
    void voice.speak(text)?.catch?.(() => {});
  }

  function complete(at: number, due: Due[]) {
    for (const c of cues) due.push({at, cue: c});
    fired = cues.length;
    status.value = 'complete';
    now.value = at;
    stopLoop();
    const {device} = deps();
    void Promise.resolve(device.release()).catch(() => {});
    device.setNowPlaying(null);
    if (plan && day.value) {
      const days = plan.days;
      const i = days.findIndex((d) => d.id === day.value!.id);
      settings.nextDayId = days[(i + 1) % days.length]?.id ?? null;
    }
  }

  /** Brings the player up to the clock: fires due cues and walks past any steps whose time is up. */
  function tick() {
    if (status.value !== 'running') return;
    const t = deps().clock.now();
    now.value = t;
    const due: Due[] = [];
    for (let guard = steps.value.length + 1; guard > 0; guard--) {
      const s = step.value;
      if (!s) break;
      if (s.type === 'complete') { complete(stepStart.value, due); break; }
      const elapsed = t - stepStart.value;
      const dur = stepMs(s, extraMs.value);
      const limit = dur === null ? elapsed : Math.min(elapsed, dur);
      while (fired < cues.length && cues[fired].atMs <= limit) {
        const c = cues[fired++];
        // a one-off only plays while its step is still running
        if (c.once && dur !== null && c.atMs >= dur) continue;
        due.push({at: stepStart.value + c.atMs, cue: c});
      }
      if (dur === null || elapsed < dur) break;
      markDone(index.value);
      enter(index.value + 1, stepStart.value + dur);
    }
    emit(due, t);
  }

  // time "now" from the store's point of view: frozen at the pause while paused
  const current = () => (status.value === 'running' ? deps().clock.now() : now.value);

  function jump(i: number) {
    if (status.value !== 'running' && status.value !== 'paused') return;
    deps().voice.cancel();
    const at = current();
    enter(i, at);
    if (status.value === 'running') tick();
    else if (step.value?.type === 'complete') { const due: Due[] = []; complete(at, due); emit(due, at); }
  }

  async function start(dayId: string): Promise<void> {
    const {voice, device, clock, plans} = deps();
    const d = plans.getDay(dayId);
    const p = plans.planForDay(dayId);
    if (!d || !p) throw new Error(`Unknown day "${dayId}"`);
    // both must start inside the tap, before any await
    const unlocked = voice.unlock();
    void Promise.resolve(device.keepAwake()).catch(() => {});
    stopLoop();
    const mine = ++run;

    plan = p;
    cueCtx = {plan: p, coach: plans.coach, day: d, variant: 0};
    day.value = d;
    steps.value = buildSteps(d, p, plans.coach);
    completed.value = [];
    voice.setEnabled({voice: settings.voice, beeps: settings.beeps});
    status.value = 'running';
    const t0 = clock.now();
    now.value = t0;
    totalStart.value = t0;
    enter(0, t0);
    try { await unlocked; } catch { /* audio stays locked; the workout still runs */ }
    if (mine !== run || status.value !== 'running') return;

    // the clock starts once audio is ready, so the welcome isn't clipped
    const t = clock.now();
    now.value = t;
    totalStart.value = t;
    stepStart.value = t;
    startLoop();
    tick();
  }

  function pause() {
    if (status.value !== 'running') return;
    tick();
    if (status.value !== 'running') return;
    status.value = 'paused';
    stopLoop();
    deps().voice.cancel();
  }

  function resume() {
    if (status.value !== 'paused') return;
    const delta = deps().clock.now() - now.value;
    stepStart.value += delta;
    totalStart.value += delta;
    status.value = 'running';
    startLoop();
    tick();
  }

  function done() {
    if (step.value?.type !== 'work') return;
    markDone(index.value);
    jump(index.value + 1);
  }

  function next() {
    if (!step.value || step.value.type === 'complete') return;
    jump(index.value + 1);
  }

  function previous() {
    if (!step.value || step.value.type === 'complete') return;
    if (stepElapsedMs.value > RESTART_AFTER_MS) { jump(index.value); return; }
    let j = index.value - 1;
    while (j >= 0 && steps.value[j].type !== 'work') j--;
    jump(j >= 0 ? j : index.value);
  }

  function addRest(seconds: number) {
    if (step.value?.type !== 'rest' || seconds <= 0) return;
    if (status.value === 'running') tick();
    if (step.value?.type !== 'rest') return;
    extraMs.value += seconds * 1000;
    // the countdown and "up next" move with the new end; anything already past stays fired
    cues = cuesAt(index.value, extraMs.value);
    const elapsed = current() - stepStart.value;
    fired = cues.filter((c) => c.atMs <= elapsed).length;
  }

  function end() {
    run++;
    stopLoop();
    const {voice, device} = deps();
    voice.cancel();
    void Promise.resolve(device.release()).catch(() => {});
    device.setNowPlaying(null);
    status.value = 'idle';
    day.value = null;
    steps.value = [];
    index.value = 0;
    completed.value = [];
    currentLine.value = null;
    extraMs.value = 0;
    plan = null;
    cueCtx = null;
    cues = [];
    fired = 0;
  }

  // a coach line then the 3·2·1·Go beeps, so you can set your music level before starting
  async function soundCheck(): Promise<void> {
    const {voice, plans} = deps();
    const unlocked = voice.unlock();   // inside the tap, before any await
    voice.setMusicMode(settings.music);
    voice.setEnabled({voice: settings.voice, beeps: settings.beeps});
    await unlocked;
    await voice.speak(plans.coach.lines.soundCheck?.[0] ?? 'Sound check. Can you hear me over your music?');
    for (const kind of ['short', 'short', 'short', 'long'] as const) {
      voice.beep(kind);
      await new Promise((r) => setTimeout(r, 700));
    }
  }

  return {
    status, day, steps, index, currentLine, step, stepElapsedMs, stepRemainingMs, totalElapsedMs, setsDone,
    start, pause, resume, done, next, previous, addRest, end, soundCheck,
  };
});

// compile-time check that the store is a PlayerApi
type IsPlayerApi<T extends PlayerApi> = T;
export type PlayerStore = IsPlayerApi<ReturnType<typeof usePlayerStore>>;
