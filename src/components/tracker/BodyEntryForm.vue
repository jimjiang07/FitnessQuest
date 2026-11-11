<script setup lang="ts">
import {reactive, ref} from 'vue';
import type {BodyEntry} from '@/types';
import {isIsoDate, parseNumber, today} from '@/tracker/logic';
import BodyScale from './BodyScale.vue';

// Adds a new entry, or edits one when `entry` is given.
const props = defineProps<{entry?: BodyEntry; idPrefix?: string}>();
const emit = defineEmits<{save: [Omit<BodyEntry, 'id'>]; cancel: []}>();

const pre = props.idPrefix ?? 'body';
const fmt = (n: number | null) => (n == null ? '' : String(n));
const form = reactive({
  date: props.entry?.date ?? today(),
  weight: fmt(props.entry?.weight ?? null),
  waist: fmt(props.entry?.waist ?? null),
  lumbar: props.entry?.lumbar ?? 0,
  neck: props.entry?.neck ?? 0,
  notes: props.entry?.notes ?? '',
});
const error = ref('');

function parse(s: string, max: number): number | null | undefined {
  const n = parseNumber(s, {min: 0.1, max});
  return n == null ? n : Math.round(n * 10) / 10;
}

function submit() {
  const weight = parse(form.weight, 500), waist = parse(form.waist, 300);
  if (!isIsoDate(form.date)) error.value = 'Pick a date.';
  else if (weight === undefined) error.value = 'Weight should be a number in kg, like 75.4.';
  else if (waist === undefined) error.value = 'Waist should be a number in cm, like 94.5.';
  else {
    error.value = '';
    emit('save', {date: form.date, weight, waist, lumbar: form.lumbar, neck: form.neck, notes: form.notes.trim()});
    if (!props.entry) Object.assign(form, {weight: '', waist: '', lumbar: 0, neck: 0, notes: ''});
  }
}
</script>

<template>
  <form class="entry" novalidate @submit.prevent="submit">
    <div class="field">
      <label :for="`${pre}-date`">Date</label>
      <input :id="`${pre}-date`" v-model="form.date" type="date" required />
    </div>
    <div class="pair">
      <div class="field">
        <label :for="`${pre}-weight`">Fasting weight <span class="unit">kg</span></label>
        <input :id="`${pre}-weight`" v-model="form.weight" type="text" inputmode="decimal" autocomplete="off" placeholder="75.4" />
      </div>
      <div class="field">
        <label :for="`${pre}-waist`">Navel waist <span class="unit">cm</span></label>
        <input :id="`${pre}-waist`" v-model="form.waist" type="text" inputmode="decimal" autocomplete="off" placeholder="94.5"
          :aria-describedby="`${pre}-waist-hint`" />
      </div>
    </div>
    <p :id="`${pre}-waist-hint`" class="fq-mini fq-muted hint">
      Measure first thing in the morning, tape level at the navel. Waist is your main belly-fat indicator.
    </p>
    <BodyScale :id="`${pre}-lumbar`" v-model="form.lumbar" label="Lumbar discomfort" hint="Lower back, right now" />
    <BodyScale :id="`${pre}-neck`" v-model="form.neck" label="Neck strain" hint="Tension or ache" />
    <div class="field">
      <label :for="`${pre}-notes`">Notes</label>
      <textarea :id="`${pre}-notes`" v-model="form.notes" rows="3" placeholder="Sleep, flare-ups, what helped"></textarea>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div class="actions">
      <button type="submit" class="primary">{{ entry ? 'Save changes' : 'Save entry' }}</button>
      <button v-if="entry" type="button" class="secondary" @click="emit('cancel')">Cancel</button>
    </div>
  </form>
</template>

<style scoped>
.entry { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.pair { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; }
label { font-weight: 700; }
.unit { color: var(--muted); font-weight: 600; }
input[type='date'], input[type='text'], textarea {
  width: 100%; min-height: 52px; padding: 10px 14px; border-radius: 14px; border: 1px solid var(--line);
  background: var(--surface-2); color: var(--fg); font: inherit; font-size: 18px; font-weight: 600;
}
input[type='text'] { font-size: 22px; font-variant-numeric: tabular-nums; }
textarea { min-height: 84px; font-size: 16px; font-weight: 500; resize: vertical; }
input::placeholder, textarea::placeholder { color: var(--muted); opacity: .6; }
input:focus, textarea:focus { border-color: var(--rest); outline: none; box-shadow: 0 0 0 3px rgba(39, 196, 176, .25); }
input[type='date']::-webkit-calendar-picker-indicator { filter: invert(.8); }
.hint { margin: -6px 0 0; }
.error { margin: 0; color: var(--ready); font-weight: 700; }
.actions { display: flex; gap: 10px; }
.actions button {
  flex: 1; min-height: var(--tap-min); border-radius: var(--radius-pill); border: 0; font-weight: 800; font-size: 17px; cursor: pointer;
}
.primary { background: var(--rest); color: #04201c; }
.secondary { background: var(--surface-2); color: var(--fg); }
</style>
