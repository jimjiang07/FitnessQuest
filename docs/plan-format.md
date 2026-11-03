# Plan format

A plan is one YAML file in `data/plans/`. Every file there shows up in the app automatically, so you
change the workout by editing data, not code. Example: `data/plans/spine-rehab.yaml`.

After editing, run:

```bash
npm run check-plan     # validates every plan and prints each day's timeline and estimated length
npm run voice          # records coach clips for any new or changed lines (optional; see below)
```

`check-plan` runs inside `npm test` too, so a broken plan fails CI before it gets deployed.

## Structure

```yaml
id: spine-rehab                 # unique, lower-case, hyphens
name: Spine Rehab Split
summary: One sentence for the home screen.

exercises:                      # library: define each move once
  b-stance-hinge:               # key, used by days below
    name: B-stance DB hip hinge # shown on screen
    say: B stance dumbbell hip hinge   # optional: how the coach pronounces it
    gear: [dumbbells]           # shown on day detail and "have ready"; must be in `equipment` (mat is always fine)
    note: 25 lb dumbbell        # optional, shown under the name
    images: [b-stance-hinge-a.webp, b-stance-hinge-b.webp]  # optional; see Exercise pictures
    cues:                       # first one is spoken
      - "Push your hips back."
      - "Spine stays neutral."  # quoted, one per line: a comma inside [ ] would split a cue in two

blocks:                         # optional shared blocks (warm-up, cool-down…)
  warmup: { name: Warm-up, kind: warmup, rest: 5, items: [ … ] }

days:
  - id: day-2
    title: Posterior chain + anti-shear glutes
    anchor: B-stance DB hip hinge      # optional
    why: Why this day helps.           # optional, shown on day detail
    blocks:
      - use: warmup                    # reuse a shared block (no other fields allowed here)
      - name: Superset A
        kind: superset                 # warmup | superset | circuit | finisher | cooldown (sets colour)
        rounds: 3
        rest: 45                       # default rest after each item in this block
        items:
          - { label: A1, exercise: swiss-ball-ham-curl, reps: 10-12, rest: 45 }
          - { label: A2, exercise: db-bulgarian-split-squat, reps: 8-10, perSide: true, rest: 75 }
```

## Items: pick one work type

| Field | Example | What happens |
|---|---|---|
| `reps` | `reps: 10-12` | Shows the target, counts the set time up, waits for **Done set** |
| `time` | `time: 30` | Counts down and moves on by itself |
| `guided` + `hold` | `guided: {reps: 6, hold: 5}` | Coach counts each rep: "Reach… hold, two, three, four, five" |
| `guided` + `tempo` | `guided: {reps: 8, tempo: 6}` | Coach calls one rep every 6 seconds |

Optional on any item:

| Field | Default | Meaning |
|---|---|---|
| `label` | none | A1, B2… shown as a badge |
| `perSide` | `false` | Do it left then right. Timed items get "Switch sides" |
| `restBetweenSides` | `coach.timing.switchSidesGap` | Rest between left and right |
| `rest` | block `rest`, or 0 | Rest after the item |
| `unit` | `reps` | Word after the number, e.g. `steps each way` |

## Exercise pictures

Put pictures in `public/exercises/`. If an exercise has no `images` field, the app looks for
`<key>-a.*` (start position) and `<key>-b.*` (end position) automatically: webp, avif, jpg, png or svg, preferring
them in that order. File names in `images:` are relative to `public/exercises/`. With two pictures, the app
switches between them in time with the coach's count, so the move reads like a short animation. With one,
it's a still. With none, the screen shows text only. Pictures are about 800 × 600, a side view, with the
same person, outfit and style for every exercise.

## Coach settings: `data/coach.yaml`

Timings (get-ready length, when "Up next" is said, beeps), pronunciations (`DB` → "dumbbell") and every
sentence template the coach uses. Change the wording there and every plan picks it up.

## Voice clips

`npm run voice` records every sentence the plan can produce with the edge-tts coach voice and commits them to
`public/voice/`. If you skip it, new lines are read by the phone's own voice, so an edited plan always works,
it just sounds slightly different until you re-record.

## Converting a plan with an AI

Paste this prompt and your plan into ChatGPT or Claude, then save the reply as `data/plans/<id>.yaml`:

> Convert the workout plan below into YAML that matches this format exactly: [paste the "Structure" and
> "Items" sections above]. Rules: define every exercise once under `exercises` with 1–3 short cues taken
> from the plan's own wording, written one per line as quoted strings; use `reps` for rep counts, `time` for anything in seconds, and `guided` with
> `hold` for reps that have a hold of a few seconds; set `perSide: true` for "each side / each leg / per
> hand"; put any shared warm-up and cool-down under `blocks` and reference them with `use:`. Output only the
> YAML.

Then run `npm run check-plan`. It lists every mistake at once and names where each one is, e.g.
`day-2 › Superset A › A2: unknown exercise "db-bulgarian-split-sqat". Did you mean "db-bulgarian-split-squat"?`

Shared blocks are named by their key, e.g. `blocks › warmup › item 2`. Items without a `label` are numbered
(`item 1`, `item 2`…). Unknown fields are errors too (`rset: 30` → `Did you mean "rest"?`), so typos don't slip
through. Missing pictures and cues that don't end with `.`, `!` or `?` are warnings: the plan still runs.

Why cues are quoted, one per line: in a `[ ]` list a comma separates items, so `[Reach long, hips square.]` becomes
two fragments. `check-plan` warns about cues without end punctuation because that's how a split shows up.
