import {describe, expect, it} from 'vitest';
import {readFileSync, readdirSync} from 'node:fs';
import {parse} from 'yaml';
import {PlanError, resolvePlan, suggest, validatePlan} from '../../src/plan/resolve';

// A small valid raw plan; each error test breaks one thing in a fresh copy.
function rawPlan(): any {
  return {
    id: 'test-plan',
    name: 'Test plan',
    summary: 'A tiny plan for tests.',
    equipment: ['dumbbells', 'bench'],
    exercises: {
      'cat-camel': {name: 'Cat-camel', gear: ['mat'], cues: ['Small and slow.']},
      'db-bulgarian-split-squat': {name: 'DB Bulgarian split squat', gear: ['dumbbells', 'bench'], cues: ['Torso tall.']},
      'b-stance-hinge': {name: 'B-stance hinge', say: 'B stance hinge', gear: ['dumbbells'], note: '25 lb', cues: ['Hips back.']},
      'side-plank': {name: 'Side plank', gear: ['mat'], cues: ['Hips high.'], images: ['custom-side.png']},
    },
    blocks: {
      warmup: {name: 'Warm-up', kind: 'warmup', rest: 5, items: [
        {exercise: 'cat-camel', guided: {reps: 8, tempo: 6}},
        {exercise: 'side-plank', time: 20, perSide: true, rest: 10},
      ]},
    },
    days: [
      {id: 'day-1', title: 'Legs', why: 'Because.', blocks: [
        {use: 'warmup'},
        {name: 'Superset A', kind: 'superset', rounds: 3, rest: 45, items: [
          {label: 'A1', exercise: 'b-stance-hinge', reps: 10, perSide: true, restBetweenSides: 20},
          {label: 'A2', exercise: 'db-bulgarian-split-squat', reps: '8-10', unit: 'reps each leg', rest: 75},
        ]},
        {name: 'Finisher', kind: 'finisher', items: [{label: 'C1', exercise: 'cat-camel', guided: {reps: 6, hold: 5}}]},
        {use: 'warmup'},
      ]},
    ],
  };
}

const errorsOf = (raw: unknown) => {
  const r = validatePlan(raw);
  return r.ok ? [] : r.errors;
};

describe('the real plan', () => {
  const raw = parse(readFileSync('data/plans/spine-rehab.yaml', 'utf8'));
  const pictures = readdirSync('public/exercises');

  it('resolves with no errors and finds a picture pair for every exercise', () => {
    const r = validatePlan(raw, {pictures});
    expect(r.ok ? [] : r.errors).toEqual([]);
    if (!r.ok) return;
    expect(r.plan.days.map((d) => d.id)).toEqual(['day-1', 'day-2', 'day-3', 'day-4']);
    for (const ex of Object.values(r.plan.exercises)) expect(ex.images, ex.key).toHaveLength(2);
    expect(r.warnings).toEqual([]);
  });

  it('starts every day with the warm-up and ends with the cool-down', () => {
    for (const d of resolvePlan(raw).days) {
      expect(d.blocks[0].name).toBe('Warm-up');
      expect(d.blocks.at(-1)!.name).toBe('Cool-down');
    }
  });
});

describe('resolvePlan', () => {
  it('expands use: blocks into full blocks with ids unique within the day', () => {
    const day = resolvePlan(rawPlan()).days[0];
    expect(day.blocks.map((b) => b.id)).toEqual(['warm-up', 'superset-a', 'finisher', 'warm-up-2']);
    expect(day.blocks[0]).toEqual({
      id: 'warm-up', name: 'Warm-up', kind: 'warmup', rounds: 1,
      items: [
        {exercise: 'cat-camel', rx: {kind: 'guided', reps: 8, tempo: 6}, perSide: false, rest: 5},
        {exercise: 'side-plank', rx: {kind: 'time', seconds: 20}, perSide: true, rest: 10},
      ],
    });
    expect(day.blocks[3].items).toEqual(day.blocks[0].items);
  });

  it('applies the block rest as the default, an item rest overrides it, and no rest means 0', () => {
    const [, superset, finisher] = resolvePlan(rawPlan()).days[0].blocks;
    expect(superset.items.map((i) => i.rest)).toEqual([45, 75]);
    expect(finisher.items[0].rest).toBe(0);
    expect(finisher.rounds).toBe(1);
  });

  it('normalises each work type into a Prescription', () => {
    const [a1, a2] = resolvePlan(rawPlan()).days[0].blocks[1].items;
    expect(a1).toEqual({exercise: 'b-stance-hinge', label: 'A1', rx: {kind: 'reps', reps: '10'}, perSide: true, restBetweenSides: 20, rest: 45});
    expect(a2.rx).toEqual({kind: 'reps', reps: '8-10', unit: 'reps each leg'});
    expect(resolvePlan(rawPlan()).days[0].blocks[2].items[0].rx).toEqual({kind: 'guided', reps: 6, hold: 5});
  });

  it('keeps exercise details and fills in defaults', () => {
    const raw = rawPlan();
    raw.exercises['cat-camel'] = {name: 'Cat-camel'};
    const plan = resolvePlan(raw);
    expect(plan.exercises['b-stance-hinge']).toEqual({
      key: 'b-stance-hinge', name: 'B-stance hinge', say: 'B stance hinge', gear: ['dumbbells'], note: '25 lb', cues: ['Hips back.'], images: [],
    });
    expect(plan.exercises['cat-camel']).toEqual({key: 'cat-camel', name: 'Cat-camel', gear: [], cues: [], images: []});
  });
});

describe('exercise pictures', () => {
  const pictures = ['cat-camel-a.jpg', 'cat-camel-b.jpg', 'b-stance-hinge-a.svg', 'b-stance-hinge-a.webp', 'b-stance-hinge-b.svg',
    'db-bulgarian-split-squat-a.png', 'custom-side.png', 'CREDITS.md'];

  it('finds <key>-a and <key>-b by key, preferring webp, and uses an explicit images: list as given', () => {
    const r = validatePlan(rawPlan(), {pictures});
    if (!r.ok) throw new Error(r.errors.join('\n'));
    const ex = r.plan.exercises;
    expect(ex['cat-camel'].images).toEqual(['exercises/cat-camel-a.jpg', 'exercises/cat-camel-b.jpg']);
    expect(ex['b-stance-hinge'].images).toEqual(['exercises/b-stance-hinge-a.webp', 'exercises/b-stance-hinge-b.svg']);
    expect(ex['db-bulgarian-split-squat'].images).toEqual(['exercises/db-bulgarian-split-squat-a.png']);
    expect(ex['side-plank'].images).toEqual(['exercises/custom-side.png']);
    expect(r.warnings).toEqual([]);
  });

  it('warns, but does not fail, when pictures are missing', () => {
    const raw = rawPlan();
    raw.exercises['side-plank'].images = ['nope.jpg'];
    const r = validatePlan(raw, {pictures: []});
    expect(r.ok).toBe(true);
    expect(r.warnings).toContain('exercises › cat-camel: no pictures (looked for cat-camel-a.* and cat-camel-b.* in public/exercises)');
    expect(r.warnings).toContain('exercises › side-plank: picture "exercises/nope.jpg" not found in public/exercises');
  });

  it('skips the lookup when no picture list is passed', () => {
    const plan = resolvePlan(rawPlan());
    expect(plan.exercises['cat-camel'].images).toEqual([]);
    expect(plan.exercises['side-plank'].images).toEqual(['exercises/custom-side.png']);
  });
});

describe('errors', () => {
  it('unknown exercise, with a did-you-mean suggestion', () => {
    const raw = rawPlan();
    raw.days[0].blocks[1].items[1].exercise = 'db-bulgarian-split-sqat';
    expect(errorsOf(raw)).toEqual(['day-1 › Superset A › A2: unknown exercise "db-bulgarian-split-sqat". Did you mean "db-bulgarian-split-squat"?']);
  });

  it('unknown exercise inside a shared block names the block key', () => {
    const raw = rawPlan();
    raw.blocks.warmup.items[0].exercise = 'cat-camle';
    expect(errorsOf(raw)).toEqual(['blocks › warmup › item 1: unknown exercise "cat-camle". Did you mean "cat-camel"?']);
  });

  it('two work types on one item', () => {
    const raw = rawPlan();
    raw.days[0].blocks[1].items[0].time = 30;
    expect(errorsOf(raw)).toEqual(['day-1 › Superset A › A1: pick one work type, not reps and time']);
  });

  it('no work type', () => {
    const raw = rawPlan();
    delete raw.days[0].blocks[2].items[0].guided;
    expect(errorsOf(raw)).toEqual(['day-1 › Finisher › C1: needs a work type: reps, time or guided']);
  });

  it('guided with both hold and tempo, or neither', () => {
    const raw = rawPlan();
    raw.days[0].blocks[2].items[0].guided = {reps: 6, hold: 5, tempo: 4};
    expect(errorsOf(raw)).toEqual(['day-1 › Finisher › C1: guided takes hold or tempo, not both']);
    raw.days[0].blocks[2].items[0].guided = {reps: 6};
    expect(errorsOf(raw)).toEqual(['day-1 › Finisher › C1: guided needs hold (seconds per rep held) or tempo (seconds per rep)']);
  });

  it('unknown use: block, with a suggestion', () => {
    const raw = rawPlan();
    raw.days[0].blocks[3] = {use: 'warmpu'};
    expect(errorsOf(raw)).toEqual(['day-1 › block 4: unknown block "warmpu". Did you mean "warmup"?']);
  });

  it('gear that is not in equipment (mat is always allowed)', () => {
    const raw = rawPlan();
    raw.exercises['b-stance-hinge'].gear = ['dumbbells', 'swiss ball'];
    expect(errorsOf(raw)).toEqual(['exercises › b-stance-hinge: gear "swiss ball" isn\'t in equipment [dumbbells, bench].']);
  });

  it('negative or zero times', () => {
    const raw = rawPlan();
    raw.blocks.warmup.items[1].time = -20;
    raw.days[0].blocks[1].items[1].rest = -5;
    expect(errorsOf(raw)).toEqual([
      'blocks › warmup › item 2: time must be more than 0 seconds',
      'day-1 › Superset A › A2: rest can\'t be negative',
    ]);
  });

  it('unknown fields, missing fields and bad kinds', () => {
    const raw = rawPlan();
    raw.days[0].blocks[1].rset = 30;
    raw.days[0].blocks[2].kind = 'finsher';
    delete raw.days[0].title;
    raw.days[0].blocks[0].rounds = 2;
    expect(errorsOf(raw)).toEqual([
      'day-1 › Finisher: kind must be one of warmup, superset, circuit, finisher, cooldown',
      'day-1 › Superset A: unknown field "rset". Did you mean "rest"?',
      'day-1 › block 1: unknown field "rounds".',
      'day-1: missing "title"',
    ]);
  });

  it('collects every error instead of stopping at the first', () => {
    const raw = rawPlan();
    raw.days[0].blocks[1].items[0].exercise = 'b-stance-hindge';
    raw.days[0].blocks[1].items[1].time = 30;
    raw.days[0].blocks[3] = {use: 'cooldown'};
    raw.days.push({...raw.days[0]});
    const errors = errorsOf(raw);
    expect(errors).toContain('day-1 › Superset A › A1: unknown exercise "b-stance-hindge". Did you mean "b-stance-hinge"?');
    expect(errors).toContain('day-1 › Superset A › A2: pick one work type, not reps and time');
    expect(errors).toContain('day-1 › block 4: unknown block "cooldown".');
    expect(errors).toContain('day-1: another day already has the id "day-1"');
  });

  it('resolvePlan throws a PlanError listing every error', () => {
    const raw = rawPlan();
    raw.days[0].blocks[3] = {use: 'warmpu'};
    raw.exercises['cat-camel'].gear = ['kettlebell'];
    try {
      resolvePlan(raw);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(PlanError);
      expect((e as PlanError).errors).toHaveLength(2);
      expect((e as PlanError).message).toMatch(/^test-plan has 2 errors:/);
    }
  });
});

describe('warnings', () => {
  it('flags cues without sentence punctuation, the sign of a YAML comma split', () => {
    const raw = rawPlan();
    raw.exercises['cat-camel'].cues = ['Reach long', 'hips square.', 'Go!'];
    const r = validatePlan(raw);
    expect(r.ok).toBe(true);
    expect(r.warnings).toEqual(['exercises › cat-camel: cue "Reach long" doesn\'t end with . ! or ?, so a comma may have split it. Write cues as a list of quoted strings.']);
  });
});

describe('suggest', () => {
  it('offers the closest key only when it is close', () => {
    expect(suggest('warmpu', ['warmup', 'cooldown'])).toBe('warmup');
    expect(suggest('pilates', ['warmup', 'cooldown'])).toBeUndefined();
  });
});
