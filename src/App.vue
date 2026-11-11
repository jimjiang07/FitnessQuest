<script setup lang="ts">
import {computed} from 'vue';
import {useRoute} from 'vue-router';
import TabBar from '@/components/TabBar.vue';

const route = useRoute();
// the workout itself, its finish screen and the component gallery stay full screen
const showTabs = computed(() => !/^\/(play|done|kit)\b/.test(route.path));
</script>

<template>
  <div class="shell" :class="{tabs: showTabs}">
    <RouterView />
    <TabBar v-if="showTabs" />
  </div>
</template>

<style>
.shell { --tabbar-h: 0px; min-height: 100%; }
.shell.tabs { --tabbar-h: calc(62px + env(safe-area-inset-bottom, 0px)); padding-bottom: var(--tabbar-h); }
</style>
