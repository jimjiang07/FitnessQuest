<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref} from 'vue';

// Kit-only: shows a device-sized screen at its real size, shrunk to fit the page, with the fold drawn on.
const props = defineProps<{width: number; height: number; fold?: 'vertical' | 'horizontal'}>();

const outer = ref<HTMLElement | null>(null);
const scale = ref(1);
let ro: ResizeObserver | undefined;
onMounted(() => {
  ro = new ResizeObserver(([e]) => { scale.value = Math.min(1, e.contentRect.width / props.width); });
  if (outer.value) ro.observe(outer.value);
});
onBeforeUnmount(() => ro?.disconnect());
</script>

<template>
  <div ref="outer" class="outer" :style="{maxWidth: `${width}px`, height: `${height * scale}px`}">
    <div class="device" :style="{width: `${width}px`, height: `${height}px`, transform: `scale(${scale})`}">
      <slot />
      <div v-if="fold" class="fold" :class="fold" aria-hidden="true" />
    </div>
  </div>
</template>

<style scoped>
.outer { position: relative; width: 100%; }
.device { position: absolute; top: 0; left: 0; transform-origin: 0 0; border-radius: 24px; overflow: hidden; border: 1px solid var(--line); background: var(--bg); display: flex; flex-direction: column; }
.fold { position: absolute; pointer-events: none; z-index: 50; background: rgba(255, 255, 255, .05); }
.fold::after { content: ""; position: absolute; background: rgba(255, 255, 255, .28); }
.vertical { top: 0; bottom: 0; left: calc(50% - var(--fold-gutter) / 2); width: var(--fold-gutter); }
.vertical::after { top: 0; bottom: 0; left: 50%; width: 1px; }
.horizontal { left: 0; right: 0; top: calc(50% - var(--fold-gutter) / 2); height: var(--fold-gutter); }
.horizontal::after { left: 0; right: 0; top: 50%; height: 1px; }
</style>
