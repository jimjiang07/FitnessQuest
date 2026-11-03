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
import '@/styles/components.css';

const plan = plans[0];
const layout = useLayout();
const route = useRoute();
const router = useRouter();
const settings = useSettingsApi();

const split = computed(() => layout.value === 'book' || layout.value === 'tabletop');
const nextId = computed(() => plan.days.find((d) => d.id === settings.nextDayId)?.id ?? plan.days[0].id);
const minutes = plan.days.map((d) => summariseDay(d, plan, coach).totalSeconds);
const avg = formatMinutes(minutes.reduce((a, b) => a + b, 0) / minutes.length);

const picked = ref<string | null>(typeof route.query.day === 'string' ? route.query.day : null);
watch(() => route.query.day, (d) => { if (typeof d === 'string') picked.value = d; });
const selected = computed(() => plan.days.find((d) => d.id === picked.value) ?? plan.days.find((d) => d.id === nextId.value)!);

function choose(id: string) {
  if (split.value) picked.value = id;
  else router.push(`/day/${id}`);
}
const detailLine = (i: number) => [anchorShort(plan.days[i]), formatMinutes(minutes[i])].filter(Boolean).join(' · ');
</script>

<template>
  <PhaseScreen v-if="split" class="home split">
    <Panes :layout="layout">
      <template #now>
        <div class="list">
          <header class="top">
            <span class="fq-tag fq-muted">Your plan</span>
            <h1 class="name">{{ plan.name }}</h1>
            <span class="fq-mini fq-muted">{{ plan.days.length }} days · ~{{ avg }} each · L4–S1 safe</span>
          </header>
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
      <span class="fq-mini fq-muted">{{ plan.days.length }} days · ~{{ avg }} each · L4–S1 safe</span>
    </header>
    <ol class="days">
      <li v-for="(d, i) in plan.days" :key="d.id">
        <DayCard :number="i + 1" :title="d.title" :detail="detailLine(i)" :next="d.id === nextId" @select="choose(d.id)" />
      </li>
    </ol>
    <p class="fq-mini fq-muted foot">Warm-up and cool-down are built into every day · <RouterLink to="/about">About</RouterLink></p>
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
.foot a { color: var(--fg); display: inline-flex; align-items: center; min-height: 44px; min-width: 44px; padding: 0 4px; }
</style>
