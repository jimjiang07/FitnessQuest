import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createPinia, setActivePinia} from 'pinia';
import {SETTINGS_KEY, useSettingsStore} from '../../src/stores/settings';

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {getItem: (k: string) => map.get(k) ?? null, setItem: vi.fn((k: string, v: string) => { map.set(k, v); }), map};
}

beforeEach(() => setActivePinia(createPinia()));
afterEach(() => vi.unstubAllGlobals());

describe('settings store', () => {
  it('defaults to voice and beeps on and no next day', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const s = useSettingsStore();
    expect({voice: s.voice, beeps: s.beeps, nextDayId: s.nextDayId}).toEqual({voice: true, beeps: true, nextDayId: null});
  });

  it('persists every change under one key and loads it back', () => {
    const storage = memoryStorage();
    vi.stubGlobal('localStorage', storage);
    const s = useSettingsStore();
    s.voice = false;
    s.nextDayId = 'day-3';
    expect(JSON.parse(storage.map.get(SETTINGS_KEY)!)).toEqual({voice: false, beeps: true, music: 'off', nextDayId: 'day-3'});
    expect([...storage.map.keys()]).toEqual([SETTINGS_KEY]);

    setActivePinia(createPinia());
    const again = useSettingsStore();
    expect({voice: again.voice, beeps: again.beeps, music: again.music, nextDayId: again.nextDayId}).toEqual({voice: false, beeps: true, music: 'off', nextDayId: 'day-3'});
  });

  it('ignores corrupt or wrongly typed saved data', () => {
    vi.stubGlobal('localStorage', memoryStorage({[SETTINGS_KEY]: '{"voice":"no","beeps":false,"nextDayId":4}'}));
    const s = useSettingsStore();
    expect({voice: s.voice, beeps: s.beeps, nextDayId: s.nextDayId}).toEqual({voice: true, beeps: false, nextDayId: null});
    setActivePinia(createPinia());
    vi.stubGlobal('localStorage', memoryStorage({[SETTINGS_KEY]: '{not json'}));
    expect(useSettingsStore().voice).toBe(true);
  });

  it('survives a localStorage that throws on every call', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('SecurityError'); },
      setItem: () => { throw new Error('QuotaExceededError'); },
    });
    const s = useSettingsStore();
    expect(s.voice).toBe(true);
    expect(() => { s.beeps = false; }).not.toThrow();
    expect(s.beeps).toBe(false);
  });

  it('works with no localStorage at all', () => {
    vi.stubGlobal('localStorage', undefined);
    const s = useSettingsStore();
    s.nextDayId = 'day-2';
    expect(s.nextDayId).toBe('day-2');
  });
});
