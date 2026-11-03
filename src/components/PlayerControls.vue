<script setup lang="ts">
withDefaults(defineProps<{paused: boolean; canPrevious?: boolean; canNext?: boolean}>(), {canPrevious: true, canNext: true});
const emit = defineEmits<{previous: []; toggle: []; next: []}>();
</script>

<template>
  <!-- .stop: these taps mustn't reach the screen's tap-to-pause handler -->
  <div class="controls" role="group" aria-label="Playback">
    <button type="button" class="icon" aria-label="Previous" :disabled="!canPrevious" @click.stop="emit('previous')">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 5v14L8 12zM6 5h2v14H6z" /></svg>
    </button>
    <button type="button" class="icon play" :aria-label="paused ? 'Resume' : 'Pause'" @click.stop="emit('toggle')">
      <svg v-if="paused" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4v16l13-8z" /></svg>
      <svg v-else viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /></svg>
    </button>
    <button type="button" class="icon" aria-label="Next" :disabled="!canNext" @click.stop="emit('next')">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5v14l10-7zM16 5h2v14h-2z" /></svg>
    </button>
  </div>
</template>

<style scoped>
.controls { display: flex; align-items: center; justify-content: center; gap: 20px; }
.icon { width: var(--tap-min); height: var(--tap-min); border-radius: 50%; border: 0; padding: 0; background: var(--surface-2); color: var(--fg); display: grid; place-items: center; cursor: pointer; touch-action: manipulation; flex: none; }
.icon svg { width: 20px; height: 20px; }
.play { width: 72px; height: 72px; background: var(--fg); color: var(--bg); }
.play svg { width: 26px; height: 26px; }
.icon:disabled { opacity: .35; cursor: default; }
.icon:active:not(:disabled) { transform: scale(.95); }
</style>
