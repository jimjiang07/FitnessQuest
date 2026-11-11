<script setup lang="ts">
import {computed, nextTick, reactive, watch} from 'vue';
import {today} from '@/tracker/logic';
import {routine as findRoutine} from '@/tracker/config';
import {useTrackerStore} from '@/stores/tracker';
import {useLayout} from '@/composables/useLayout';
import type {RoutineId} from '@/types';
import StrengthRoster from '@/components/tracker/StrengthRoster.vue';
import StrengthSessionCard from '@/components/tracker/StrengthSessionCard.vue';

const props = defineProps<{routine: RoutineId}>();
const store = useTrackerStore();
const layout = useLayout();
const book = computed(() => layout.value === 'book');

const r = computed(() => findRoutine(props.routine)!);
const sessions = computed(() => store.sessionsFor(props.routine));

// the newest session starts open; older ones collapse to a one-line summary
const opened = reactive(new Set<string>());
const openOnly = (id?: string) => { opened.clear(); if (id) opened.add(id); };
openOnly(sessions.value[0]?.id);
watch(() => props.routine, () => openOnly(sessions.value[0]?.id));   // /upper and /lower share this view instance

const toggle = (id: string) => { if (!opened.delete(id)) opened.add(id); };
// one session a day per routine: a second tap reopens today's instead of starting a duplicate
const todays = computed(() => sessions.value.find(s => s.date === today()));
async function start() {
  const s = todays.value ?? store.addSession(props.routine);
  openOnly(s.id);
  await nextTick();
  document.querySelector(`[data-session="${s.id}"]`)?.scrollIntoView({block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
}
</script>

<template>
  <main class="fq-page" :class="{book}" :data-routine="routine">
    <div class="fq-col">
      <header class="fq-head">
        <span class="fq-tag fq-muted">Strength log</span>
        <h1 class="fq-title">{{ r.name }}</h1>
        <p class="summary">{{ r.summary }}</p>
      </header>
      <StrengthRoster :routine="r" :part="book ? undefined : 'warning'" />
    </div>

    <div class="fq-col">
      <button type="button" class="start" @click="start">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        {{ todays ? "Continue today's session" : "Start today's session" }}
      </button>

      <section class="log" aria-labelledby="log-title">
        <div class="log-head">
          <h2 id="log-title" class="log-title">Sessions</h2>
          <span v-if="sessions.length" class="fq-mini fq-muted">{{ sessions.length }} logged</span>
        </div>
        <p v-if="!sessions.length" class="empty fq-muted">No sessions yet. Start one when you walk into the gym and log each set as you go.</p>
        <ol v-else class="sessions">
          <li v-for="s in sessions" :key="s.id">
            <StrengthSessionCard :session="s" :routine="r" :open="opened.has(s.id)" @toggle="toggle(s.id)" />
          </li>
        </ol>
      </section>
    </div>

    <div v-if="!book" class="fq-col"><StrengthRoster :routine="r" part="exercises" /></div>
  </main>
</template>

<style scoped>
.summary { margin: 2px 0 0; color: var(--muted); font-size: 14.5px; }

.start {
  display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 64px; width: 100%; padding: 0 18px;
  border: 0; border-radius: var(--radius-pill); background: var(--rest); color: #062521; cursor: pointer;
  font-family: var(--display); font-weight: 800; font-size: 24px; text-transform: uppercase; letter-spacing: .02em;
  box-shadow: 0 8px 24px rgba(39, 196, 176, .25);
}
.start svg { width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 3; stroke-linecap: round; }
.start:active { transform: scale(.98); }

.log { display: flex; flex-direction: column; gap: 8px; }
.log-head { display: flex; align-items: baseline; justify-content: space-between; }
.log-title { font-size: 20px; font-weight: 800; color: var(--muted); }
.empty { margin: 0; padding: 18px; border: 1px dashed var(--line); border-radius: var(--radius-card); text-align: center; }
.sessions { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }

</style>
