<script setup lang="ts">
import {useLayout} from '@/composables/useLayout';

const layout = useLayout();
const REPO = 'https://github.com/jimjiang07/FitnessQuest';
const PLAN_FILE = `${REPO}/blob/main/data/plans/spine-rehab.yaml`;

interface Licence {name: string; url: string}
const CC_BY_2: Licence = {name: 'CC BY 2.0', url: 'https://creativecommons.org/licenses/by/2.0/'};
const CC_BY_SA_3: Licence = {name: 'CC BY-SA 3.0', url: 'https://creativecommons.org/licenses/by-sa/3.0/'};
const flickr = (id: string) => `https://www.flickr.com/photos/182613284@N02/${id}`;

// mirrors public/exercises/CREDITS.md; CC BY and BY-SA need title, author, licence and source shown in the app
const photos: {exercise: string; title: string; author: string; licence: Licence; sources: string[]}[] = [
  {exercise: 'Bird dog', title: 'Girl doing bird dog yoga pose (1 and 2)', author: 'PTPioneer', licence: CC_BY_2,
    sources: [flickr('48833762938'), flickr('48834307337')]},
  {exercise: 'Swiss ball wall squat', title: 'Stability ball squats outdoors (1 and 2)', author: 'PTPioneer', licence: CC_BY_2,
    sources: [flickr('48834348157'), flickr('48833809798')]},
  {exercise: 'Stir the pot', title: 'Stability ball plank Exercise', author: 'PTPioneer', licence: CC_BY_2,
    sources: [flickr('48834392537')]},
  {exercise: 'Sphinx', title: 'IMG 0549 2 Sphinx', author: 'Christy Collins', licence: CC_BY_SA_3,
    sources: ['https://commons.wikimedia.org/wiki/File:IMG_0549_2_Sphinx.jpg']},
];
const drawn = ['B-stance hinge', 'suitcase carry', 'psoas 90/90', 'figure 4', 'dumbbell pullover', 'plank shoulder tap', 'McGill curl-up', 'neck exercises'];
</script>

<template>
  <main class="about" :class="layout">
    <div class="col">
      <header class="top">
        <span class="fq-tag fq-muted">About</span>
        <h1 class="title">Fitness Quest</h1>
      </header>

      <section class="fq-panel">
        <p>
          A voice coach for a 4-day spine rehab plan. Pick a day, press Start, and the coach calls every exercise, set,
          rest and side switch, with a timer and a picture of each move. No login, no tracking, and it works offline
          once you've opened it.
        </p>
      </section>

      <section class="fq-panel">
        <h2>Change the plan</h2>
        <p>
          The whole workout is one file, <code>data/plans/spine-rehab.yaml</code>. Edit it, push to <code>main</code>,
          and the app updates; no code changes needed.
        </p>
        <p class="links">
          <a :href="PLAN_FILE" target="_blank" rel="noopener">Open the plan file</a>
          <a :href="REPO" target="_blank" rel="noopener">Source on GitHub</a>
        </p>
      </section>

      <section class="fq-panel">
        <h2>Use it in the gym</h2>
        <p>
          On iPhone, open the app in Safari, tap Share, then Add to Home Screen. After one visit the pictures and the
          coach's voice are saved on the phone, so a workout runs with no signal. Updates arrive the next time you open
          it with a connection.
        </p>
      </section>
    </div>

    <div class="col">
      <section class="fq-panel">
        <h2>Photo credits</h2>
        <ul class="credits">
          <li v-for="p in photos" :key="p.exercise" class="credit">
            <span class="fq-tag ex">{{ p.exercise }}</span>
            <span class="what">“{{ p.title }}” by {{ p.author }}</span>
            <span class="meta">
              <a :href="p.licence.url" target="_blank" rel="noopener" class="lic">{{ p.licence.name }}</a>
              <a v-for="(s, i) in p.sources" :key="s" :href="s" target="_blank" rel="noopener">
                Source{{ p.sources.length > 1 ? ` ${i + 1}` : '' }}
              </a>
            </span>
          </li>
        </ul>
        <p class="fq-mini fq-muted">Photos are resized to 900 px; otherwise unmodified.</p>
        <p>
          All other exercise photos are from
          <a href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noopener">free-exercise-db</a>
          (Unlicense, public domain).
        </p>
        <p>Illustrations for the {{ drawn.join(', ') }} are drawn for this app.</p>
      </section>

      <section class="fq-panel">
        <h2>Coach voice</h2>
        <p>Recorded with a Microsoft neural voice (en-AU William) through edge-tts. Anything not recorded uses your device's voice.</p>
      </section>

      <RouterLink to="/" class="back">Back to plan</RouterLink>
    </div>
  </main>
</template>

<style scoped>
.about {
  min-height: 100%;
  margin: 0 auto;
  padding: max(22px, env(safe-area-inset-top)) max(18px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left));
  display: flex; flex-direction: column; gap: 12px; max-width: 900px;
}
/* book: one column per half so nothing sits on the fold */
.about.book { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); column-gap: var(--fold-gutter); max-width: none; align-items: start; }
.col { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.top { display: flex; flex-direction: column; gap: 4px; padding: 2px 2px 4px; }
.title { font-size: clamp(38px, 10vw, 52px); font-weight: 800; }
.book .title { font-size: 44px; }
h2 { font-size: 22px; font-weight: 800; margin-bottom: 6px; }
p { margin: 0 0 8px; overflow-wrap: anywhere; }
p:last-child { margin-bottom: 0; }
code { font-size: 13px; background: var(--surface-2); padding: 1px 6px; border-radius: 6px; overflow-wrap: anywhere; }
a { color: var(--work); font-weight: 600; }
.links { display: flex; flex-wrap: wrap; gap: 0 18px; }
.links a, .meta a { display: inline-flex; align-items: center; min-height: 44px; }
.credits { list-style: none; margin: 0 0 8px; padding: 0; display: flex; flex-direction: column; }
.credit { display: flex; flex-direction: column; padding: 10px 0 2px; border-top: 1px solid var(--line); }
.credit:first-child { border-top: 0; padding-top: 0; }
.ex { color: var(--muted); }
.what { font-weight: 600; overflow-wrap: anywhere; }
.meta { display: flex; flex-wrap: wrap; gap: 0 16px; }
.lic { color: var(--fg); }
.back {
  display: flex; align-items: center; justify-content: center; min-height: var(--tap-min); margin-top: 4px;
  border-radius: var(--radius-pill); background: var(--surface-2); color: var(--fg); font-weight: 800; font-size: 16px;
  text-decoration: none;
}
</style>
