<script setup lang="ts">
import {phaseColor, type Phase} from './phase';
import '@/styles/components.css';

withDefaults(defineProps<{
  label?: string;    // "A2", or a rest length like "45s"
  name: string;
  target?: string;   // "8–10 reps each leg"
  image?: string;    // thumb picture; the label then sits on it as a badge
  phase?: Phase;
}>(), {phase: 'work'});
</script>

<template>
  <div class="upnext">
    <div class="thumb">
      <img v-if="image" :src="image" alt="" />
      <span v-if="label" class="fq-big lbl" :class="{badge: image}" :style="{color: phaseColor(phase)}">{{ label }}</span>
    </div>
    <div class="txt">
      <b>{{ name }}</b>
      <span v-if="target" class="fq-mini fq-muted">{{ target }}</span>
    </div>
  </div>
</template>

<style scoped>
.upnext { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 14px; background: var(--surface); border: 1px solid var(--line); min-width: 0; }
.thumb { position: relative; width: 48px; height: 48px; border-radius: 10px; background: var(--surface-2); display: grid; place-items: center; flex: none; overflow: hidden; }
.thumb img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.lbl { font-size: 18px; }
.badge { position: absolute; left: 3px; bottom: 3px; font-size: 12px; padding: 2px 5px 1px; border-radius: 6px; background: rgba(13, 16, 22, .85); }
.txt { display: flex; flex-direction: column; min-width: 0; }
b { font-size: 14px; line-height: 1.25; }
</style>
