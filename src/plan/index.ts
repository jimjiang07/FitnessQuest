// tests type-check under tsconfig.node.json, which does not include src/env.d.ts
/// <reference path="../env.d.ts" />
import type {CoachConfig, Day, Plan} from '../types';
import {coachSchema} from './schema';
import {PlanError, validatePlan} from './resolve';
import coachYaml from '@data/coach.yaml';

// YAML is parsed at build time (vite.config.ts › yamlPlugin), so these are plain objects
const planFiles = import.meta.glob<unknown>('/data/plans/*.yaml', {eager: true, import: 'default'});
// only the file names are used; the lazy loaders are never called, so nothing is bundled
const pictureFiles = Object.keys(import.meta.glob('/public/exercises/*.{webp,avif,jpg,jpeg,png,svg}', {query: '?url'}));

export const pictures = pictureFiles.map((p) => p.slice(p.lastIndexOf('/') + 1));

const fileName = (path: string) => path.slice(path.lastIndexOf('/') + 1);

export const plans: Plan[] = Object.entries(planFiles).map(([path, raw]) => {
  const result = validatePlan(raw, {pictures});
  if (!result.ok) throw new PlanError(result.errors, result.warnings, `data/plans/${fileName(path)}`);
  if (import.meta.env.DEV) for (const w of result.warnings) console.warn(`data/plans/${fileName(path)}: ${w}`);
  return result.plan;
}).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

export const coach: CoachConfig = (() => {
  const parsed = coachSchema.safeParse(coachYaml);
  if (!parsed.success)
    throw new PlanError(parsed.error.issues.map((i) => `${i.path.join('.') || 'coach'}: ${i.message}`), [], 'data/coach.yaml');
  return parsed.data;
})();

export function getDay(dayId: string): Day | undefined {
  return planForDay(dayId)?.days.find((d) => d.id === dayId);
}

export function planForDay(dayId: string): Plan | undefined {
  return plans.find((p) => p.days.some((d) => d.id === dayId));
}
