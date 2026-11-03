import type {Block, Exercise, Plan} from '../../src/types';
import {makeExercise} from './exercise';

// Day 2 of data/plans/spine-rehab.yaml, resolved by hand (shared blocks expanded, block rest defaults applied).
const ex = (key: string, name: string, gear: string[], cues: string[], say?: string): Exercise =>
  makeExercise(key, name, gear, cues, say, [`exercises/${key}-a.jpg`, `exercises/${key}-b.jpg`]);

const exercises: Record<string, Exercise> = Object.fromEntries([
  ex('cat-camel', 'Cat-camel', ['mat'], ['Small and slow. Mid-range only.', "Don't force the end of the range."]),
  ex('bird-dog', 'McGill bird-dog', ['mat'], ['Reach long, hips square.', 'Make a fist and squeeze the glute.'], 'McGill bird dog'),
  ex('glute-bridge', 'Glute bridge', ['mat'], ['Squeeze the glutes and hold at the top.', "Ribs down. Don't arch your back."]),
  ex('hip-flexor-squeeze', 'Half-kneeling hip flexor squeeze', ['mat'], ['Squeeze the back glute.', 'Feel the front of the hip open.']),
  ex('swiss-ball-ham-curl', 'Swiss ball hamstring curl', ['swiss ball', 'mat'], ['Hips up, heels drive the ball in.', 'Slow on the way out.']),
  ex('db-bulgarian-split-squat', 'DB Bulgarian split squat', ['dumbbells', 'bench'], ['Torso tall, drop straight down.', 'Back foot on the bench, laces down.'], 'dumbbell bulgarian split squat'),
  ex('b-stance-hinge', 'B-stance DB hip hinge', ['dumbbells'], ['Push your hips back.', 'Spine stays locked and neutral.'], 'B stance dumbbell hip hinge'),
  ex('single-leg-glute-bridge', 'Single-leg glute bridge', ['mat'], ['Drive through the heel. Hips stay level.', "Lower slowly. Don't let the hip drop."]),
  ex('stir-the-pot', 'Swiss ball stir-the-pot', ['swiss ball'], ['Small, controlled circles.', 'Hips still. Only the forearms move.'], 'Swiss ball stir the pot'),
  ex('psoas-90-90', '90/90 psoas relief on Swiss ball', ['swiss ball', 'mat'], ['Lower legs on the ball, knees and hips at ninety degrees.', 'Breathe deep into your belly.'], 'ninety ninety psoas relief'),
  ex('sphinx', 'Prone sphinx pose', ['mat'], ['Let your glutes and lower back hang loose.', 'If it pinches, lie flat on your stomach instead.']),
  ex('figure-4', 'Supine figure-4 stretch', ['mat'], ['Ankle over the opposite knee.', 'Gently draw the leg toward your chest.'], 'figure four stretch'),
].map((e) => [e.key, e]));

const blocks: Block[] = [
  {id: 'warmup', name: 'Warm-up', kind: 'warmup', rounds: 1, items: [
    {exercise: 'cat-camel', rx: {kind: 'guided', reps: 8, tempo: 6}, perSide: false, rest: 5},
    {exercise: 'bird-dog', rx: {kind: 'guided', reps: 6, hold: 5}, perSide: true, rest: 5},
    {exercise: 'glute-bridge', rx: {kind: 'guided', reps: 15, hold: 2}, perSide: false, rest: 5},
    {exercise: 'hip-flexor-squeeze', rx: {kind: 'time', seconds: 30}, perSide: true, rest: 5},
  ]},
  {id: 'superset-a', name: 'Superset A', kind: 'superset', rounds: 3, items: [
    {label: 'A1', exercise: 'swiss-ball-ham-curl', rx: {kind: 'reps', reps: '10-12'}, perSide: false, rest: 45},
    {label: 'A2', exercise: 'db-bulgarian-split-squat', rx: {kind: 'reps', reps: '8-10'}, perSide: true, rest: 75},
  ]},
  {id: 'superset-b', name: 'Superset B', kind: 'superset', rounds: 3, items: [
    {label: 'B1', exercise: 'b-stance-hinge', rx: {kind: 'reps', reps: '10'}, perSide: true, rest: 45},
    {label: 'B2', exercise: 'single-leg-glute-bridge', rx: {kind: 'reps', reps: '10'}, perSide: true, rest: 60},
  ]},
  {id: 'spine-rehab-finisher', name: 'Spine rehab finisher', kind: 'finisher', rounds: 3, items: [
    {label: 'C1', exercise: 'stir-the-pot', rx: {kind: 'time', seconds: 30}, perSide: false, rest: 60},
  ]},
  {id: 'cooldown', name: 'Cool-down', kind: 'cooldown', rounds: 1, items: [
    {exercise: 'psoas-90-90', rx: {kind: 'time', seconds: 180}, perSide: false, rest: 5},
    {exercise: 'sphinx', rx: {kind: 'time', seconds: 120}, perSide: false, rest: 5},
    {exercise: 'figure-4', rx: {kind: 'time', seconds: 90}, perSide: true, rest: 5},
  ]},
];

export const day2Plan: Plan = {
  id: 'spine-rehab',
  name: 'Spine Rehab Split',
  summary: 'Four ~60-minute days built around L4–S1 safety. Every day has a spine rehab anchor.',
  equipment: ['dumbbells', 'bench', 'swiss ball'], order: 1, rotate: true, dayLabel: 'Day',
  exercises,
  days: [{
    id: 'day-2',
    title: 'Posterior chain + anti-shear glute strength',
    anchor: 'B-stance DB hip hinge & Swiss ball hamstring curls',
    blocks,
  }],
};

export const day2 = day2Plan.days[0];
