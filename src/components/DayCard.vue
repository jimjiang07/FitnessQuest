<script setup lang="ts">
withDefaults(defineProps<{
  number: number;
  title: string;
  detail?: string;     // "Anchor: B-stance hinge · DB, Swiss ball"
  next?: boolean;      // the day the app picked for you
  selected?: boolean;  // shown in the detail pane (book layout)
  dense?: boolean;
}>(), {next: false, selected: false, dense: false});
const emit = defineEmits<{select: []}>();
</script>

<template>
  <button type="button" class="day" :class="{next, selected, dense}" :aria-pressed="selected" @click="emit('select')">
    <span class="num">{{ number }}</span>
    <span class="txt">
      <span class="title">{{ title }}</span>
      <span v-if="detail" class="detail">{{ detail }}</span>
    </span>
    <span v-if="next" class="tag">Next up</span>
  </button>
</template>

<style scoped>
.day { display: flex; gap: 12px; align-items: center; width: 100%; min-height: var(--tap-min); padding: 12px; border-radius: var(--radius-card); background: var(--surface); border: 1px solid var(--line); color: var(--fg); text-align: left; cursor: pointer; touch-action: manipulation; }
.dense { padding: 8px 12px; gap: 10px; }
.num { font-family: var(--display); font-weight: 800; font-size: 34px; line-height: 1; width: 28px; flex: none; color: var(--work); }
.dense .num { font-size: 26px; width: 20px; }
.txt { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.title { font-family: var(--display); font-weight: 700; font-size: 18px; text-transform: uppercase; letter-spacing: .02em; line-height: 1.05; }
.dense .title { font-size: 15px; }
.detail { font-size: 12px; color: var(--muted); line-height: 1.35; margin-top: 3px; }
.tag { font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--work); flex: none; }
.next { border-color: var(--work); background: linear-gradient(180deg, rgba(255, 92, 57, .12), transparent 70%), var(--surface); }
.selected { box-shadow: inset 0 0 0 1px var(--fg); }
.day:active { transform: scale(.99); }
</style>
