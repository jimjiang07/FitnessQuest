/// <reference path="../env.d.ts" />
/* data/tracker.yaml, validated once at load so a typo fails the build instead of a gym session. */
import {z} from 'zod';
import type {TrackerConfig} from '../types';
import trackerYaml from '@data/tracker.yaml';

const text = z.string().min(1);
const kg = z.number().positive().max(400);
const grams = z.number().int().positive();
const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const exercise = z.strictObject({
  key: z.string().regex(/^[a-z0-9-]+$/), name: text, cue: text, why: text,
  critical: z.boolean().optional(), target: text.optional(), repsLabel: text.optional(),
  weightLabel: text.default('Weight'), weightUnit: z.string().default('kg'),
});
const trackerSchema = z.strictObject({
  weeklyTarget: z.number().int().min(1).max(7),
  weeksShown: z.number().int().min(1).max(520),
  week: z.array(z.strictObject({day: text, plan: text, note: text.optional()})).length(7),
  profile: z.strictObject({lumbar: text, cervical: text, goals: z.array(text)}),
  cut: z.strictObject({
    start: kg, from: isoDay, target: kg, by: text, pace: text,
    nutrition: z.strictObject({kcal: grams, protein: grams, fat: grams, carbs: grams, note: text.optional()}),
    milestones: z.array(z.strictObject({date: isoDay, weight: kg, note: text})),
  }).optional(),
  activities: z.array(z.strictObject({
    id: z.string().regex(/^[a-z0-9-]+$/), label: text, short: text,
    color: z.enum(['work', 'rest', 'ready', 'cool', 'muted']), counts: z.boolean(),
  })).min(1),
  routines: z.array(z.strictObject({
    id: z.enum(['upper', 'lower']), name: text, tab: text, summary: text,
    warning: z.strictObject({title: text, points: z.array(text)}),
    exercises: z.array(exercise).min(1),
  })),
  flexMix: z.strictObject({
    title: text, summary: text,
    cards: z.array(z.strictObject({id: text, name: text, summary: text, points: z.array(text)})),
  }),
});

export function parseTracker(raw: unknown): TrackerConfig {
  const r = trackerSchema.safeParse(raw);
  if (!r.success) throw new Error(`data/tracker.yaml: ${r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  return r.data;
}

export const tracker: TrackerConfig = parseTracker(trackerYaml);
export const routine = (id: string) => tracker.routines.find(r => r.id === id);
export const activity = (id: string | undefined) => tracker.activities.find(a => a.id === id);
