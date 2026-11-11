<script setup lang="ts">
import {computed, nextTick, onMounted, ref} from 'vue';
import {useLayout} from '@/composables/useLayout';
import {useTrackerStore} from '@/stores/tracker';
import {tracker} from '@/tracker/config';
import {formatDate, streaks, today, weeksToShow} from '@/tracker/logic';
import HabitDay from '@/components/tracker/HabitDay.vue';
import HabitPicker from '@/components/tracker/HabitPicker.vue';

const layout = useLayout();
const store = useTrackerStore();
const book = computed(() => layout.value === 'book');

const HEAD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const short = (iso: string) => formatDate(iso);
const long = (iso: string) => formatDate(iso, 'day');

const now = today();
const target = tracker.weeklyTarget;
const cur = computed(() => Math.max(1, store.currentWeek));
const weeks = computed(() => {
  const n = weeksToShow(store.data.startDate, now, tracker.weeksShown);
  return Array.from({length: n}, (_, i) => store.week(i + 1));
});
const thisWeek = computed(() => weeks.value[cur.value - 1]);
const started = computed(() => store.currentWeek >= 1);

const sofar = computed(() => weeks.value.slice(0, cur.value));
const runs = computed(() => streaks(sofar.value));
const streak = computed(() => runs.value.current);
const stats = computed(() => {
  const best = runs.value.best;
  return [
    {label: 'On target', value: `${sofar.value.filter(w => w.achieved).length}/${sofar.value.length}`},
    {label: 'Sessions', value: String(sofar.value.reduce((n, w) => n + w.sessions, 0))},
    {label: 'Best streak', value: `${best} wk`},
  ];
});
const streakLine = computed(() => streak.value
  ? `${streak.value}-week streak${thisWeek.value.achieved ? '' : ' · hit this week to keep it'}`
  : `No streak yet: ${target} sessions in a week starts one`);
const toGo = computed(() => Math.max(0, target - thisWeek.value.sessions));

const picking = ref<string | null>(null);
let opener: HTMLElement | null = null;
function pick(date: string, e: Event) { opener = e.currentTarget as HTMLElement; picking.value = date; }
function close() { picking.value = null; opener?.focus({preventScroll: true}); }
function choose(id: string | null) { if (picking.value) store.setHabit(picking.value, id); close(); }

const wall = ref<HTMLElement | null>(null);
onMounted(async () => {
  await nextTick();
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  wall.value?.querySelector('[data-current]')?.scrollIntoView({block: 'center', behavior: reduce ? 'auto' : 'smooth'});
});
</script>

<template>
  <main class="fq-page habits" :class="layout">
    <section class="fq-col side">
      <header class="fq-head">
        <span class="fq-tag fq-muted">Habits</span>
        <h1 class="fq-title">Habit wall</h1>
        <span class="fq-mini fq-muted">
          <template v-if="started">Week {{ store.currentWeek }} · since {{ short(store.data.startDate) }}</template>
          <template v-else>Starts {{ short(store.data.startDate) }}</template>
        </span>
      </header>

      <section class="fq-panel now" :class="{won: thisWeek.achieved}" aria-labelledby="this-week">
        <div class="now-head">
          <div>
            <h2 id="this-week">This week</h2>
            <span class="fq-mini fq-muted">Week {{ cur }} · {{ short(thisWeek.dates[0]) }} to {{ short(thisWeek.dates[6]) }}</span>
          </div>
          <div class="score fq-num" aria-hidden="true"><b>{{ thisWeek.sessions }}</b>/{{ target }}</div>
        </div>
        <div class="meter" role="meter" :aria-valuenow="thisWeek.sessions" aria-valuemin="0" :aria-valuemax="target"
          :aria-label="`${thisWeek.sessions} of ${target} sessions this week`">
          <span v-for="i in target" :key="i" :class="{on: i <= thisWeek.sessions}" />
        </div>
        <div v-if="book" class="days big-days">
          <span v-for="h in HEAD" :key="h" class="dow fq-tag fq-muted" aria-hidden="true">{{ h }}</span>
          <HabitDay v-for="d in thisWeek.dates" :key="d" big :date="d" :label="long(d)" :habit="store.data.habits[d]"
            :today="d === now" :future="d > now" @pick="pick(d, $event)" />
        </div>
        <p class="status" :class="{won: thisWeek.achieved}">
          <template v-if="thisWeek.achieved">🌟 Target achieved</template>
          <template v-else>{{ toGo }} more session{{ toGo === 1 ? '' : 's' }} to hit your target</template>
        </p>
        <p class="fq-mini streak" :class="{hot: streak > 0}">{{ streakLine }}</p>
      </section>

      <dl class="stats">
        <div v-for="st in stats" :key="st.label" class="stat fq-panel">
          <dt class="fq-tag fq-muted">{{ st.label }}</dt>
          <dd class="fq-num">{{ st.value }}</dd>
        </div>
      </dl>

      <ul class="legend" aria-label="Activities">
        <li v-for="a in tracker.activities" :key="a.id" class="fq-mini" :style="{'--c': `var(--${a.color})`}">
          <span class="dot" aria-hidden="true" />{{ a.label }}
        </li>
      </ul>
    </section>

    <section ref="wall" class="fq-col wall" aria-label="All weeks">
      <div class="wall-head" aria-hidden="true">
        <span v-for="h in HEAD" :key="h" class="fq-tag fq-muted">{{ h.slice(0, 1) }}</span>
      </div>
      <ol class="weeks">
        <li v-for="w in weeks" :key="w.week" class="week" :class="{current: w.week === cur, ahead: w.dates[0] > now}"
          :data-current="w.week === cur ? '' : undefined">
          <div class="week-head">
            <span class="wk"><b>Week {{ w.week }}</b> <span class="fq-muted">{{ short(w.dates[0]) }}</span></span>
            <span class="badge fq-num" :class="{won: w.achieved}">
              <template v-if="w.achieved">🌟 Target achieved</template>
              <template v-else>{{ w.sessions }} / {{ target }} sessions</template>
            </span>
          </div>
          <div class="days">
            <HabitDay v-for="d in w.dates" :key="d" :date="d" :label="long(d)" :habit="store.data.habits[d]"
              :today="d === now" :future="d > now" @pick="pick(d, $event)" />
          </div>
        </li>
      </ol>
    </section>

    <HabitPicker :date="picking" :label="picking ? long(picking) : ''" :current="picking ? store.data.habits[picking] : undefined"
      :layout="layout" @pick="choose" @close="close" />
  </main>
</template>

<style scoped>
/* book: header and this week on the left half, the wall scrolls on the right */
.book .wall { gap: 0; }
.week { content-visibility: auto; contain-intrinsic-size: auto 96px; }

.now { display: flex; flex-direction: column; gap: 10px; position: relative; overflow: hidden; }
.now.won { border-color: color-mix(in srgb, var(--rest) 55%, var(--line)); box-shadow: 0 0 28px rgba(39, 196, 176, .18); }
.now-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
h2 { font-size: 24px; font-weight: 800; }
.score { font-family: var(--display); font-size: 24px; font-weight: 800; color: var(--muted); line-height: 1; }
.score b { font-size: 44px; color: var(--fg); }
.won .score b { color: var(--rest); }
.meter { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 6px; }
.meter span { height: 8px; border-radius: 4px; background: var(--surface-2); transition: background .2s, box-shadow .2s; }
.meter span.on { background: var(--rest); box-shadow: 0 0 10px rgba(39, 196, 176, .55); }
.status { margin: 0; font-weight: 800; font-size: 15px; }
.status.won { color: var(--rest); text-shadow: 0 0 14px rgba(39, 196, 176, .55); }
.streak { margin: -6px 0 0; color: var(--muted); }
.streak.hot { color: var(--ready); }

.days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
.big-days { gap: 6px; row-gap: 4px; }
.dow { text-align: center; font-size: 10px; }

.stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 0; }
.stat { padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.stat dt { font-size: 9.5px; letter-spacing: .1em; }
.stat dd { margin: 0; font-family: var(--display); font-size: 26px; font-weight: 800; line-height: 1; }
.legend { list-style: none; margin: 0; padding: 0 2px; display: flex; flex-wrap: wrap; gap: 6px 14px; }
.legend li { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); }
.dot { width: 10px; height: 10px; border-radius: 50%; background: var(--c); flex: none; }

.wall-head {
  position: sticky; top: 0; z-index: 2; display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px;
  padding: 8px 7px 6px; background: var(--bg); text-align: center;
}
.weeks { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.week { display: flex; flex-direction: column; gap: 6px; padding: 8px 6px; border-radius: 16px; border: 1px solid transparent; }
.week.current { background: var(--surface); border-color: var(--line); scroll-margin: 40px; }
.week.ahead .week-head { opacity: .55; }
.week-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 2px; }
.wk { font-size: 13px; white-space: nowrap; }
.wk b { font-family: var(--display); font-size: 16px; text-transform: uppercase; letter-spacing: .03em; }
.badge {
  font-size: 11.5px; font-weight: 800; padding: 3px 10px; border-radius: var(--radius-pill);
  background: var(--surface-2); color: var(--muted); white-space: nowrap;
}
.badge.won {
  background: color-mix(in srgb, var(--rest) 20%, transparent); color: var(--rest);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--rest) 60%, transparent), 0 0 14px rgba(39, 196, 176, .45);
}
</style>
