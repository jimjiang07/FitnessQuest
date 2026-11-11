<script setup lang="ts">
import {computed} from 'vue';
import {useRoute} from 'vue-router';
import TabBar from '@/components/TabBar.vue';
import SaveWarning from '@/components/tracker/SaveWarning.vue';

const route = useRoute();
const showTabs = computed(() => !route.meta.fullscreen);
const tracking = computed(() => !!route.meta.tab && route.meta.tab !== 'coach');
</script>

<template>
  <div class="shell" :class="{tabs: showTabs}">
    <RouterView />
    <SaveWarning v-if="tracking" />
    <TabBar v-if="showTabs" />
  </div>
</template>

<style>
.shell { --tabbar-h: 0px; --view-h: calc(100dvh - var(--tabbar-h)); min-height: 100%; }
.shell.tabs { --tabbar-h: calc(62px + env(safe-area-inset-bottom, 0px)); padding-bottom: var(--tabbar-h); }
</style>
