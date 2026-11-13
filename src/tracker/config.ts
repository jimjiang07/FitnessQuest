/// <reference path="../env.d.ts" />
/* data/tracker.yaml, validated once at load so a typo fails the build instead of a gym session. */
import {z} from 'zod';
import type {TrackerConfig} from '../types';
import trackerYaml from '@data/tracker.yaml';

const text = z.string().min(1);
const kg = z.number().positive().max(400);
const grams = z.number().int().positive();
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const weekday = z.enum(WEEKDAYS);
const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const exercise = z.strictObject({
  key: z.string().regex(/^[a-z0-9-]+$/), name: text, cue: text, why: text,
  critical: z.boolean().optional(), target: text.optional(), repsLabel: text.optional(),
  weightLabel: text.default('Weight'), weightUnit: z.string().default('kg'),
  images: z.array(z.string().regex(/^[\w.-]+$/)).max(2).default([]).transform(fs => fs.map(f => `exercises/${f}`)),
});
const trackerSchema = z.strictObject({
  weeklyTarget: z.number().int().min(1).max(7),
  weeksShown: z.number().int().min(1).max(520),
  week: z.array(z.strictObject({day: text, plan: text, note: text.optional()})).length(7),
  profile: z.strictObject({lumbar: text, cervical: text, goals: z.array(text)}),
  cut: z.strictObject({
    start: kg, from: isoDay, target: kg, by: text, pace: text,
    fuel: z.array(z.strictObject({label: text, days: z.array(weekday).min(1), kcal: grams, protein: grams, fat: grams, carbs: grams, note: text.optional()}))
      .refine(f => f.flatMap(x => x.days).sort().join() === [...WEEKDAYS].sort().join(), 'every weekday in exactly one fuel day'),
    milestones: z.array(z.strictObject({date: isoDay, weight: kg, note: text})),
  }).optional(),
  activities: z.array(z.strictObject({
    id: z.string().regex(/^[a-z0-9-]+$/), label: text, short: text,
    color: z.enum(['work', 'rest', 'ready', 'cool', 'muted']), counts: z.boolean(),
  })).min(1),
  routines: z.array(z.strictObject({
    id: z.enum(['push', 'pull', 'legs']), name: text, tab: text, day: weekday, summary: text,
    warning: z.strictObject({title: text, points: z.array(text)}),
    busy: z.array(text).default([]),
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
