<script setup lang="ts">
import {computed} from 'vue';
import {useRouter} from 'vue-router';
import type {Day, Plan} from '@/types';
import {coach} from '@/plan';
import BigButton from '@/components/BigButton.vue';
import BlockTimeline from '@/components/BlockTimeline.vue';
import GearChips from '@/components/GearChips.vue';
import {dayGear, dayNumber, dayTimeline, formatMinutes, summariseDay} from '../viewModel';
import '@/styles/components.css';

// Day detail: title, why it helps, block timeline, gear and Start. Shared by Home (book/tabletop) and DayView.
// dense = smaller head; steps = still list each block's exercises (book has the height for it)
const props = withDefaults(defineProps<{day: Day; plan: Plan; next?: boolean; dense?: boolean; back?: boolean; steps?: boolean}>(),
  {next: false, dense: false, back: false, steps: false});

const router = useRouter();
const summary = computed(() => summariseDay(props.day, props.plan, coach));
const timeline = computed(() => dayTimeline(props.day, props.plan, summary.value.blockSeconds));
const gear = computed(() => dayGear(props.day, props.plan));
const eyebrow = computed(() => [`Day ${dayNumber(props.plan, props.day.id)}`, formatMinutes(summary.value.totalSeconds),
  props.next ? 'Next up' : ''].filter(Boolean).join(' · '));
</script>

<template>
  <section class="detail" :class="{dense}" aria-labelledby="day-title">
    <div class="head">
      <RouterLink v-if="back" to="/" class="back" aria-label="Back to plan">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
      </RouterLink>
      <span class="fq-tag fq-muted fq-num">{{ eyebrow }}</span>
    </div>
    <h2 id="day-title" class="title">{{ day.title }}</h2>
    <div v-if="day.why" class="why" :class="{panel: !dense}">
      <span v-if="!dense" class="fq-tag" style="color: var(--rest)">Why it helps your back</span>
      <p>{{ day.why }}</p>
    </div>
    <BlockTimeline :items="timeline" :dense="dense && !steps" class="tl" />
    <GearChips :gear="gear" />
    <BigButton size="lg" class="start" @click="router.push(`/play/${day.id}`)">
      <template #icon><svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z" /></svg></template>
      Start workout
    </BigButton>
  </section>
</template>

<style scoped>
.detail { display: flex; flex-direction: column; gap: 12px; min-height: 0; flex: 1; }
.dense { gap: 9px; }
.head { display: flex; align-items: center; gap: 12px; }
.back { width: var(--tap-min); height: var(--tap-min); border-radius: 50%; background: var(--surface-2); color: var(--fg); display: grid; place-items: center; flex: none; margin: -6px 0; }
.back svg { width: 22px; height: 22px; }
.title { font-size: 34px; font-weight: 800; }
.dense .title { font-size: 26px; }
.why p { margin: 0; font-size: 14px; line-height: 1.45; color: var(--muted); }
.dense .why p { font-size: 13px; line-height: 1.4; }
.panel { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; }
.start { margin-top: auto; flex: none; }
</style>
