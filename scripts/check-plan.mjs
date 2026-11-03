#!/usr/bin/env node
// Validates every plan in data/plans/ and prints each day's timeline with an estimated length.
// Usage: npm run check-plan    (exit code 1 if any plan or data/coach.yaml has errors)
import {readFileSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {parse} from 'yaml';
import {createServer} from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const plansDir = join(root, 'data/plans');

// load the TS validator through Vite so this script needs no build step or extra dependency
const vite = await createServer({root, logLevel: 'error', appType: 'custom', server: {middlewareMode: true, hmr: false}});
let failed = false;
let buildSteps, estimateDuration; // used by printDay below
try {
  const {validatePlan} = await vite.ssrLoadModule('/src/plan/resolve.ts');
  const {coachSchema} = await vite.ssrLoadModule('/src/plan/schema.ts');
  ({buildSteps} = await vite.ssrLoadModule('/src/engine/buildSteps.ts'));
  ({estimateDuration} = await vite.ssrLoadModule('/src/engine/estimate.ts'));

  const coachResult = coachSchema.safeParse(parse(readFileSync(join(root, 'data/coach.yaml'), 'utf8')));
  if (!coachResult.success) {
    failed = true;
    console.log('✗ data/coach.yaml');
    for (const i of coachResult.error.issues) console.log(`  error: ${i.path.join('.') || 'coach'}: ${i.message}`);
  }
  const coach = coachResult.success ? coachResult.data : null;

  const pictures = readdirSync(join(root, 'public/exercises'));
  const files = readdirSync(plansDir).filter((f) => /\.ya?ml$/.test(f)).sort();
  if (!files.length) {
    failed = true;
    console.log('✗ no plans found in data/plans/');
  }
  for (const file of files) {
    let raw;
    try {
      raw = parse(readFileSync(join(plansDir, file), 'utf8'));
    } catch (e) {
      failed = true;
      console.log(`✗ data/plans/${file}\n  error: not valid YAML: ${e.message}`);
      continue;
    }
    const result = validatePlan(raw, {pictures});
    if (!result.ok) {
      failed = true;
      console.log(`✗ data/plans/${file}: ${result.errors.length} error${result.errors.length === 1 ? '' : 's'}`);
      for (const e of result.errors) console.log(`  error: ${e}`);
      for (const w of result.warnings) console.log(`  warning: ${w}`);
      continue;
    }
    const {plan, warnings} = result;
    console.log(`✓ data/plans/${file}: ${plan.name} (${plan.days.length} days, ${Object.keys(plan.exercises).length} exercises)`);
    for (const w of warnings) console.log(`  warning: ${w}`);
    if (coach) for (const day of plan.days) printDay(day, plan, coach);
  }
} finally {
  await vite.close();
}
process.exit(failed ? 1 : 0);

// same steps and estimate the player uses, so the printed length matches the app
function printDay(day, plan, coach) {
  console.log(`\n  ${day.id}  ${day.title}`);
  const steps = buildSteps(day, plan, coach);
  day.blocks.forEach((block, i) => {
    const secs = estimateDuration(steps.filter((s) => s.type !== 'ready' && s.type !== 'transition' && s.blockIndex === i), coach);
    const rounds = block.rounds > 1 ? `× ${block.rounds}` : '';
    console.log(`    ${block.name.padEnd(24)}${rounds.padEnd(5)}${clock(secs).padStart(6)}`);
  });
  const {getReady, blockChange} = coach.timing;
  console.log(`    ${'Total'.padEnd(29)}${clock(estimateDuration(steps, coach)).padStart(6)}  (incl. ${getReady}s get ready, ${blockChange}s between blocks)`);
}

function clock(secs) {
  const s = Math.round(secs);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
