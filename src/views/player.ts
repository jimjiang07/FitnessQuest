// The only way views reach the player and settings, so the stores can change without touching screens.
import type {PlayerApi, Settings} from '@/types';
import {usePlayerStore} from '@/stores/player';
import {useSettingsStore} from '@/stores/settings';

/** Voice, beeps and next day; the player forwards voice/beeps changes to the voice itself. */
export function useSettingsApi(): Settings {
  return useSettingsStore();
}

/** Read state off the returned store (api.step), never destructure it. */
export function usePlayerApi(): PlayerApi {
  return usePlayerStore();
}
