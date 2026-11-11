<script setup lang="ts">
import {useTrackerStore} from '@/stores/tracker';

const store = useTrackerStore();
</script>

<template>
  <p v-if="store.saveError" class="save-warning" role="alert">
    This browser isn't saving your log (private browsing or storage full). Export a backup from Data.
  </p>
</template>

<style scoped>
.save-warning {
  position: fixed; left: 12px; right: 12px; bottom: calc(var(--tabbar-h) + 8px); z-index: 40; margin: 0;
  padding: 10px 14px; border-radius: 14px; background: #2a2210; border: 1px solid var(--ready); color: var(--ready); font-weight: 700; font-size: 14px;
}
</style>
