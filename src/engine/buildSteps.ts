import type {Block, BlockItem, CoachConfig, Day, Exercise, Plan, Prescription, Side, Step, StepPosition} from '../types';

/** Seconds at the start of a guided set for the intro line, before the coach starts counting reps. */
export const GUIDED_LEAD_IN = 4;

/** Seconds per guided rep: Reach + hold + Back, or one tempo beat. */
export function guidedRepSeconds(rx: Extract<Prescription, {kind: 'guided'}>, coach: CoachConfig): number {
  return rx.hold !== undefined ? rx.hold + 2 : rx.tempo ?? coach.timing.secondsPerRep;
}

/** Duration of one work step; undefined for reps, which wait for Done. */
export function workSeconds(rx: Prescription, coach: CoachConfig): number | undefined {
  if (rx.kind === 'time') return rx.seconds;
  if (rx.kind === 'guided') return GUIDED_LEAD_IN + rx.reps * guidedRepSeconds(rx, coach);
  return undefined;
}

interface Entry {exercise: Exercise; item: BlockItem; side?: Side; round: number; restAfter: number}

function lookup(plan: Plan, key: string): Exercise {
  const ex = plan.exercises[key];
  if (!ex) throw new Error(`Unknown exercise "${key}"`);
  return ex;
}

// Every work step in a block in order, each with the rest that follows it.
function blockEntries(block: Block, plan: Plan, coach: CoachConfig): Entry[] {
  const out: Entry[] = [];
  for (let round = 1; round <= block.rounds; round++) {
    for (const item of block.items) {
      const exercise = lookup(plan, item.exercise);
      if (item.perSide) {
        out.push({exercise, item, side: 'left', round, restAfter: item.restBetweenSides ?? coach.timing.switchSidesGap});
        out.push({exercise, item, side: 'right', round, restAfter: item.rest});
      } else {
        out.push({exercise, item, round, restAfter: item.rest});
      }
    }
  }
  return out;
}

const gearOf = (entries: Entry[]) => [...new Set(entries.flatMap((e) => e.exercise.gear))];

/** The flat list of steps the player walks for one day. */
export function buildSteps(day: Day, plan: Plan, coach: CoachConfig): Step[] {
  const blocks = day.blocks.map((b) => blockEntries(b, plan, coach));
  if (!blocks.length || !blocks[0].length) throw new Error(`${day.id} has no exercises`);

  const steps: Step[] = [];
  const pos = (bi: number, round: number): StepPosition => {
    const b = day.blocks[bi];
    return {index: steps.length, blockIndex: bi, blockName: b.name, blockKind: b.kind, round, rounds: b.rounds};
  };

  steps.push({...pos(0, 1), type: 'ready', seconds: coach.timing.getReady, first: blocks[0][0].exercise});

  blocks.forEach((entries, bi) => {
    if (!entries.length) return;
    if (bi > 0) {
      steps.push({...pos(bi, 1), type: 'transition', seconds: coach.timing.blockChange, gear: gearOf(entries),
        first: entries[0].exercise});
    }
    entries.forEach((e, j) => {
      steps.push({...pos(bi, e.round), type: 'work', exercise: e.exercise, item: e.item,
        ...(e.side && {side: e.side}), seconds: workSeconds(e.item.rx, coach)});
      // the block's last work never rests: a transition or the finish replaces it
      const next = entries[j + 1];
      if (next && e.restAfter > 0) {
        steps.push({...pos(bi, e.round), type: 'rest', seconds: e.restAfter,
          next: {exercise: next.exercise, item: next.item, ...(next.side && {side: next.side})}});
      }
    });
  });

  const last = day.blocks.length - 1;
  steps.push({...pos(last, day.blocks[last].rounds), type: 'complete'});
  return steps;
}
