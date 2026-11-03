import type {BlockItem, CoachConfig, Exercise} from '../types';

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** 45 → "forty-five", 180 → "one hundred and eighty", "10-12" → "ten to twelve". Other text passes through. */
export function numberWords(n: number | string): string {
  if (typeof n === 'string') {
    const s = n.trim();
    const range = s.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
    if (range) return `${numberWords(Number(range[1]))} to ${numberWords(Number(range[2]))}`;
    return /^\d+$/.test(s) ? numberWords(Number(s)) : n;
  }
  if (!Number.isInteger(n) || n < 0) return String(n);
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '');
  if (n < 1000) {
    const rest = n % 100;
    return `${ONES[Math.floor(n / 100)]} hundred${rest ? ` and ${numberWords(rest)}` : ''}`;
  }
  if (n < 1_000_000) {
    const rest = n % 1000;
    return `${numberWords(Math.floor(n / 1000))} thousand${rest ? (rest < 100 ? ' and ' : ' ') + numberWords(rest) : ''}`;
  }
  return String(n);
}

/** Variant `n` (rotating) of a coach template, with {placeholders} filled; numbers become words. */
export function lineFor(template: string, vars: Record<string, string | number>, n: number,
  coach: Pick<CoachConfig, 'lines'>): string {
  const variants = coach.lines[template];
  if (!variants?.length) throw new Error(`coach.yaml has no lines for "${template}"`);
  const line = variants[((n % variants.length) + variants.length) % variants.length];
  return line.replace(/\{(\w+)\}/g, (m, key: string) => {
    const v = vars[key];
    return v === undefined ? m : typeof v === 'number' ? numberWords(v) : v;
  });
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/** How the coach says it: the exercise's `say:` first, then the plan-wide `pronounce` map. */
export function spoken(text: string, coach: Pick<CoachConfig, 'pronounce'>, exercise?: Exercise): string {
  let out = exercise?.say ? text.split(exercise.name).join(exercise.say) : text;
  for (const [word, say] of Object.entries(coach.pronounce)) {
    out = out.replace(new RegExp(`(?<![\\w])${escapeRe(word)}(?![\\w])`, 'g'), say);
  }
  return out;
}

/** Capitalises each sentence and fixes "one rounds" style plurals left by templates. */
export function tidy(text: string): string {
  return text
    .replace(/\b([Oo]ne) (round|rep|second|minute)s\b/g, '$1 $2')
    .replace(/(^|[.!?]\s+)([a-z])/g, (_m, pre: string, ch: string) => pre + ch.toUpperCase());
}

/** Ends a sentence fragment with a full stop so joined lines read as separate sentences. */
export const sentence = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

/** "the Swiss ball, a mat and your dumbbells" */
export function gearPhrase(gear: string[]): string {
  if (!gear.length) return 'nothing extra';
  const words = gear.map((g) => {
    const name = g.replace(/\bswiss\b/gi, 'Swiss');
    if (g === 'mat') return 'a mat';
    return g.endsWith('s') ? `your ${name}` : `the ${name}`;
  });
  return words.length === 1 ? words[0] : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;
}

/** What the set asks for: "ten to twelve reps", "thirty seconds", "six reps, five-second hold". */
export function targetText(item: BlockItem): string {
  const rx = item.rx;
  if (rx.kind === 'reps') return `${numberWords(rx.reps)} ${rx.unit ?? 'reps'}`;
  if (rx.kind === 'time') return `${numberWords(rx.seconds)} seconds`;
  return `${numberWords(rx.reps)} reps${rx.hold ? `, ${numberWords(rx.hold)}-second hold` : ''}`;
}
