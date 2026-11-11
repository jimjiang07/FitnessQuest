<script setup lang="ts">
import {computed} from 'vue';
import type {BodyEntry} from '@/types';
import {addDays, daysBetween, formatDate} from '@/tracker/logic';

const props = defineProps<{entries: BodyEntry[]}>();

interface Point {date: string; v: number}
interface Trend {key: 'waist' | 'weight'; label: string; unit: string; points: Point[]; latest: number; total: number | null; recent: number | null; path: string; dot: [number, number]}

const W = 120, H = 36, PAD = 3;
const oldestFirst = computed(() => [...props.entries].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)));

function build(key: 'waist' | 'weight', label: string, unit: string): Trend | null {
  const points = oldestFirst.value.flatMap(e => (e[key] == null ? [] : [{date: e.date, v: e[key] as number}]));
  if (!points.length) return null;
  const first = points[0], last = points.at(-1)!;
  // 4-week change: from the earliest reading in the 28 days up to the latest one
  const cutoff = addDays(last.date, -28);
  const from = points.find(p => p.date >= cutoff)!;
  const span = Math.max(1, daysBetween(first.date, last.date));
  const vs = points.map(p => p.v), lo = Math.min(...vs), hi = Math.max(...vs), range = hi - lo || 1;
  // x follows the calendar, so a gap in logging shows as a gap
  const xy = points.map(p => [
    points.length === 1 ? W / 2 : PAD + (daysBetween(first.date, p.date) / span) * (W - PAD * 2),
    hi === lo ? H / 2 : PAD + (1 - (p.v - lo) / range) * (H - PAD * 2),
  ] as [number, number]);
  return {
    key, label, unit, points, latest: last.v,
    total: points.length > 1 ? last.v - first.v : null,
    recent: from !== last ? last.v - from.v : null,
    path: xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' '),
    dot: xy.at(-1)!,
  };
}

const trends = computed(() => [build('waist', 'Waist', 'cm'), build('weight', 'Weight', 'kg')].filter((t): t is Trend => !!t));
const firstDate = computed(() => oldestFirst.value[0]?.date);

const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(n).toFixed(1)}`;
// both falling is the goal, so down reads as progress
const tone = (n: number | null) => (n == null || Math.abs(n) < 0.05 ? 'flat' : n < 0 ? 'good' : 'up');
const shortDate = (iso: string) => formatDate(iso);
</script>

<template>
  <section class="trends fq-panel" aria-labelledby="trends-h">
    <h2 id="trends-h">Trends</h2>
    <p v-if="!trends.length" class="fq-muted empty">Log your waist and weight a few mornings a week and the trend shows here.</p>
    <div v-for="t in trends" :key="t.key" class="trend" :data-trend="t.key">
      <div class="now">
        <span class="fq-tag fq-muted">{{ t.label }}</span>
        <span class="val fq-big fq-num">{{ t.latest.toFixed(1) }}<small>{{ t.unit }}</small></span>
      </div>
      <svg class="spark" :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" role="img"
        :aria-label="`${t.label} over ${t.points.length} readings`">
        <path :d="t.path" />
        <circle :cx="t.dot[0]" :cy="t.dot[1]" r="2.6" />
      </svg>
      <dl class="deltas">
        <div :class="tone(t.total)">
          <dt>Since {{ firstDate ? shortDate(firstDate) : 'start' }}</dt>
          <dd class="fq-num">{{ t.total == null ? '—' : `${signed(t.total)} ${t.unit}` }}</dd>
        </div>
        <div :class="tone(t.recent)">
          <dt>Last 4 weeks</dt>
          <dd class="fq-num">{{ t.recent == null ? '—' : `${signed(t.recent)} ${t.unit}` }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>

<style scoped>
.trends { display: flex; flex-direction: column; gap: 12px; }
h2 { font-size: 22px; font-weight: 800; }
.empty { margin: 0; }
.trend { display: grid; grid-template-columns: auto minmax(0, 1fr); grid-template-areas: 'now spark' 'deltas deltas'; gap: 6px 14px; align-items: center; padding-top: 10px; border-top: 1px solid var(--line); }
.trend:first-of-type { border-top: 0; padding-top: 0; }
.now { grid-area: now; display: flex; flex-direction: column; }
.val { font-size: 40px; }
.val small { font-size: 16px; color: var(--muted); margin-left: 3px; }
.spark { grid-area: spark; width: 100%; height: 44px; overflow: visible; }
.spark path { fill: none; stroke: var(--rest); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }
.spark circle { fill: var(--rest); }
.deltas { grid-area: deltas; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0; }
.deltas div { background: var(--surface-2); border-radius: 12px; padding: 6px 10px; }
dt { font-size: 12px; color: var(--muted); }
dd { margin: 0; font-weight: 800; font-size: 17px; }
.good dd { color: var(--rest); }
.up dd { color: var(--ready); }
</style>
