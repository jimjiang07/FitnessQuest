import {z} from 'zod';

/* zod schemas for the raw YAML (docs/plan-format.md). Structure only: cross-references such as exercise keys,
   `use:` targets and gear are checked in resolve.ts, where the friendly "did you mean" errors are built. */

const seconds = (field: string) =>
  z.number({error: `${field} must be a number of seconds`}).nonnegative({error: `${field} can't be negative`});
const positiveSeconds = (field: string) =>
  z.number({error: `${field} must be a number of seconds`}).positive({error: `${field} must be more than 0 seconds`});
const text = (field: string) => z.string({error: `${field} must be text`}).trim().min(1, {error: `${field} can't be empty`});

export const blockKinds = ['warmup', 'superset', 'circuit', 'finisher', 'cooldown'] as const;

export const guidedSchema = z
  .strictObject({
    reps: z.number({error: 'guided reps must be a number'}).int({error: 'guided reps must be a whole number'})
      .positive({error: 'guided reps must be more than 0'}),
    hold: positiveSeconds('hold').optional(),
    tempo: positiveSeconds('tempo').optional(),
  })
  .superRefine((g, ctx) => {
    if (g.hold !== undefined && g.tempo !== undefined)
      ctx.addIssue({code: 'custom', message: 'guided takes hold or tempo, not both'});
    if (g.hold === undefined && g.tempo === undefined)
      ctx.addIssue({code: 'custom', message: 'guided needs hold (seconds per rep held) or tempo (seconds per rep)'});
  });

export const workTypes = ['reps', 'time', 'guided'] as const;

export const itemSchema = z
  .strictObject({
    exercise: text('exercise'),
    label: z.union([z.string(), z.number()]).transform(String).optional(),
    reps: z.union([text('reps'), z.number().int().positive()], {error: 'reps must be a number or a range like 10-12'})
      .transform(String).optional(),
    time: positiveSeconds('time').optional(),
    guided: guidedSchema.optional(),
    perSide: z.boolean({error: 'perSide must be true or false'}).optional(),
    restBetweenSides: seconds('restBetweenSides').optional(),
    rest: seconds('rest').optional(),
    unit: text('unit').optional(),
  })
  .superRefine((item, ctx) => {
    const found = workTypes.filter((w) => item[w] !== undefined);
    if (found.length === 0) ctx.addIssue({code: 'custom', message: 'needs a work type: reps, time or guided'});
    if (found.length > 1) ctx.addIssue({code: 'custom', message: `pick one work type, not ${found.join(' and ')}`});
    if (item.unit !== undefined && item.reps === undefined)
      ctx.addIssue({code: 'custom', message: 'unit only applies to reps items'});
  });

export const blockSchema = z.strictObject({
  name: text('name'),
  kind: z.enum(blockKinds, {error: `kind must be one of ${blockKinds.join(', ')}`}),
  rounds: z.number({error: 'rounds must be a number'}).int({error: 'rounds must be a whole number'})
    .positive({error: 'rounds must be at least 1'}).default(1),
  rest: seconds('rest').optional(),
  items: z.array(itemSchema, {error: 'items must be a list'}).min(1, {error: 'a block needs at least one item'}),
});

export const useSchema = z.strictObject({use: text('use')});

// a day's block is either inline or a reference to a shared one; resolve.ts reports the matching branch's errors
export const dayBlockSchema = z.union([useSchema, blockSchema]);

export const daySchema = z.strictObject({
  id: text('id'),
  title: text('title'),
  anchor: text('anchor').optional(),
  why: text('why').optional(),
  blocks: z.array(dayBlockSchema, {error: 'blocks must be a list'}).min(1, {error: 'a day needs at least one block'}),
});

export const exerciseSchema = z.strictObject({
  name: text('name'),
  say: text('say').optional(),
  gear: z.array(text('gear'), {error: 'gear must be a list, e.g. [dumbbells]'}).default([]),
  note: text('note').optional(),
  cues: z.array(text('cue'), {error: 'cues must be a list'}).default([]),
  images: z.array(text('image'), {error: 'images must be a list'}).max(2, {error: 'images takes at most two pictures (start, end)'}).optional(),
});

export const planSchema = z.strictObject({
  id: z.string({error: 'id must be text'}).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, {error: 'id must be lower-case words joined by hyphens'}),
  name: text('name'),
  summary: text('summary'),
  equipment: z.array(text('equipment'), {error: 'equipment must be a list'}).default([]),
  exercises: z.record(z.string(), exerciseSchema, {error: 'exercises must be a map of key: exercise'}),
  blocks: z.record(z.string(), blockSchema, {error: 'blocks must be a map of key: block'}).optional(),
  days: z.array(daySchema, {error: 'days must be a list'}).min(1, {error: 'a plan needs at least one day'}),
});

export const coachSchema = z.strictObject({
  timing: z.strictObject({
    getReady: seconds('getReady'),
    blockChange: seconds('blockChange'),
    upNextAt: seconds('upNextAt'),
    countdownBeeps: z.number().int().nonnegative(),
    repNudgeAfter: seconds('repNudgeAfter'),
    switchSidesGap: seconds('switchSidesGap'),
    secondsPerRep: positiveSeconds('secondsPerRep'),
  }),
  pronounce: z.record(z.string(), z.string()).default({}),
  lines: z.record(z.string(), z.array(z.string()).min(1, {error: 'each line needs at least one variant'})),
});

export type RawPlan = z.infer<typeof planSchema>;
export type RawBlock = z.infer<typeof blockSchema>;
export type RawItem = z.infer<typeof itemSchema>;
export type RawExercise = z.infer<typeof exerciseSchema>;
