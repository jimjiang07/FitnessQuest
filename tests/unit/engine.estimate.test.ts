import {describe, expect, it} from 'vitest';
import {buildSteps, GUIDED_LEAD_IN} from '../../src/engine/buildSteps';
import {estimateDuration, topReps} from '../../src/engine/estimate';
import {coach} from '../fixtures/coach';
import {day2, day2Plan} from '../fixtures/day2';
import {synthetic, syntheticDay} from '../fixtures/synthetic';

describe('estimateDuration', () => {
  it('Day 2: every block added up by hand', () => {
    const g = GUIDED_LEAD_IN;
    const ready = 10;
    // cat-camel, bird-dog ×2, glute bridge, hip flexor ×2, with 5 s rests (none before the transition)
    const warmup = (g + 8 * 6) + 5 + (g + 6 * 7) + 5 + (g + 6 * 7) + 5 + (g + 15 * 4) + 5 + 30 + 5 + 30;
    const rep = (n: number) => n * coach.timing.secondsPerRep;
    // ham curl (12) · 45 · BSS L (10) · 5 · BSS R (10) · 75, last round without the 75
    const supersetA = 3 * (rep(12) + 45 + rep(10) + 5 + rep(10)) + 2 * 75;
    // hinge L/R (10) with 5 between · 45 · bridge L/R (10) with 5 between · 60
    const supersetB = 3 * (rep(10) + 5 + rep(10) + 45 + rep(10) + 5 + rep(10)) + 2 * 60;
    const finisher = 3 * 30 + 2 * 60;
    const cooldown = 180 + 5 + 120 + 5 + 90 + 5 + 90;
    const transitions = 4 * 15;
    const expected = ready + warmup + supersetA + supersetB + finisher + cooldown + transitions;
    expect(estimateDuration(buildSteps(day2, day2Plan, coach), coach)).toBe(expected);
    expect(expected).toBe(2301);
  });

  it('synthetic plan', () => {
    const steps = buildSteps(syntheticDay, synthetic, coach);
    const g = GUIDED_LEAD_IN;
    const expected = 10 + 30 + 10 + (g + 10) + 5 + (g + 10) + 15 + 2 * (30 + 30 + 30 + 15 + 30) + 20 + 15 + (g + 12);
    expect(estimateDuration(steps, coach)).toBe(expected);
  });

  it('reads the top of a rep range', () => {
    expect(topReps('10-12')).toBe(12);
    expect(topReps('8–10')).toBe(10);
    expect(topReps('15')).toBe(15);
    expect(topReps('max')).toBe(10);
  });
});
