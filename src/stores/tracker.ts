/* Everything you log at the gym. Lives only in this browser's localStorage; Export is the backup. */
import {defineStore} from 'pinia';
import {computed, ref, watch} from 'vue';
import type {BodyEntry, RoutineId, SetEntry, StrengthSession, TrackerData} from '@/types';
import {routine, tracker} from '@/tracker/config';
import {bestWeights, emptyData, emptySet, mondayOf, newestFirst, newId, previousSets, sanitize, today, weekNumber, weekSummary} from '@/tracker/logic';

export const TRACKER_KEY = 'fitness-quest:tracker';

function load(): TrackerData {
  try {
    const raw = (globalThis as any).localStorage?.getItem(TRACKER_KEY);
    return raw ? sanitize(JSON.parse(raw)) : emptyData();
  } catch { return emptyData(); }
}

export const useTrackerStore = defineStore('tracker', () => {
  const data = ref<TrackerData>(load());
  const saveError = ref(false);   // the screens can warn that this browser isn't keeping data

  // typing a set shouldn't re-serialise years of history per keystroke: save once things go quiet, or when the app hides
  let pending: ReturnType<typeof setTimeout> | undefined;
  function save() {
    clearTimeout(pending);
    pending = undefined;
    try { (globalThis as any).localStorage?.setItem(TRACKER_KEY, JSON.stringify(data.value)); saveError.value = false; }
    catch { saveError.value = true; }
  }
  watch(data, () => { clearTimeout(pending); pending = setTimeout(save, 400); }, {deep: true});
  const flushNow = () => save();
  globalThis.addEventListener?.('pagehide', flushNow);
  globalThis.document?.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });

  // ── habits ──
  const setHabit = (date: string, activityId: string | null) => {
    if (activityId) data.value.habits[date] = activityId;
    else delete data.value.habits[date];
  };
  const week = (n: number) => weekSummary(data.value.startDate, n, data.value.habits, tracker.activities, tracker.weeklyTarget);
  const currentWeek = computed(() => weekNumber(data.value.startDate, today()));
  const setStartDate = (iso: string) => { data.value.startDate = mondayOf(iso); };

  // ── strength sessions ──
  const sessionsFor = (r: RoutineId) => newestFirst(data.value.sessions.filter(s => s.routine === r));
  const session = (id: string) => data.value.sessions.find(s => s.id === id);

  // also marks the day as a gym day if nothing else is logged
  function addSession(r: RoutineId, date = today()): StrengthSession {
    const exercises = routine(r)?.exercises ?? [];
    const s: StrengthSession = {id: newId(), routine: r, date, sets: Object.fromEntries(exercises.map(e => [e.key, [emptySet()]]))};
    data.value.sessions.push(s);
    if (!data.value.habits[date]) data.value.habits[date] = 'strength';
    return session(s.id)!;   // the reactive copy
  }
  const deleteSession = (id: string) => { data.value.sessions = data.value.sessions.filter(s => s.id !== id); };
  const setSessionDate = (id: string, date: string) => { const s = session(id); if (s) s.date = date; };

  function updateSet(id: string, key: string, index: number, patch: Partial<SetEntry>) {
    const set = session(id)?.sets[key]?.[index];
    if (set) Object.assign(set, patch);
  }
  function addSet(id: string, key: string) {
    const s = session(id);
    if (!s) return;
    const sets = (s.sets[key] ??= []);
    const last = sets.at(-1);
    sets.push(last ? {weight: last.weight, reps: last.reps, rpe: null} : emptySet());  // next set usually repeats the weight
  }
  function removeSet(id: string, key: string, index: number) {
    const sets = session(id)?.sets[key];
    if (sets && sets.length > 1) sets.splice(index, 1);
  }
  /** Copies last session's sets for one exercise into this one (RPE left for you to rate). */
  function copyPrevious(id: string, key: string) {
    const s = session(id);
    const prev = s && previousSets(data.value.sessions, s.routine, key, s);
    if (s && prev) s.sets[key] = prev.map(p => ({weight: p.weight, reps: p.reps, rpe: null}));
  }
  const previous = (s: StrengthSession, key: string) => previousSets(data.value.sessions, s.routine, key, s);
  const best = computed(() => bestWeights(data.value.sessions));

  // ── body journal ──
  const bodyEntries = computed(() => newestFirst(data.value.body));
  function addBody(entry: Omit<BodyEntry, 'id'>): BodyEntry {
    const b = {...entry, id: newId()};
    data.value.body.push(b);
    return b;
  }
  const updateBody = (id: string, patch: Partial<Omit<BodyEntry, 'id'>>) => {
    const b = data.value.body.find(x => x.id === id);
    if (b) Object.assign(b, patch);
  };
  const deleteBody = (id: string) => { data.value.body = data.value.body.filter(b => b.id !== id); };

  // ── backup ──
  const exportJson = () => JSON.stringify(data.value, null, 2);
  /** Replaces everything with the file's contents; returns false if it isn't tracker data. */
  function importJson(text: string): boolean {
    try {
      const raw = JSON.parse(text);
      if (!raw || typeof raw !== 'object' || raw.version !== 1) return false;
      data.value = sanitize(raw);
      return true;
    } catch { return false; }
  }
  const clearAll = () => { data.value = emptyData(); };

  return {
    data, saveError, setHabit, week, currentWeek, setStartDate,
    sessionsFor, addSession, deleteSession, setSessionDate, updateSet, addSet, removeSet, copyPrevious, previous, best, flushNow,
    bodyEntries, addBody, updateBody, deleteBody, exportJson, importJson, clearAll,
  };
});
