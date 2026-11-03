import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createPinia, setActivePinia} from 'pinia';
import {nextTick} from 'vue';
import type {NowPlaying} from '../../src/audio/device';
import {createFakeClock, type FakeClock} from '../../src/engine/clock';
import {configurePlayer, usePlayerStore} from '../../src/stores/player';
import {useSettingsStore} from '../../src/stores/settings';
import type {Block, Day, Plan, PlayerApi, Voice} from '../../src/types';
import {coach} from '../fixtures/coach';
import {makeExercise as ex} from '../fixtures/exercise';

// Each day walks: 0 ready 10s · 1 march 30s · 2 rest 20s · 3 press (reps) · 4 transition 15s ·
// 5 lunge left 20s · 6 switch sides 5s · 7 lunge right 20s · 8 complete
const blocks: Block[] = [
  {id: 'warmup', name: 'Warm-up', kind: 'warmup', rounds: 1, items: [
    {exercise: 'march', rx: {kind: 'time', seconds: 30}, perSide: false, rest: 20},
    {exercise: 'db-press', rx: {kind: 'reps', reps: '8-10'}, perSide: false, rest: 15},
  ]},
  {id: 'finisher', name: 'Finisher', kind: 'finisher', rounds: 1, items: [
    {exercise: 'lunge', rx: {kind: 'time', seconds: 20}, perSide: true, rest: 0},
  ]},
];
const days: Day[] = [1, 2, 3, 4].map((n) => ({id: `day-${n}`, title: `Day ${n}`, blocks}));
const plan: Plan = {
  id: 'test', name: 'Test', summary: '', equipment: ['dumbbells'],
  exercises: {
    march: ex('march', 'March', ['mat'], ['Knees high.']),
    'db-press': ex('db-press', 'DB press', ['dumbbells'], ['Press straight up.']),
    lunge: ex('lunge', 'Reverse lunge', ['dumbbells'], ['Torso tall.']),
  },
  days,
};

type Event = {kind: 'speak'; line: string} | {kind: 'beep'; beep: 'short' | 'long'} | {kind: 'cancel'};

function fakeVoice() {
  const events: Event[] = [];
  const voice = {
    unlock: vi.fn(async () => {}),
    speak: vi.fn(async (line: string) => { events.push({kind: 'speak', line}); }),
    cancel: vi.fn(() => { events.push({kind: 'cancel'}); }),
    beep: vi.fn((beep: 'short' | 'long') => { events.push({kind: 'beep', beep}); }),
    setEnabled: vi.fn(),
  } satisfies Voice;
  return {voice, events};
}

let clock: FakeClock;
let voice: ReturnType<typeof fakeVoice>['voice'];
let events: Event[];
const fakeDevice = () => ({
  keepAwake: vi.fn(async () => {}), release: vi.fn(async () => {}), setNowPlaying: vi.fn((_np: NowPlaying | null) => {}),
});
let device: ReturnType<typeof fakeDevice>;

const spoken = () => events.flatMap((e) => (e.kind === 'speak' ? [e.line] : []));
const beeps = () => events.flatMap((e) => (e.kind === 'beep' ? [e.beep] : []));
const clear = () => { events.length = 0; };
const run = (ms: number) => clock.advance(ms, 100);   // smooth frames, like a visible tab

async function started(dayId = 'day-1') {
  const p = usePlayerStore();
  await p.start(dayId);
  return p;
}

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v)});
  setActivePinia(createPinia());
  clock = createFakeClock(1000);
  ({voice, events} = fakeVoice());
  device = fakeDevice();
  configurePlayer({voice, device, clock, plans: {getDay: (id) => days.find((d) => d.id === id), planForDay: () => plan, coach}});
});

afterEach(() => {
  configurePlayer();
  vi.unstubAllGlobals();
});

describe('player store', () => {
  it('satisfies PlayerApi', () => {
    const api: PlayerApi = usePlayerStore();
    expect(api.status).toBe('idle');
  });

  it('start: unlocks audio, keeps the screen on, and runs the ready countdown into the first work', async () => {
    const p = await started();
    expect(voice.unlock).toHaveBeenCalledOnce();
    expect(device.keepAwake).toHaveBeenCalledOnce();
    expect(device.setNowPlaying).toHaveBeenLastCalledWith(expect.objectContaining({title: 'Warm-up', artist: 'Day 1'}));
    expect(p.status).toBe('running');
    expect(p.index).toBe(0);
    expect(p.step?.type).toBe('ready');
    expect(spoken()).toEqual(['Welcome to day one. Grab a mat. We start with March.']);
    expect(p.currentLine).toBe(spoken()[0]);
    expect(p.stepRemainingMs).toBe(10000);

    run(6900);
    expect(beeps()).toEqual([]);
    run(100);
    expect(beeps()).toEqual(['short']);
    run(2000);
    expect(beeps()).toEqual(['short', 'short', 'short']);
    expect(p.index).toBe(0);
    run(1000);
    expect(beeps()).toEqual(['short', 'short', 'short', 'long']);
    expect(p.index).toBe(1);
    expect(p.step?.type).toBe('work');
    // Go is spoken with the intro in one line so the intro doesn't cut it off
    expect(spoken().at(-1)).toBe('Go! March. Thirty seconds. Knees high.');
    expect(p.currentLine).toBe('Go! March. Thirty seconds. Knees high.');
    expect(device.setNowPlaying).toHaveBeenLastCalledWith(expect.objectContaining({title: 'March'}));
  });

  it('timed work fires halfway and ten-left, then auto-advances into rest', async () => {
    const p = await started();
    run(10000);
    clear();
    run(14900);
    expect(spoken()).toEqual([]);
    run(100);
    expect(spoken()).toEqual(['Halfway.']);
    expect(p.stepRemainingMs).toBe(15000);
    run(5000);
    expect(spoken()).toEqual(['Halfway.', 'Ten seconds left.']);
    run(9900);
    expect(p.index).toBe(1);
    expect(p.setsDone).toBe(0);
    run(100);
    expect(p.index).toBe(2);
    expect(p.step?.type).toBe('rest');
    expect(p.setsDone).toBe(1);
    expect(spoken().at(-1)).toBe('Nice. Rest, twenty seconds.');
  });

  it('rest: "up next" at 10 s left, 3·2·1 beeps, and Go before the next step starts', async () => {
    const p = await started();
    run(40000);
    expect(p.index).toBe(2);
    clear();
    run(9900);
    expect(spoken()).toEqual([]);
    run(100);
    expect(spoken()).toEqual(['Up next, dumbbell press. Eight to ten reps.']);
    run(7000);
    expect(beeps()).toEqual(['short']);
    run(2000);
    expect(beeps()).toEqual(['short', 'short', 'short']);
    run(900);
    expect(p.index).toBe(2);
    expect(spoken().some((l) => /go/i.test(l))).toBe(false);
    run(100);
    expect(beeps().at(-1)).toBe('long');
    expect(p.index).toBe(3);
    const last = spoken().at(-1)!;
    expect(last.startsWith('Go!')).toBe(true);
    expect(last).toBe('Go! Dumbbell press. Eight to ten reps. Press straight up.');
  });

  it('reps waits for done(), nudges once, then the rest or transition starts', async () => {
    const p = await started();
    run(60000);
    expect(p.index).toBe(3);
    expect(p.stepRemainingMs).toBeNull();
    clear();
    run(120000);
    expect(p.index).toBe(3);
    expect(spoken()).toEqual(['Slow and controlled. Tap done when you finish your set.']);
    expect(p.stepElapsedMs).toBe(120000);
    p.done();
    expect(p.index).toBe(4);
    expect(p.step?.type).toBe('transition');
    expect(p.setsDone).toBe(2);
    expect(p.stepElapsedMs).toBe(0);
  });

  it('a reps nudge is skipped when the set is done before it', async () => {
    const p = await started();
    run(60000);
    run(10000);
    p.done();
    clear();
    run(60000);
    expect(spoken().some((l) => l.includes('Tap done'))).toBe(false);
  });

  it('pause and resume keep the remaining time exact', async () => {
    const p = await started();
    run(22000);              // 12 s into the march
    expect(p.stepRemainingMs).toBe(18000);
    p.pause();
    expect(p.status).toBe('paused');
    expect(voice.cancel).toHaveBeenCalled();
    expect(clock.listeners).toBe(0);
    clock.advance(60000);
    expect(p.stepRemainingMs).toBe(18000);
    expect(p.totalElapsedMs).toBe(22000);
    clear();
    p.resume();
    expect(p.status).toBe('running');
    expect(spoken()).toEqual([]);   // nothing replayed
    run(17900);
    expect(p.index).toBe(1);
    expect(spoken()).toEqual(['Halfway.', 'Ten seconds left.']);
    run(100);
    expect(p.index).toBe(2);
    expect(p.totalElapsedMs).toBe(40000);
  });

  it('a 20 s clock jump catches up without speaking a backlog', async () => {
    const p = await started();
    run(5000);
    clear();
    clock.advance(20000);    // one frame: 3·2·1, Go, the march intro and halfway were all due
    expect(p.index).toBe(1);
    expect(p.stepElapsedMs).toBe(15000);
    expect(p.stepRemainingMs).toBe(15000);
    expect(spoken()).toEqual(['Halfway.']);
    expect(beeps()).toEqual([]);   // stale beeps are dropped
    expect(p.currentLine).toBe('Halfway.');
  });

  it('a long jump walks through several steps and counts their sets', async () => {
    const p = await started();
    clock.advance(10000 + 30000 + 25000);   // ready, march and rest are over; 5 s into the press
    expect(p.index).toBe(3);
    expect(p.stepElapsedMs).toBe(5000);
    expect(p.setsDone).toBe(1);
    expect(spoken().slice(1)).toEqual(['Go! Dumbbell press. Eight to ten reps. Press straight up.']);
  });

  it('next skips without counting the set; previous goes back or restarts', async () => {
    const p = await started();
    run(12000);              // 2 s into the march
    p.next();
    expect(p.index).toBe(2);
    expect(p.setsDone).toBe(0);
    expect(p.stepElapsedMs).toBe(0);
    expect(spoken().at(-1)).toBe('Nice. Rest, twenty seconds.');
    run(2000);
    p.previous();            // within 3 s: back to the previous work
    expect(p.index).toBe(1);
    expect(spoken().at(-1)).toBe('March. Thirty seconds. Knees high.');
    run(5000);
    p.previous();            // more than 3 s in: restart this one
    expect(p.index).toBe(1);
    expect(p.stepElapsedMs).toBe(0);
    expect(p.stepRemainingMs).toBe(30000);
    p.previous();            // at the start of the first work: nothing earlier, so it restarts
    expect(p.index).toBe(1);
  });

  it('addRest only works on rests and moves the countdown with the end', async () => {
    const p = await started();
    run(15000);
    p.addRest(15);
    expect(p.stepRemainingMs).toBe(25000);   // march unchanged
    run(25000);
    expect(p.index).toBe(2);
    run(2000);
    p.addRest(15);
    expect(p.stepRemainingMs).toBe(33000);
    clear();
    run(22900);
    expect(beeps()).toEqual([]);   // no 3·2·1 at the old end
    expect(spoken()).toEqual([]);
    run(100);                       // 25 s in: "up next" at 10 s before the new end
    expect(spoken()).toEqual(['Up next, dumbbell press. Eight to ten reps.']);
    run(7000);
    expect(beeps()).toEqual(['short']);
    run(2900);
    expect(p.index).toBe(2);
    run(100);
    expect(beeps()).toEqual(['short', 'short', 'short', 'long']);
    expect(p.index).toBe(3);
  });

  it('end stops everything and releases the wake lock', async () => {
    const p = await started();
    run(5000);
    p.end();
    expect(p.status).toBe('idle');
    expect(p.day).toBeNull();
    expect(p.step).toBeNull();
    expect(device.release).toHaveBeenCalledOnce();
    expect(device.setNowPlaying).toHaveBeenLastCalledWith(null);
    expect(voice.cancel).toHaveBeenCalled();
    expect(clock.listeners).toBe(0);
  });

  it.each([['day-1', 'day-2'], ['day-4', 'day-1']])('finishing %s completes, counts sets, and sets next day %s',
    async (dayId, nextId) => {
      const p = await started(dayId);
      run(10000 + 30000 + 20000);
      p.done();
      run(15000 + 20000 + 5000 + 20000);
      expect(p.status).toBe('complete');
      expect(p.step?.type).toBe('complete');
      expect(p.setsDone).toBe(4);
      expect(p.stepRemainingMs).toBeNull();
      expect(device.release).toHaveBeenCalledOnce();
      expect(device.setNowPlaying).toHaveBeenLastCalledWith(null);
      expect(clock.listeners).toBe(0);
      expect(spoken().at(-1)).toMatch(/^That's day (one|four) done\./);
      expect(useSettingsStore().nextDayId).toBe(nextId);
      const total = p.totalElapsedMs;
      clock.advance(10000);
      expect(p.totalElapsedMs).toBe(total);
    });

  it('skipping to the end while paused still completes', async () => {
    const p = await started();
    p.pause();
    for (let i = 0; i < 8; i++) p.next();
    expect(p.status).toBe('complete');
    expect(p.setsDone).toBe(0);
    expect(useSettingsStore().nextDayId).toBe('day-2');
  });

  it('passes voice and beeps settings to the voice', async () => {
    const p = usePlayerStore();
    const settings = useSettingsStore();
    expect(voice.setEnabled).toHaveBeenLastCalledWith({voice: true, beeps: true});
    settings.beeps = false;
    await nextTick();
    expect(voice.setEnabled).toHaveBeenLastCalledWith({voice: true, beeps: false});
    expect(p.status).toBe('idle');
  });

  it('start rejects an unknown day', async () => {
    await expect(usePlayerStore().start('day-9')).rejects.toThrow(/day-9/);
  });
});
