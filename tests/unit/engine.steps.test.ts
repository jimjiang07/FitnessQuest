import {describe, expect, it} from 'vitest';
import {buildSteps, GUIDED_LEAD_IN} from '../../src/engine/buildSteps';
import type {Step} from '../../src/types';
import {coach} from '../fixtures/coach';
import {day2, day2Plan} from '../fixtures/day2';
import {synthetic, syntheticDay} from '../fixtures/synthetic';

// One readable line per step, e.g. "rest 15 → lunge/right".
function summary(s: Step): string {
  switch (s.type) {
    case 'ready': return `ready ${s.seconds} ${s.first.key}`;
    case 'transition': return `transition ${s.seconds} ${s.gear.join('+')} ${s.first.key}`;
    case 'work': return `work ${s.exercise.key}${s.side ? `/${s.side}` : ''} ${s.seconds ?? 'reps'}`;
    case 'rest': return `rest ${s.seconds} → ${s.next?.exercise.key}${s.next?.side ? `/${s.next.side}` : ''}`;
    case 'complete': return 'complete';
  }
}

describe('buildSteps: synthetic plan', () => {
  const steps = buildSteps(syntheticDay, synthetic, coach);

  it('produces the exact step list', () => {
    expect(steps.map(summary)).toEqual([
      'ready 10 march',
      'work march 30',
      'rest 10 → bird-dog/left',
      `work bird-dog/left ${GUIDED_LEAD_IN + 2 * 5}`,
      'rest 5 → bird-dog/right',              // no restBetweenSides: switchSidesGap
      `work bird-dog/right ${GUIDED_LEAD_IN + 2 * 5}`,
      'transition 15 dumbbells db-press',     // rest 0 and end of block: straight to the transition
      'work db-press reps',
      'rest 30 → lunge/left',
      'work lunge/left reps',
      'rest 15 → lunge/right',                // restBetweenSides
      'work lunge/right reps',
      'rest 20 → db-press',                   // between rounds
      'work db-press reps',
      'rest 30 → lunge/left',
      'work lunge/left reps',
      'rest 15 → lunge/right',
      'work lunge/right reps',
      'transition 15 mat cat-camel',          // replaces the A2 rest after the last round
      `work cat-camel ${GUIDED_LEAD_IN + 3 * 4}`,
      'complete',                             // the cat-camel rest of 10 is dropped
    ]);
  });

  it('fills the position on every step', () => {
    steps.forEach((s, i) => expect(s.index).toBe(i));
    const pos = (i: number) => {
      const {blockIndex, blockName, blockKind, round, rounds} = steps[i];
      return {blockIndex, blockName, blockKind, round, rounds};
    };
    expect(pos(0)).toEqual({blockIndex: 0, blockName: 'Warm-up', blockKind: 'warmup', round: 1, rounds: 1});
    expect(pos(6)).toEqual({blockIndex: 1, blockName: 'Superset A', blockKind: 'superset', round: 1, rounds: 2});
    expect(pos(12)).toEqual({blockIndex: 1, blockName: 'Superset A', blockKind: 'superset', round: 1, rounds: 2});
    expect(pos(13)).toEqual({blockIndex: 1, blockName: 'Superset A', blockKind: 'superset', round: 2, rounds: 2});
    expect(pos(20)).toEqual({blockIndex: 2, blockName: 'Cool-down', blockKind: 'cooldown', round: 1, rounds: 1});
  });

  it('carries the item, side and next work', () => {
    const lungeLeft = steps[9];
    expect(lungeLeft).toMatchObject({type: 'work', side: 'left', item: {label: 'A2'}});
    const rest = steps[12];
    expect(rest.type === 'rest' && rest.next).toEqual({exercise: synthetic.exercises['db-press'],
      item: syntheticDay.blocks[1].items[0]});
    expect(steps[7].type === 'work' && 'side' in steps[7]).toBe(false);
  });

  it('throws on an unknown exercise', () => {
    const broken = {...syntheticDay, blocks: [{...syntheticDay.blocks[0], items: [{...syntheticDay.blocks[0].items[0], exercise: 'nope'}]}]};
    expect(() => buildSteps(broken, synthetic, coach)).toThrow('Unknown exercise "nope"');
  });
});

describe('buildSteps: Day 2', () => {
  const steps = buildSteps(day2, day2Plan, coach);
  const inBlock = (bi: number) => steps.filter((s) => s.blockIndex === bi && s.type !== 'transition');

  it('alternates A1 → A2 over three rounds, A2 split left then right', () => {
    const work = inBlock(1).filter((s) => s.type === 'work').map(summary);
    const round = ['work swiss-ball-ham-curl reps', 'work db-bulgarian-split-squat/left reps',
      'work db-bulgarian-split-squat/right reps'];
    expect(work).toEqual([...round, ...round, ...round]);
    expect(inBlock(1).filter((s) => s.type === 'work').map((s) => s.round)).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3]);
  });

  it('uses the rest values from the plan', () => {
    expect(inBlock(1).map(summary)).toEqual([
      'work swiss-ball-ham-curl reps', 'rest 45 → db-bulgarian-split-squat/left',
      'work db-bulgarian-split-squat/left reps', 'rest 5 → db-bulgarian-split-squat/right',
      'work db-bulgarian-split-squat/right reps', 'rest 75 → swiss-ball-ham-curl',
      'work swiss-ball-ham-curl reps', 'rest 45 → db-bulgarian-split-squat/left',
      'work db-bulgarian-split-squat/left reps', 'rest 5 → db-bulgarian-split-squat/right',
      'work db-bulgarian-split-squat/right reps', 'rest 75 → swiss-ball-ham-curl',
      'work swiss-ball-ham-curl reps', 'rest 45 → db-bulgarian-split-squat/left',
      'work db-bulgarian-split-squat/left reps', 'rest 5 → db-bulgarian-split-squat/right',
      'work db-bulgarian-split-squat/right reps',
    ]);
  });

  it('puts a transition with the block gear before every block but the first', () => {
    const transitions = steps.filter((s) => s.type === 'transition');
    expect(transitions.map(summary)).toEqual([
      'transition 15 swiss ball+mat+dumbbells+bench swiss-ball-ham-curl',
      'transition 15 dumbbells+mat b-stance-hinge',
      'transition 15 swiss ball stir-the-pot',
      'transition 15 swiss ball+mat psoas-90-90',
    ]);
    for (const t of transitions) expect(steps[t.index - 1].type).toBe('work');
  });

  it('starts with ready and ends with complete, with no rest before it', () => {
    expect(steps[0]).toMatchObject({type: 'ready', seconds: 10, first: {key: 'cat-camel'}});
    expect(steps.at(-1)?.type).toBe('complete');
    expect(summary(steps.at(-2)!)).toBe('work figure-4/right 90');
    expect(steps.filter((s) => s.type === 'complete')).toHaveLength(1);
  });

  it('times guided work from reps and hold or tempo', () => {
    const secs = (key: string) => steps.find((s) => s.type === 'work' && s.exercise.key === key)!;
    expect(secs('cat-camel')).toMatchObject({seconds: GUIDED_LEAD_IN + 8 * 6});     // tempo 6
    expect(secs('bird-dog')).toMatchObject({seconds: GUIDED_LEAD_IN + 6 * (5 + 2)}); // hold 5
    expect(secs('glute-bridge')).toMatchObject({seconds: GUIDED_LEAD_IN + 15 * (2 + 2)});
    expect(secs('stir-the-pot')).toMatchObject({seconds: 30});
    const reps = secs('swiss-ball-ham-curl');
    expect(reps.type === 'work' ? reps.seconds : 0).toBeUndefined();
  });
});
