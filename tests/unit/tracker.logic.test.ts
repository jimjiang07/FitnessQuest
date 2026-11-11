import {describe, expect, it} from 'vitest';
import type {StrengthSession, TrackerActivity} from '../../src/types';
import {addDays, bestWeights, formatDate, isIsoDate, mondayOf, parseNumber, previousSets, sanitize, streaks, today, weekNumber, weekSummary, weeksToShow} from '../../src/tracker/logic';
import {parseTracker, tracker} from '../../src/tracker/config';

const acts: TrackerActivity[] = [
  {id: 'strength', label: 'Gym', short: 'Gym', color: 'work', counts: true},
  {id: 'swim', label: 'Swim', short: 'Swim', color: 'rest', counts: true},
  {id: 'rest', label: 'Rest', short: 'Rest', color: 'muted', counts: false},
];

describe('tracker dates', () => {
  it('uses the local calendar day and whole days across daylight saving', () => {
    expect(today(new Date(2026, 10, 11, 23, 59))).toBe('2026-11-11');
    expect(addDays('2026-10-03', 2)).toBe('2026-10-05');   // Sydney DST starts 4 Oct
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('finds the Monday of a week and numbers weeks from the start', () => {
    expect(mondayOf('2026-11-11')).toBe('2026-11-09');
    expect(mondayOf('2026-11-15')).toBe('2026-11-09');    // Sunday belongs to the week before
    expect(mondayOf('2026-11-09')).toBe('2026-11-09');
    expect(weekNumber('2026-11-09', '2026-11-09')).toBe(1);
    expect(weekNumber('2026-11-09', '2026-11-16')).toBe(2);
    expect(weekNumber('2026-11-09', '2026-11-08')).toBe(0);
    expect(weeksToShow('2026-11-09', '2026-11-11', 52)).toBe(52);
    expect(weeksToShow('2025-01-06', '2026-11-11', 52)).toBe(97);
  });
  it('rejects impossible dates', () => {
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('2026-2-3')).toBe(false);
    expect(isIsoDate('2026-02-28')).toBe(true);
  });
});

describe('weekly goal', () => {
  it('counts training days but not rest days', () => {
    const habits = {'2026-11-09': 'strength', '2026-11-10': 'rest', '2026-11-11': 'swim', '2026-11-16': 'strength'};
    const w = weekSummary('2026-11-09', 1, habits, acts, 3);
    expect(w.dates).toHaveLength(7);
    expect(w.dates[6]).toBe('2026-11-15');
    expect(w).toMatchObject({sessions: 2, achieved: false});
    expect(weekSummary('2026-11-09', 1, {...habits, '2026-11-12': 'strength'}, acts, 3).achieved).toBe(true);
  });
  it('counts the current streak from last week while this week is in progress, and the best run', () => {
    const w = (...a: boolean[]) => a.map((achieved, i) => ({week: i + 1, dates: [], sessions: 0, achieved}));
    expect(streaks(w(true, false, true, true, false))).toEqual({current: 2, best: 2});
    expect(streaks(w(true, true, true))).toEqual({current: 3, best: 3});
    expect(streaks(w(false))).toEqual({current: 0, best: 0});
    expect(streaks([])).toEqual({current: 0, best: 0});
  });
});

describe('strength history', () => {
  const s = (id: string, date: string, weight: number | null, routine: 'upper' | 'lower' = 'upper'): StrengthSession =>
    ({id, routine, date, sets: {row: [{weight, reps: 10, rpe: 7}]}});
  it('finds the latest earlier session that logged the exercise', () => {
    const list = [s('a', '2026-11-01', 30), s('b', '2026-11-04', null), s('c', '2026-11-04', 35, 'lower'), s('d', '2026-11-08', 40)];
    // b logged reps only, which still counts as logged
    expect(previousSets(list, 'upper', 'row', {id: 'd', date: '2026-11-08'})).toEqual([{weight: null, reps: 10, rpe: 7}]);
    expect(previousSets(list, 'upper', 'row', {id: 'b', date: '2026-11-04'})?.[0].weight).toBe(30);
    expect(previousSets(list, 'upper', 'row', {id: 'a', date: '2026-11-01'})).toBeNull();
    expect(bestWeights(list)).toEqual({row: 40});
  });
});

describe('formatting and parsing', () => {
  it('formats dates the same way on every screen', () => {
    expect(formatDate('2026-11-09')).toBe('9 Nov');
    expect(formatDate('2026-11-09', 'day')).toBe('Mon 9 Nov');
    expect(formatDate('2026-03-02', 'long')).toBe('Monday 2 March 2026');
  });
  it('parses typed numbers, including a decimal comma', () => {
    expect(parseNumber(' 42,5 ')).toBe(42.5);
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeUndefined();
    expect(parseNumber('7.5', {integer: true})).toBeUndefined();
    expect(parseNumber('11', {min: 1, max: 10})).toBeUndefined();
  });
});

describe('sanitize', () => {
  it('keeps valid data and drops the rest', () => {
    const d = sanitize({
      version: 1, startDate: '2026-11-11',
      habits: {'2026-11-10': 'swim', bad: 'x', '2026-11-12': ''},
      sessions: [{id: 'a', routine: 'upper', date: '2026-11-10', sets: {row: [{weight: 40, reps: '10', rpe: 11}]}},
        {id: 'b', routine: 'legs', date: '2026-11-10'}],
      body: [{id: 'x', date: '2026-11-10', weight: 82.5, waist: -1, lumbar: 3.6, neck: 'a', notes: 5}],
    }, '2026-11-11');
    expect(d.startDate).toBe('2026-11-09');
    expect(d.habits).toEqual({'2026-11-10': 'swim'});
    expect(d.sessions).toEqual([{id: 'a', routine: 'upper', date: '2026-11-10', sets: {row: [{weight: 40, reps: null, rpe: null}]}}]);
    expect(d.body).toEqual([{id: 'x', date: '2026-11-10', weight: 82.5, waist: null, lumbar: 4, neck: 0, notes: ''}]);
  });
  it('starts fresh from garbage', () => {
    expect(sanitize('nope', '2026-11-11')).toEqual({version: 1, startDate: '2026-11-09', habits: {}, sessions: [], body: []});
  });
});

describe('tracker.yaml', () => {
  it('loads both routines with unique exercise keys and a rest activity that does not count', () => {
    expect(tracker.routines.map(r => r.id)).toEqual(['upper', 'lower']);
    for (const r of tracker.routines) expect(new Set(r.exercises.map(e => e.key)).size).toBe(r.exercises.length);
    expect(tracker.activities.find(a => a.id === 'rest')?.counts).toBe(false);
    expect(tracker.activities.find(a => a.id === 'strength')?.counts).toBe(true);
  });
  it('rejects unknown fields', () => {
    expect(() => parseTracker({...tracker, extra: 1})).toThrow(/tracker.yaml/);
  });
});
