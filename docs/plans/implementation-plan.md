# Fitness Quest: parallel implementation plan

How to build the app with several agents working at once without stepping on each other.
What the app is and why: `docs/plans/spec.md`. What it looks like: `docs/design/design-board.html`
(published: https://claude.ai/artifact/Lp37bsiETrus857w75ZSga). Plan data format: `docs/plan-format.md`.

## Status

| Wave | Stream | State |
|---|---|---|
| 0 | Foundation (scaffold, contracts, routes, CI, deploy) | **Done**: on `main`, deployed |
| 1 | A Plan data · B Engine · C Audio · D UI kit | **A merged (#2), C merged (#1)**; B and D in progress |
| 2 | E Player store · F Screens | Start when the Wave 1 streams they depend on have merged (F can start earlier on mocks) |
| 3 | G E2E journeys · H PWA, About, polish | After Wave 2 |

## How the parallel work stays safe

1. **One stream = one agent = one branch = one worktree.** Branch `stream/<letter>-<name>`, e.g. `stream/b-engine`.
   Work in a git worktree (`isolation: "worktree"` for agents, or `git worktree add ../fq-b stream/b-engine`).
2. **File ownership.** Each stream lists the files it owns. A stream may create and edit only its own files.
   Reading anything is fine. If a stream needs a change in someone else's file, it writes the request in its PR
   description under "Needs from other streams" and works around it (mock, local copy) until it lands.
3. **Contracts are frozen.** `src/types.ts` is the shared contract (plan types, `Step`, `Cue`, `Voice`,
   `PlayerApi`, `Settings`, `Layout`). Streams code against it and don't edit it. If a contract is wrong, raise it in
   the PR and the integrator (the main session) changes it on `main`, then streams rebase.
4. **Shared files are pre-wired.** Routes (`src/router.ts`), npm scripts and dependencies (`package.json`), tokens
   (`src/styles/tokens.css`) already exist. Streams don't touch them; adding a dependency goes through the integrator.
5. **Own E2E port.** Each stream running Playwright sets `FQ_PORT` to its own port so builds don't collide:
   A 4201, B 4202, C 4203, D 4204, E 4205, F 4206, G 4207, H 4208.
6. **Merge gate.** A PR merges when `npm run test:unit` and `npm run build` pass (CI runs both), its own new tests
   pass, and `npm run test:e2e` still passes locally. Squash-merge into `main`; every push to `main` deploys.
7. **Pure where possible.** `src/plan/` and `src/engine/` have no Vue, DOM or browser APIs, so they're fully unit-tested.

## Dependency graph

```
Wave 0  Foundation ──┬──────────────┬──────────────┬──────────────┐
                     ▼              ▼              ▼              ▼
Wave 1        A Plan data     B Engine       C Audio        D UI kit
                     │      ┌───────┘ │            │              │
                     ▼      ▼         ▼            ▼              │
Wave 2          (A+B) ──► E Player store ◄─────────┘              │
                                  │                               │
                                  ▼                               ▼
                             F Screens ◄──────────────────────────┘   (F can start on a mock PlayerApi)
                                  │
Wave 3                 G E2E journeys      H PWA · About · polish
```

B and E only need `src/types.ts`, so B can build and test with hand-written fixture plans before A lands.

---

## Wave 1

### Stream A: Plan data and validation

Turns the YAML into a validated, resolved `Plan` the rest of the app uses.

- **Owns:** `src/plan/schema.ts`, `src/plan/resolve.ts`, `src/plan/index.ts`, `scripts/check-plan.mjs`,
  `tests/unit/plan.*.test.ts`, `docs/plan-format.md`. Deletes `tests/unit/foundation.test.ts` once its tests replace it.
- **Builds:**
  - zod schema for the raw YAML (`exercises`, `blocks`, `days`, `equipment`, the four work types, `perSide`,
    `restBetweenSides`, `rest`, `label`, `unit`, `use:`). Exactly one work type per item.
  - `resolvePlan(raw): Plan`: expands `use:` blocks, applies block-level `rest` defaults, gives each block an id,
    fills `Exercise.images` (explicit `images:` or `exercises/<key>-a.*` / `-b.*` found in `public/exercises/`).
  - Friendly errors with a path and a "did you mean": `day-2 › Superset A › A2: unknown exercise "db-bulgarian-split-sqat". Did you mean "db-bulgarian-split-squat"?`
  - Gear check: every exercise's `gear` is in `equipment` (plus `mat`). Missing pictures are a warning.
  - `src/plan/index.ts` exports `plans: Plan[]` (all `data/plans/*.yaml` via `import.meta.glob`), `coach: CoachConfig`
    (`data/coach.yaml`), `getDay(dayId)` and `planForDay(dayId)`, plus `validatePlan`/`resolvePlan` in `resolve.ts`.
  - `npm run check-plan` validates every plan and prints each day's timeline and estimated length (uses B's
    `estimateDuration` once merged; until then a local estimate).
- **Accepts when:** the real plan resolves with no errors; tests cover each error type with a broken fixture; check-plan
  prints every day's timeline. (Decided: days estimate at 41–45 min at 3 s/rep; screens show the computed estimate, not the board's placeholder "58 min".)

### Stream B: Step engine

The heart of the player: turns a day into steps and timed coach cues. Pure functions, no clock.

- **Owns:** `src/engine/buildSteps.ts`, `src/engine/cues.ts`, `src/engine/estimate.ts`, `src/engine/lines.ts`,
  `tests/unit/engine.*.test.ts`, `tests/fixtures/*.ts`.
- **Builds:**
  - `buildSteps(day: Day, plan: Plan, coach: CoachConfig): Step[]`: ready → for each block: transition (between
    blocks) → rounds × items → work (split left/right for `perSide`, with `restBetweenSides` or `switchSidesGap`
    between) → rest → … → complete. No rest after the very last work step of the day; the cool-down has its own short rests.
  - `cuesFor(step, ctx): Cue[]` using the templates in `data/coach.yaml`: welcome, block start with gear, 3·2·1
    beeps + "Go", exercise intro + first cue, halfway / switch sides / ten seconds left for timed work, guided
    counting ("Reach… hold, two, three, four, five"), the one-off rep nudge, rest start, "Up next" at
    `upNextAt`, "Round two of three", finish. Applies `pronounce` and `say:`; numbers spoken as words.
  - `lineFor(template, vars)`: picks variants in rotation, fills `{placeholders}`.
  - `estimateDuration(day, …)`: seconds, using `secondsPerRep` for reps.
- **Accepts when:** snapshot tests for all four days' step lists; superset A1→A2 alternation over 3 rounds; perSide
  splits; rest values from YAML; cue timings for one timed, one reps, one guided and one rest step; total estimate per
  day matches A's check-plan output.

### Stream C: Audio

Everything that makes sound or keeps the phone awake. Implements the `Voice` contract.

- **Owns:** `src/audio/voice.ts`, `src/audio/beeps.ts`, `src/audio/device.ts`, `scripts/make-voice.mjs`,
  `scripts/voice-render.py`, `public/voice/**`, `tests/unit/audio.*.test.ts`.
- **Builds:**
  - `createVoice(): Voice`: plays `public/voice/<hash>.mp3` when the line is in `public/voice/index.json`,
    otherwise `speechSynthesis` (en-AU, then any English voice). `unlock()` primes an `AudioContext` and a silent
    clip from the Start tap (iOS). A new line cancels the current one.
  - `beeps.ts`: Web Audio oscillator, short (3·2·1) and long (Go). No files.
  - `device.ts`: Screen Wake Lock (request on start, re-request on `visibilitychange`, release on end), Media Session
    metadata (current exercise on the lock screen) and play/pause actions.
  - Voice pipeline adapted from HeroQuest: `npm run voice` collects every line the engine can produce for every
    plan (imports B's `cuesFor`/`lineFor` once merged; until then a stub list), records new/changed lines with
    edge-tts (`en-AU-WilliamNeural`, rate +5%; voice choice is an open question in the spec), deletes unused clips,
    writes `index.json`.
- **Accepts when:** unit tests with a fake `speechSynthesis`/`Audio` cover clip-vs-fallback and cancel; manual check
  on an iPhone that audio plays after Start and the screen stays on.

### Stream D: UI kit and layouts

The building blocks every screen uses, built and reviewed in isolation on `/#/kit`.

- **Owns:** `src/components/**` (except `ComingSoon.vue`, which F deletes at the end), `src/composables/useLayout.ts`,
  `src/views/KitView.vue`, `src/styles/components.css`, `tests/unit/layout.test.ts`.
- **Builds:** `RingTimer`, `SegmentBar` (block progress), `CueBubble` (with the sound-wave mark), `ExercisePic`
  (A/B crossfade in time with a `tempoMs` prop; one image = still; none = nothing; full-screen on tap),
  `BigButton`, `PhasePill`, `RoundTracker`, `UpNextCard`, `PlayerControls`, `PauseSheet` (renders inside one pane),
  `DayCard`, `BlockTimeline`, `GearChips`, `Panes` (two-pane wrapper whose gap is `--fold-gutter`).
  - `useLayout(): Ref<Layout>`: `book` (landscape, width ≥ 800), `compact` (< 440), `shortWide` (440–599, height
    < 720), `tabletop` (≥ 600, portrait). Uses Viewport Segments media queries when available so the gutter sits on
    the real hinge.
  - `KitView` shows every component in every state with sample data, at each layout.
- **Accepts when:** matches the design board; 56px+ tap targets; nothing crosses the centre line in book/tabletop;
  reduced motion stops the crossfade and ring animation; `useLayout` unit-tested with mocked `matchMedia`.

## Wave 2

### Stream E: Player store

The state machine and clock. Implements `PlayerApi`.

- **Depends on:** B (steps, cues), C (`Voice`, device), A (`getDay`). Start against fixtures and a fake `Voice` if
  they haven't merged.
- **Owns:** `src/stores/player.ts`, `src/stores/settings.ts`, `src/engine/clock.ts`, `tests/unit/player.*.test.ts`.
- **Builds:**
  - States `idle → running ⇄ paused → complete`. `start(dayId)` (call from the Start tap): `voice.unlock()`, wake
    lock, build steps, run.
  - Clock from `performance.now()` deltas in a `requestAnimationFrame` loop; elapsed = `startedAt` + `pausedTotal`, so
    a locked screen or sleeping tab doesn't drift. `src/engine/clock.ts` is injectable so tests use a fake clock.
  - Cue scheduler: fire each cue once when its `atMs` passes; speech never overlaps; `currentLine` for the UI.
  - Timed steps auto-advance; reps steps wait for `done()`; `next`, `previous`, `addRest` only move the index or the
    end time. `setsDone` counts finished work steps.
  - `settings.ts`: `Settings` in localStorage (voice, beeps, next day). Wrapped in try/catch; nothing else stored.
- **Accepts when:** fake-clock tests for auto-advance, pause/resume timing, Done → rest, skip/back, addRest,
  completion; next day advances after finishing.

### Stream F: Screens

The real views, in all four layouts, wired to the stores.

- **Depends on:** D (components), E (store). Can start immediately on a mock `PlayerApi` (`src/views/mockPlayer.ts`).
- **Owns:** `src/views/**` except `KitView.vue` and `AboutView.vue`; deletes `src/components/ComingSoon.vue`
  when the last placeholder is gone; `tests/unit/views.*.test.ts`.
- **Builds:** `HomeView` (book: list + selected day detail with Start; compact: list → `DayView`), `DayView`,
  `PlayerView` (one panel per step type: ready, timed work, reps work, guided work, rest, transition, with the
  pause sheet; the screen tints to the phase), `CompleteView`. Tap anywhere on the player to pause. Ending asks once,
  in the page.
- **Accepts when:** each screen matches the design board in book, compact, shortWide and tabletop; no scrolling on
  any player screen; uses only D's components and E's API.

## Wave 3

### Stream G: E2E journeys

- **Owns:** `tests/e2e/**` (replaces `smoke.spec.ts`).
- **Builds:** Playwright with `page.clock`, on all four projects in `playwright.config.ts`: start Day 2 → countdown →
  timed warm-up auto-advances → reps set → Done → rest → up next → 3·2·1; pause/resume; skip/back; +15 s; end
  workout; finish screen; settings and next day survive a reload; no player screen scrolls; nothing overlaps the centre
  line in book and tabletop.
- **Accepts when:** green on all four projects, under 3 minutes.

### Stream H: PWA, About, polish

- **Owns:** `public/manifest.webmanifest`, `public/icons/**`, `src/sw.ts` (or a Vite PWA plugin added through the
  integrator), `src/views/AboutView.vue`, `README.md`.
- **Builds:** installable PWA with offline cache (works in a gym with no signal), app icons, About screen with the
  photo credits from `public/exercises/CREDITS.md` (CC BY / CC BY-SA require them), README. Then `/simplify` across the repo.
- **Accepts when:** Lighthouse PWA installable; app loads offline after one visit; credits visible.

---

## Contracts (summary of `src/types.ts`)

- `Plan`, `Day`, `Block`, `BlockItem`, `Exercise`, `Prescription` (`reps` | `time` | `guided`), `CoachConfig`
- `Step` (`ready` | `transition` | `work` | `rest` | `complete`) with its block/round position
- `Cue { atMs, line?, beep?, once? }`
- `Voice { unlock, speak, cancel, beep, setEnabled }`
- `PlayerApi` (read-only state + `start/pause/resume/done/next/previous/addRest/end`)
- `Settings { voice, beeps, nextDayId }`, `Layout`

## Running it with agents

Wave 1, four agents at once from the main session, each with `isolation: "worktree"`. Brief for each:

> You are Stream **X** of `docs/plans/implementation-plan.md` in this repo. Read that file, `CLAUDE.md`,
> `src/types.ts` and the files listed for your stream. Work on branch `stream/<x>-<name>`. Create and edit only
> the files your stream owns. Write tests first. Run `npm run test:unit`, `npm run build`, and
> `FQ_PORT=<your port> npm run test:e2e` before finishing. Open a PR to `main` titled "Stream X: <name>" with what
> you built, how you tested it, and a "Needs from other streams" section.

The main session integrates: reviews and merges PRs in dependency order (A and B first, then C and D), resolves
contract requests, then launches Wave 2 the same way, then Wave 3.

## Definition of done (whole app)

- All four days play end to end with voice and beeps, on the Duo in landscape and on a standard iPhone.
- `npm test` green; deployed to https://jimjiang07.github.io/FitnessQuest/.
- Editing `data/plans/spine-rehab.yaml` and pushing changes the workout with no code changes.
