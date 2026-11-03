<script setup lang="ts">
withDefaults(defineProps<{gear: string[]; label?: string}>(), {label: 'Gear'});
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
</script>

<template>
  <ul v-if="gear.length" class="gear" :aria-label="label">
    <li v-for="g in gear" :key="g" class="chip">{{ cap(g) }}</li>
  </ul>
</template>

<style scoped>
.gear { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
.chip { font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; padding: 5px 10px; border-radius: var(--radius-pill); background: var(--surface-2); color: var(--muted); }
</style>
