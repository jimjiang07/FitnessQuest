/* Every line the coach can say, for make-voice.mjs: coach.yaml templates filled from each plan, plus exercise intros. */
// Stopgap: switch to Stream B's generator (src/engine/cues.ts / lines.ts) once it has merged.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'yaml';

const root = fileURLToPath(new URL('..', import.meta.url));
const load = f => parse(fs.readFileSync(f, 'utf8'));

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
export function words(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
  const rest = n % 100;
  return ONES[Math.floor(n / 100)] + ' hundred' + (rest ? ' and ' + words(rest) : '');
}

const fill = (t, vars) => t.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const list = xs => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);

export function collectLines() {
  const coach = load(path.join(root, 'data/coach.yaml'));
  const pron = Object.entries(coach.pronounce ?? {});
  const say = s => pron.reduce((t, [k, v]) => t.split(k).join(v), s);
  const T = coach.lines;
  const out = [];
  const add = (name, vars = {}) => { for (const t of T[name] ?? []) out.push(say(fill(t, vars))); };

  for (const name of ['go', 'repNudge', 'halfway', 'tenLeft', 'switchSides']) add(name);
  for (let n = 1; n <= 15; n++) out.push(cap(words(n)) + '.');
  for (const t of T.holdCount ?? []) for (let n = 2; n <= 10; n++) out.push(`${t}, ${words(n)}.`);

  const planDir = path.join(root, 'data/plans');
  for (const f of fs.readdirSync(planDir).filter(f => f.endsWith('.yaml'))) {
    const plan = load(path.join(planDir, f));
    const ex = key => plan.exercises[key];
    const spoken = key => say(ex(key).say ?? ex(key).name);
    const target = item => item.reps != null ? `${String(item.reps).replace(/^(\d+)-(\d+)$/, (m, a, b) => `${words(+a)} to ${words(+b)}`).replace(/^\d+$/, d => words(+d))} reps`
      : item.time != null ? `${words(item.time)} seconds`
      : item.guided ? `${words(item.guided.reps)} reps` : '';
    const side = item => (item.perSide ? ' each side' : '');

    for (const [key, e] of Object.entries(plan.exercises)) {
      out.push(cap(spoken(key)) + '.');
      if (e.cues?.[0]) out.push(say(e.cues[0]));
    }

    for (const day of plan.days) {
      const blocks = day.blocks.map(b => (b.use ? {...plan.blocks[b.use], rounds: plan.blocks[b.use].rounds ?? 1} : b));
      const first = blocks[0].items[0].exercise;
      add('welcome', {day: day.title, first: spoken(first)});
      add('finish', {day: day.title});
      for (const b of blocks) {
        const rounds = b.rounds ?? 1;
        const gear = [...new Set(b.items.flatMap(i => ex(i.exercise).gear))];
        add('blockStart', {block: b.name, rounds: cap(words(rounds)), gear: list(gear)});
        for (let r = 2; r <= rounds; r++) add('round', {round: words(r), rounds: words(rounds)});
        for (const item of b.items) {
          const vars = {exercise: cap(spoken(item.exercise)), target: cap(target(item) + side(item)), seconds: words(item.time ?? 0)};
          add(item.time != null ? 'timeStart' : 'repsStart', vars);
          add('upNext', vars);
          for (const s of [item.rest ?? b.rest, item.restBetweenSides].filter(Boolean)) add('restStart', {seconds: words(s)});
        }
      }
    }
  }
  return [...new Set(out.map(l => l.replace(/\bOne rounds\b/, "One round")))];
}
