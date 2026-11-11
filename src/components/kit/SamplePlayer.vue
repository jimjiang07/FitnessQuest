<script setup lang="ts">
import {computed, ref} from 'vue';
import type {Layout} from '@/types';
import {useLayout} from '@/composables/useLayout';
import BigButton from '../BigButton.vue';
import CueBubble from '../CueBubble.vue';
import ExercisePic from '../ExercisePic.vue';
import Panes from '../Panes.vue';
import PauseSheet from '../PauseSheet.vue';
import PhasePill from '../PhasePill.vue';
import PhaseScreen from '../PhaseScreen.vue';
import PlayerControls from '../PlayerControls.vue';
import RoundTracker from '../RoundTracker.vue';
import SegmentBar from '../SegmentBar.vue';
import UpNextCard from '../UpNextCard.vue';

// Kit-only: a Day 2 rep set laid out the way the player will use Panes, with a working pause sheet.
const props = withDefaults(defineProps<{layout?: Layout; fill?: boolean}>(), {fill: false});
const live = useLayout();
const layout = computed(() => props.layout ?? live.value);
const split = computed(() => layout.value === 'book' || layout.value === 'tabletop');

const paused = ref(false);
const voice = ref(true);
const beeps = ref(true);
</script>

<template>
  <PhaseScreen phase="work" :fill="fill" class="sample" :class="{framed: !fill}" @click="paused = true">
    <SegmentBar v-if="!split" :segments="['cool', 'work', 'work', 'ready', 'cool']" :current="1" :progress="0.4" />
    <Panes :layout="layout">
      <template #now>
        <ExercisePic class="pic-fill" :images="['exercises/swiss-ball-ham-curl-a.jpg', 'exercises/swiss-ball-ham-curl-b.jpg']" alt="Swiss ball hamstring curl" />
        <span class="fq-tag" style="color: var(--work)">Superset A · A1 · Round 2 of 3</span>
        <div class="title-row">
          <div class="fq-big name">Swiss ball hamstring curl</div>
          <div class="target">
            <div class="fq-big reps">10–12</div>
            <div class="fq-mini fq-muted fq-num">reps · set 0:34</div>
          </div>
        </div>
        <BigButton size="lg" class="done" @click.stop>Done set</BigButton>
      </template>
      <template #context>
        <div class="between">
          <span class="fq-tag fq-muted">Rounds</span>
          <span class="fq-mini fq-muted fq-num">21:06 / 58:00</span>
        </div>
        <RoundTracker :rows="['A1', 'A2']" :rounds="3" :current="{row: 0, round: 2}" />
        <UpNextCard v-if="split" label="45s" phase="rest" name="Rest, then A2" target="DB Bulgarian split squat" />
        <PhasePill v-else>A2 next · DB Bulgarian split squat</PhasePill>
        <CueBubble text="Hips up, heels drive the ball in. Slow on the way out." speaking />
        <PlayerControls class="ctl" :paused="paused" @toggle="paused = !paused" />
        <PauseSheet v-if="split" :open="paused" elapsed="21:06 in" v-model:voice="voice" v-model:beeps="beeps"
          @resume="paused = false" @previous="paused = false" @skip="paused = false" @end="paused = false" />
      </template>
    </Panes>
    <PauseSheet v-if="!split" :open="paused" elapsed="21:06 in" v-model:voice="voice" v-model:beeps="beeps"
      @resume="paused = false" @previous="paused = false" @skip="paused = false" @end="paused = false" />
  </PhaseScreen>
</template>

<style scoped>
.sample { cursor: pointer; }
.framed { flex: 1; min-height: 0; }
.now .pic-fill { flex: 1 1 0; min-height: 90px; aspect-ratio: auto; height: auto; }
.title-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
.name { font-size: 28px; min-width: 0; }
.target { text-align: right; flex: none; }
.reps { font-size: 60px; color: var(--work); }
.done { margin-top: auto; }
.between { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ctl { margin-top: auto; }
</style>
