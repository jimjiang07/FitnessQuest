/* Pure tracker logic: dates, weeks, history lookups and checking saved data. No Vue, no DOM. */
import type {BodyEntry, RoutineId, SetEntry, StrengthSession, TrackerActivity, TrackerData, WeekSummary} from '../types';

const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar day, so a late-night session doesn't land on tomorrow in UTC. */
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = (now = new Date()) => isoDate(now);
const parse = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
export const isIsoDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && isoDate(parse(s)) === s;

export function addDays(iso: string, n: number): string {
  const d = parse(iso);
  d.setDate(d.getDate() + n);   // setDate, not ms maths, so daylight-saving days stay whole
  return isoDate(d);
}
export const mondayOf = (iso: string) => addDays(iso, -((parse(iso).getDay() + 6) % 7));
export const daysBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / DAY_MS);

/** 1-based week on the habit wall; 0 or less is before week 1. */
export const weekNumber = (startDate: string, iso: string) => Math.floor(daysBetween(startDate, iso) / 7) + 1;

export function weekSummary(startDate: string, week: number, habits: Record<string, string>,
  activities: TrackerActivity[], target: number): WeekSummary {
  const first = addDays(startDate, (week - 1) * 7);
  const dates = Array.from({length: 7}, (_, i) => addDays(first, i));
  const counts = new Set(activities.filter(a => a.counts).map(a => a.id));
  const sessions = dates.filter(d => counts.has(habits[d])).length;
  return {week, dates, sessions, achieved: sessions >= target};
}

/** Weeks to show: at least `minWeeks`, and always up to the week containing `now`. */
export const weeksToShow = (startDate: string, now: string, minWeeks: number) => Math.max(minWeeks, weekNumber(startDate, now));

/** Next status when tapping a day: none → each activity in order → none. */
export function nextActivity(current: string | undefined, activities: TrackerActivity[]): string | undefined {
  const i = activities.findIndex(a => a.id === current);
  return i === -1 ? activities[0]?.id : activities[i + 1]?.id;
}

export const newestFirst = <T extends {date: string; id: string}>(list: T[]) =>
  [...list].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

/** The most recent earlier session of this routine that logged anything for the exercise. */
export function previousSets(sessions: StrengthSession[], routine: RoutineId, key: string,
  before: {date: string; id: string}): SetEntry[] | null {
  const earlier = newestFirst(sessions).filter(s => s.routine === routine && s.id !== before.id &&
    (s.date < before.date || (s.date === before.date && s.id < before.id)));
  for (const s of earlier) {
    const sets = (s.sets[key] ?? []).filter(hasValue);
    if (sets.length) return sets;
  }
  return null;
}

export const hasValue = (s: SetEntry) => s.weight != null || s.reps != null || s.rpe != null;
export const emptySet = (): SetEntry => ({weight: null, reps: null, rpe: null});

/** Best weight logged for an exercise across all sessions (for a simple progress line). */
export function bestWeight(sessions: StrengthSession[], key: string): number | null {
  let best: number | null = null;
  for (const s of sessions) for (const set of s.sets[key] ?? []) if (set.weight != null && (best == null || set.weight > best)) best = set.weight;
  return best;
}

export const newId = (now = Date.now()) => `${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const emptyData = (now = today()): TrackerData => ({version: 1, startDate: mondayOf(now), habits: {}, sessions: [], body: []});

// ── checking saved or imported data: keep what's valid, drop what isn't ──────────────
const num = (v: unknown, min: number, max: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null;
const scale = (v: unknown) => Math.round(num(v, 0, 10) ?? 0);

function cleanSet(v: any): SetEntry {
  return {weight: num(v?.weight, 0, 1000), reps: num(v?.reps, 0, 10000), rpe: num(v?.rpe, 1, 10)};
}

export function sanitize(raw: unknown, now = today()): TrackerData {
  const d = emptyData(now);
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as any;
  const startDate = isIsoDate(r.startDate) ? mondayOf(r.startDate) : d.startDate;
  const habits: Record<string, string> = {};
  if (r.habits && typeof r.habits === 'object')
    for (const [k, v] of Object.entries(r.habits)) if (isIsoDate(k) && typeof v === 'string' && v) habits[k] = v;
  const sessions: StrengthSession[] = Array.isArray(r.sessions) ? r.sessions.flatMap((s: any) => {
    if (!s || typeof s.id !== 'string' || !isIsoDate(s.date) || (s.routine !== 'upper' && s.routine !== 'lower')) return [];
    const sets: Record<string, SetEntry[]> = {};
    if (s.sets && typeof s.sets === 'object')
      for (const [k, v] of Object.entries(s.sets)) if (Array.isArray(v)) sets[k] = v.map(cleanSet);
    return [{id: s.id, routine: s.routine, date: s.date, sets}];
  }) : [];
  const body: BodyEntry[] = Array.isArray(r.body) ? r.body.flatMap((b: any) => {
    if (!b || typeof b.id !== 'string' || !isIsoDate(b.date)) return [];
    return [{id: b.id, date: b.date, weight: num(b.weight, 0, 500), waist: num(b.waist, 0, 300),
      lumbar: scale(b.lumbar), neck: scale(b.neck), notes: typeof b.notes === 'string' ? b.notes : ''}];
  }) : [];
  return {version: 1, startDate, habits, sessions, body};
}
