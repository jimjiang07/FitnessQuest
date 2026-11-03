import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {parse} from 'yaml';

// Foundation smoke test; Stream A replaces it with schema validation of every plan.
describe('plan data', () => {
  const plan = parse(readFileSync('data/plans/spine-rehab.yaml', 'utf8'));

  it('has four days that each start with the warm-up and end with the cool-down', () => {
    expect(plan.days).toHaveLength(4);
    for (const d of plan.days) {
      expect(d.blocks[0]).toEqual({use: 'warmup'});
      expect(d.blocks.at(-1)).toEqual({use: 'cooldown'});
    }
  });

  it('only references exercises that exist and gear that is owned', () => {
    const items = [...Object.values(plan.blocks), ...plan.days.flatMap((d: any) => d.blocks)].flatMap((b: any) => b.items ?? []);
    for (const it of items) expect(plan.exercises, it.exercise).toHaveProperty(it.exercise);
    const owned = new Set([...plan.equipment, 'mat']);
    for (const [k, e] of Object.entries<any>(plan.exercises)) for (const g of e.gear) expect(owned.has(g), `${k} needs ${g}`).toBe(true);
  });
});
