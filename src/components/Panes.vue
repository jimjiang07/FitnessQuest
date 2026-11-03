<script setup lang="ts">
import {computed} from 'vue';
import type {Layout} from '@/types';
import {useLayout} from '@/composables/useLayout';

// Two halves split at the fold. Centred on the screen only when Panes spans the viewport with symmetric
// padding (PhaseScreen gives you that).
const props = defineProps<{layout?: Layout}>();
const live = useLayout();
const current = computed(() => props.layout ?? live.value);
</script>

<template>
  <div class="panes" :class="current" :data-layout="current">
    <div class="pane now"><slot name="now" /></div>
    <div class="pane context"><slot name="context" /></div>
  </div>
</template>

<style scoped>
.panes { display: flex; flex-direction: column; gap: 14px; flex: 1; min-height: 0; min-width: 0; }
.book { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); column-gap: var(--fold-gutter); }
.tabletop { display: grid; grid-template-rows: minmax(0, 1fr) minmax(0, 1fr); row-gap: var(--fold-gutter); }
.pane { position: relative; display: flex; flex-direction: column; gap: 10px; min-width: 0; min-height: 0; }
.tabletop .pane { justify-content: center; }
/* single column: the "now" half takes the spare height so its picture or timer can grow */
.compact .now, .shortWide .now { flex: 1 1 auto; }
</style>
