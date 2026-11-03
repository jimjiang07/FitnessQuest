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
try {
  const {validatePlan} = await vite.ssrLoadModule('/src/plan/resolve.ts');
  const {coachSchema} = await vite.ssrLoadModule('/src/plan/schema.ts');

  const coachResult = coachSchema.safeParse(parse(readFileSync(join(root, 'data/coach.yaml'), 'utf8')));
  if (!coachResult.success) {
    failed = true;
    console.log('✗ data/coach.yaml');
    for (const i of coachResult.error.issues) console.log(`  error: ${i.path.join('.') || 'coach'}: ${i.message}`);
  }
  const timing = coachResult.success ? coachResult.data.timing : {getReady: 10, blockChange: 15, switchSidesGap: 5, secondsPerRep: 3};

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
    // switch to Stream B's estimateDuration from src/engine/estimate.ts once it lands
    for (const day of plan.days) printDay(day, timing);
  }
} finally {
  await vite.close();
}
process.exit(failed ? 1 : 0);

function printDay(day, timing) {
  console.log(`\n  ${day.id}  ${day.title}`);
  let total = timing.getReady + timing.blockChange * (day.blocks.length - 1);
  day.blocks.forEach((block, i) => {
    let secs = 0;
    for (const item of block.items) secs += itemSeconds(item, timing);
    secs *= block.rounds;
    if (i === day.blocks.length - 1) secs -= block.items.at(-1).rest; // no rest after the day's last set
    total += secs;
    const rounds = block.rounds > 1 ? `× ${block.rounds}` : '';
    console.log(`    ${block.name.padEnd(24)}${rounds.padEnd(5)}${clock(secs).padStart(6)}`);
  });
  console.log(`    ${'Total'.padEnd(29)}${clock(total).padStart(6)}  (incl. ${timing.getReady}s get ready, ${timing.blockChange}s between blocks)`);
}

function itemSeconds(item, timing) {
  const rx = item.rx;
  const work = rx.kind === 'time' ? rx.seconds
    : rx.kind === 'guided' ? rx.reps * (rx.tempo ?? rx.hold + timing.secondsPerRep)
    : Math.max(...(rx.reps.match(/\d+/g) ?? ['10']).map(Number)) * timing.secondsPerRep;
  const sides = item.perSide ? 2 * work + (item.restBetweenSides ?? timing.switchSidesGap) : work;
  return sides + item.rest;
}

function clock(secs) {
  const s = Math.round(secs);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
