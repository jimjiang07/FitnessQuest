<script setup lang="ts">
import {computed} from 'vue';
import type {BodyEntry, CutPlan} from '@/types';
import {formatDate, today, weekday, weeklyAverage} from '@/tracker/logic';

const props = defineProps<{cut: CutPlan; entries: BodyEntry[]}>();

const week = computed(() => weeklyAverage(props.entries));
const now = computed(() => week.value?.avg ?? props.cut.start);
const toGo = computed(() => Math.max(0, now.value - props.cut.target));
const done = computed(() => Math.min(1, Math.max(0, (props.cut.start - now.value) / (props.cut.start - props.cut.target))));
const reached = (kg: number) => now.value <= kg;
const next = computed(() => props.cut.milestones.find(m => !reached(m.weight)));
// carb cycling: today's numbers up front, the other kind of day on one line
const day = weekday(today());
const fuelToday = computed(() => props.cut.fuel.find(f => f.days.includes(day)) ?? props.cut.fuel[0]);
const others = computed(() => props.cut.fuel.filter(f => f !== fuelToday.value));
const fuel = computed(() => {
  const n = fuelToday.value;
  return [
    {label: 'Energy', value: n.kcal.toLocaleString('en-AU'), unit: 'kcal'},
    {label: 'Protein', value: n.protein, unit: 'g'},
    {label: 'Carbs', value: n.carbs, unit: 'g'},
    {label: 'Fat', value: n.fat, unit: 'g'},
  ];
});
</script>

<template>
  <section class="goal fq-panel" aria-labelledby="goal-h">
    <header>
      <span class="fq-tag fq-muted">The cut · {{ cut.by }}</span>
      <h2 id="goal-h" class="fq-num">{{ cut.start.toFixed(1) }} → {{ cut.target.toFixed(1) }} kg</h2>
    </header>

    <div class="now">
      <div>
        <span class="val fq-big fq-num">{{ now.toFixed(1) }}<small>kg</small></span>
        <span class="fq-mini fq-muted">{{ week ? `7-day average of ${week.count} weigh-in${week.count === 1 ? '' : 's'}` : `Start, ${formatDate(cut.from)}` }}</span>
      </div>
      <span class="togo fq-num" data-togo>{{ toGo > 0 ? `${toGo.toFixed(1)} kg to go` : 'Target reached' }}</span>
    </div>
    <div class="bar" role="progressbar" aria-label="Progress to target weight" aria-valuemin="0" aria-valuemax="100"
      :aria-valuenow="Math.round(done * 100)"><span :style="{width: `${done * 100}%`}" /></div>
    <p class="fq-mini fq-muted pace">{{ cut.pace }}</p>

    <div v-if="next" class="next" data-next>
      <span class="fq-tag lab">Next · {{ formatDate(next.date) }} · {{ next.weight.toFixed(1) }} kg</span>
      <p>{{ next.note }}</p>
    </div>

    <div class="fuel-head"><span class="fq-tag lab" data-fuel-day>Today · {{ fuelToday.label }}</span></div>
    <dl class="fuel">
      <div v-for="f in fuel" :key="f.label">
        <dt>{{ f.label }}</dt>
        <dd class="fq-num">{{ f.value }}<small>{{ f.unit }}</small></dd>
      </div>
    </dl>
    <p v-if="fuelToday.note" class="fq-mini fq-muted note">{{ fuelToday.note }}</p>
    <p v-for="o in others" :key="o.label" class="fq-mini other fq-num">
      <b>{{ o.label }}</b> ({{ o.days.join(', ') }}): {{ o.kcal.toLocaleString('en-AU') }} kcal · {{ o.protein }} g protein · {{ o.carbs }} g carbs · {{ o.fat }} g fat
    </p>

    <ol class="miles">
      <li v-for="m in cut.milestones" :key="m.date" :class="{hit: reached(m.weight)}">
        <span class="fq-num">{{ formatDate(m.date) }}</span>
        <span class="fq-num">{{ m.weight.toFixed(1) }} kg</span>
        <span class="tick" aria-hidden="true">{{ reached(m.weight) ? '✓' : '' }}</span>
        <span class="fq-sr">{{ reached(m.weight) ? 'reached' : '' }}</span>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.goal { display: flex; flex-direction: column; gap: 10px; }
header { display: flex; flex-direction: column; gap: 2px; }
h2 { font-size: 22px; font-weight: 800; }
.now { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; }
.now > div { display: flex; flex-direction: column; }
.val { font-size: 40px; }
.val small { font-size: 16px; color: var(--muted); margin-left: 3px; }
.togo { font-weight: 800; font-size: 17px; color: var(--rest); text-align: right; }
.bar { height: 10px; border-radius: 999px; background: var(--surface-2); overflow: hidden; }
.bar span { display: block; height: 100%; border-radius: inherit; background: var(--rest); }
.pace { margin: -2px 0 0; }
.next { background: var(--surface-2); border-radius: 12px; padding: 8px 12px; display: flex; flex-direction: column; gap: 2px; }
.next p { margin: 0; font-size: 14.5px; }
.lab { color: var(--ready); }
.fuel { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; margin: -4px 0 0; }
.fuel div { background: var(--surface-2); border-radius: 12px; padding: 6px 8px; min-width: 0; }
dt { font-size: 12px; color: var(--muted); }
dd { margin: 0; font-weight: 800; font-size: 17px; white-space: nowrap; }
dd small { font-size: 12px; color: var(--muted); margin-left: 2px; font-weight: 700; }
.note, .other { margin: 0; }
.other { padding: 6px 10px; border-radius: 10px; background: var(--surface-2); }
.miles { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.miles li { display: grid; grid-template-columns: 1fr auto 24px; gap: 8px; padding: 6px 2px; border-top: 1px solid var(--line); font-size: 14px; font-weight: 600; }
.miles li.hit { color: var(--rest); }
.tick { text-align: right; font-weight: 800; }
</style>
