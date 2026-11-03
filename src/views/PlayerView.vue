<script setup lang="ts">
import {computed, onBeforeUnmount, ref, watch} from 'vue';
import {useRouter} from 'vue-router';
import type {Step} from '@/types';
import {coach, getDay, planForDay} from '@/plan';
import {useLayout} from '@/composables/useLayout';
import BigButton from '@/components/BigButton.vue';
import BlockTimeline from '@/components/BlockTimeline.vue';
import CueBubble from '@/components/CueBubble.vue';
import ExercisePic from '@/components/ExercisePic.vue';
import GearChips from '@/components/GearChips.vue';
import Panes from '@/components/Panes.vue';
import PauseSheet from '@/components/PauseSheet.vue';
import PhasePill from '@/components/PhasePill.vue';
import PhaseScreen from '@/components/PhaseScreen.vue';
import PlayerControls from '@/components/PlayerControls.vue';
import RingTimer from '@/components/RingTimer.vue';
import RoundTracker from '@/components/RoundTracker.vue';
import SegmentBar from '@/components/SegmentBar.vue';
import UpNextCard from '@/components/UpNextCard.vue';
import {formatClock, phaseColor} from '@/components/phase';
import {usePlayerApi, useSettingsApi} from './player';
import {
  blockItemsTimeline, dayNumber, guidedCount, itemPhase, panelFor, phaseFor, progressFor, readyChecklist, roundsFor,
  sideLabel, stepTag, summariseDay, targetLabel, upNextAfter,
} from './viewModel';
import '@/styles/components.css';

const props = defineProps<{dayId: string}>();
const router = useRouter();
const player = usePlayerApi();
const settings = useSettingsApi();
const layout = useLayout();

const day = computed(() => getDay(props.dayId));
const plan = computed(() => planForDay(props.dayId));
watch(day, (d) => { if (!d) router.replace('/'); }, {immediate: true});

const split = computed(() => layout.value === 'book' || layout.value === 'tabletop');
const wideNow = computed(() => layout.value === 'shortWide' || layout.value === 'tabletop');
const active = computed(() => player.status !== 'idle' && player.day?.id === props.dayId);
const paused = computed(() => player.status === 'paused');
const estimateMs = computed(() => (day.value && plan.value ? summariseDay(day.value, plan.value, coach).totalSeconds * 1000 : 0));

const step = computed(() => (active.value ? player.step : null));
const panel = computed(() => panelFor(step.value));
const phase = computed(() => phaseFor(step.value));
const color = computed(() => phaseColor(phase.value));
const tag = computed(() => (day.value && step.value ? stepTag(day.value, step.value) : ''));
const progress = computed(() => (day.value ? progressFor(day.value, player.steps, player.index) : {segments: [], current: 0, progress: 0}));
const clock = computed(() => `${formatClock(player.totalElapsedMs)} / ${formatClock(estimateMs.value)}`);
const remainingMs = computed(() => player.stepRemainingMs ?? 0);
const totalMs = computed(() => remainingMs.value + player.stepElapsedMs);  // includes any +15 s
const countdown = computed(() => Math.max(0, Math.ceil(remainingMs.value / 1000)));
const countUp = (ms: number) => formatClock(Math.floor(ms / 1000) * 1000);

type Of<T extends Step['type']> = Extract<Step, {type: T}>;
const work = computed(() => (step.value?.type === 'work' ? step.value : null));
const rest = computed(() => (step.value?.type === 'rest' ? step.value : null));
const lead = computed(() => (step.value?.type === 'ready' || step.value?.type === 'transition' ? step.value as Of<'ready' | 'transition'> : null));
const leadItem = computed(() => (lead.value && day.value ? day.value.blocks[lead.value.blockIndex]?.items[0] : undefined));

const rounds = computed(() => (work.value && day.value && plan.value && work.value.rounds > 1 ? roundsFor(day.value, plan.value, work.value) : null));
const blockList = computed(() => (work.value && day.value && plan.value && !rounds.value ? blockItemsTimeline(day.value, plan.value, work.value) : []));
const upNext = computed(() => upNextAfter(player.steps, player.index));
const guided = computed(() => (work.value ? guidedCount(work.value, player.stepElapsedMs, coach) : null));
const checklist = computed(() => (day.value && plan.value ? readyChecklist(day.value, plan.value) : []));
const repsText = computed(() => (work.value?.item.rx.kind === 'reps' ? work.value.item.rx.reps.replace(/\s*-\s*/g, '–') : ''));
const tempoMs = computed(() => {
  const rx = work.value?.item.rx;
  if (rx?.kind === 'guided') return ((rx.tempo ?? (rx.hold ?? 0) + 2) * 1000);
  return 3200;
});

const ring = computed(() => ({book: 210, tabletop: 200, compact: 250, shortWide: 176}[layout.value]));
const ringSmall = computed(() => ({book: 180, tabletop: 170, compact: 210, shortWide: 150}[layout.value]));
const bigCount = computed(() => ({book: 210, tabletop: 230, compact: 200, shortWide: 170}[layout.value]));
const repsSize = computed(() => ({book: 60, tabletop: 76, compact: 76, shortWide: 60}[layout.value]));
const canNext = computed(() => player.index < player.steps.length - 1);
const showControls = computed(() => panel.value !== 'ready'
  && (split.value || panel.value === 'timed' || panel.value === 'guided' || panel.value === 'transition'));

// leaving mid-workout (back button, link) ends it; finishing hands over to the done screen
watch(() => player.status, (s) => { if (s === 'complete' && player.day?.id === props.dayId) router.replace(`/done/${props.dayId}`); });
onBeforeUnmount(() => { if (active.value && player.status !== 'complete') player.end(); });

const starting = ref(false);
async function begin() {
  if (starting.value || active.value) return;
  starting.value = true;
  try { await player.start(props.dayId); } finally { starting.value = false; }
}
const musicModes = [
  {mode: 'off', label: 'No music'},
  {mode: 'mix', label: 'With music'},
] as const;
const musicHelp = computed(() => (settings.music === 'off'
  ? 'Only the coach plays. Works with the ringer switch on silent.'
  : 'Your music keeps playing and the coach plays over it. Turn the ringer switch off silent, or you won’t hear the coach.'));
const checking = ref(false);
async function soundCheck() {
  if (checking.value) return;
  checking.value = true;
  try { await player.soundCheck(); } finally { checking.value = false; }
}
function tapScreen() { if (player.status === 'running') player.pause(); }
function toggle() { if (paused.value) player.resume(); else player.pause(); }
function fromSheet(action: 'previous' | 'skip') {
  if (action === 'previous') player.previous(); else player.next();
  player.resume();
}
function endWorkout() { player.end(); router.replace('/'); }
</script>

<template>
  <!-- the Tap to begin tap is the user gesture iOS needs before audio can play -->
  <PhaseScreen v-if="!active && day && plan" phase="ready" class="begin" role="button" tabindex="0"
    aria-label="Tap to begin" @click="begin" @keydown.enter="begin" @keydown.space.prevent="begin">
    <Panes :layout="layout">
      <template #now>
        <div class="col center">
          <span class="fq-tag" style="color: var(--ready)">{{ plan.dayLabel }} {{ dayNumber(plan, day.id) }} · {{ Math.round(estimateMs / 60000) }} min</span>
          <h1 class="fq-big begin-title">{{ day.title }}</h1>
          <p class="fq-muted hint">Turn your sound up and put the phone where you can see it.</p>
          <div class="music" @click.stop>
            <span class="fq-tag fq-muted">Music from another app?</span>
            <div class="seg-btns" role="radiogroup" aria-label="Music from another app">
              <button v-for="m in musicModes" :key="m.mode" type="button" role="radio" :aria-checked="settings.music === m.mode"
                :class="{on: settings.music === m.mode}" @click="settings.music = m.mode">{{ m.label }}</button>
            </div>
            <p class="fq-mini fq-muted music-help">{{ musicHelp }}</p>
            <BigButton size="md" variant="ghost" :disabled="checking" @click="soundCheck">{{ checking ? 'Listen…' : 'Sound check' }}</BigButton>
          </div>
        </div>
      </template>
      <template #context>
        <div class="col center">
          <div class="fq-big tap" style="color: var(--ready)">Tap to begin</div>
          <BigButton size="lg" phase="ready" @click.stop="begin">
            <template #icon><svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z" /></svg></template>
            Begin
          </BigButton>
          <RouterLink to="/" class="back fq-mini fq-muted" @click.stop>Back to plan</RouterLink>
        </div>
      </template>
    </Panes>
  </PhaseScreen>

  <PhaseScreen v-else-if="active && step && day && plan" :phase="phase" class="player" :class="[layout, panel, {paused}]"
    :data-panel="panel" :data-block="step.blockIndex" :data-side="work?.side" @click="tapScreen">
    <div v-if="!split" class="bar">
      <SegmentBar v-bind="progress" />
      <div class="between">
        <span class="fq-tag" :style="{color}">{{ tag }}</span>
        <span class="fq-mini fq-muted fq-num">{{ clock }}</span>
      </div>
    </div>

    <Panes :layout="layout">
      <template #now>
        <div class="col" :class="{dim: paused && split}">
          <span v-if="split" class="fq-tag" :style="{color}">{{ tag }}</span>

          <!-- ready -->
          <template v-if="panel === 'ready' && lead">
            <div class="fill grid-center"><div class="fq-big fq-num count" :style="{fontSize: `${bigCount}px`, color}">{{ countdown }}</div></div>
            <div v-if="!split" class="first">
              <span class="fq-mini fq-muted">First up</span>
              <div class="fq-big name-lg">{{ lead.first.name }}</div>
              <span v-if="leadItem" class="fq-mini fq-muted">{{ targetLabel(leadItem) }}</span>
            </div>
          </template>

          <!-- transition -->
          <template v-else-if="panel === 'transition' && lead">
            <div class="fq-big name-xl">{{ lead.blockName }}</div>
            <span class="fq-mini fq-muted">{{ lead.rounds > 1 ? `${lead.rounds} rounds` : 'One round' }} · grab your gear</span>
            <div class="fill grid-center">
              <RingTimer :remaining-ms="remainingMs" :total-ms="totalMs" phase="ready" :size="ringSmall" label="get ready" />
            </div>
          </template>

          <!-- timed work -->
          <template v-else-if="panel === 'timed' && work">
            <div class="fq-big name">{{ work.exercise.name }}</div>
            <PhasePill v-if="work.side" :phase="phase">{{ sideLabel(work.side) }}</PhasePill>
            <div class="fill" :class="wideNow ? 'side-by-side' : 'stack'">
              <div class="grid-center ring-box">
                <RingTimer :remaining-ms="remainingMs" :total-ms="totalMs" :phase="phase" :size="ring" />
              </div>
              <ExercisePic v-if="!split || wideNow" class="pic-fill" :images="work.exercise.images" :alt="work.exercise.name" :tempo-ms="tempoMs" />
            </div>
          </template>

          <!-- reps work -->
          <template v-else-if="panel === 'reps' && work">
            <ExercisePic class="pic-fill" :images="work.exercise.images" :alt="work.exercise.name" />
            <div v-if="!split && work.item.label" class="pills">
              <PhasePill :phase="phase">{{ work.item.label }}</PhasePill>
              <PhasePill v-if="upNext?.target && work.side !== 'left'">{{ upNext.name.replace('Rest, then ', '') }} next</PhasePill>
              <PhasePill v-if="work.side" :phase="phase">{{ sideLabel(work.side) }}</PhasePill>
            </div>
            <PhasePill v-else-if="work.side" :phase="phase">{{ sideLabel(work.side) }}</PhasePill>
            <div class="title-row">
              <div class="fq-big name">{{ work.exercise.name }}</div>
              <div class="target">
                <div class="fq-big fq-num reps" :style="{fontSize: `${repsSize}px`, color}">{{ repsText }}</div>
                <div class="fq-mini fq-muted fq-num">{{ work.item.rx.kind === 'reps' ? work.item.rx.unit ?? 'reps' : '' }}{{ work.item.perSide ? ' each side' : '' }} · set {{ countUp(player.stepElapsedMs) }}</div>
              </div>
            </div>
            <BigButton v-if="split" size="lg" class="push-down" @click.stop="player.done()">Done set</BigButton>
          </template>

          <!-- guided work -->
          <template v-else-if="panel === 'guided' && work && guided">
            <div class="fq-big name">{{ work.exercise.name }}</div>
            <PhasePill v-if="work.side" :phase="phase">{{ sideLabel(work.side) }}</PhasePill>
            <ExercisePic class="pic-fill" :images="work.exercise.images" :alt="work.exercise.name" :tempo-ms="tempoMs" />
            <div class="counter">
              <div class="count-box">
                <div class="fq-big fq-num count-md" :style="{color}">{{ guided.rep || '–' }}<span class="of">/{{ guided.reps }}</span></div>
                <span class="fq-mini fq-muted">{{ guided.rep ? 'rep' : 'get set' }}</span>
              </div>
              <div v-if="guided.holds" class="count-box">
                <div class="fq-big fq-num count-md">{{ guided.hold || '·' }}</div>
                <span class="fq-mini fq-muted">hold {{ guided.holds }} s</span>
              </div>
              <RingTimer class="push-right" :remaining-ms="remainingMs" :total-ms="totalMs" :phase="phase" :size="layout === 'compact' ? 120 : 104" label="left" />
            </div>
          </template>

          <!-- rest -->
          <template v-else-if="panel === 'rest' && rest">
            <div class="fill" :class="layout === 'shortWide' ? 'side-by-side' : 'grid-center'">
              <div class="grid-center"><RingTimer :remaining-ms="remainingMs" :total-ms="totalMs" phase="rest" :size="ring" /></div>
              <div v-if="layout === 'shortWide' && rest.next" class="next-text">
                <span class="fq-tag fq-muted">Up next{{ rest.next.item.label ? ` · ${rest.next.item.label}` : '' }}</span>
                <div class="fq-big name-lg">{{ rest.next.exercise.name }}</div>
                <span class="fq-mini fq-muted">{{ targetLabel(rest.next.item) }}{{ rest.next.side ? ` · ${rest.next.side} side` : '' }}</span>
              </div>
            </div>
            <UpNextCard v-if="layout === 'compact' && rest.next" :label="rest.next.item.label" :phase="itemPhase(rest.next.item)"
              :name="rest.next.exercise.name" :target="targetLabel(rest.next.item) + (rest.next.side ? ` · ${rest.next.side} side` : '')"
              :image="rest.next.exercise.images[0]" />
            <div v-if="split" class="btn-row">
              <BigButton variant="ghost" @click.stop="player.addRest(15)">+15 s</BigButton>
              <BigButton variant="ghost" @click.stop="player.next()">Skip rest</BigButton>
            </div>
          </template>
        </div>
      </template>

      <template #context>
        <div class="col">
          <template v-if="split">
            <SegmentBar v-bind="progress" />
            <div class="between">
              <span class="fq-tag fq-muted">{{ panel === 'rest' ? 'Up next' : panel === 'reps' && rounds ? 'Rounds' : step.blockName }}</span>
              <PhasePill v-if="panel === 'rest' && rest?.next?.item.label" :phase="itemPhase(rest.next.item)">{{ rest.next.item.label }}</PhasePill>
              <span v-else class="fq-mini fq-muted fq-num">{{ clock }}</span>
            </div>
          </template>

          <!-- ready: what to have ready -->
          <template v-if="panel === 'ready' && lead && split">
            <span class="fq-tag fq-muted">First up</span>
            <div class="fq-big name-lg">{{ lead.first.name }}</div>
            <span v-if="leadItem" class="fq-mini fq-muted">{{ targetLabel(leadItem) }}</span>
            <div class="fq-panel list">
              <span class="fq-tag fq-muted">Have ready for the {{ step.blockName.toLowerCase() }}</span>
              <div v-for="row in checklist" :key="row.name" class="row">
                <span>{{ row.name }}</span><span class="fq-mini fq-muted">{{ row.note ?? '✓' }}</span>
              </div>
            </div>
          </template>

          <!-- transition: gear and first move -->
          <template v-else-if="panel === 'transition' && lead?.type === 'transition'">
            <span class="fq-tag fq-muted">Grab</span>
            <GearChips :gear="lead.gear" label="Gear to grab" class="gear-lg" />
            <span class="fq-tag fq-muted">First up</span>
            <UpNextCard :label="leadItem?.label" :phase="phase" :name="lead.first.name" :target="leadItem ? targetLabel(leadItem) : undefined"
              :image="lead.first.images[0]" />
          </template>

          <!-- work: where you are in the block -->
          <template v-else-if="work && split">
            <RoundTracker v-if="rounds" :rows="rounds.rows" :rounds="rounds.rounds" :current="rounds.current" :phase="phase" />
            <div v-else-if="blockList.length > 1" class="fq-panel tl-panel"><BlockTimeline :items="blockList" dense /></div>
            <ExercisePic v-if="panel === 'timed' && layout === 'book'" class="pic-fill" :images="work.exercise.images" :alt="work.exercise.name" :tempo-ms="tempoMs" />
            <UpNextCard v-if="upNext && (panel === 'reps' || layout === 'book')" :label="upNext.label" :phase="upNext.phase" :name="upNext.name"
              :target="upNext.target" :image="upNext.label && upNext.phase !== 'rest' ? upNext.image : undefined" />
          </template>

          <!-- rest: the next move with its picture -->
          <template v-else-if="panel === 'rest' && rest?.next && split">
            <ExercisePic class="pic-fill" :images="rest.next.exercise.images" :alt="rest.next.exercise.name" />
            <div class="fq-big name">{{ rest.next.exercise.name }}</div>
            <span class="fq-mini fq-muted">{{ targetLabel(rest.next.item) }}{{ rest.next.side ? ` · ${rest.next.side} side` : '' }}{{ rest.next.exercise.note ? ` · ${rest.next.exercise.note}` : '' }}</span>
          </template>

          <CueBubble v-if="player.currentLine" :text="player.currentLine" :phase="phase" speaking class="cue" />
          <p v-if="panel === 'ready' || (panel === 'reps' && !split)" class="fq-mini fq-muted hint-line">
            {{ panel === 'reps' && upNext?.phase === 'rest' ? `Rest ${upNext.label} starts on Done · ` : '' }}Tap anywhere to pause
          </p>
          <PlayerControls v-if="showControls" class="controls" :paused="paused" :can-previous="player.index > 0" :can-next="canNext"
            @previous="player.previous()" @toggle="toggle" @next="player.next()" />
          <BigButton v-if="panel === 'reps' && !split" size="lg" class="push-down" @click.stop="player.done()">Done set</BigButton>
          <div v-if="panel === 'rest' && !split" class="btn-row push-down">
            <BigButton variant="ghost" @click.stop="player.addRest(15)">+15 s</BigButton>
            <BigButton variant="ghost" @click.stop="player.next()">Skip rest</BigButton>
          </div>
        </div>
        <PauseSheet v-if="split" :open="paused" :elapsed="`${formatClock(player.totalElapsedMs)} in`" :phase="phase === 'rest' ? 'rest' : 'work'"
          v-model:voice="settings.voice" v-model:beeps="settings.beeps" :can-previous="player.index > 0" :can-skip="canNext"
          @resume="player.resume()" @previous="fromSheet('previous')" @skip="fromSheet('skip')" @end="endWorkout" />
      </template>
    </Panes>

    <PauseSheet v-if="!split" :open="paused" :elapsed="`${formatClock(player.totalElapsedMs)} in`" :phase="phase === 'rest' ? 'rest' : 'work'"
      v-model:voice="settings.voice" v-model:beeps="settings.beeps" :can-previous="player.index > 0" :can-skip="canNext"
      @resume="player.resume()" @previous="fromSheet('previous')" @skip="fromSheet('skip')" @end="endWorkout" />
  </PhaseScreen>
</template>

<style scoped>
.player { cursor: pointer; user-select: none; }
.col { display: flex; flex-direction: column; gap: 10px; flex: 1; min-height: 0; min-width: 0; transition: opacity .2s; }
.col.dim { opacity: .3; }
.center { justify-content: center; }
.bar { display: flex; flex-direction: column; gap: 10px; flex: none; }
.between { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 22px; }
.fill { flex: 1 1 0; min-height: 0; }
.grid-center { display: grid; place-items: center; min-height: 0; }
.count { line-height: .85; }
.name { font-size: 28px; }
.name-lg { font-size: 32px; }
.name-xl { font-size: 46px; }
.first { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 4px; }
.stack { display: flex; flex-direction: column; gap: 10px; }
.stack .ring-box { flex: 1 1 auto; }
.side-by-side { display: flex; gap: 14px; align-items: center; }
.side-by-side > * { flex: 1 1 0; min-width: 0; }
.pic-fill { flex: 1 1 0; min-height: 80px; aspect-ratio: auto; height: auto; }
.side-by-side .pic-fill { align-self: stretch; height: auto; min-height: 0; max-height: 100%; }
.title-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; padding-bottom: 4px; }
.title-row .name { min-width: 0; }
.target { text-align: right; flex: none; }
.pills { display: flex; gap: 8px; flex-wrap: wrap; }
.push-down { margin-top: auto; flex: none; }
.push-right { margin-left: auto; }
.counter { display: flex; align-items: center; gap: 20px; flex: none; }
.count-box { display: flex; flex-direction: column; }
.count-md { font-size: 64px; }
.of { font-size: .45em; color: var(--muted); margin-left: 2px; }
.btn-row { display: flex; gap: 10px; flex: none; }
.next-text { display: flex; flex-direction: column; gap: 6px; }
.list { display: flex; flex-direction: column; gap: 2px; padding: 10px 14px; }
.row { display: flex; justify-content: space-between; gap: 8px; padding: 6px 0; border-top: 1px solid var(--line); font-size: 14px; }
.list .fq-tag + .row { border-top: 0; }
.tl-panel { padding: 8px 14px; }
.gear-lg :deep(.chip) { font-size: 13px; padding: 8px 14px; }
.hint-line { margin: 0; text-align: center; }
.ready .hint-line { margin-top: auto; }
.controls { margin-top: auto; flex: none; }
.cue { flex: none; }
/* compact/shortWide: the context half sits at the bottom with controls */
.compact :deep(.pane.context), .shortWide :deep(.pane.context) { flex: none; }

.begin { cursor: pointer; }
.begin-title { font-size: 40px; }
.tap { font-size: 54px; }
.hint { margin: 0; font-size: 14px; }
.music { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; width: 100%; max-width: 360px; cursor: default; }
.seg-btns { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; padding: 4px; border-radius: var(--radius-pill); background: var(--surface); border: 1px solid var(--line); }
.seg-btns button { min-height: 44px; border: 0; border-radius: var(--radius-pill); background: transparent; color: var(--muted); font-weight: 700; font-size: 14px; cursor: pointer; }
.seg-btns button.on { background: var(--ready); color: #1a1204; }
.music-help { margin: 0; min-height: 2.8em; }
.back { align-self: center; min-height: 44px; display: inline-flex; align-items: center; }
</style>
