<script setup lang="ts">
import {computed} from 'vue';
import {useRoute} from 'vue-router';
import {useLayout} from '@/composables/useLayout';
// icons are lucide-style strokes on a 24px grid; `fold` starts the right half in book layout
const TABS = [
  {id: 'coach', to: '/', label: 'Coach', icon: 'M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z'},
  {id: 'habits', to: '/habits', label: 'Habits', icon: 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18M8 15l2 2 4-4'},
  {id: 'gym', to: '/gym', label: 'Gym', icon: 'M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11', fold: true},
  {id: 'body', to: '/body', label: 'Body', icon: 'M3 12h4l3-8 4 16 3-8h4'},
  {id: 'data', to: '/data', label: 'Data', icon: 'M12 3c4.97 0 9 1.34 9 3s-4.03 3-9 3-9-1.34-9-3 4.03-3 9-3zM3 6v6c0 1.66 4.03 3 9 3s9-1.34 9-3V6M3 12v6c0 1.66 4.03 3 9 3s9-1.34 9-3v-6'},
];

const route = useRoute();
const layout = useLayout();
const active = computed(() => route.meta.tab ?? 'coach');
</script>

<template>
  <nav class="tabbar" :class="layout" aria-label="Sections">
    <RouterLink v-for="t in TABS" :key="t.id" :to="t.to" class="tab" :class="{on: active === t.id, fold: t.fold}"
      :aria-current="active === t.id ? 'page' : undefined">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="t.icon" /></svg>
      <span>{{ t.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.tabbar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 50;
  display: grid; grid-template-columns: repeat(5, minmax(0, 1fr));
  height: var(--tabbar-h); padding: 4px max(8px, env(safe-area-inset-right)) env(safe-area-inset-bottom) max(8px, env(safe-area-inset-left));
  background: rgba(13, 16, 22, .94); border-top: 1px solid var(--line); backdrop-filter: blur(10px);
}
/* book: Coach and Habits on the left, Gym, Body and Data on the right, nothing on the hinge */
.book { grid-template-columns: repeat(2, minmax(0, 1fr)) var(--fold-gutter) repeat(3, minmax(0, 1fr)); }
.book .fold { grid-column: 4; }
.tab {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; min-height: 52px;
  color: var(--muted); text-decoration: none; font-size: 11.5px; font-weight: 700; border-radius: 14px;
}
.tab svg { width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.tab.on { color: var(--rest); }
.tab.on svg { filter: drop-shadow(0 0 6px rgba(39, 196, 176, .5)); }
</style>
