<script setup lang="ts">
import {formatClock, phaseColor, type TimelineItem} from './phase';

withDefaults(defineProps<{items: TimelineItem[]; dense?: boolean}>(), {dense: false});
</script>

<template>
  <ol class="tl" :class="{dense}">
    <li v-for="(it, i) in items" :key="i" class="tl-item" :class="it.state">
      <span class="bar" :style="{background: phaseColor(it.phase)}" aria-hidden="true" />
      <span class="txt">
        <b>{{ it.name }}</b>
        <span v-if="it.detail && !dense" class="detail">{{ it.detail }}</span>
      </span>
      <em v-if="it.state === 'done'" class="mark" :style="{color: 'var(--rest)'}">✓</em>
      <em v-else-if="it.state === 'now'" class="mark" :style="{color: phaseColor(it.phase)}">now</em>
      <em v-else-if="it.seconds != null">{{ formatClock(it.seconds * 1000) }}</em>
    </li>
  </ol>
</template>

<style scoped>
.tl { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.tl-item { display: grid; grid-template-columns: 14px 1fr auto; gap: 10px; align-items: start; padding: 5px 0; }
.bar { width: 4px; height: 30px; border-radius: 2px; margin: 3px auto 0; }
.dense .bar { height: 18px; margin-top: 1px; }
.dense .tl-item { padding: 3px 0; }
.txt { min-width: 0; }
b { display: block; font-size: 14px; line-height: 1.25; }
.now b { color: var(--fg); }
.done b { color: var(--muted); }
.detail { display: block; font-size: 12px; color: var(--muted); line-height: 1.35; }
em { font-style: normal; font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; padding-top: 2px; }
.mark { font-weight: 800; }
</style>
