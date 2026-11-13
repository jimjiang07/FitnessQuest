# Gym tracker: plan

The app gains a gym tracker next to the voice coach. A tab bar has six tabs: Coach, Habits, Upper, Lower, Body and Data.
The tracker is data-driven (`data/tracker.yaml`) and keeps everything in localStorage (`fitness-quest:tracker`). There is no backend and no accounts.

## Foundation (done, shared: don't change inside a stream)
- `src/types.ts`: the tracker section (TrackerConfig, StrengthSession, SetEntry, BodyEntry, TrackerData, WeekSummary)
- `data/tracker.yaml` + `src/tracker/config.ts` (`tracker`, `routine()`, `activity()`)
- `src/tracker/logic.ts`: pure date, week, history and sanitising helpers
- `src/stores/tracker.ts`: the Pinia store; every mutation goes through it
- `src/router.ts`: /habits, /upper, /lower (StrengthView, `routine` prop), /body, /data; opening the app returns to the last tracker tab
- `src/components/TabBar.vue`, `src/App.vue`: the tab bar is hidden on /play, /done and /kit; `--tabbar-h` is reserved

## Parallel streams (file ownership)
| Stream | Owns | Tests |
|---|---|---|
| A Habits | `src/views/HabitsView.vue` | `tests/e2e/habits.spec.ts` |
| B Strength | `src/views/StrengthView.vue`, `src/components/tracker/Strength*.vue` | `tests/e2e/strength.spec.ts` |
| C Body + data | `src/views/BodyView.vue`, `src/views/DataView.vue`, `src/components/tracker/Body*.vue` | `tests/e2e/body.spec.ts` |
| Integrator | foundation, `tests/unit/tracker.*.test.ts`, docs, final review | |

## Rules for every stream
- Use the existing tokens and kit classes (`src/styles/tokens.css`, `components.css`). Accent colours: `--rest` (teal) for progress and achievement, and `--ready` / `--work` for safety warnings.
- Dark theme. Tap targets are 56px or more, and inputs are large enough for one hand on the gym floor.
- Tracker pages may scroll; player screens still never do.
- Book layout (Duo inner, landscape): two halves via `Panes` or a 2-column grid with `--fold-gutter`, and nothing on the crease. Compact: one column.
- No `window.alert` / `confirm`: confirm in the page.
- Every exercise shows its cue, plus a tappable safety badge that reveals `why`.

## Update, 12 Nov 2026: upper definition and the cut

- Tuesday is now "Upper definition" (about 45 min): chest-supported row, 30° incline press, neutral-grip pulldown,
  cable or machine lateral raise, then a rope triceps pushdown + rope hammer curl superset (one cable station, one rope, so you never leave it in a busy gym), RKC plank 3 × 20 s and a 20 min
  incline walk (4%, 5.2 km/h). Reverse pec deck and Pallof press dropped out of the session.
- `cut` in `data/tracker.yaml`: 75.4 → 68.5 kg by late Feb 2027, daily fuel (1,850 kcal, 150 g protein, 200 g carbs,
  50 g fat) and four milestones. The Body tab's "The cut" panel goes by the 7-day average weigh-in (`weeklyAverage`).
