<script setup lang="ts">
import type {Phase} from './phase';

// A full-screen player surface tinted by phase; 'done' is the warm finish glow, 'none' plain.
withDefaults(defineProps<{phase?: Phase | 'done' | 'none'; fill?: boolean}>(), {phase: 'none', fill: true});
</script>

<template>
  <div class="screen" :class="[phase, {fill}]"><slot /></div>
</template>

<style scoped>
/* symmetric inline padding (the larger safe-area inset on both sides) keeps the halves split exactly at the fold */
.screen {
  --pad-x: max(22px, env(safe-area-inset-left, 0px), env(safe-area-inset-right, 0px));
  position: relative; display: flex; flex-direction: column; gap: 12px; min-width: 0; overflow: hidden;
  padding: max(16px, env(safe-area-inset-top, 0px)) var(--pad-x) max(16px, env(safe-area-inset-bottom, 0px));
  background: var(--bg); color: var(--fg);
}
.fill { height: calc(100vh - var(--tabbar-h, 0px)); height: calc(100dvh - var(--tabbar-h, 0px)); }
.work { background: radial-gradient(120% 60% at 50% 0%, rgba(255, 92, 57, .22), transparent 60%), var(--bg); }
.rest { background: radial-gradient(120% 60% at 50% 0%, rgba(39, 196, 176, .22), transparent 60%), var(--bg); }
.ready { background: radial-gradient(120% 70% at 50% 30%, rgba(255, 182, 39, .25), transparent 60%), var(--bg); }
.cool { background: radial-gradient(120% 60% at 50% 0%, rgba(157, 140, 255, .22), transparent 60%), var(--bg); }
.done { background: radial-gradient(120% 70% at 50% 20%, rgba(255, 92, 57, .28), transparent 60%), var(--bg); }
</style>
