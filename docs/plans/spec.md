# Fitness Quest: plan

A no-login web app that runs the 4-day Spine Rehab split as guided, voice-coached workouts, like an
F45 or Fitstop class. You pick a day and press Start. The app then calls every exercise, set, rest and side
switch in order. Plan data is hard-coded. No accounts, no backend, no tracking.

- Repo: `~/Documents/fitnessQuest`
- Design board: `docs/design/design-board.html`, images in `docs/design/images/`
- Stack: copied from HeroQuest (Vue 3 + Vite + TS, Pinia, Vue Router hash mode, Vitest, Playwright, GitHub Pages)

## Decisions

| Topic | Decision | Why |
|---|---|---|
| Rep sets | You lift at your own pace and tap **Done set**. Rest then starts by itself. A set timer counts up. | Apple Fitness+ and F45 use fixed time windows, but this plan is written in reps, and rushing loaded lifts is bad for a disc injury. |
| Timed work | Holds, carries, stretches and stir-the-pot count down and move on by themselves. | These are written as time in the plan. |
| Guided tempo | Bird-dog (5 s holds), glute bridges (2 s hold), Pallof press (2 s hold), dead bug, cat-camel: the coach counts each rep. | The hold is the point of these moves. Counting for you keeps you hands-free. |
| Each-side moves | Timed moves: "Switch sides" at the half. Rep moves: one Done per side, or one Done for both sides if there's no rest between them. | Keeps tapping to a minimum. |
| Voice | Clips pre-recorded with edge-tts (`en-AU-WilliamNeural`, energetic coach, rate +5%) through `npm run voice`, same pipeline as HeroQuest. `speechSynthesis` reads any missing line. | No runtime API, works offline, sounds the same on every device. |
| Beeps | Web Audio oscillator (3·2·1 short beeps, long beep on Go). | No latency. |
| Persistence | `localStorage` keeps settings (voice on, beeps on, coach volume) and the next day number. Nothing else. | "No tracking." |
| Look | Dark, high contrast, condensed display type, colour per phase: work coral, rest teal, ready amber, warm-up/cool-down lavender. | Readable from a mat 2 m away. |

## Data-driven plans

Plans are data, not code, so the workout can be changed without touching TypeScript.

- **`data/plans/*.yaml`**: one self-contained file per plan (exercise library, shared blocks, days). Picked up
  with `import.meta.glob`; if there's more than one, Home shows a plan picker. The current plan is
  `data/plans/spine-rehab.yaml` (already written, all 4 days).
- **`data/coach.yaml`**: timings, pronunciations and every sentence template the coach uses.
- **Format reference + AI conversion prompt**: `docs/plan-format.md`.
- Work types: `reps` (tap Done), `time` (countdown), `guided: {reps, hold}` / `guided: {reps, tempo}` (coach
  counts). Modifiers: `perSide`, `restBetweenSides`, `rest`, `label`, `unit`. Shared blocks reused with `use:`.
- **Validation** (`src/plan/schema.ts`, zod): unknown exercise keys (with "did you mean"), a missing or doubled
  work type, negative times, unknown `use:` references. Errors name the path: `day-2 › Superset A › A2`.
- **`npm run check-plan`** prints every day's timeline and estimated length. It also runs in `npm test`, so a broken
  plan can't deploy.
- The engine reads only the parsed, validated plan (`PlanData` types inferred from the zod schema), so nothing
  else in the code knows which plan exists.
- Voice: `npm run voice` builds lines from the plan + coach templates. Lines with no recording fall back to
  device speech, so an edited plan works straight away.
- **Later (M4): in-app import.** Paste YAML/JSON on a settings page → same validator → saved in localStorage →
  device voice only. This lets a plan from ChatGPT run without a redeploy.

### Equipment

Only dumbbells, a flat/incline bench and a Swiss ball (no bands). The plan's `equipment:` field records this;
`check-plan` should flag any exercise whose `gear` isn't in it. Band moves from the source plan were swapped
(2026-11-03), keeping each one's purpose:

| Source (band) | Now | Why it fits |
|---|---|---|
| Pallof press (Day 1 anchor) | Plank shoulder taps, 10/side with 2 s hold | Same anti-rotation job: stop the hips twisting |
| Banded face pull | Chest-supported DB reverse fly | Rear delts / upper back, chest on the bench so the spine is unloaded |
| High-anchor band lat pulldown | DB pullover lying along the bench | Lats + serratus; along the bench (not across) so the lower back stays supported |
| Banded glute bridge (warm-up) | Glute bridge | Same move, bodyweight |
| Banded bridge + abduction | Single-leg glute bridge | Glute med / pelvic control without a band |
| Lateral band walk | Standing hip abduction, holding the bench | Glute med directly |

### Exercise pictures

- Each exercise gets two pictures, start (`-a`) and end (`-b`), in one consistent illustrated style (same person,
  side view, dark-friendly background). The app crossfades A↔B in time with the coach's tempo or hold count, so
  it reads like a short loop. Files go in `public/exercises/<key>-a.webp` / `-b.webp`, found by key automatically,
  or listed in `images:`.
- Where they show: Get ready (first move), the work screen's left half above the target, and **the rest screen's
  up-next preview**, so you see the next move before it starts. Tapping the picture shows it full screen.
- **Sources (all 27 covered):** 23 photos from free-exercise-db (public domain), PTPioneer on Flickr (CC BY 2.0) and
  Wikimedia Commons (CC BY-SA 3.0). The 4 moves no open library had (B-stance hinge, suitcase carry, 90/90 psoas,
  figure-4) are SVG illustrations from `scripts/make-figures.mjs` (poses as data, knees/elbows solved by IK).
  9 photos are close variants (e.g. cable instead of band) and are worth replacing when better ones turn up.
  Files and credits: `docs/design/exercises/` + `CREDITS.md`. The CC BY photos need credit, so the app gets a
  small About screen listing them.
- `check-plan` lists exercises with no pictures, as a warning, not an error.

Note: at 3 s/rep the plan estimates ~41 min/day, against the ~60 min in the source. The source's 14-minute supersets
allow for slow tempo and setup. The app runs what's written; `coach.timing.secondsPerRep` only changes the estimate.

## Step engine (`src/engine/`, pure, unit-tested, no Vue or DOM)

`buildSteps(day): Step[]` turns a day into a flat list:

```ts
type Step =
  | { type: 'ready'; seconds: 10; next: StepRef }
  | { type: 'work'; block; round; item; side?: 'left' | 'right'; rx }   // timed, reps or guided
  | { type: 'rest'; seconds; next: StepRef }
  | { type: 'transition'; seconds: 15; block; equipment }              // "Grab your dumbbells"
  | { type: 'complete' };
```

`voiceCues(step): Cue[]` returns `{ atMs, line }[]` for each step (intro, halfway, switch sides, 10 s left, up next,
3·2·1). `estimateDuration(day)` gives the time shown on the day screen, using 3 s per rep for rep sets.

Back and Skip only move the step index. The engine has no clock.

## Player (`src/stores/player.ts`, Pinia)

States: `idle → ready → running ⇄ paused → complete`.

- The clock is `performance.now()` deltas, checked in a `requestAnimationFrame` loop. Elapsed time is stored as
  `startedAt` + `pausedTotal`, so the timer stays right if the tab sleeps or the screen locks.
- Cue scheduler: on each tick, fire any cue whose `atMs` has passed and hasn't fired yet. Speech never overlaps:
  a new line cancels the one playing.
- Start tap: unlock the `AudioContext`, play a silent clip (iOS), ask for the Screen Wake Lock (ask again on
  `visibilitychange`), and set Media Session metadata.
- If you ask to end, it confirms in the page (no `confirm()`).

## Screens (`src/views/`)

1. `HomeView`: four day cards, the next day highlighted, voice settings button
2. `DayView`: why it helps, block timeline with durations, gear chips, Start
3. `PlayerView` uses `phase` to pick one of: `ReadyPanel`, `WorkTimedPanel`, `WorkRepsPanel`, `WorkGuidedPanel`, `RestPanel`, `TransitionPanel`, with `PauseSheet` on top
4. `CompleteView`: time, sets done, blocks ticked, next day

Shared: `SegmentBar` (block progress), `RingTimer`, `CueBubble` (the line being spoken), `BigButton`.

## Layouts and iPhone Duo

The layout is chosen from the viewport, not the device name, so the same rules cover iPad and desktop too.
Duo sizes are the reported specs (outer ≈466 × 678 pt, inner ≈626 × 890 pt) and need checking on a real device.

**Main target: Duo inner screen open, landscape (≈890 × 626).** The Duo opens like a book. In landscape the fold
runs top to bottom down the middle, and each half is about the size of the outer screen. Design and test this layout first.

| Layout | Rule | Used on | What changes |
|---|---|---|---|
| **Book (main)** | landscape, width ≥ 800 | Duo inner screen sideways, iPad landscape, laptop | Left half = now (exercise, timer or reps, Done, rest ±15 s). Right half = context (block or round progress, up next with form cues, coach line, controls). Home + day detail are one screen. Pause opens in the right half only |
| Compact | width < 440 | Standard iPhones | Single column (the base designs) |
| Short-wide | 440–599 wide, height < 720 | Duo outer screen | Ring and up-next side by side, no scrolling |
| Tabletop | width ≥ 600, portrait | Duo inner screen upright, half-folded | Fold runs across the middle. Top: exercise + huge timer. Bottom: coach line, progress, controls |

- The fold sits in a 28 pt gutter: the column gap in Book, the row gap in Tabletop. No text, button or sheet crosses it.
  Modals and sheets open inside one half, never centred across the fold.
- Build order for the UI stream: Book first, then Compact, then Short-wide and Tabletop.
- Use CSS media queries for the rules above, with the Viewport Segments API (`horizontal-viewport-segments` /
  `env(viewport-segment-*)`) where Safari supports it, so the gutter matches the real hinge.
- `usePlayerLayout()` composable returns `compact | shortWide | twoPane | tabletop`. Player panels are built so each
  layout only rearranges the same components (`StepHero`, `RingTimer`, `UpNext`, `RoundTracker`, `CueBubble`, `Controls`).
- Playwright projects for 375×812, 466×678, 626×890 and 890×626, each checking that the player has no
  scrollbar and that no button overlaps the centre line.

## Voice pipeline

- `src/voice/lines.ts` builds every line from templates plus plan data (exercise intros, cues, rest lengths,
  "Round two of three", "Up next, …", block transitions, the finish).
- `scripts/make-voice.mjs` + `scripts/voice-render.py`, adapted from HeroQuest, record new or changed lines to
  `public/voice/<hash>.mp3` and write `index.json`.
- `src/voice/speak.ts`: play the clip if it's in the index, otherwise use `speechSynthesis` (en-AU, then any English voice).

## Parallel work streams

Streams 2–4 only need the types from stream 1.

1. **Scaffold + data**: Vite/Vue/TS project, router, tokens and fonts, YAML loading, zod schema + `check-plan` script (the plan YAML already exists)
2. **Engine**: `buildSteps`, `voiceCues`, `estimateDuration`, plus Vitest tests (step order for each day, superset
   alternation, rest values, per-side splits, total time within ±10% of 60 min)
3. **Audio**: `beeps.ts`, `speak.ts`, `lines.ts`, voice scripts, recorded clips
4. **UI**: Home, Day, player panels, pause sheet, complete, mobile-first and checked at 375 / 768 / 1280
5. **Player store**: state machine, clock, cue scheduler, wake lock, Media Session (after 2)
6. **E2E (required, UI changes)**: Playwright with `page.clock`: start Day 2, check the countdown, timed
   auto-advance, Done → rest → up next, pause/skip/back, finish screen, settings kept after reload
7. **Ship**: PWA manifest and offline cache, GitHub Pages deploy workflow (copied from HeroQuest), README

## Milestones

- **M1, playable day**: streams 1, 2, 4 and 5 with device speech only. Day 2 runs from start to finish.
- **M2, real coach**: recorded clips, beeps, guided-tempo counting, wake lock.
- **M3, ship**: PWA/offline, E2E green, `/simplify`, deploy to Pages.
- **M4, import**: paste a plan in the app (validated, stored on device, device voice).

## Open questions

1. Coach voice: male `en-AU-WilliamNeural` or female `en-AU-NatashaNeural` (the HeroQuest voice)?
2. Rep sets: keep tap-Done, or offer fixed time windows (e.g. 40 s work) for a more class-like flow?
3. Exercise pictures: keep the mixed photo + illustration set, or later replace everything with one consistent illustrated set?
4. Should the source plan's "rest 45 s between sides" (Pallof, suitcase carry) count as its own rest step? Planned: yes.
