<script setup lang="ts">
import {computed, watch} from 'vue';
import {useRouter} from 'vue-router';
import {coach, getDay, planForDay} from '@/plan';
import {useLayout} from '@/composables/useLayout';
import BigButton from '@/components/BigButton.vue';
import BlockTimeline from '@/components/BlockTimeline.vue';
import Panes from '@/components/Panes.vue';
import PhaseScreen from '@/components/PhaseScreen.vue';
import {formatClock} from '@/components/phase';
import {usePlayerApi, useSettingsApi} from './player';
import {dayNumber, dayTimeline, nextDayAfter, summariseDay} from './viewModel';

const props = defineProps<{dayId: string}>();
const router = useRouter();
const layout = useLayout();
const player = usePlayerApi();
const settings = useSettingsApi();

const day = computed(() => getDay(props.dayId));
const plan = computed(() => planForDay(props.dayId));
watch(day, (d) => { if (!d) router.replace('/'); }, {immediate: true});

// stats only mean something straight after finishing this day; a reload shows dashes
const finished = computed(() => player.status === 'complete' && player.day?.id === props.dayId);
const time = computed(() => (finished.value ? formatClock(player.totalElapsedMs) : '–'));
const sets = computed(() => (finished.value ? String(player.setsDone) : '–'));
const timeline = computed(() => (day.value && plan.value
  ? dayTimeline(day.value, plan.value, summariseDay(day.value, plan.value, coach).blockSeconds, {complete: true}) : []));
const nextDay = computed(() => {
  if (!plan.value?.rotate) return undefined;   // quick sessions are picked freely
  return plan.value.days.find((d) => d.id === settings.nextDayId) ?? nextDayAfter(plan.value, props.dayId);
});
</script>

<template>
  <PhaseScreen v-if="day && plan" phase="done" class="done" :class="layout">
    <Panes :layout="layout">
      <template #now>
        <div class="col">
          <span class="fq-tag" style="color: var(--work)">{{ plan.dayLabel }} {{ dayNumber(plan, day.id) }} complete</span>
          <h1 class="fq-big nice">Nice<br />work.</h1>
          <div class="stats">
            <div class="stat"><div class="fq-big fq-num v">{{ time }}</div><div class="fq-mini fq-muted">time</div></div>
            <div class="stat"><div class="fq-big fq-num v">{{ sets }}</div><div class="fq-mini fq-muted">sets done</div></div>
          </div>
        </div>
      </template>
      <template #context>
        <div class="col">
          <div class="fq-panel tl"><BlockTimeline :items="timeline" dense /></div>
          <p v-if="nextDay" class="fq-mini fq-muted next">Next time: {{ plan.dayLabel }} {{ dayNumber(plan, nextDay.id) }} · {{ nextDay.title }}</p>
          <BigButton variant="ghost" size="lg" class="back" @click="router.push('/')">Back to plan</BigButton>
        </div>
      </template>
    </Panes>
  </PhaseScreen>
</template>

<style scoped>
.col { display: flex; flex-direction: column; gap: 12px; flex: 1; min-height: 0; }
.nice { font-size: 72px; }
.compact .nice, .shortWide .nice { font-size: 64px; text-align: center; }
.compact .fq-tag, .shortWide .fq-tag { text-align: center; }
.stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: auto; }
.compact .stats, .shortWide .stats { margin-top: 8px; }
.stat { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 12px; text-align: center; }
.v { font-size: 34px; }
.tl { padding: 8px 14px; }
.next { margin: 0; text-align: center; }
.back { margin-top: auto; flex: none; }
</style>
