<script setup lang="ts">
import {phaseColor, phaseInk, type Phase} from './phase';

// rows are walked round by round (A1, A2, A1, A2…), so "done" is everything before current in that order
const props = withDefaults(defineProps<{
  rows: string[];                               // item labels: A1, A2
  rounds: number;
  current: {row: number; round: number} | null; // row 0-based, round 1-based; null = not started
  complete?: boolean;
  phase?: Phase;
}>(), {complete: false, phase: 'work'});

function state(row: number, round: number): 'done' | 'now' | 'todo' {
  if (props.complete) return 'done';
  const c = props.current;
  if (!c) return 'todo';
  if (round < c.round || (round === c.round && row < c.row)) return 'done';
  return round === c.round && row === c.row ? 'now' : 'todo';
}
</script>

<template>
  <div class="rounds" :style="{gridTemplateColumns: `auto repeat(${rounds}, 1fr)`}" role="table" aria-label="Rounds">
    <div class="r" role="row">
      <span role="columnheader" />
      <span v-for="n in rounds" :key="n" class="h fq-mini fq-muted" role="columnheader">{{ n }}</span>
    </div>
    <div v-for="(label, row) in rows" :key="label" class="r" role="row">
      <b role="rowheader">{{ label }}</b>
      <span v-for="n in rounds" :key="n" role="cell" class="c" :class="state(row, n)"
        :style="state(row, n) === 'now' ? {background: phaseColor(phase), color: phaseInk(phase)} : undefined">
        <template v-if="state(row, n) === 'done'">✓<span class="fq-sr"> done</span></template>
        <template v-else-if="state(row, n) === 'now'">now</template>
        <template v-else>·<span class="fq-sr"> to do</span></template>
      </span>
    </div>
  </div>
</template>

<style scoped>
.rounds { display: grid; gap: 6px; align-items: center; font-size: 13px; }
.r { display: contents; }
.h { text-align: center; }
b { padding-right: 4px; }
.c { height: 30px; border-radius: 8px; background: var(--surface-2); display: grid; place-items: center; font-weight: 800; font-size: 12px; color: var(--muted); }
.c.done { background: rgba(39, 196, 176, .18); color: var(--rest); }
</style>
