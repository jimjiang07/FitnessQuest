import type {Plan} from '../../src/types';
import {makeExercise as ex} from './exercise';

// Small made-up plan that hits every case: time, reps (with unit), guided hold, guided tempo, perSide with and
// without restBetweenSides, rest 0, several rounds, transitions, and a rest on the last item (dropped).

export const synthetic: Plan = {
  id: 'synthetic',
  name: 'Synthetic',
  summary: 'Test plan',
  equipment: ['dumbbells'], order: 1, rotate: true, dayLabel: 'Day',
  exercises: {
    march: ex('march', 'March', ['mat'], ['Knees high']),
    'bird-dog': ex('bird-dog', 'Bird-dog', ['mat'], ['Reach long.'], 'bird dog'),
    'db-press': ex('db-press', 'DB press', ['dumbbells'], ['Press straight up.']),
    lunge: ex('lunge', 'Reverse lunge', ['dumbbells'], ['Torso tall.'], 'back lunge'),
    'cat-camel': ex('cat-camel', 'Cat-camel', ['mat'], ['Small and slow.']),
  },
  days: [{
    id: 'day-9',
    title: 'Synthetic day',
    blocks: [
      {id: 'warmup', name: 'Warm-up', kind: 'warmup', rounds: 1, items: [
        {exercise: 'march', rx: {kind: 'time', seconds: 30}, perSide: false, rest: 10},
        {exercise: 'bird-dog', rx: {kind: 'guided', reps: 2, hold: 3}, perSide: true, rest: 0},
      ]},
      {id: 'superset-a', name: 'Superset A', kind: 'superset', rounds: 2, items: [
        {label: 'A1', exercise: 'db-press', rx: {kind: 'reps', reps: '8-10'}, perSide: false, rest: 30},
        {label: 'A2', exercise: 'lunge', rx: {kind: 'reps', reps: '10', unit: 'each leg'}, perSide: true,
          restBetweenSides: 15, rest: 20},
      ]},
      {id: 'cooldown', name: 'Cool-down', kind: 'cooldown', rounds: 1, items: [
        {exercise: 'cat-camel', rx: {kind: 'guided', reps: 3, tempo: 4}, perSide: false, rest: 10},
      ]},
    ],
  }],
};

export const syntheticDay = synthetic.days[0];
