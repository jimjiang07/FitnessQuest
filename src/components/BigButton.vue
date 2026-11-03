<script setup lang="ts">
import {phaseColor, phaseInk, type Phase} from './phase';

withDefaults(defineProps<{
  variant?: 'primary' | 'ghost';
  phase?: Phase;        // colour of a primary button
  size?: 'md' | 'lg';   // 56px or 64px tall
  type?: 'button' | 'submit';
  disabled?: boolean;
}>(), {variant: 'primary', phase: 'work', size: 'md', type: 'button', disabled: false});
</script>

<template>
  <button :type="type" class="btn" :class="[variant, size]" :disabled="disabled"
    :style="variant === 'primary' ? {background: phaseColor(phase), color: phaseInk(phase)} : undefined">
    <slot name="icon" />
    <slot />
  </button>
</template>

<style scoped>
.btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: var(--tap-min); padding: 0 20px; border: 0; border-radius: var(--radius-pill); font-weight: 800; font-size: 16px; letter-spacing: .02em; cursor: pointer; touch-action: manipulation; }
.lg { min-height: 64px; font-size: 18px; }
.ghost { background: var(--surface-2); color: var(--fg); }
.btn:active { transform: scale(.98); }
.btn:disabled { opacity: .45; cursor: default; transform: none; }
.btn :slotted(svg) { width: 16px; height: 16px; flex: none; }
</style>
