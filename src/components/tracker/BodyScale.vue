<script setup lang="ts">
import {computed} from 'vue';

// A 0–10 symptom slider: the number is big so it reads at a glance, and the colour warns as it climbs.
const props = defineProps<{label: string; hint?: string; id: string}>();
const value = defineModel<number>({required: true});
const tone = computed(() => (value.value >= 7 ? 'high' : value.value >= 4 ? 'mid' : 'low'));
const word = computed(() => (value.value === 0 ? 'None' : value.value >= 7 ? 'High' : value.value >= 4 ? 'Moderate' : 'Mild'));
</script>

<template>
  <div class="scale" :class="tone">
    <div class="head">
      <label :for="props.id" class="lbl">{{ label }}<span v-if="hint" class="fq-mini fq-muted hint">{{ hint }}</span></label>
      <output :for="props.id" class="num fq-big fq-num">{{ value }}<small>/10</small></output>
    </div>
    <input :id="props.id" v-model.number="value" type="range" min="0" max="10" step="1"
      :style="{'--pct': `${value * 10}%`}" :aria-valuetext="`${value} out of 10, ${word.toLowerCase()}`" />
    <div class="ends fq-mini fq-muted"><span>0 none</span><span class="word">{{ word }}</span><span>10 worst</span></div>
  </div>
</template>

<style scoped>
.scale { --tone: var(--rest); display: flex; flex-direction: column; gap: 4px; }
.mid { --tone: var(--ready); }
.high { --tone: var(--work); }
.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
.lbl { font-weight: 700; display: flex; flex-direction: column; }
.hint { font-weight: 500; }
.num { font-size: 44px; color: var(--tone); transition: color .2s; }
.num small { font-size: 18px; color: var(--muted); margin-left: 2px; }
.word { color: var(--tone); font-weight: 700; }
.ends { display: flex; justify-content: space-between; }
input[type='range'] {
  -webkit-appearance: none; appearance: none; width: 100%; height: 48px; margin: 0; background: transparent; cursor: pointer;
}
input[type='range']::-webkit-slider-runnable-track {
  height: 10px; border-radius: 999px;
  background: linear-gradient(to right, var(--tone) var(--pct), var(--surface-2) var(--pct));
}
input[type='range']::-moz-range-track { height: 10px; border-radius: 999px; background: var(--surface-2); }
input[type='range']::-moz-range-progress { height: 10px; border-radius: 999px; background: var(--tone); }
input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none; width: 32px; height: 32px; margin-top: -11px; border-radius: 50%;
  background: var(--fg); border: 4px solid var(--tone); box-shadow: 0 2px 8px rgba(0, 0, 0, .5);
}
input[type='range']::-moz-range-thumb {
  width: 24px; height: 24px; border-radius: 50%; background: var(--fg); border: 4px solid var(--tone);
}
</style>
