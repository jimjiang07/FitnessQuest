import {describe, expect, it} from 'vitest';
import type {Step} from '../../src/types';
import {coach, getDay, planForDay} from '../../src/plan';
import {buildSteps} from '../../src/engine/buildSteps';
import {
  anchorShort, blockPhase, dayGear, dayTimeline, formatMinutes, guidedCount, nextDayAfter, panelFor, phaseFor,
  progressFor, readyChecklist, roundsFor, stepTag, summariseDay, targetLabel, upNextAfter,
} from '../../src/views/viewModel';

const day = getDay('day-2')!;
const plan = planForDay('day-2')!;
const steps = buildSteps(day, plan, coach);
type Work = Extract<Step, {type: 'work'}>;
const firstWork = (pred: (s: Work) => boolean) => steps.findIndex((s) => s.type === 'work' && pred(s));

describe('views/viewModel', () => {
  it('maps each step to its panel', () => {
    const panels = new Set(steps.map(panelFor));
    expect(panels).toEqual(new Set(['ready', 'transition', 'guided', 'timed', 'reps', 'rest', 'complete']));
    expect(panelFor(null)).toBeNull();
  });

  it('tints reps as work, holds and stretches lavender, rests teal', () => {
    expect(phaseFor(steps[firstWork((s) => s.item.rx.kind === 'reps')])).toBe('work');
    expect(phaseFor(steps[firstWork((s) => s.item.rx.kind === 'time')])).toBe('cool');
    expect(phaseFor(steps.find((s) => s.type === 'rest')!)).toBe('rest');
    expect(phaseFor(steps[0])).toBe('ready');
    expect(blockPhase('finisher')).toBe('ready');
    expect(blockPhase('warmup')).toBe('cool');
  });

  it('writes the step tag like the board', () => {
    const a1 = steps[firstWork((s) => s.item.label === 'A1')];
    expect(stepTag(day, a1)).toBe('Superset A · A1 · Round 1 of 3');
    const flexor = steps[firstWork((s) => s.exercise.key === 'hip-flexor-squeeze')];
    expect(stepTag(day, flexor)).toBe('Warm-up · 4 of 4');
    expect(stepTag(day, steps[0])).toBe('Get ready');
  });

  it('shows targets with an en dash and per-side wording', () => {
    const a2 = day.blocks[1].items[1];
    expect(targetLabel(a2)).toBe('8–10 reps each side');
    expect(targetLabel(day.blocks[0].items[1])).toBe('6 reps · 5 s hold each side');
    expect(targetLabel(day.blocks[0].items[3])).toBe('30 s each side');
  });

  it('estimates days with the engine and never the 58 min placeholder', () => {
    for (const d of plan.days) {
      const {totalSeconds, blockSeconds} = summariseDay(d, plan, coach);
      expect(totalSeconds / 60).toBeGreaterThan(35);
      expect(totalSeconds / 60).toBeLessThan(46);
      expect(blockSeconds).toHaveLength(d.blocks.length);
    }
    expect(formatMinutes(2301)).toBe('38 min');
  });

  it('builds the day timeline and gear without the mat', () => {
    const tl = dayTimeline(day, plan, [1, 2, 3, 4, 5], {current: 1});
    expect(tl.map((t) => t.state)).toEqual(['done', 'now', 'todo', 'todo', 'todo']);
    expect(tl[1].name).toBe('Superset A × 3');
    expect(dayGear(day, plan)).not.toContain('mat');
    expect(anchorShort(day)).toBe('Anchor: B-stance DB hip hinge');
  });

  it('lists gear to have ready, with what the next block adds', () => {
    const rows = readyChecklist(day, plan);
    expect(rows[0]).toEqual({name: 'Mat'});
    expect(rows.at(-1)?.note).toBe('for Superset A');
  });

  it('tracks rounds and block progress', () => {
    const i = firstWork((s) => s.item.label === 'A2' && s.round === 2);
    expect(roundsFor(day, plan, steps[i] as Work)).toEqual({rows: ['A1', 'A2'], rounds: 3, current: {row: 1, round: 2}});
    const p = progressFor(day, steps, i);
    expect(p.current).toBe(1);
    expect(p.progress).toBeGreaterThan(0);
    expect(progressFor(day, steps, steps.length - 1).current).toBe(day.blocks.length);
  });

  it('says what comes after a work step', () => {
    const a1 = firstWork((s) => s.item.label === 'A1');
    expect(upNextAfter(steps, a1)).toMatchObject({label: '45s', phase: 'rest', name: 'Rest, then A2'});
    const left = firstWork((s) => s.side === 'left' && s.item.rx.kind === 'reps');
    expect(upNextAfter(steps, left)?.name).toBe('Switch sides');
  });

  it('counts guided reps and holds after the lead-in', () => {
    const bird = steps[firstWork((s) => s.exercise.key === 'bird-dog')] as Work;
    expect(guidedCount(bird, 0, coach).rep).toBe(0);
    expect(guidedCount(bird, 4000, coach)).toMatchObject({rep: 1, hold: 0, reps: 6, holds: 5});
    expect(guidedCount(bird, 4000 + 3500, coach)).toMatchObject({rep: 1, hold: 3});
    expect(guidedCount(bird, 4000 + 7000, coach).rep).toBe(2);
    expect(guidedCount(bird, 10 ** 7, coach).rep).toBe(6);
  });

  it('wraps to day 1 after the last day', () => {
    expect(nextDayAfter(plan, 'day-2')?.id).toBe('day-3');
    expect(nextDayAfter(plan, 'day-4')?.id).toBe('day-1');
  });
});
