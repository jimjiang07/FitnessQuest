/* Every line the coach can say, for make-voice.mjs: runs the real engine (buildSteps + cuesFor) over every day of every plan. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'yaml';

const root = fileURLToPath(new URL('..', import.meta.url));
const load = f => parse(fs.readFileSync(f, 'utf8'));
const VARIANTS = 4; // coach.yaml has at most a few variants per line; cover every rotation

/** @param vite a Vite dev server in middleware mode, used to load the app's TypeScript */
export async function collectLines(vite) {
  const {resolvePlan} = await vite.ssrLoadModule('/src/plan/resolve.ts');
  const {coachSchema} = await vite.ssrLoadModule('/src/plan/schema.ts');
  const {buildSteps} = await vite.ssrLoadModule('/src/engine/buildSteps.ts');
  const {cuesFor} = await vite.ssrLoadModule('/src/engine/cues.ts');

  const coach = coachSchema.parse(load(path.join(root, 'data/coach.yaml')));
  const pictures = fs.readdirSync(path.join(root, 'public/exercises'));
  const planDir = path.join(root, 'data/plans');
  const out = new Set();
  for (const f of fs.readdirSync(planDir).filter(f => /\.ya?ml$/.test(f))) {
    const plan = resolvePlan(load(path.join(planDir, f)), {pictures});
    for (const day of plan.days)
      for (const step of buildSteps(day, plan, coach))
        for (let variant = 0; variant < VARIANTS; variant++)
          for (const cue of cuesFor(step, {plan, coach, day, variant})) if (cue.line) out.add(cue.line);
  }
  for (const line of coach.lines.soundCheck ?? []) out.add(line); // said by the Sound check button, not a step
  return [...out];
}
