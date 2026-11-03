<script setup lang="ts">
import {onMounted, onBeforeUnmount, ref} from 'vue';
import {useLayout} from '@/composables/useLayout';
import BigButton from '@/components/BigButton.vue';
import BlockTimeline from '@/components/BlockTimeline.vue';
import CueBubble from '@/components/CueBubble.vue';
import DayCard from '@/components/DayCard.vue';
import ExercisePic from '@/components/ExercisePic.vue';
import GearChips from '@/components/GearChips.vue';
import PauseSheet from '@/components/PauseSheet.vue';
import PhasePill from '@/components/PhasePill.vue';
import PhaseScreen from '@/components/PhaseScreen.vue';
import PlayerControls from '@/components/PlayerControls.vue';
import RingTimer from '@/components/RingTimer.vue';
import RoundTracker from '@/components/RoundTracker.vue';
import SegmentBar from '@/components/SegmentBar.vue';
import UpNextCard from '@/components/UpNextCard.vue';
import ScaledFrame from '@/components/kit/ScaledFrame.vue';
import SamplePlayer from '@/components/kit/SamplePlayer.vue';
import type {Phase, TimelineItem} from '@/components/phase';
import '@/styles/components.css';

// Gallery of every kit component and state, with sample data from the real plan (Day 2).
const layout = useLayout();
const size = ref('');
const measure = () => { size.value = `${window.innerWidth}×${window.innerHeight}`; };
onMounted(() => { measure(); window.addEventListener('resize', measure); });
onBeforeUnmount(() => window.removeEventListener('resize', measure));

const phases: Phase[] = ['work', 'rest', 'ready', 'cool'];
const pic = (key: string) => [`exercises/${key}-a.jpg`, `exercises/${key}-b.jpg`];

const days = [
  {n: 1, title: 'Upper push/pull + anti-rotation core', detail: 'Anchor: Plank shoulder taps · DB, bench'},
  {n: 2, title: 'Posterior chain + anti-shear glute strength', detail: 'Anchor: B-stance hinge · DB, Swiss ball'},
  {n: 3, title: 'Upper vertical & arms + anti-extension core', detail: 'Anchor: Swiss ball dead bug · DB, bench'},
  {n: 4, title: 'Quad dominance + lateral hip & pelvic stability', detail: 'Anchor: Suitcase carry · DB, Swiss ball, bench'},
];
const selectedDay = ref(2);

const day2: TimelineItem[] = [
  {name: 'Warm-up', detail: 'Cat-camel · Bird-dog · Bridges · Hip flexor', seconds: 600, phase: 'cool'},
  {name: 'Superset A × 3', detail: 'Swiss ball hamstring curl · DB Bulgarian split squat', seconds: 840, phase: 'work'},
  {name: 'Superset B × 3', detail: 'B-stance DB hip hinge · Single-leg glute bridge', seconds: 840, phase: 'work'},
  {name: 'Finisher × 3', detail: 'Swiss ball stir-the-pot', seconds: 600, phase: 'ready'},
  {name: 'Cool-down', detail: '90/90 psoas · Sphinx · Figure-4', seconds: 480, phase: 'cool'},
];
const day2Live: TimelineItem[] = day2.map((it, i) => ({...it, state: i === 0 ? 'done' : i === 1 ? 'now' : 'todo'}));

const paused = ref(false);
const sheetOpen = ref(true);
const voice = ref(true);
const beeps = ref(false);
const confirmSheet = ref<InstanceType<typeof PauseSheet> | null>(null);
onMounted(() => { if (confirmSheet.value) confirmSheet.value.confirming = true; });
const log = ref('Tap a control');

const frames = [
  {layout: 'book', w: 890, h: 626, fold: 'vertical', name: 'Book · Duo inner, landscape'},
  {layout: 'tabletop', w: 626, h: 890, fold: 'horizontal', name: 'Tabletop · Duo inner, upright'},
  {layout: 'shortWide', w: 466, h: 678, fold: undefined, name: 'Short-wide · Duo outer'},
  {layout: 'compact', w: 390, h: 844, fold: undefined, name: 'Compact · iPhone'},
] as const;
</script>

<template>
  <main class="kit">
    <header class="top">
      <div>
        <div class="fq-tag fq-muted">Fitness Quest</div>
        <h1>Component kit</h1>
      </div>
      <p class="readout" data-testid="layout-readout">Layout: <b>{{ layout }}</b> <span class="fq-muted fq-num">{{ size }}</span></p>
    </header>

    <section>
      <h2>Ring timer</h2>
      <div class="row">
        <RingTimer :remaining-ms="18000" :total-ms="30000" phase="cool" />
        <RingTimer :remaining-ms="9000" :total-ms="45000" phase="rest" :size="180" />
        <RingTimer :remaining-ms="27000" :total-ms="30000" phase="work" :size="150" label="left side" />
        <RingTimer :remaining-ms="0" :total-ms="10000" phase="ready" :size="120" label="go" />
      </div>
    </section>

    <section>
      <h2>Segment bar</h2>
      <div class="stack narrow">
        <SegmentBar :segments="['cool', 'work', 'work', 'ready', 'cool']" :current="0" :progress="0" />
        <SegmentBar :segments="['cool', 'cool', 'cool', 'cool', 'work', 'work', 'work', 'work', 'cool']" :current="3" :progress="0.6" />
        <SegmentBar :segments="['cool', 'work', 'work', 'ready', 'cool']" :current="2" :progress="0.46" />
        <SegmentBar :segments="['cool', 'work', 'work', 'ready', 'cool']" :current="5" />
      </div>
    </section>

    <section>
      <h2>Cue bubble</h2>
      <div class="grid">
        <CueBubble phase="ready" speaking text="Welcome to day two. Grab a mat. We start with cat-camel, small and slow." />
        <CueBubble phase="cool" speaking text="Squeeze the back glute. Feel the front of the hip open." />
        <CueBubble phase="work" text="Hips up, heels drive the ball in. Slow on the way out." />
        <CueBubble phase="rest" text="Up next, dumbbell Bulgarian split squats. Grab your dumbbells." />
      </div>
      <p class="note">Top two are speaking (wave moves); bottom two are silent.</p>
    </section>

    <section>
      <h2>Exercise picture</h2>
      <div class="grid pics">
        <figure><ExercisePic :images="pic('swiss-ball-ham-curl')" alt="Swiss ball hamstring curl" /><figcaption>A/B, 3.2 s tempo</figcaption></figure>
        <figure><ExercisePic :images="pic('db-bulgarian-split-squat')" :tempo-ms="1600" alt="DB Bulgarian split squat" /><figcaption>A/B, 1.6 s tempo</figcaption></figure>
        <figure><ExercisePic :images="['exercises/b-stance-hinge-a.svg', 'exercises/b-stance-hinge-b.svg']" alt="B-stance DB hip hinge" /><figcaption>Illustration</figcaption></figure>
        <figure><ExercisePic :images="['exercises/sphinx-a.jpg']" alt="Sphinx" /><figcaption>One image: still</figcaption></figure>
        <figure><div class="empty"><ExercisePic :images="[]" alt="No picture" /></div><figcaption>No images: renders nothing</figcaption></figure>
      </div>
      <p class="note">Tap a picture for full screen; tap again to close.</p>
    </section>

    <section>
      <h2>Big button</h2>
      <div class="grid">
        <BigButton>
          <template #icon><svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z" /></svg></template>
          Start workout
        </BigButton>
        <BigButton size="lg">Done set</BigButton>
        <BigButton variant="ghost">+15 s</BigButton>
        <BigButton variant="ghost">Back to plan</BigButton>
        <BigButton phase="rest">Skip rest</BigButton>
        <BigButton phase="cool">Next stretch</BigButton>
        <BigButton disabled>Disabled</BigButton>
      </div>
    </section>

    <section>
      <h2>Phase pill</h2>
      <div class="row">
        <PhasePill phase="work">A1</PhasePill>
        <PhasePill phase="cool">Left side · then right</PhasePill>
        <PhasePill phase="rest">Rest 45 s</PhasePill>
        <PhasePill phase="ready">Get ready</PhasePill>
        <PhasePill>A2 next</PhasePill>
      </div>
    </section>

    <section>
      <h2>Round tracker</h2>
      <div class="grid">
        <div class="card"><div class="fq-tag fq-muted">Not started</div><RoundTracker :rows="['A1', 'A2']" :rounds="3" :current="null" /></div>
        <div class="card"><div class="fq-tag fq-muted">A1 · Round 2</div><RoundTracker :rows="['A1', 'A2']" :rounds="3" :current="{row: 0, round: 2}" /></div>
        <div class="card"><div class="fq-tag fq-muted">Finisher · Round 3</div><RoundTracker :rows="['C1']" :rounds="3" :current="{row: 0, round: 3}" phase="ready" /></div>
        <div class="card"><div class="fq-tag fq-muted">Complete</div><RoundTracker :rows="['B1', 'B2']" :rounds="3" :current="null" complete /></div>
      </div>
    </section>

    <section>
      <h2>Up next card</h2>
      <div class="grid">
        <UpNextCard label="A2" name="DB Bulgarian split squat" target="8–10 reps each leg · rest 75 s" />
        <UpNextCard label="45s" phase="rest" name="Rest, then A2" target="DB Bulgarian split squat" />
        <UpNextCard label="B1" :image="pic('db-step-up')[0]" name="DB step-ups" target="10 reps each leg" />
        <UpNextCard name="Cool-down" target="90/90 psoas · Sphinx · Figure-4" phase="cool" />
      </div>
    </section>

    <section>
      <h2>Player controls</h2>
      <div class="row">
        <PlayerControls :paused="paused" @previous="log = 'previous'" @toggle="paused = !paused; log = 'toggle'" @next="log = 'next'" />
        <PlayerControls paused :can-previous="false" />
        <PlayerControls :paused="false" :can-next="false" />
      </div>
      <p class="note">Last event: {{ log }}. Second: paused on the first step. Third: last step.</p>
    </section>

    <section>
      <h2>Pause sheet</h2>
      <div class="grid sheets">
        <div class="pane-demo">
          <div class="fq-big ghost-text">DB Bulgarian split squat</div>
          <PauseSheet :open="sheetOpen" elapsed="24:51 in" v-model:voice="voice" v-model:beeps="beeps"
            @resume="sheetOpen = false" @end="sheetOpen = false" />
          <BigButton v-if="!sheetOpen" variant="ghost" class="reopen" @click="sheetOpen = true">Pause</BigButton>
        </div>
        <div class="pane-demo">
          <div class="fq-big ghost-text">DB Bulgarian split squat</div>
          <PauseSheet ref="confirmSheet" open elapsed="24:51 in" :voice="true" :beeps="true" />
        </div>
      </div>
      <p class="note">Each sheet stays inside its pane. Left: voice on, beeps off. Right: the "End workout?" step.</p>
    </section>

    <section>
      <h2>Day card</h2>
      <div class="grid">
        <div class="stack">
          <DayCard v-for="d in days" :key="d.n" :number="d.n" :title="d.title" :detail="d.detail" :next="d.n === 2" />
        </div>
        <div class="stack">
          <DayCard v-for="d in days" :key="d.n" dense :number="d.n" :title="d.title" :detail="d.detail.split(' · ')[0]"
            :next="d.n === 2" :selected="d.n === selectedDay" @select="selectedDay = d.n" />
        </div>
      </div>
    </section>

    <section>
      <h2>Block timeline and gear</h2>
      <div class="grid">
        <div class="card"><BlockTimeline :items="day2" /><GearChips :gear="['dumbbells', 'swiss ball', 'bench']" /></div>
        <div class="card"><BlockTimeline :items="day2" dense /><GearChips :gear="['mat']" /></div>
        <div class="card"><BlockTimeline :items="day2Live" dense /></div>
      </div>
    </section>

    <section>
      <h2>Phase screen</h2>
      <div class="grid">
        <PhaseScreen v-for="p in [...phases, 'done' as const, 'none' as const]" :key="p" :phase="p" :fill="false" class="tint">
          <span class="fq-tag" :style="{color: p === 'none' || p === 'done' ? 'var(--muted)' : `var(--${p})`}">{{ p }}</span>
        </PhaseScreen>
      </div>
    </section>

    <section>
      <h2>Layouts</h2>
      <p class="note">Live: this screen at the current layout (<b>{{ layout }}</b>). Tap it to open the pause sheet.</p>
    </section>
  </main>

  <div class="live" data-testid="live-layout">
    <SamplePlayer fill />
    <div v-if="layout === 'book'" class="fold v" aria-hidden="true" />
    <div v-if="layout === 'tabletop'" class="fold h" aria-hidden="true" />
  </div>

  <main class="kit">
    <section>
      <p class="note">Each layout at its device size, with the fold drawn on.</p>
      <div class="frames">
        <figure v-for="f in frames" :key="f.layout" :class="f.layout">
          <ScaledFrame :width="f.w" :height="f.h" :fold="f.fold"><SamplePlayer :layout="f.layout" /></ScaledFrame>
          <figcaption>{{ f.name }} · {{ f.w }}×{{ f.h }}</figcaption>
        </figure>
      </div>
    </section>
  </main>
</template>

<style scoped>
.kit { max-width: 1100px; margin: 0 auto; padding: 32px max(16px, env(safe-area-inset-left, 0px)) 40px; display: flex; flex-direction: column; gap: 40px; }
.top { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 12px; }
h1 { font-size: clamp(40px, 7vw, 64px); font-weight: 800; }
h2 { font-size: 26px; font-weight: 700; margin-bottom: 14px; }
.readout { margin: 0; padding: 8px 14px; border-radius: var(--radius-pill); background: var(--surface); border: 1px solid var(--line); font-size: 14px; }
.readout b { color: var(--work); }
section { min-width: 0; }
.row { display: flex; flex-wrap: wrap; align-items: center; gap: 20px; }
.stack { display: flex; flex-direction: column; gap: 10px; }
.narrow { max-width: 420px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr)); gap: 16px; align-items: start; }
.pics { grid-template-columns: repeat(auto-fill, minmax(min(200px, 100%), 1fr)); }
figure { margin: 0; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
figcaption, .note { margin: 10px 0 0; color: var(--muted); font-size: 13px; }
figcaption { margin: 0; }
.empty { aspect-ratio: 3 / 2; border: 2px dashed var(--line); border-radius: 14px; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-card); padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.sheets { grid-template-columns: repeat(auto-fill, minmax(min(380px, 100%), 1fr)); }
.pane-demo { position: relative; height: 520px; border-radius: 20px; border: 1px solid var(--line); background: radial-gradient(120% 60% at 50% 0%, rgba(255, 92, 57, .22), transparent 60%), var(--bg); padding: 16px; overflow: hidden; }
.ghost-text { font-size: 30px; opacity: .5; }
.reopen { position: absolute; left: 16px; right: 16px; bottom: 16px; width: auto; }
.tint { height: 120px; border-radius: var(--radius-card); border: 1px solid var(--line); }
.live { position: relative; display: flex; flex-direction: column; border-block: 1px solid var(--line); }
.fold { position: absolute; pointer-events: none; z-index: 40; background: rgba(255, 255, 255, .05); }
.fold::after { content: ""; position: absolute; background: rgba(255, 255, 255, .28); }
.fold.v { top: 0; bottom: 0; left: calc(50% - var(--fold-gutter) / 2); width: var(--fold-gutter); }
.fold.v::after { top: 0; bottom: 0; left: 50%; width: 1px; }
.fold.h { left: 0; right: 0; top: calc(50% - var(--fold-gutter) / 2); height: var(--fold-gutter); }
.fold.h::after { left: 0; right: 0; top: 50%; height: 1px; }
.frames { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(420px, 100%), 1fr)); gap: 28px 20px; align-items: start; }
.frames .book { grid-column: 1 / -1; }
</style>
