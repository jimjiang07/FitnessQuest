import type {z} from 'zod';
import type {Block, BlockItem, Day, Exercise, Plan, Prescription} from '../types';
import {blockSchema, daySchema, exerciseSchema, guidedSchema, itemSchema, planSchema, useSchema} from './schema';
import type {RawBlock, RawExercise, RawItem, RawPlan} from './schema';

export interface ResolveOptions {
  /** file names in public/exercises/; when given, pictures are looked up by key and missing ones become warnings */
  pictures?: string[];
}

export type ResolveResult =
  | {ok: true; plan: Plan; warnings: string[]}
  | {ok: false; errors: string[]; warnings: string[]};

export class PlanError extends Error {
  constructor(readonly errors: string[], readonly warnings: string[] = [], source = 'plan') {
    super(`${source} has ${errors.length} error${errors.length === 1 ? '' : 's'}:\n  ${errors.join('\n  ')}`);
    this.name = 'PlanError';
  }
}

const SEP = ' › ';
const OWNED_BY_EVERYONE = 'mat';
const PICTURE_EXTS = ['webp', 'avif', 'jpg', 'jpeg', 'png', 'svg'];

/** Validates and resolves a raw plan, collecting every error instead of stopping at the first. */
export function validatePlan(raw: unknown, opts: ResolveOptions = {}): ResolveResult {
  const errors: string[] = [], warnings: string[] = [];
  const parsed = planSchema.safeParse(raw);
  if (!parsed.success) for (const issue of parsed.error.issues) errors.push(...describeIssue(issue, raw));
  checkReferences(raw, errors, warnings);
  if (!parsed.success || errors.length) return {ok: false, errors: [...new Set(errors)].sort(), warnings};
  return {ok: true, plan: build(parsed.data, opts, warnings), warnings};
}

/** Like validatePlan, but returns the Plan and throws a PlanError listing every problem. */
export function resolvePlan(raw: unknown, opts: ResolveOptions = {}): Plan {
  const result = validatePlan(raw, opts);
  if (!result.ok) throw new PlanError(result.errors, result.warnings, planName(raw));
  return result.plan;
}

// ── did you mean ───────────────────────────────────────────────────────────────────

export function suggest(word: string, options: Iterable<string>): string | undefined {
  let best: string | undefined, bestDist = Infinity;
  for (const o of options) {
    const d = distance(word.toLowerCase(), o.toLowerCase());
    if (d < bestDist) [best, bestDist] = [o, d];
  }
  return best !== undefined && bestDist <= Math.max(2, Math.floor(word.length / 3)) ? best : undefined;
}

const didYouMean = (word: string, options: Iterable<string>) => {
  const s = suggest(word, options);
  return s ? ` Did you mean "${s}"?` : '';
};

function distance(a: string, b: string): number {
  let prev = Array.from({length: b.length + 1}, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

// ── friendly locations: "day-2 › Superset A › A2" ──────────────────────────────────

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const list = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const str = (x: unknown): string | undefined => (typeof x === 'string' || typeof x === 'number' ? String(x) : undefined);

const planName = (raw: unknown) => (isObj(raw) && str(raw.id)) || 'plan';
const dayLabel = (day: unknown, i: number) => (isObj(day) && str(day.id)) || `day ${i + 1}`;
const itemLabel = (item: unknown, i: number) => (isObj(item) && str(item.label)) || `item ${i + 1}`;
const blockLabel = (block: unknown, i: number) => (isObj(block) && str(block.name)) || `block ${i + 1}`;

type Path = readonly PropertyKey[];

/** Splits a zod path into readable place names and the field names left over. */
function locate(raw: unknown, path: Path): {where: string[]; fields: string[]; node: unknown} {
  const where: string[] = [], fields: string[] = [];
  let node: unknown = raw;
  for (let i = 0; i < path.length; i++) {
    const seg = path[i], next = path[i + 1], parent = node;
    node = isObj(parent) ? parent[seg as string] : Array.isArray(parent) ? parent[seg as number] : undefined;
    if (typeof next === 'number' && (seg === 'days' || seg === 'items' || seg === 'blocks')) {
      const child = list(node)[next];
      where.push(seg === 'days' ? dayLabel(child, next) : seg === 'items' ? itemLabel(child, next) : blockLabel(child, next));
      node = child;
      i++;
    } else if (i === 0 && (seg === 'exercises' || seg === 'blocks') && next !== undefined) {
      where.push(`${seg}${SEP}${String(next)}`);
      node = isObj(node) ? node[next as string] : undefined;
      i++;
    } else if (typeof seg === 'string') fields.push(seg);
  }
  return {where, fields, node};
}

function keysOf(path: Path, node: unknown): string[] {
  const last = path.at(-1), before = path.at(-2);
  if (path.length === 0) return Object.keys(planSchema.shape);
  if (last === 'guided') return Object.keys(guidedSchema.shape);
  if (before === 'exercises' && path.length === 2) return Object.keys(exerciseSchema.shape);
  if (before === 'items') return Object.keys(itemSchema.shape);
  if (before === 'days') return Object.keys(daySchema.shape);
  if (before === 'blocks') return isObj(node) && 'use' in node ? Object.keys(useSchema.shape) : Object.keys(blockSchema.shape);
  return [];
}

function describeIssue(issue: z.core.$ZodIssue, raw: unknown, base: Path = []): string[] {
  const path = [...base, ...issue.path];
  const {where, fields, node} = locate(raw, path);
  // a day block failed both shapes: report only the one it was meant to be
  if (issue.code === 'invalid_union' && path.at(-2) === 'blocks' && path[0] === 'days' && issue.errors.length === 2) {
    const branch = isObj(node) && 'use' in node ? 0 : 1;
    return issue.errors[branch].flatMap((inner) => describeIssue(inner, raw, path));
  }
  let message = issue.message;
  if (issue.code === 'invalid_type' && node === undefined) message = `missing "${fields.at(-1) ?? 'value'}"`;
  else if (issue.code === 'unrecognized_keys') {
    const allowed = keysOf(path, node);
    message = issue.keys.map((k) => `unknown field "${k}".${didYouMean(k, allowed)}`).join(' ');
    if (fields.length) message += ` (in ${fields.join('.')})`;
  } else if (fields.length > 1) message += ` (in ${fields.slice(0, -1).join('.')})`;
  return [`${where.length ? where.join(SEP) : planName(raw)}: ${message}`];
}

// ── cross-reference checks (run on the raw data so they still report when the shape is off) ──

function checkReferences(raw: unknown, errors: string[], warnings: string[]) {
  if (!isObj(raw)) return;
  const exercises = isObj(raw.exercises) ? raw.exercises : {};
  const shared = isObj(raw.blocks) ? raw.blocks : {};
  const equipment = list(raw.equipment).filter((g): g is string => typeof g === 'string');
  const owned = new Set([...equipment, OWNED_BY_EVERYONE]);

  for (const [key, ex] of Object.entries(exercises)) {
    // a cue without sentence punctuation is the telltale of a YAML flow list split at a comma
    for (const cue of isObj(ex) ? list(ex.cues) : []) {
      if (typeof cue === 'string' && !/[.!?]["')]?$/.test(cue.trim()))
        warnings.push(`exercises${SEP}${key}: cue "${cue}" doesn't end with . ! or ?, so a comma may have split it. Write cues as a list of quoted strings.`);
    }
    for (const g of isObj(ex) ? list(ex.gear) : []) {
      if (typeof g !== 'string' || owned.has(g)) continue;
      errors.push(`exercises${SEP}${key}: gear "${g}" isn't in equipment [${equipment.join(', ')}].${didYouMean(g, owned)}`);
    }
  }

  const checkItems = (block: unknown, where: string) => {
    list(isObj(block) ? block.items : undefined).forEach((item, k) => {
      if (!isObj(item)) return;
      const at = `${where}${SEP}${itemLabel(item, k)}`;
      if (typeof item.exercise === 'string' && !(item.exercise in exercises))
        errors.push(`${at}: unknown exercise "${item.exercise}".${didYouMean(item.exercise, Object.keys(exercises))}`);
      if (item.restBetweenSides !== undefined && item.perSide !== true)
        warnings.push(`${at}: restBetweenSides is ignored without perSide: true`);
    });
  };

  for (const [key, block] of Object.entries(shared)) checkItems(block, `blocks${SEP}${key}`);

  const seen = new Set<string>();
  list(raw.days).forEach((day, i) => {
    if (!isObj(day)) return;
    const id = dayLabel(day, i);
    if (typeof day.id === 'string' && seen.has(day.id)) errors.push(`${id}: another day already has the id "${day.id}"`);
    seen.add(id);
    list(day.blocks).forEach((block, j) => {
      if (isObj(block) && typeof block.use === 'string') {
        if (!(block.use in shared)) {
          const hint = Object.keys(shared).length ? didYouMean(block.use, Object.keys(shared)) : ' This plan has no shared blocks.';
          errors.push(`${id}${SEP}${blockLabel(block, j)}: unknown block "${block.use}".${hint}`);
        }
      } else checkItems(block, `${id}${SEP}${blockLabel(block, j)}`);
    });
  });
}

// ── building the resolved Plan ─────────────────────────────────────────────────────

function build(raw: RawPlan, opts: ResolveOptions, warnings: string[]): Plan {
  const exercises: Record<string, Exercise> = {};
  for (const [key, ex] of Object.entries(raw.exercises)) exercises[key] = toExercise(key, ex, opts, warnings);
  const days: Day[] = raw.days.map((day) => {
    const ids = new Set<string>();
    const blocks = day.blocks.map((b) => toBlock('use' in b ? raw.blocks![b.use] : b, ids));
    return omitUndefined({id: day.id, title: day.title, anchor: day.anchor, why: day.why, blocks});
  });
  return {id: raw.id, name: raw.name, summary: raw.summary, equipment: raw.equipment, order: raw.order, rotate: raw.rotate,
    dayLabel: raw.dayLabel, exercises, days};
}

function toExercise(key: string, ex: RawExercise, opts: ResolveOptions, warnings: string[]): Exercise {
  const pictures = opts.pictures;
  let images: string[] = [];
  if (ex.images) {
    images = ex.images.map((f) => (/^(https?:|data:)/.test(f) ? f : `exercises/${f.replace(/^\/?(public\/)?exercises\//, '')}`));
    if (pictures) {
      const missing = images.filter((p) => p.startsWith('exercises/') && !pictures.includes(p.slice('exercises/'.length)));
      for (const m of missing) warnings.push(`exercises${SEP}${key}: picture "${m}" not found in public/exercises`);
    }
  } else if (pictures) {
    images = ['a', 'b'].map((pose) => findPicture(`${key}-${pose}`, pictures)).filter((f) => f !== undefined)
      .map((f) => `exercises/${f}`);
    if (!images.length) warnings.push(`exercises${SEP}${key}: no pictures (looked for ${key}-a.* and ${key}-b.* in public/exercises)`);
  }
  return omitUndefined({key, name: ex.name, say: ex.say, gear: ex.gear, note: ex.note, cues: ex.cues, images});
}

function findPicture(stem: string, pictures: string[]): string | undefined {
  const matches = pictures.filter((f) => f.slice(0, f.lastIndexOf('.')) === stem);
  const rank = (f: string) => {
    const r = PICTURE_EXTS.indexOf(f.slice(f.lastIndexOf('.') + 1).toLowerCase());
    return r === -1 ? Infinity : r;
  };
  return matches.filter((f) => rank(f) !== Infinity).sort((a, b) => rank(a) - rank(b))[0];
}

function toBlock(b: RawBlock, ids: Set<string>): Block {
  const slug = b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'block';
  let id = slug;
  for (let n = 2; ids.has(id); n++) id = `${slug}-${n}`;
  ids.add(id);
  return {id, name: b.name, kind: b.kind, rounds: b.rounds, items: b.items.map((item) => toItem(item, b.rest))};
}

function toItem(item: RawItem, blockRest: number | undefined): BlockItem {
  return omitUndefined({
    exercise: item.exercise,
    label: item.label,
    rx: toPrescription(item),
    perSide: item.perSide ?? false,
    restBetweenSides: item.restBetweenSides,
    rest: item.rest ?? blockRest ?? 0,
  });
}

function toPrescription(item: RawItem): Prescription {
  if (item.reps !== undefined) return omitUndefined({kind: 'reps', reps: item.reps, unit: item.unit});
  if (item.time !== undefined) return {kind: 'time', seconds: item.time};
  const g = item.guided!;
  return omitUndefined({kind: 'guided', reps: g.reps, hold: g.hold, tempo: g.tempo});
}

// keeps resolved objects free of `key: undefined`, so snapshots and deep-equals stay clean
function omitUndefined<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}
