<script setup lang="ts">
import {computed, ref} from 'vue';
import type {SetEntry, StrengthSession, TrackerRoutine} from '@/types';
import {useTrackerStore} from '@/stores/tracker';
import {formatDate, hasValue, isIsoDate} from '@/tracker/logic';
import StrengthNumber from './StrengthNumber.vue';
import ExercisePic from '@/components/ExercisePic.vue';

const props = defineProps<{session: StrengthSession; routine: TrackerRoutine; open: boolean}>();
const emit = defineEmits<{toggle: []}>();
const store = useTrackerStore();
const confirming = ref(false);

const dayLabel = computed(() => formatDate(props.session.date, 'day'));

const summary = computed(() => {
  const logged = props.routine.exercises.filter(e => (props.session.sets[e.key] ?? []).some(hasValue)).length;
  // only real lifts count as a top set, not treadmill incline or bike level
  const lifts = props.routine.exercises.filter(e => e.weightUnit === 'kg').flatMap(e => props.session.sets[e.key] ?? []);
  const top = Math.max(-Infinity, ...lifts.map(s => s.weight ?? -Infinity));
  const parts = [logged ? `${logged} exercise${logged === 1 ? '' : 's'}` : 'Nothing logged yet'];
  if (Number.isFinite(top)) parts.push(`top set ${top} kg`);
  return parts.join(' · ');
});

const v = (n: number | null) => (n == null ? '–' : String(n));
/** "40 kg × 10 @ 7, 40 × 9" — units once, like you'd jot it down. */
function formatSets(sets: SetEntry[], unit: string): string {
  const u = unit === '%' ? '%' : unit ? ` ${unit}` : '';
  return sets.map((s, i) => `${v(s.weight)}${i === 0 && s.weight != null ? u : ''} × ${v(s.reps)}${s.rpe != null ? ` @ ${s.rpe}` : ''}`).join(', ');
}
const weightHead = (unit: string, label: string) => (unit ? `${label} (${unit})` : label);
// one lookup per exercise per change, not per render call
const last = computed(() => Object.fromEntries(props.routine.exercises.map(e => [e.key, store.previous(props.session, e.key)])));

function setDate(e: Event) {
  const d = (e.target as HTMLInputElement).value;
  if (isIsoDate(d)) store.setSessionDate(props.session.id, d);   // a cleared date field keeps the old date
}
const upd = (key: string, i: number, field: keyof SetEntry, n: number | null) => store.updateSet(props.session.id, key, i, {[field]: n});
</script>

<template>
  <article class="card" :class="{open}" :data-session="session.id">
    <header class="head">
      <label class="date">
        <span class="fq-sr">Session date</span>
        <input type="date" :value="session.date" required @change="setDate">
      </label>
      <button type="button" class="toggle" :aria-expanded="open" :aria-controls="`body-${session.id}`" @click="emit('toggle')">
        <span class="toggle-text">
          <span class="day">{{ dayLabel }}</span>
          <span class="sum fq-mini fq-muted">{{ summary }}</span>
        </span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        <span class="fq-sr">{{ open ? 'Collapse' : 'Expand' }} session</span>
      </button>
    </header>

    <div v-if="open" :id="`body-${session.id}`" class="body">
      <section v-for="ex in routine.exercises" :key="ex.key" class="ex" :data-key="ex.key" :aria-label="ex.name">
        <div class="ex-top">
          <ExercisePic v-if="ex.images.length" class="thumb" :images="ex.images" :alt="ex.name" />
          <h3 class="ex-name">{{ ex.name }}</h3>
          <span v-if="ex.weightUnit === 'kg' && store.best[ex.key] != null" class="best fq-mini">Best {{ store.best[ex.key] }} kg</span>
        </div>
        <p v-if="ex.target" class="target fq-mini fq-num">Target {{ ex.target }}</p>
        <p class="cue fq-mini" :class="{critical: ex.critical}"><span v-if="ex.critical" aria-hidden="true">🚨 </span>{{ ex.cue }}</p>

        <div v-if="last[ex.key]" class="last">
          <span class="last-text fq-mini fq-num"><b>Last:</b> {{ formatSets(last[ex.key]!, ex.weightUnit) }}</span>
          <button type="button" class="same" @click="store.copyPrevious(session.id, ex.key)">Same as last</button>
        </div>

        <div class="grid" role="group" :aria-label="`${ex.name} sets`">
          <span class="h" aria-hidden="true">Set</span>
          <span class="h" aria-hidden="true">{{ weightHead(ex.weightUnit, ex.weightLabel) }}</span>
          <span class="h" aria-hidden="true">{{ ex.repsLabel ?? 'Reps' }}</span>
          <span class="h" aria-hidden="true">RPE</span>
          <span aria-hidden="true" />
          <template v-for="(s, i) in session.sets[ex.key] ?? []" :key="i">
            <span class="n fq-num">{{ i + 1 }}</span>
            <StrengthNumber :model-value="s.weight" decimal :min="0" :max="1000" :label="`${ex.name} set ${i + 1} ${weightHead(ex.weightUnit, ex.weightLabel).toLowerCase()}`"
              @update:model-value="upd(ex.key, i, 'weight', $event)" />
            <StrengthNumber :model-value="s.reps" decimal :min="0" :max="10000" :label="`${ex.name} set ${i + 1} ${(ex.repsLabel ?? 'Reps').toLowerCase()}`"
              @update:model-value="upd(ex.key, i, 'reps', $event)" />
            <StrengthNumber :model-value="s.rpe" :min="1" :max="10" :label="`${ex.name} set ${i + 1} RPE (1 to 10)`"
              @update:model-value="upd(ex.key, i, 'rpe', $event)" />
            <button v-if="(session.sets[ex.key]?.length ?? 0) > 1" type="button" class="remove" :aria-label="`Remove ${ex.name} set ${i + 1}`"
              @click="store.removeSet(session.id, ex.key, i)">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
            <span v-else aria-hidden="true" />
          </template>
        </div>
        <button type="button" class="add" @click="store.addSet(session.id, ex.key)">+ Set</button>
      </section>

      <div v-if="confirming" class="confirm" role="alertdialog" aria-labelledby="del-q" aria-modal="false">
        <p id="del-q" class="q">Delete the {{ dayLabel }} session? This can't be undone.</p>
        <div class="row">
          <button type="button" class="ghost" @click="confirming = false">Cancel</button>
          <button type="button" class="danger" @click="store.deleteSession(session.id)">Delete</button>
        </div>
      </div>
      <button v-else type="button" class="del" @click="confirming = true">Delete session</button>
    </div>
  </article>
</template>

<style scoped>
.card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-card); overflow: hidden; }
.card.open { border-color: rgba(39, 196, 176, .45); }
.head { display: flex; align-items: center; gap: 8px; padding: 8px 8px 8px 10px; }
.date input {
  height: 48px; padding: 0 10px; border-radius: 12px; border: 1px solid var(--line); background: var(--bg); color: var(--fg);
  font: 700 15px var(--body); color-scheme: dark; max-width: 160px;
}
.toggle {
  flex: 1; min-width: 0; min-height: 56px; display: flex; align-items: center; gap: 8px; padding: 0 8px; border: 0;
  background: transparent; text-align: left; cursor: pointer; border-radius: 12px;
}
.toggle-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.day { font-family: var(--display); font-weight: 800; font-size: 19px; text-transform: uppercase; line-height: 1.1; }
.sum { overflow-wrap: anywhere; }
.toggle svg { flex: none; width: 22px; height: 22px; fill: none; stroke: var(--muted); stroke-width: 2.2; stroke-linecap: round; transition: transform .2s; }
.open .toggle svg { transform: rotate(180deg); }

.body { display: flex; flex-direction: column; gap: 10px; padding: 0 10px 12px; }
.ex { border-top: 1px solid var(--line); padding-top: 10px; display: flex; flex-direction: column; gap: 6px; }
.ex-top { display: flex; align-items: center; gap: 10px; }
.thumb { width: 84px; border-radius: 10px; }
.ex-name { flex: 1; font-size: 18px; font-weight: 800; min-width: 0; overflow-wrap: anywhere; }
.best { flex: none; color: var(--rest); font-weight: 800; }
.cue { margin: 0; color: var(--muted); }
.target { margin: 0; color: var(--rest); font-weight: 800; }
.cue.critical { color: var(--work); font-weight: 700; }
.last {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: space-between;
  padding: 6px 6px 6px 10px; border-radius: 12px; background: rgba(39, 196, 176, .08); border: 1px solid rgba(39, 196, 176, .25);
}
.last-text { min-width: 0; overflow-wrap: anywhere; flex: 1 1 140px; }
.last-text b { color: var(--rest); }
.same {
  min-height: 44px; padding: 0 14px; border-radius: var(--radius-pill); border: 0; background: var(--rest); color: #062521;
  font-weight: 800; font-size: 13.5px; cursor: pointer;
}
.grid { display: grid; grid-template-columns: 26px repeat(3, minmax(0, 1fr)) 44px; gap: 6px; align-items: center; }
.h { font-size: 10.5px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); text-align: center; line-height: 1.2; }
.h:first-child { text-align: left; }
.n { font-weight: 800; color: var(--muted); text-align: center; }
.remove {
  width: 44px; height: 44px; border-radius: 50%; border: 0; background: var(--surface-2); color: var(--muted);
  display: grid; place-items: center; cursor: pointer;
}
.remove svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; }
.add {
  align-self: flex-start; min-height: 48px; padding: 0 18px; border-radius: var(--radius-pill);
  border: 1px dashed var(--line); background: transparent; color: var(--fg); font-weight: 800; cursor: pointer;
}
.del {
  margin-top: 4px; min-height: 48px; border-radius: var(--radius-pill); border: 1px solid rgba(255, 92, 57, .4);
  background: transparent; color: var(--work); font-weight: 800; cursor: pointer;
}
.confirm { margin-top: 4px; padding: 12px; border-radius: 14px; background: rgba(255, 92, 57, .1); border: 1px solid rgba(255, 92, 57, .5); }
.q { margin: 0 0 10px; font-weight: 700; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.ghost, .danger { min-height: var(--tap-min); border-radius: var(--radius-pill); border: 0; font-weight: 800; cursor: pointer; }
.ghost { background: var(--surface-2); }
.danger { background: var(--work); color: var(--on-work); }
</style>
