<script setup lang="ts">
import {phaseColor, type Phase} from './phase';

withDefaults(defineProps<{text: string; phase?: Phase; speaking?: boolean}>(), {phase: 'work', speaking: false});
</script>

<template>
  <div class="cue" :class="{live: speaking}" :style="{color: phaseColor(phase)}" aria-live="polite">
    <span class="wave" aria-hidden="true"><i style="height:6px" /><i style="height:14px" /><i style="height:9px" /><i style="height:12px" /></span>
    <span class="line">“{{ text }}”</span>
  </div>
</template>

<style scoped>
.cue { display: flex; gap: 10px; align-items: flex-start; background: var(--surface); border-radius: 14px; padding: 12px 14px; font-size: 14px; line-height: 1.4; }
.wave { display: flex; gap: 2px; align-items: center; height: 18px; flex: none; }
.wave i { width: 3px; border-radius: 2px; background: currentColor; opacity: .5; }
.live .wave i { opacity: 1; }
.line { color: var(--fg); min-width: 0; }
@media (prefers-reduced-motion: no-preference) {
  .live .wave i { animation: wave 1s ease-in-out infinite alternate; }
  .live .wave i:nth-child(2) { animation-delay: .2s; }
  .live .wave i:nth-child(3) { animation-delay: .4s; }
  .live .wave i:nth-child(4) { animation-delay: .1s; }
}
@keyframes wave { from { transform: scaleY(.4); } to { transform: scaleY(1); } }
</style>
