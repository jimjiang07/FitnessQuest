<script setup lang="ts">
import {computed} from 'vue';
import {activity} from '@/tracker/config';

const props = defineProps<{date: string; label: string; habit?: string; today: boolean; future: boolean; big?: boolean}>();
defineEmits<{pick: [e: MouseEvent]}>();
const a = computed(() => activity(props.habit));
const dayNum = computed(() => Number(props.date.slice(8)));
</script>

<template>
  <button type="button" class="day fq-num" :class="{set: a, today, future, big}" :style="a ? {'--c': `var(--${a.color})`} : undefined"
    :aria-label="`${label}: ${a ? a.short : 'not logged'}`" :aria-current="today ? 'date' : undefined" @click="$emit('pick', $event)">
    <span class="n" aria-hidden="true">{{ dayNum }}</span>
    <span v-if="a" class="s" aria-hidden="true">{{ a.short }}</span>
  </button>
</template>

<style scoped>
.day {
  --c: var(--line);
  position: relative; min-width: 0; min-height: 48px; padding: 4px 2px; border-radius: 12px;
  border: 1px solid var(--line); background: var(--surface); color: var(--muted);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; cursor: pointer;
  transition: background .15s, border-color .15s;
}
.n { font-size: 12px; font-weight: 700; line-height: 1; }
.s { font-size: 10.5px; font-weight: 800; letter-spacing: .02em; line-height: 1.1; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.set { background: color-mix(in srgb, var(--c) 24%, var(--surface)); border-color: color-mix(in srgb, var(--c) 70%, transparent); color: var(--fg); }
.set .s { color: var(--c); }
.set .n { opacity: .7; }
.today { outline: 2px solid var(--fg); outline-offset: 1px; }
.today .n { color: var(--fg); }
.future { opacity: .45; border-style: dashed; }
.big { min-height: 64px; border-radius: 16px; }
.big .n { font-size: 15px; }
.big .s { font-size: 12.5px; }
</style>
