<script setup lang="ts">
import {ref} from 'vue';
import type {TrackerRoutine} from '@/types';
import ExercisePic from '@/components/ExercisePic.vue';

// part: compact layouts place the warning and the exercise list apart; there the warning folds to one line
const props = defineProps<{routine: TrackerRoutine; part?: 'warning' | 'exercises'}>();
const rulesOpen = ref(props.part !== 'warning');
const open = ref(new Set<string>());
const toggle = (key: string) => {
  const s = new Set(open.value);
  if (!s.delete(key)) s.add(key);
  open.value = s;
};
</script>

<template>
  <section v-if="part !== 'exercises'" class="warning" :class="{folded: !rulesOpen}" aria-labelledby="spine-warning">
    <h2 id="spine-warning" class="w-title">
      <button v-if="part === 'warning'" type="button" class="w-toggle" :aria-expanded="rulesOpen" aria-controls="spine-rules" @click="rulesOpen = !rulesOpen">
        <span><span aria-hidden="true">⚠️</span> Spine and neck warning</span>
        <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      <template v-else><span aria-hidden="true">⚠️</span> Spine and neck warning</template>
    </h2>
    <div v-show="rulesOpen" id="spine-rules">
    <p class="w-sub">{{ routine.warning.title }}</p>
    <ul class="w-points">
      <li v-for="p in routine.warning.points" :key="p">{{ p }}</li>
    </ul>
    </div>
  </section>

  <section v-if="part !== 'warning'" class="roster" aria-labelledby="roster-title">
    <h2 id="roster-title" class="r-title">Exercises</h2>
    <aside v-if="routine.busy.length" class="busy" aria-label="Machine taken?">
      <span class="fq-tag">Machine taken?</span>
      <ul><li v-for="b in routine.busy" :key="b">{{ b }}</li></ul>
    </aside>
    <ol class="list">
      <li v-for="(ex, i) in routine.exercises" :key="ex.key" class="ex" :class="{critical: ex.critical}" :data-key="ex.key">
        <ExercisePic v-if="ex.images.length" class="ex-pic" :images="ex.images" :alt="ex.name" />
        <div class="ex-head">
          <span class="ex-num fq-num" aria-hidden="true">{{ i + 1 }}</span>
          <div class="ex-text">
            <h3 class="ex-name">{{ ex.name }}</h3>
            <p v-if="ex.target" class="target fq-num">{{ ex.target }}</p>
            <p class="cue"><span v-if="ex.critical" aria-hidden="true">🚨 </span>{{ ex.cue }}</p>
          </div>
        </div>
        <button type="button" class="badge" :aria-expanded="open.has(ex.key)" :aria-controls="`why-${ex.key}`" @click="toggle(ex.key)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" /><path d="M12 8v5M12 16.5v.5" /></svg>
          Clinical safety cue
          <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        <p v-show="open.has(ex.key)" :id="`why-${ex.key}`" class="why">{{ ex.why }}</p>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.warning {
  border-radius: var(--radius-card); padding: 14px 16px 12px;
  background: linear-gradient(135deg, rgba(255, 182, 39, .16), rgba(255, 92, 57, .12));
  border: 1.5px solid rgba(255, 182, 39, .55);
}
.w-title { font-size: 22px; font-weight: 800; color: var(--ready); }
.w-toggle {
  width: 100%; min-height: 44px; margin: -6px 0; padding: 0; display: flex; align-items: center; justify-content: space-between; gap: 8px;
  border: 0; background: transparent; color: inherit; font: inherit; text-transform: inherit; letter-spacing: inherit; text-align: left; cursor: pointer;
}
.w-toggle .chev { width: 22px; height: 22px; flex: none; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; transition: transform .2s; }
.w-toggle[aria-expanded="true"] .chev { transform: rotate(180deg); }
.folded { padding-bottom: 14px; }
.w-sub { margin: 4px 0 6px; font-weight: 700; font-size: 13.5px; }
.w-points { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; font-size: 14px; }
.w-points li::marker { color: var(--ready); }

.roster { display: flex; flex-direction: column; gap: 8px; }
.r-title { font-size: 20px; font-weight: 800; color: var(--muted); }
.busy { padding: 10px 12px; border-radius: 14px; background: var(--surface-2); display: flex; flex-direction: column; gap: 4px; }
.busy .fq-tag { color: var(--rest); }
.busy ul { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 3px; font-size: 14px; }
.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.ex { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.ex.critical { border-color: rgba(255, 92, 57, .6); }
.ex-pic { max-height: 240px; }
.ex-head { display: flex; gap: 10px; align-items: flex-start; }
.ex-num {
  flex: none; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center;
  background: var(--surface-2); font-weight: 800; font-size: 14px; color: var(--muted);
}
.ex-text { min-width: 0; }
.ex-name { font-size: 19px; font-weight: 800; overflow-wrap: anywhere; }
.target { margin: 2px 0 0; color: var(--rest); font-weight: 800; font-size: 13px; }
.cue { margin: 3px 0 0; font-size: 14px; color: var(--fg); opacity: .9; }
.critical .cue { color: var(--work); opacity: 1; font-weight: 700; }
.badge {
  align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 14px;
  border-radius: var(--radius-pill); border: 1px solid rgba(255, 182, 39, .45); background: rgba(255, 182, 39, .1);
  color: var(--ready); font-size: 13px; font-weight: 800; cursor: pointer;
}
.badge svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.badge .chev { width: 16px; height: 16px; transition: transform .2s; }
.badge[aria-expanded="true"] .chev { transform: rotate(180deg); }
.why { margin: 0; padding: 10px 12px; border-radius: 12px; background: var(--surface-2); border-left: 3px solid var(--ready); font-size: 14px; }
</style>
