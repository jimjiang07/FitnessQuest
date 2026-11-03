import {describe, expect, it} from 'vitest';
import {buildSteps} from '../../src/engine/buildSteps';
import {cuesFor, variantFor} from '../../src/engine/cues';
import {estimateDuration} from '../../src/engine/estimate';
import {coach, plans} from '../../src/plan';
import type {Step} from '../../src/types';
import {day2, day2Plan} from '../fixtures/day2';

// Shape of a step without exercise text, so the hand fixture and the resolved plan compare on structure.
const shape = (s: Step) => ({
  type: s.type, blockIndex: s.blockIndex, blockName: s.blockName, round: s.round, rounds: s.rounds,
  ...(s.type === 'work' && {key: s.exercise.key, side: s.side, seconds: s.seconds, rx: s.item.rx}),
  ...(s.type === 'rest' && {seconds: s.seconds, next: s.next?.exercise.key, nextSide: s.next?.side}),
  ...((s.type === 'ready' || s.type === 'transition') && {seconds: s.seconds, first: s.first.key}),
});

describe('engine on the real resolved plan', () => {
  const plan = plans.find((p) => p.id === 'spine-rehab')!;

  it('Day 2 matches the hand-resolved fixture step for step', () => {
    const real = buildSteps(plan.days.find((d) => d.id === 'day-2')!, plan, coach);
    expect(real.map(shape)).toEqual(buildSteps(day2, day2Plan, coach).map(shape));
    expect(estimateDuration(real, coach)).toBe(2301);
  });

  it.each(['day-1', 'day-2', 'day-3', 'day-4'])('%s builds and every step has cues from coach.yaml', (dayId) => {
    const day = plan.days.find((d) => d.id === dayId)!;
    const steps = buildSteps(day, plan, coach);
    expect(steps[0].type).toBe('ready');
    expect(steps.at(-1)?.type).toBe('complete');
    for (const s of steps) {
      const cues = cuesFor(s, {plan, coach, day, variant: variantFor(steps, s.index)});
      expect(cues.length, `${dayId} step ${s.index}`).toBeGreaterThan(0);
      for (const c of cues) expect(c.line ?? '').not.toMatch(/[{}]|\bDB\b|undefined/);
    }
  });
});
