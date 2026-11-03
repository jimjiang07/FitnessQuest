import type {CoachConfig, Cue, Day, Exercise, Plan, Side, Step} from '../types';
import {GUIDED_LEAD_IN, guidedRepSeconds} from './buildSteps';
import {gearPhrase, lineFor, numberWords, sentence, spoken, targetText, tidy} from './lines';

export interface CueContext {
  plan: Plan;
  coach: CoachConfig;
  day: Day;
  /** rotates template variants; the player passes a counter that goes up as steps play */
  variant: number;
}

// Not in coach.yaml yet; used unless it adds `reach` / `back` lines.
const DEFAULT_LINES: Record<string, string[]> = {reach: ['Reach'], back: ['Back']};

/** "day-2" → "day two"; any other id falls back to the day's title. */
export function dayName(day: Day): string {
  const m = day.id.match(/^day-(\d+)$/);
  return m ? `day ${numberWords(Number(m[1]))}` : day.title;
}

/** A rotation counter per step type, so consecutive rests (or blocks) don't repeat the same variant. */
export function variantFor(steps: Step[], index: number): number {
  const type = steps[index]?.type;
  return steps.slice(0, index).filter((s) => s.type === type).length;
}

// say: wins over the display name
const named = (ex: Exercise, side?: Side) => (side ? `${ex.say ?? ex.name}, ${side} side` : ex.say ?? ex.name);

/** The coach's lines and beeps for one step, with `atMs` from the step's start, in time order. */
export function cuesFor(step: Step, ctx: CueContext): Cue[] {
  const {coach, variant} = ctx;
  const t = coach.timing;
  const lines = {lines: {...DEFAULT_LINES, ...coach.lines}};
  const line = (template: string, vars: Record<string, string | number> = {}) => lineFor(template, vars, variant, lines);
  const say = (text: string) => tidy(spoken(text, coach));
  const cues: Cue[] = [];

  // 3·2·1 short beeps, then a long beep and "Go" as the step ends
  const countdown = (seconds: number) => {
    for (let k = t.countdownBeeps; k >= 1; k--) {
      if (seconds - k >= 0) cues.push({atMs: (seconds - k) * 1000, beep: 'short'});
    }
    cues.push({atMs: seconds * 1000, beep: 'long', line: say(line('go'))});
  };

  switch (step.type) {
    case 'ready':
      cues.push({atMs: 0, line: say(line('welcome', {day: dayName(ctx.day), first: named(step.first)}))});
      countdown(step.seconds);
      break;

    case 'transition':
      cues.push({atMs: 0, line: say(line('blockStart', {block: step.blockName, rounds: step.rounds,
        gear: gearPhrase(step.gear)}))});
      countdown(step.seconds);
      break;

    case 'work': {
      const {exercise: ex, item, side} = step;
      const firstCue = ex.cues[0] ? ` ${sentence(ex.cues[0])}` : '';
      const rx = item.rx;
      if (rx.kind === 'time') {
        const s = rx.seconds;
        cues.push({atMs: 0, line: say(line('timeStart', {exercise: named(ex, side), seconds: s}) + firstCue)});
        if (s >= 20) cues.push({atMs: s * 500, line: say(line('halfway'))});
        if (s >= 25) cues.push({atMs: (s - 10) * 1000, line: say(line('tenLeft'))});
      } else if (rx.kind === 'reps') {
        cues.push({atMs: 0, line: say(line('repsStart', {exercise: named(ex, side), target: targetText(item)}) + firstCue)});
        cues.push({atMs: t.repNudgeAfter * 1000, line: say(line('repNudge')), once: true});
      } else {
        cues.push({atMs: 0, line: say(line('repsStart', {exercise: named(ex, side), target: targetText(item)}))});
        const per = guidedRepSeconds(rx, coach);
        for (let r = 0; r < rx.reps; r++) {
          const start = (GUIDED_LEAD_IN + r * per) * 1000;
          if (rx.hold !== undefined) {
            cues.push({atMs: start, line: say(line('reach'))});
            cues.push({atMs: start + 1000, line: say(line('holdCount'))});
            for (let c = 2; c <= rx.hold; c++) cues.push({atMs: start + c * 1000, line: say(numberWords(c))});
            cues.push({atMs: start + (rx.hold + 1) * 1000, line: say(line('back'))});
          } else {
            cues.push({atMs: start, line: say(numberWords(r + 1))});
          }
        }
      }
      break;
    }

    case 'rest': {
      const next = step.next;
      const switching = next?.side === 'right';
      const block = ctx.day.blocks[step.blockIndex];
      // rests never cross blocks, so going back to the first item means a new round
      const newRound = !!next && !switching && block.items[0] === next.item && step.round < step.rounds;
      const round = newRound ? `${line('round', {round: step.round + 1, rounds: step.rounds})} ` : '';
      const opening = switching ? line('switchSides') : line('restStart', {seconds: step.seconds});
      if (next && step.seconds > t.upNextAt) {
        cues.push({atMs: 0, line: say(opening)});
        const upNext = line('upNext', {exercise: named(next.exercise, next.side), target: targetText(next.item)});
        cues.push({atMs: (step.seconds - t.upNextAt) * 1000, line: say(round + upNext)});
      } else {
        // too short for "Up next": keep it to one line so nothing gets cut off
        cues.push({atMs: 0, line: say(`${opening} ${round}`.trim())});
      }
      countdown(step.seconds);
      break;
    }

    case 'complete':
      cues.push({atMs: 0, line: say(line('finish', {day: dayName(ctx.day)}))});
      break;
  }

  return cues.sort((a, b) => a.atMs - b.atMs);
}
