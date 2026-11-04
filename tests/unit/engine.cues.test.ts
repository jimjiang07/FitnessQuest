import {describe, expect, it} from 'vitest';
import {buildSteps, GUIDED_LEAD_IN} from '../../src/engine/buildSteps';
import {cuesFor, dayName, variantFor} from '../../src/engine/cues';
import type {Cue, Step} from '../../src/types';
import {coach} from '../fixtures/coach';
import {day2, day2Plan} from '../fixtures/day2';
import {synthetic, syntheticDay} from '../fixtures/synthetic';

const steps = buildSteps(day2, day2Plan, coach);
const ctx = {plan: day2Plan, coach, day: day2, variant: 0};
const cues = (s: Step, variant = 0) => cuesFor(s, {...ctx, variant});
const find = (pred: (s: Step) => boolean) => steps.find(pred)!;
const work = (key: string, side?: string) =>
  find((s) => s.type === 'work' && s.exercise.key === key && s.side === side);
const countdown = (seconds: number, go = 'Go!'): Cue[] => [
  {atMs: (seconds - 3) * 1000, beep: 'short'}, {atMs: (seconds - 2) * 1000, beep: 'short'},
  {atMs: (seconds - 1) * 1000, beep: 'short'}, {atMs: seconds * 1000, beep: 'long', line: go},
];

describe('cuesFor', () => {
  it('ready: welcome with the first exercise, then 3·2·1 and Go', () => {
    expect(cues(steps[0])).toEqual([
      {atMs: 0, line: 'Welcome to day two. Grab a mat. We start with Cat-camel.'},
      ...countdown(10),
    ]);
  });

  it('transition: block, rounds and gear, then 3·2·1 and Go', () => {
    const t = find((s) => s.type === 'transition');
    expect(cues(t)).toEqual([
      {atMs: 0, line: "Superset A. Three rounds. You'll need the Swiss ball, a mat, your dumbbells and the bench."},
      ...countdown(15),
    ]);
    expect(cues(t, 1)[0].line).toBe('Next up, Superset A. Grab the Swiss ball, a mat, your dumbbells and the bench.');
    expect(cues(t, 1).at(-1)?.line).toBe("Let's go!");
  });

  it('timed work: intro and first cue, halfway, ten seconds left', () => {
    expect(cues(work('stir-the-pot'))).toEqual([
      {atMs: 0, line: 'Swiss ball stir the pot. Thirty seconds. Small, controlled circles.'},
      {atMs: 15000, line: 'Halfway.'},
      {atMs: 20000, line: 'Ten seconds left.'},
    ]);
  });

  it('timed work: says the side, skips halfway under 20 s and ten-left under 25 s', () => {
    const plan = synthetic;
    const day = {...syntheticDay, blocks: [{...syntheticDay.blocks[0], items: [
      {exercise: 'march', rx: {kind: 'time' as const, seconds: 15}, perSide: true, rest: 0}]}]};
    const [, left] = buildSteps(day, plan, coach);
    expect(cuesFor(left, {plan, coach, day, variant: 0})).toEqual([
      {atMs: 0, line: 'March, left side. Fifteen seconds. Knees high.'},
    ]);
    const hip = cues(work('hip-flexor-squeeze', 'right'));
    expect(hip[0].line).toBe('Half-kneeling hip flexor squeeze, right side. Thirty seconds. Squeeze the back glute.');
  });

  it('reps work: intro with target and first cue, then a one-off nudge', () => {
    expect(cues(work('swiss-ball-ham-curl'))).toEqual([
      {atMs: 0, line: 'Swiss ball hamstring curl. Ten to twelve reps. Hips up, heels drive the ball in.'},
      {atMs: 45000, line: 'Slow and controlled. Tap done when you finish your set.', once: true},
    ]);
    expect(cues(work('db-bulgarian-split-squat', 'left'))[0].line)
      .toBe('Dumbbell bulgarian split squat, left side. Eight to ten reps. Torso tall, drop straight down.');
  });

  it('guided hold: Reach, Hold, counted seconds, Back for every rep', () => {
    const c = cues(work('bird-dog', 'left'));
    expect(c[0]).toEqual({atMs: 0, line: 'McGill bird dog, left side. Six reps, five-second hold.'});
    const lead = GUIDED_LEAD_IN * 1000;
    expect(c.slice(1, 8)).toEqual([
      {atMs: lead, line: 'Reach'}, {atMs: lead + 1000, line: 'Hold'}, {atMs: lead + 2000, line: 'Two'},
      {atMs: lead + 3000, line: 'Three'}, {atMs: lead + 4000, line: 'Four'}, {atMs: lead + 5000, line: 'Five'},
      {atMs: lead + 6000, line: 'Back'},
    ]);
    expect(c).toHaveLength(1 + 6 * 7);
    expect(c.at(-1)).toEqual({atMs: (GUIDED_LEAD_IN + 6 * 7 - 1) * 1000, line: 'Back'});
    // a 2 s hold: Reach, Hold, Two, Back
    const bridge = cues(work('glute-bridge'));
    expect(bridge.slice(1, 5).map((x) => x.line)).toEqual(['Reach', 'Hold', 'Two', 'Back']);
    expect(bridge[5].atMs).toBe((GUIDED_LEAD_IN + 4) * 1000);
  });

  it('guided tempo: the rep number every tempo seconds', () => {
    const c = cues(work('cat-camel'));
    expect(c[0]).toEqual({atMs: 0, line: 'Cat-camel. Eight reps.'});
    expect(c.slice(1)).toEqual(['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight']
      .map((line, i) => ({atMs: (GUIDED_LEAD_IN + i * 6) * 1000, line})));
  });

  it('rest: rest line, round and up next at upNextAt, 3·2·1 in the last 3 s', () => {
    const roundRest = find((s) => s.type === 'rest' && s.seconds === 75);
    expect(cues(roundRest)).toEqual([
      {atMs: 0, line: 'Nice. Rest, seventy-five seconds.'},
      {atMs: 65000, line: 'Round two of three. Up next, Swiss ball hamstring curl. Ten to twelve reps.'},
      ...countdown(75),
    ]);
    const midRound = find((s) => s.type === 'rest' && s.seconds === 45);
    expect(cues(midRound, 1)).toEqual([
      {atMs: 0, line: 'Good work. Rest forty-five.'},
      {atMs: 35000, line: 'Up next, dumbbell bulgarian split squat, left side. Eight to ten reps.'},
      ...countdown(45, "Let's go!"),
    ]);
    const upNext = steps.filter((s) => s.type === 'rest' && s.blockIndex === 2 && s.seconds === 45)[0];
    expect(cues(upNext)[1].line).toBe('Up next, Single-leg glute bridge, left side. Ten reps.');
  });

  it('rest: left → right switch says Switch sides / Other side', () => {
    const sw = find((s) => s.type === 'rest' && s.next?.side === 'right');
    expect(cues(sw)).toEqual([{atMs: 0, line: 'Switch sides.'}, ...countdown(5)]);
    expect(cues(sw, 1)[0].line).toBe('Other side.');
  });

  it('rest: short rests keep to one line, with the round when one starts', () => {
    const short = find((s) => s.type === 'rest' && s.seconds === 5 && s.next?.side !== 'right');
    expect(cues(short)).toEqual([{atMs: 0, line: 'Nice. Rest, five seconds.'}, ...countdown(5)]);
    const plan = synthetic;
    const day = {...syntheticDay, blocks: [{...syntheticDay.blocks[1], items: [
      {exercise: 'db-press', rx: {kind: 'reps' as const, reps: '8'}, perSide: false, rest: 8}]}]};
    const rest = buildSteps(day, plan, coach)[2];
    expect(cuesFor(rest, {plan, coach, day, variant: 0})[0].line).toBe('Nice. Rest, eight seconds. Round two of two.');
  });

  it('complete: the finish line', () => {
    expect(cues(steps.at(-1)!)).toEqual([{atMs: 0, line: "That's day two done. Great work looking after your spine."}]);
  });

  it('applies pronounce to every line and say: to names', () => {
    const allLines = steps.flatMap((s) => cues(s)).map((c) => c.line ?? '');
    expect(allLines.some((l) => /\bDB\b|90\/90/.test(l))).toBe(false);
    expect(allLines).toContain('Ninety ninety psoas relief. One hundred and eighty seconds. Lower legs on the ball, knees and hips at ninety degrees.');
  });

  it('keeps every cue inside the step and in time order', () => {
    for (const s of steps) {
      const c = cues(s);
      const end = 'seconds' in s && s.seconds !== undefined ? s.seconds * 1000 : Infinity;
      expect(c.every((x) => x.atMs >= 0 && x.atMs <= end)).toBe(true);
      expect(c.map((x) => x.atMs)).toEqual([...c.map((x) => x.atMs)].sort((a, b) => a - b));
    }
  });
});

describe('variantFor and dayName', () => {
  it('counts earlier steps of the same type so lines rotate', () => {
    const rests = steps.filter((s) => s.type === 'rest').slice(0, 3);
    expect(rests.map((r) => variantFor(steps, r.index))).toEqual([0, 1, 2]);
    expect(variantFor(steps, 0)).toBe(0);
  });

  it('names numbered days, otherwise uses the title', () => {
    expect(dayName(day2)).toBe('day two');
    expect(dayName({id: 'mobility', title: 'Mobility', blocks: []})).toBe('Mobility');
  });
});
