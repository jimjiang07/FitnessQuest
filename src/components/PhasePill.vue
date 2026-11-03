<script setup lang="ts">
import {phaseColor, phaseInk, type Phase} from './phase';

// no phase = the quiet grey pill ("A2 next")
defineProps<{phase?: Phase}>();
</script>

<template>
  <span class="pill" :style="phase ? {background: phaseColor(phase), color: phaseInk(phase)} : undefined"><slot /></span>
</template>

<style scoped>
.pill { display: inline-flex; align-items: center; align-self: flex-start; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; padding: 5px 10px; border-radius: var(--radius-pill); background: var(--surface-2); color: var(--muted); white-space: nowrap; }
</style>
