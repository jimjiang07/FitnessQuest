<script setup lang="ts">
import {ref, watch} from 'vue';
import {parseNumber} from '@/tracker/logic';

const props = defineProps<{modelValue: number | null; label: string; decimal?: boolean; min?: number; max?: number}>();
const emit = defineEmits<{'update:modelValue': [number | null]}>();

const show = (n: number | null) => (n == null ? '' : String(n));
const text = ref(show(props.modelValue));
const invalid = ref(false);

const parse = (raw: string) => parseNumber(raw, {min: props.min, max: props.max, integer: !props.decimal});

function onInput(e: Event) {
  text.value = (e.target as HTMLInputElement).value;
  const n = parse(text.value);
  invalid.value = n === undefined;
  emit('update:modelValue', n ?? null);
}

// keep half-typed text like "42." while the store holds 42; only outside changes (Same as last) rewrite it
watch(() => props.modelValue, v => { if (parse(text.value) !== v) { text.value = show(v); invalid.value = false; } });
</script>

<template>
  <input class="num fq-num" type="text" :inputmode="decimal ? 'decimal' : 'numeric'" autocomplete="off" enterkeyhint="next"
    :aria-label="label" :aria-invalid="invalid || undefined" :value="text" @input="onInput">
</template>

<style scoped>
.num {
  width: 100%; min-width: 0; height: 52px; padding: 0 8px; border-radius: 12px;
  border: 1px solid var(--line); background: var(--bg); color: var(--fg);
  font: 700 20px/1 var(--body); text-align: center;
}
.num:focus { border-color: var(--rest); outline: none; box-shadow: 0 0 0 3px rgba(39, 196, 176, .25); }
.num[aria-invalid] { border-color: var(--work); }
</style>
