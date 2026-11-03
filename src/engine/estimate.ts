import type {CoachConfig, Step} from '../types';

/** Top of a rep range: "10-12" → 12, "10" → 10. */
export function topReps(reps: string): number {
  const nums = reps.match(/\d+/g)?.map(Number) ?? [];
  return nums.length ? Math.max(...nums) : 10;
}

/** Estimated length of a step list in seconds; reps sets count secondsPerRep per rep (each step is one side). */
export function estimateDuration(steps: Step[], coach: CoachConfig): number {
  let total = 0;
  for (const s of steps) {
    if (s.type === 'complete') continue;
    if (s.type === 'work' && s.item.rx.kind === 'reps') {
      total += topReps(s.item.rx.reps) * coach.timing.secondsPerRep;
    } else {
      total += s.seconds ?? 0;
    }
  }
  return total;
}
