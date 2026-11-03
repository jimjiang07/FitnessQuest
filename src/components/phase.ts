/** Phase colours the screens tint to. Kit-local; not part of the shared contract. */
export type Phase = 'work' | 'rest' | 'ready' | 'cool';

export const phaseColor = (p: Phase) => `var(--${p})`;

// dark ink that reads on a filled phase colour
export const phaseInk = (p: Phase) => (p === 'work' ? 'var(--on-work)' : p === 'cool' ? 'var(--on-cool)' : 'var(--bg)');

/** m:ss, rounding up so "0:01" shows until the very end. */
export function formatClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** One row of BlockTimeline. */
export interface TimelineItem {
  name: string;         // "Superset A × 3"
  detail?: string;      // exercise names
  seconds?: number;
  phase: Phase;
  state?: 'done' | 'now' | 'todo';
}
