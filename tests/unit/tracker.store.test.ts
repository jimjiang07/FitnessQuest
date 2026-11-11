import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createPinia, setActivePinia} from 'pinia';
import {TRACKER_KEY, useTrackerStore} from '../../src/stores/tracker';
import {today} from '../../src/tracker/logic';

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {getItem: (k: string) => map.get(k) ?? null, setItem: vi.fn((k: string, v: string) => { map.set(k, v); }), map};
}

beforeEach(() => setActivePinia(createPinia()));
afterEach(() => vi.unstubAllGlobals());

describe('tracker store', () => {
  it('logs a session dated today, marks the habit, and persists', () => {
    const storage = memoryStorage();
    vi.stubGlobal('localStorage', storage);
    const t = useTrackerStore();
    const s = t.addSession('upper');
    expect(s.date).toBe(today());
    expect(Object.keys(s.sets)).toContain('machine-row');
    expect(t.data.habits[today()]).toBe('strength');
    t.updateSet(s.id, 'machine-row', 0, {weight: 40, reps: 10, rpe: 7});
    t.addSet(s.id, 'machine-row');
    expect(s.sets['machine-row'][1]).toEqual({weight: 40, reps: 10, rpe: null});
    t.removeSet(s.id, 'machine-row', 1);
    t.removeSet(s.id, 'machine-row', 0);   // the last set stays
    expect(s.sets['machine-row']).toHaveLength(1);

    expect(storage.setItem).not.toHaveBeenCalled();   // saves are batched
    t.flushNow();
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    setActivePinia(createPinia());
    const again = useTrackerStore();
    expect(again.sessionsFor('upper')[0].sets['machine-row'][0].weight).toBe(40);
    expect(JSON.parse(storage.map.get(TRACKER_KEY)!).version).toBe(1);
  });

  it("doesn't overwrite a habit already logged that day", () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const t = useTrackerStore();
    t.setHabit(today(), 'swim');
    t.addSession('lower');
    expect(t.data.habits[today()]).toBe('swim');
    t.setHabit(today(), null);
    expect(t.data.habits[today()]).toBeUndefined();
  });

  it('copies the previous session without its RPE', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const t = useTrackerStore();
    const first = t.addSession('lower', '2026-11-01');
    t.updateSet(first.id, 'leg-press', 0, {weight: 80, reps: 12, rpe: 6});
    const second = t.addSession('lower', '2026-11-05');
    expect(t.previous(second, 'leg-press')).toEqual([{weight: 80, reps: 12, rpe: 6}]);
    t.copyPrevious(second.id, 'leg-press');
    expect(second.sets['leg-press']).toEqual([{weight: 80, reps: 12, rpe: null}]);
    expect(t.sessionsFor('lower').map(s => s.id)).toEqual([second.id, first.id]);
  });

  it('exports, clears and imports back; rejects files that are not tracker data', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const t = useTrackerStore();
    t.addBody({date: '2026-11-10', weight: 82, waist: 95, lumbar: 2, neck: 3, notes: 'ok'});
    const backup = t.exportJson();
    t.clearAll();
    expect(t.bodyEntries).toHaveLength(0);
    expect(t.importJson('{"hello":1}')).toBe(false);
    expect(t.importJson('not json')).toBe(false);
    expect(t.importJson(backup)).toBe(true);
    expect(t.bodyEntries[0]).toMatchObject({waist: 95, notes: 'ok'});
  });

  it('starts empty when storage is blocked and flags that saving failed', () => {
    vi.stubGlobal('localStorage', {getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }});
    const t = useTrackerStore();
    expect(t.data.sessions).toEqual([]);
    t.setHabit('2026-11-10', 'swim');
    t.flushNow();
    expect(t.saveError).toBe(true);
  });
});
