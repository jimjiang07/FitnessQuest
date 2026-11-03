import {describe, expect, it} from 'vitest';
import {coach, getDay, pictures, planForDay, plans} from '../../src/plan';

describe('src/plan/index', () => {
  it('loads every plan in data/plans with pictures from public/exercises', () => {
    expect(plans.map((p) => p.id)).toContain('spine-rehab');
    expect(pictures).toContain('bird-dog-a.jpg');
    expect(pictures).not.toContain('CREDITS.md');
    expect(plans[0].exercises['bird-dog'].images).toEqual(['exercises/bird-dog-a.jpg', 'exercises/bird-dog-b.jpg']);
  });

  it('validates data/coach.yaml', () => {
    expect(coach.timing.secondsPerRep).toBe(3);
    expect(coach.lines.go.length).toBeGreaterThan(0);
  });

  it('finds a day and its plan by id', () => {
    expect(getDay('day-2')?.title).toMatch(/Posterior chain/);
    expect(planForDay('day-2')?.id).toBe('spine-rehab');
    expect(getDay('day-9')).toBeUndefined();
  });
});
