/* The only things the app remembers: voice and beeps on/off, music mode, and which day is next. */
import {defineStore} from 'pinia';
import {ref, watch} from 'vue';
import type {MusicMode, Settings} from '@/types';

export const SETTINGS_KEY = 'fitness-quest:settings';

export const defaultSettings = (): Settings => ({voice: true, beeps: true, music: 'off', nextDayId: null});
const MUSIC_MODES: MusicMode[] = ['off', 'duck', 'mix'];

// storage can throw on access (private mode, blocked site data), so every touch is guarded
function load(): Settings {
  const d = defaultSettings();
  try {
    const raw = (globalThis as any).localStorage?.getItem(SETTINGS_KEY);
    if (!raw) return d;
    const p = JSON.parse(raw);
    return {
      voice: typeof p?.voice === 'boolean' ? p.voice : d.voice,
      beeps: typeof p?.beeps === 'boolean' ? p.beeps : d.beeps,
      music: MUSIC_MODES.includes(p?.music) ? p.music : d.music,
      nextDayId: typeof p?.nextDayId === 'string' ? p.nextDayId : d.nextDayId,
    };
  } catch {
    return d;
  }
}

function save(s: Settings): void {
  try {
    (globalThis as any).localStorage?.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch { /* not saved this time; the app still works */ }
}

export const useSettingsStore = defineStore('settings', () => {
  const initial = load();
  const voice = ref(initial.voice);
  const beeps = ref(initial.beeps);
  const music = ref<MusicMode>(initial.music);
  const nextDayId = ref<string | null>(initial.nextDayId);

  watch([voice, beeps, music, nextDayId],
    () => save({voice: voice.value, beeps: beeps.value, music: music.value, nextDayId: nextDayId.value}), {flush: 'sync'});

  return {voice, beeps, music, nextDayId};
});
