<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {coach, plans} from '@/plan';
import {useLayout} from '@/composables/useLayout';
import DayCard from '@/components/DayCard.vue';
import Panes from '@/components/Panes.vue';
import PhaseScreen from '@/components/PhaseScreen.vue';
import DayDetail from './parts/DayDetail.vue';
import {useSettingsApi} from './player';
import {anchorShort, formatMinutes, summariseDay} from './viewModel';

const layout = useLayout();
const route = useRoute();
const router = useRouter();
const settings = useSettingsApi();

const split = computed(() => layout.value === 'book' || layout.value === 'tabletop');
// ?plan= picks the plan; otherwise the one the selected or next day belongs to, else the first
const planFor = (dayId: unknown) => plans.find((p) => p.days.some((d) => d.id === dayId));
const planId = ref((typeof route.query.plan === 'string' && plans.some((p) => p.id === route.query.plan) ? route.query.plan : undefined)
  ?? planFor(route.query.day)?.id ?? plans[0].id);
watch(() => route.query.day, (d) => { const p = planFor(d); if (p) planId.value = p.id; });
const plan = computed(() => plans.find((p) => p.id === planId.value) ?? plans[0]);
function choosePlan(id: string) { planId.value = id; picked.value = null; router.replace({query: {plan: id}}); }

const nextId = computed(() => (plan.value.rotate ? plan.value.days.find((d) => d.id === settings.nextDayId)?.id ?? plan.value.days[0].id : null));
const minutes = computed(() => plan.value.days.map((d) => summariseDay(d, plan.value, coach).totalSeconds));
const avg = computed(() => formatMinutes(minutes.value.reduce((a, b) => a + b, 0) / minutes.value.length));

const picked = ref<string | null>(typeof route.query.day === 'string' ? route.query.day : null);
watch(() => route.query.day, (d) => { if (typeof d === 'string') picked.value = d; });
const selected = computed(() => plan.value.days.find((d) => d.id === picked.value)
  ?? plan.value.days.find((d) => d.id === nextId.value) ?? plan.value.days[0]);

function choose(id: string) {
  if (split.value) picked.value = id;
  else router.push(`/day/${id}`);
}
const detailLine = (i: number) => [anchorShort(plan.value.days[i]), formatMinutes(minutes.value[i])].filter(Boolean).join(' · ');
const subtitle = computed(() => `${plan.value.days.length} ${plan.value.dayLabel.toLowerCase()}s · ~${avg.value} each`);
const hasWarmups = computed(() => plan.value.days.every(d => d.blocks.some(b => b.kind === 'warmup') && d.blocks.some(b => b.kind === 'cooldown')));
</script>

<template>
  <PhaseScreen v-if="split" class="home split">
    <Panes :layout="layout">
      <template #now>
        <div class="list">
          <header class="top">
            <span class="fq-tag fq-muted">Your plan</span>
            <h1 class="name">{{ plan.name }}</h1>
            <span class="fq-mini fq-muted">{{ subtitle }}</span>
          </header>
          <div v-if="plans.length > 1" class="plan-switch" role="tablist" aria-label="Plan">
            <button v-for="p in plans" :key="p.id" type="button" role="tab" :aria-selected="p.id === plan.id"
              :class="{on: p.id === plan.id}" @click="choosePlan(p.id)">{{ p.name }}</button>
          </div>
          <ol class="days" :class="{grid: layout === 'tabletop'}">
            <li v-for="(d, i) in plan.days" :key="d.id">
              <DayCard :dense="layout === 'tabletop'" :number="i + 1" :title="d.title" :detail="detailLine(i)" :next="d.id === nextId"
                :selected="d.id === selected.id" @select="choose(d.id)" />
            </li>
          </ol>
          <RouterLink to="/about" class="about fq-mini fq-muted">About and photo credits</RouterLink>
        </div>
      </template>
      <template #context>
        <DayDetail :key="selected.id" :day="selected" :plan="plan" :next="selected.id === nextId" dense :steps="layout === 'book'" />
      </template>
    </Panes>
  </PhaseScreen>

  <main v-else class="home page">
    <header class="top">
      <span class="fq-tag fq-muted">Your plan</span>
      <div class="title-row">
        <h1 class="name big">{{ plan.name }}</h1>
        <button type="button" class="voice" role="switch" :aria-checked="settings.voice"
          :aria-label="settings.voice ? 'Voice coach on' : 'Voice coach off'" @click="settings.voice = !settings.voice">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M11 5 6 9H2v6h4l5 4z" />
            <path v-if="settings.voice" d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
            <path v-else d="m16 9 6 6M22 9l-6 6" />
          </svg>
        </button>
      </div>
      <span class="fq-mini fq-muted">{{ subtitle }}</span>
    </header>
    <div v-if="plans.length > 1" class="plan-switch" role="tablist" aria-label="Plan">
      <button v-for="p in plans" :key="p.id" type="button" role="tab" :aria-selected="p.id === plan.id"
        :class="{on: p.id === plan.id}" @click="choosePlan(p.id)">{{ p.name }}</button>
    </div>
    <ol class="days">
      <li v-for="(d, i) in plan.days" :key="d.id">
        <DayCard :number="i + 1" :title="d.title" :detail="detailLine(i)" :next="d.id === nextId" @select="choose(d.id)" />
      </li>
    </ol>
    <p class="fq-mini fq-muted foot"><template v-if="hasWarmups">Warm-up and cool-down are built into every day · </template><RouterLink to="/about">About</RouterLink></p>
  </main>
</template>

<style scoped>
.list { display: flex; flex-direction: column; gap: 12px; min-height: 0; flex: 1; }
.top { display: flex; flex-direction: column; gap: 4px; }
.name { font-size: 34px; font-weight: 800; }
.big { font-size: clamp(38px, 11vw, 52px); }
.days { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.days.grid { display: grid; grid-template-columns: 1fr 1fr; }
.days.grid :deep(.day) { height: 100%; }
.about { margin-top: auto; align-self: flex-start; min-height: 44px; display: inline-flex; align-items: center; text-decoration: none; }
.page { max-width: 640px; margin: 0 auto; padding: max(22px, env(safe-area-inset-top)) max(18px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left)); display: flex; flex-direction: column; gap: 16px; }
.page .days { gap: 12px; }
.page .days :deep(.day) { padding: 16px; }
.title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.voice { width: var(--tap-min); height: var(--tap-min); border-radius: 50%; border: 0; background: var(--surface-2); color: var(--fg); display: grid; place-items: center; flex: none; cursor: pointer; }
.voice svg { width: 22px; height: 22px; }
.foot { margin: 0; text-align: center; }
.plan-switch { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 4px; padding: 4px; border-radius: var(--radius-pill); background: var(--surface); border: 1px solid var(--line); }
.plan-switch button { min-height: 44px; padding: 0 10px; border: 0; border-radius: var(--radius-pill); background: transparent; color: var(--muted); font-weight: 700; font-size: 13.5px; cursor: pointer; }
.plan-switch button.on { background: var(--work); color: var(--on-work); }
.foot a { color: var(--fg); display: inline-flex; align-items: center; min-height: 44px; min-width: 44px; padding: 0 4px; }
</style>
