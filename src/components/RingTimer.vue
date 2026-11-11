<script setup lang="ts">
import {computed} from 'vue';
import {formatClock, phaseColor, type Phase} from './phase';

const props = withDefaults(defineProps<{
  remainingMs: number;
  totalMs: number;
  phase?: Phase;
  label?: string;   // under the digits; defaults to "of m:ss"
  size?: number;    // px
}>(), {phase: 'work', size: 200});

const R = 44, C = 2 * Math.PI * R;
const fraction = computed(() => (props.totalMs > 0 ? Math.min(1, Math.max(0, props.remainingMs / props.totalMs)) : 0));
const sub = computed(() => props.label ?? `of ${formatClock(props.totalMs)}`);
const digits = computed(() => formatClock(props.remainingMs));
</script>

<template>
  <div class="ring" role="timer" :aria-label="`${digits} left, ${sub}`" :style="{width: `${size}px`, height: `${size}px`}">
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" :r="R" fill="none" stroke="var(--surface-2)" stroke-width="8" />
      <circle class="arc" cx="50" cy="50" :r="R" fill="none" :stroke="phaseColor(phase)" stroke-width="8"
        stroke-linecap="round" :stroke-dasharray="C" :stroke-dashoffset="C * (1 - fraction)" />
    </svg>
    <div class="t" aria-hidden="true">
      <div class="fq-big fq-num" :style="{fontSize: `${Math.round(size * 0.34)}px`}">{{ digits }}</div>
      <div class="fq-mini fq-muted">{{ sub }}</div>
    </div>
  </div>
</template>

<style scoped>
.ring { position: relative; flex: none; max-width: 100%; }
svg { display: block; width: 100%; height: 100%; transform: rotate(-90deg); }
.arc { transition: stroke-dashoffset .25s linear; }
.t { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
@media (prefers-reduced-motion: reduce) { .arc { transition: none; } }
</style>
