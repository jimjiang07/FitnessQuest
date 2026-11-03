// Pure helpers that turn plan data and player steps into what the screens show. No Vue, no DOM.
import type {Block, BlockItem, BlockKind, CoachConfig, Day, Plan, Side, Step} from '@/types';
import type {Phase, TimelineItem} from '@/components/phase';
import {buildSteps, guidedRepSeconds, GUIDED_LEAD_IN} from '@/engine/buildSteps';
import {estimateDuration} from '@/engine/estimate';

export type Panel = 'ready' | 'transition' | 'timed' | 'reps' | 'guided' | 'rest' | 'complete';

/** Which player panel a step shows. */
export function panelFor(step: Step | null): Panel | null {
  if (!step) return null;
  if (step.type !== 'work') return step.type;
  const kind = step.item.rx.kind;
  return kind === 'time' ? 'timed' : kind;
}

/** Block colour on timelines and the segment bar. */
export function blockPhase(kind: BlockKind): Phase {
  if (kind === 'warmup' || kind === 'cooldown') return 'cool';
  return kind === 'finisher' ? 'ready' : 'work';
}

/** Screen tint: reps are work; holds, carries and stretches are lavender (the board's "timed halves"). */
export function phaseFor(step: Step | null): Phase {
  if (!step) return 'ready';
  switch (step.type) {
    case 'ready': case 'transition': return 'ready';
    case 'rest': return 'rest';
    case 'complete': return 'work';
    case 'work': return itemPhase(step.item);
  }
}

export const itemPhase = (item: BlockItem): Phase => (item.rx.kind === 'reps' ? 'work' : 'cool');

const dash = (s: string) => s.replace(/\s*-\s*/g, '–');

/** "10–12 reps each side", "30 s each side", "6 reps · 5 s hold". */
export function targetLabel(item: BlockItem): string {
  const rx = item.rx;
  const each = item.perSide ? ' each side' : '';
  if (rx.kind === 'reps') return `${dash(rx.reps)} ${rx.unit ?? 'reps'}${each}`;
  if (rx.kind === 'time') return `${rx.seconds} s${each}`;
  return `${rx.reps} ${rx.tempo ? 'slow reps' : 'reps'}${rx.hold ? ` · ${rx.hold} s hold` : ''}${each}`;
}

export const sideLabel = (side?: Side) => (side === 'left' ? 'Left side · then right' : side === 'right' ? 'Right side' : '');

export const blockTitle = (b: Pick<Block, 'name' | 'rounds'>) => (b.rounds > 1 ? `${b.name} × ${b.rounds}` : b.name);

export function itemIndex(day: Day, step: Extract<Step, {type: 'work'}>): number {
  const items = day.blocks[step.blockIndex]?.items ?? [];
  const i = items.indexOf(step.item);
  return i >= 0 ? i : items.findIndex((it) => it.exercise === step.item.exercise && it.label === step.item.label);
}

/** "Superset A · A1 · Round 2 of 3", "Warm-up · 4 of 4", "Rest · Superset A · Round 2 of 3". */
export function stepTag(day: Day, step: Step): string {
  if (step.type === 'ready') return 'Get ready';
  if (step.type === 'transition') return `Next block · ${step.blockIndex + 1} of ${day.blocks.length}`;
  if (step.type === 'complete') return 'Done';
  const round = step.rounds > 1 ? `Round ${step.round} of ${step.rounds}` : '';
  if (step.type === 'rest') return ['Rest', step.blockName, round].filter(Boolean).join(' · ');
  const items = day.blocks[step.blockIndex]?.items ?? [];
  const parts = [step.blockName];
  if (step.item.label) parts.push(step.item.label);
  if (round) parts.push(round);
  else if (items.length > 1) parts.push(`${itemIndex(day, step) + 1} of ${items.length}`);
  return parts.join(' · ');
}

const uniq = <T>(xs: T[]) => [...new Set(xs)];

export function blockGear(block: Block, plan: Plan): string[] {
  return uniq(block.items.flatMap((it) => plan.exercises[it.exercise]?.gear ?? []));
}

/** Gear chips for a day; the mat is a given, so it's left off. */
export function dayGear(day: Day, plan: Plan): string[] {
  return uniq(day.blocks.flatMap((b) => blockGear(b, plan))).filter((g) => g !== 'mat');
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Get-ready checklist: the first block's gear, then what the next block adds. */
export function readyChecklist(day: Day, plan: Plan): {name: string; note?: string}[] {
  const [first, second] = day.blocks;
  if (!first) return [];
  const have = blockGear(first, plan);
  const rows: {name: string; note?: string}[] = have.map((g) => ({name: cap(g)}));
  const more = second ? blockGear(second, plan).filter((g) => !have.includes(g)) : [];
  if (more.length) rows.push({name: cap(more.join(' + ')), note: `for ${second.name}`});
  return rows;
}

/** "Anchor: B-stance DB hip hinge" from the day's anchor (first move only). */
export const anchorShort = (day: Day) => (day.anchor ? `Anchor: ${day.anchor.split(/\s+&\s+/)[0]}` : undefined);

export interface DaySummary {
  steps: Step[];
  totalSeconds: number;
  blockSeconds: number[];   // per block, including its transition
}

/** Step list and estimated lengths for a day, from the real engine. */
export function summariseDay(day: Day, plan: Plan, coach: CoachConfig): DaySummary {
  const steps = buildSteps(day, plan, coach);
  const blockSeconds = day.blocks.map((_, bi) => estimateDuration(steps.filter((s) => s.blockIndex === bi), coach));
  return {steps, totalSeconds: estimateDuration(steps, coach), blockSeconds};
}

export const formatMinutes = (secs: number) => `${Math.round(secs / 60)} min`;

/** Day timeline rows; `current` marks done/now while playing, `complete` ticks them all. */
export function dayTimeline(day: Day, plan: Plan, blockSeconds: number[], opts: {current?: number; complete?: boolean} = {}):
  TimelineItem[] {
  return day.blocks.map((b, i) => ({
    name: blockTitle(b),
    detail: b.items.map((it) => plan.exercises[it.exercise]?.name ?? it.exercise).join(' · '),
    seconds: blockSeconds[i],
    phase: blockPhase(b.kind),
    state: opts.complete ? 'done' : opts.current === undefined ? undefined
      : i < opts.current ? 'done' : i === opts.current ? 'now' : 'todo',
  }));
}

/** The exercises of the current block with done/now ticks, for single-round blocks. */
export function blockItemsTimeline(day: Day, plan: Plan, step: Extract<Step, {type: 'work'}>): TimelineItem[] {
  const block = day.blocks[step.blockIndex];
  const at = itemIndex(day, step);
  return block.items.map((it, i) => ({
    name: plan.exercises[it.exercise]?.name ?? it.exercise,
    phase: phaseFor(step),
    state: i < at ? 'done' : i === at ? 'now' : 'todo',
  }));
}

/** Segment bar: one segment per block, current block partly filled by steps done in it. */
export function progressFor(day: Day, steps: Step[], index: number) {
  const segments = day.blocks.map((b) => blockPhase(b.kind));
  const step = steps[index];
  if (!step) return {segments, current: 0, progress: 0};
  if (step.type === 'complete') return {segments, current: segments.length, progress: 0};
  const inBlock = steps.filter((s) => s.blockIndex === step.blockIndex && s.type !== 'complete');
  const at = inBlock.indexOf(step);
  return {segments, current: step.blockIndex, progress: inBlock.length ? Math.max(0, at) / inBlock.length : 0};
}

/** Round tracker rows/position for a multi-round block. */
export function roundsFor(day: Day, plan: Plan, step: Extract<Step, {type: 'work'}>) {
  const block = day.blocks[step.blockIndex];
  return {
    rows: block.items.map((it, i) => it.label ?? (plan.exercises[it.exercise]?.name ?? `${i + 1}`)),
    rounds: block.rounds,
    current: {row: Math.max(0, itemIndex(day, step)), round: step.round},
  };
}

export interface UpNext {label?: string; phase: Phase; name: string; target?: string; image?: string}

/** What follows the step at `index`, for the up-next card on a work step. */
export function upNextAfter(steps: Step[], index: number): UpNext | null {
  const after = steps[index + 1];
  if (!after) return null;
  if (after.type === 'rest') {
    const n = after.next;
    const switching = n?.side === 'right';
    return {
      label: `${after.seconds}s`, phase: 'rest',
      name: switching ? 'Switch sides' : n ? `Rest, then ${n.item.label ?? 'next'}` : 'Rest',
      target: n ? n.exercise.name + (n.side ? ` · ${n.side} side` : '') : undefined,
    };
  }
  if (after.type === 'work') {
    return {label: after.item.label, phase: phaseFor(after), name: after.exercise.name, target: targetLabel(after.item),
      image: after.exercise.images[0]};
  }
  if (after.type === 'transition') return {phase: 'ready', name: `Next: ${after.blockName}`, target: after.first.name};
  return {phase: 'work', name: 'Last one', target: 'Then you’re done'};
}

/** Guided counter: which rep you're on and the hold count inside it (0 during the intro). */
export function guidedCount(step: Extract<Step, {type: 'work'}>, elapsedMs: number, coach: CoachConfig) {
  const rx = step.item.rx;
  if (rx.kind !== 'guided') return {rep: 0, reps: 0, hold: 0, holds: 0};
  const per = guidedRepSeconds(rx, coach) * 1000;
  const t = elapsedMs - GUIDED_LEAD_IN * 1000;
  if (t < 0) return {rep: 0, reps: rx.reps, hold: 0, holds: rx.hold ?? 0};
  const rep = Math.min(rx.reps, Math.floor(t / per) + 1);
  const within = t - (rep - 1) * per;
  // Reach at 0 s, hold counts 1..hold from 1 s, Back after
  const hold = rx.hold ? Math.min(rx.hold, Math.max(0, Math.floor(within / 1000))) : 0;
  return {rep, reps: rx.reps, hold, holds: rx.hold ?? 0};
}

export function dayNumber(plan: Plan, dayId: string): number {
  return plan.days.findIndex((d) => d.id === dayId) + 1;
}

export function nextDayAfter(plan: Plan, dayId: string): Day | undefined {
  const i = plan.days.findIndex((d) => d.id === dayId);
  return i < 0 ? undefined : plan.days[(i + 1) % plan.days.length];
}
