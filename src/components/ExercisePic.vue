<script setup lang="ts">
import {computed, onBeforeUnmount, ref, watch} from 'vue';

const props = withDefaults(defineProps<{
  images: string[];
  tempoMs?: number;   // one full start → end → start cycle
  alt: string;
}>(), {tempoMs: 3200});

const big = ref(false);
const pair = computed(() => props.images.slice(0, 2));
const style = computed(() => ({'--tempo': `${Math.max(400, props.tempoMs)}ms`}));

const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') big.value = false; };
watch(big, (open) => (open ? window.addEventListener('keydown', onKey) : window.removeEventListener('keydown', onKey)));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <!-- .stop: a tap on the picture shouldn't also pause the workout; single root so callers can size it -->
  <button v-if="pair.length" type="button" class="pic" :style="style" :aria-label="`Show ${alt} full screen`" @click.stop="big = true">
    <img :src="pair[0]" :alt="alt" draggable="false" />
    <img v-if="pair[1]" class="b" :src="pair[1]" alt="" draggable="false" />
    <Teleport to="body">
      <button v-if="big" type="button" class="pic full" :style="style" aria-label="Close picture" @click.stop="big = false">
        <img :src="pair[0]" :alt="alt" draggable="false" />
        <img v-if="pair[1]" class="b" :src="pair[1]" alt="" draggable="false" />
      </button>
    </Teleport>
  </button>
</template>

<style scoped>
.pic { position: relative; display: block; width: 100%; aspect-ratio: 3 / 2; min-height: 0; padding: 0; border: 0; border-radius: 14px; overflow: hidden; background: #1a1f29; cursor: zoom-in; flex: none; }
.pic img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; background: #1a1f29; user-select: none; }
.pic .b { opacity: 0; }
@media (prefers-reduced-motion: no-preference) {
  .pic .b { animation: ab var(--tempo) ease-in-out infinite; }
}
@keyframes ab { 0%, 38% { opacity: 0; } 50%, 88% { opacity: 1; } 100% { opacity: 0; } }
.full { position: fixed; inset: 0; z-index: 100; width: 100vw; height: 100dvh; aspect-ratio: auto; border-radius: 0; background: rgba(5, 7, 10, .96); cursor: zoom-out; }
.full img { background: transparent; }
</style>
