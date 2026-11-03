<script setup lang="ts">
import {phaseColor, type Phase} from './phase';

// one segment per block (or step); done ones are filled, the current one partly
const props = withDefaults(defineProps<{
  segments: Phase[];
  current: number;
  progress?: number;   // 0..1 through the current segment
}>(), {progress: 0});

function fill(i: number, phase: Phase): string | undefined {
  if (i < props.current) return phaseColor(phase);
  if (i > props.current) return undefined;
  const pct = Math.round(Math.min(1, Math.max(0, props.progress)) * 100);
  return `linear-gradient(90deg, ${phaseColor(phase)} ${pct}%, var(--surface-2) ${pct}%)`;
}
</script>

<template>
  <div class="seg" role="progressbar" :aria-valuemin="0" :aria-valuemax="segments.length"
    :aria-valuenow="Math.min(segments.length, current + progress)" aria-label="Workout progress">
    <i v-for="(p, i) in segments" :key="i" :style="{background: fill(i, p)}" />
  </div>
</template>

<style scoped>
.seg { display: flex; gap: 3px; width: 100%; }
i { flex: 1; height: 5px; border-radius: 3px; background: var(--surface-2); }
</style>
