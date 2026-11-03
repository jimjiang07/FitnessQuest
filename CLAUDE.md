# Fitness Quest: project guide for Claude Code

A no-login web app that runs a 4-day spine rehab plan as voice-coached workouts, like an F45 or Fitstop class:
pick a day, press Start, and the coach calls every exercise, set, rest and side switch. Plan data is YAML.
No accounts, no backend, no tracking. Main device: iPhone Duo, inner screen open in landscape.

- What and why: `docs/plans/spec.md`
- Look: `docs/design/design-board.html` (published: https://claude.ai/artifact/Lp37bsiETrus857w75ZSga)
- **How to build it in parallel: `docs/plans/implementation-plan.md`** (streams, file ownership, contracts)
- Plan file format: `docs/plan-format.md`

This repo is **public** (GitHub Pages). The plan describes the owner's back condition on purpose; don't add any other
personal details (names, addresses, photos of people we know).

## Commands

```bash
npm run dev           # local dev server
npm run test:unit     # vitest (tests/unit)
npm run test:e2e      # playwright at 4 layouts (tests/e2e); FQ_PORT=<port> for a parallel run
npm run build         # type-check + build to dist/
npm run check-plan    # validate data/plans/*.yaml and print timelines
npm run voice         # record coach clips into public/voice/ (edge-tts via uv)
npm run figures       # redraw the SVG exercise illustrations into public/exercises/
```

Every push to `main` deploys to https://jimjiang07.github.io/FitnessQuest/ (`.github/workflows/deploy.yml`).

## Rules

- **Contracts:** `src/types.ts` is shared by all work streams. Don't change it inside a stream; raise it in the PR.
- **Data, not code:** exercises, days, rests and coach wording live in `data/`. A plan change needs no code change.
- **Pure core:** `src/plan/` and `src/engine/` have no Vue, DOM or browser APIs, and are fully unit-tested.
- **Equipment:** dumbbells, a bench and a Swiss ball only. No bands. New exercises must fit that.
- **Back safety first:** no loaded spinal flexion, no exercise picture showing a riskier variant than the plan's
  (e.g. pullover across the bench). When unsure, pick the version with the spine supported and neutral.
- **Layouts:** book (Duo inner landscape: left half = now, right half = context, 28px fold gutter, nothing on the
  crease, sheets open inside one half), compact (phones), shortWide (Duo outer), tabletop (Duo upright half-folded).
- **Player screens never scroll.** Tap targets 56px+. Dark theme only. Respect reduced motion.
- **Reps are not timed:** reps sets wait for Done; timed and guided work auto-advance.
- **Pictures:** `public/exercises/<key>-a.*` and `-b.*` (start/end). Keep `public/exercises/CREDITS.md` up to date;
  CC BY / BY-SA photos need credit on the About screen.
- **Comments:** short, one line, explain why. No ticket numbers in code.
- Australian spelling. Sentence case in UI copy.
