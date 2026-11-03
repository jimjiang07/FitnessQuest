<script setup lang="ts">
// Placeholder for routes whose view hasn't been built yet; names the stream that owns it.
defineProps<{title: string; stream: string}>();
</script>

<template>
  <main class="soon">
    <h1>{{ title }}</h1>
    <p>Being built in {{ stream }}.</p>
    <RouterLink to="/">Back to plan</RouterLink>
  </main>
</template>

<style scoped>
.soon { min-height: 100vh; display: grid; place-content: center; gap: 12px; text-align: center; padding: 24px; }
h1 { font-size: 44px; }
p { color: var(--muted); margin: 0; }
a { color: var(--work); }
</style>
