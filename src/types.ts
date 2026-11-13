/* Shared contracts. Every work stream builds against these; change them only through the integrator
   (see docs/plans/implementation-plan.md › Contracts) so parallel streams stay compatible. */

// ── Plan data (resolved: shared blocks expanded, image paths filled in) ──────────────
export type BlockKind = 'warmup' | 'superset' | 'circuit' | 'finisher' | 'cooldown';

export type Prescription =
  | {kind: 'reps'; reps: string; unit?: string}          // "10-12" → tap Done
  | {kind: 'time'; seconds: number}                       // counts down by itself
  | {kind: 'guided'; reps: number; hold?: number; tempo?: number}; // coach counts each rep

export interface Exercise {
  key: string;
  name: string;
  say?: string;          // pronunciation for the coach
  gear: string[];
  note?: string;
  cues: string[];        // first one is spoken
  images: string[];      // [start, end] relative to the site root, e.g. "exercises/bird-dog-a.jpg"; may be empty
}

export interface BlockItem {
  exercise: string;      // key into Plan.exercises
  label?: string;        // A1, B2…
  rx: Prescription;
  perSide: boolean;
  restBetweenSides?: number;
  rest: number;          // seconds after the item (0 = none)
}

export interface Block {
  id: string;
  name: string;
  kind: BlockKind;
  rounds: number;
  items: BlockItem[];
}

export interface Day {
  id: string;
  title: string;
  anchor?: string;
  why?: string;
  blocks: Block[];
}

export interface Plan {
  id: string;
  name: string;
  summary: string;
  equipment: string[];
  order: number;          // position in the plan switch on Home
  rotate: boolean;        // false: sessions are picked freely, finishing one doesn't move "next day"
  dayLabel: string;       // "Day" or "Session"
  exercises: Record<string, Exercise>;
  days: Day[];
}

export interface CoachConfig {
  timing: {
    getReady: number; blockChange: number; upNextAt: number; countdownBeeps: number;
    repNudgeAfter: number; switchSidesGap: number; secondsPerRep: number;
  };
  pronounce: Record<string, string>;
  lines: Record<string, string[]>;   // template name → variants with {placeholders}
}

// ── Steps: the flat list the player walks ──────────────────────────────────────────
export type Side = 'left' | 'right';

export interface StepPosition {
  index: number;          // position in the day's step list
  blockIndex: number;
  blockName: string;
  blockKind: BlockKind;
  round: number;          // 1-based
  rounds: number;
}

export type Step =
  | (StepPosition & {type: 'ready'; seconds: number; first: Exercise})
  | (StepPosition & {type: 'transition'; seconds: number; gear: string[]; first: Exercise})
  | (StepPosition & {type: 'work'; exercise: Exercise; item: BlockItem; side?: Side;
      seconds?: number})   // duration for time/guided work; undefined for reps (waits for Done)
  | (StepPosition & {type: 'rest'; seconds: number; next?: {exercise: Exercise; item: BlockItem; side?: Side}})
  | (StepPosition & {type: 'complete'});

/** A moment inside a step: a spoken line and/or a beep, at ms from the step's start. */
export interface Cue {
  atMs: number;
  line?: string;
  beep?: 'short' | 'long';
  /** for reps steps: fire this many ms after start only if the step is still running (the one-off nudge) */
  once?: boolean;
}

// ── Audio ──────────────────────────────────────────────────────────────────────────
export interface Voice {
  /** must be called from a user gesture (the Start tap) to unlock audio on iOS */
  unlock(): Promise<void>;
  speak(line: string): Promise<void>;   // cancels anything still speaking
  cancel(): void;
  beep(kind: 'short' | 'long'): void;
  setEnabled(opts: {voice: boolean; beeps: boolean}): void;
  /** how the coach shares the speaker with music from another app (Safari's Audio Session API where available) */
  setMusicMode(mode: MusicMode): void;
}

// ── Player ─────────────────────────────────────────────────────────────────────────
export type PlayerStatus = 'idle' | 'running' | 'paused' | 'complete';

/** What screens read from and call on the player store (src/stores/player.ts). */
export interface PlayerApi {
  readonly status: PlayerStatus;
  readonly day: Day | null;
  readonly steps: Step[];
  readonly index: number;
  readonly step: Step | null;
  readonly stepElapsedMs: number;     // time in the current step
  readonly stepRemainingMs: number | null; // null for reps steps
  readonly totalElapsedMs: number;
  readonly currentLine: string | null; // the coach line being spoken, for the cue bubble
  readonly setsDone: number;
  start(dayId: string): Promise<void>; // call from the Start tap
  pause(): void;
  resume(): void;
  done(): void;                       // finish a reps step
  next(): void;                       // skip
  previous(): void;
  addRest(seconds: number): void;
  end(): void;
  /** plays a coach line and the beeps so you can check the level over your music; call from a tap */
  soundCheck(): Promise<void>;
}

/** off: no music · duck: lower other apps' music while the coach talks · mix: play over it at full volume */
export type MusicMode = 'off' | 'duck' | 'mix';

export interface Settings {
  voice: boolean;
  beeps: boolean;
  music: MusicMode;
  nextDayId: string | null;
}

export type Layout = 'compact' | 'shortWide' | 'book' | 'tabletop';

// ── Gym tracker (data/tracker.yaml + what you log, kept in localStorage) ─────────────
export type RoutineId = 'push' | 'pull' | 'legs';
export type ActivityColor = 'work' | 'rest' | 'ready' | 'cool' | 'muted';

export interface TrackerActivity { id: string; label: string; short: string; color: ActivityColor; counts: boolean }

export interface TrackerExercise {
  key: string;
  name: string;
  cue: string;           // what to do, always visible
  why: string;           // the clinical reason, behind the safety badge
  critical?: boolean;    // shown in the warning colour
  target?: string;       // the dose, e.g. "3 × 10–12"
  weightLabel: string;   // "Weight", or "Incline" for the treadmill
  weightUnit: string;    // "kg", "%", or "" for a level
  repsLabel?: string;    // defaults to "Reps"
  images: string[];      // [start, end] or one, e.g. "exercises/gym-leg-press-a.jpg"; may be empty
}

export interface TrackerRoutine {
  id: RoutineId;
  name: string;
  tab: string;
  day: string;           // "Tue": the Gym tab opens on today's routine
  summary: string;
  warning: {title: string; points: string[]};
  busy: string[];        // what to do when a machine is taken
  exercises: TrackerExercise[];
}

export interface FlexCard { id: string; name: string; summary: string; points: string[] }

export interface WeekPlanDay { day: string; plan: string; note?: string }

export interface FuelDay { label: string; days: string[]; kcal: number; protein: number; fat: number; carbs: number; note?: string }

export interface Milestone { date: string; weight: number; note: string }

/** The fat-loss plan; weights in kg, dates "YYYY-MM-DD". */
export interface CutPlan {
  start: number;
  from: string;
  target: number;
  by: string;            // shown as written, e.g. "Late Feb 2027"
  pace: string;
  fuel: FuelDay[];       // one per kind of day; every weekday in exactly one
  milestones: Milestone[];
}

export interface TrackerConfig {
  weeklyTarget: number;
  week: WeekPlanDay[];   // Monday first
  weeksShown: number;
  profile: {lumbar: string; cervical: string; goals: string[]};
  cut?: CutPlan;
  activities: TrackerActivity[];
  routines: TrackerRoutine[];
  flexMix: {title: string; summary: string; cards: FlexCard[]};
}

/** Dates are local calendar days, "YYYY-MM-DD". Empty number fields are null. */
export interface SetEntry { weight: number | null; reps: number | null; rpe: number | null }

export interface StrengthSession {
  id: string;
  routine: RoutineId;
  date: string;
  sets: Record<string, SetEntry[]>;   // exercise key → sets in order
}

export interface BodyEntry {
  id: string;
  date: string;
  weight: number | null;   // fasting, kg
  waist: number | null;    // morning, at the navel, cm
  lumbar: number;          // discomfort 0–10
  neck: number;            // strain 0–10
  notes: string;
}

export interface TrackerData {
  version: 1;
  startDate: string;                 // Monday of week 1 on the habit wall
  habits: Record<string, string>;    // date → activity id
  sessions: StrengthSession[];
  body: BodyEntry[];
}

export interface WeekSummary { week: number; dates: string[]; sessions: number; achieved: boolean }
