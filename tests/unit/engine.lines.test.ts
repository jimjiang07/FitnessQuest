import {describe, expect, it} from 'vitest';
import {gearPhrase, lineFor, numberWords, spoken, tidy} from '../../src/engine/lines';
import {coach} from '../fixtures/coach';
import {day2Plan} from '../fixtures/day2';

describe('numberWords', () => {
  it.each([
    [0, 'zero'], [5, 'five'], [13, 'thirteen'], [20, 'twenty'], [45, 'forty-five'], [75, 'seventy-five'],
    [100, 'one hundred'], [120, 'one hundred and twenty'], [180, 'one hundred and eighty'], [2301, 'two thousand three hundred and one'],
  ])('%i → %s', (n, words) => expect(numberWords(n)).toBe(words));

  it('reads ranges and numeric strings', () => {
    expect(numberWords('10-12')).toBe('ten to twelve');
    expect(numberWords('8–10')).toBe('eight to ten');
    expect(numberWords('15')).toBe('fifteen');
    expect(numberWords('AMRAP')).toBe('AMRAP');
  });
});

describe('lineFor', () => {
  it('fills placeholders, numbers as words', () => {
    expect(lineFor('round', {round: 2, rounds: 3}, 0, coach)).toBe('Round two of three.');
    expect(lineFor('restStart', {seconds: 45}, 0, coach)).toBe('Nice. Rest, forty-five seconds.');
  });

  it('rotates variants', () => {
    expect(lineFor('restStart', {seconds: 60}, 1, coach)).toBe('Good work. Rest sixty.');
    expect(lineFor('restStart', {seconds: 60}, 2, coach)).toBe('Nice. Rest, sixty seconds.');
    expect(lineFor('go', {}, 3, coach)).toBe("Let's go!");
  });

  it('throws on an unknown template', () => {
    expect(() => lineFor('nope', {}, 0, coach)).toThrow('coach.yaml has no lines for "nope"');
  });
});

describe('spoken', () => {
  it('applies the pronounce map', () => {
    expect(spoken('Chest-supported DB row', coach)).toBe('Chest-supported dumbbell row');
    expect(spoken('Built around L4–S1 safety, 90/90 first.', coach)).toBe('Built around L four, S one safety, ninety ninety first.');
    expect(spoken('DBX stays', coach)).toBe('DBX stays');
  });

  it('prefers the exercise say: override', () => {
    const bss = day2Plan.exercises['db-bulgarian-split-squat'];
    expect(spoken('Up next, DB Bulgarian split squat.', coach, bss)).toBe('Up next, dumbbell bulgarian split squat.');
    const psoas = day2Plan.exercises['psoas-90-90'];
    expect(spoken('90/90 psoas relief on Swiss ball. Three minutes.', coach, psoas)).toBe('ninety ninety psoas relief. Three minutes.');
  });
});

describe('helpers', () => {
  it('tidies sentence starts and singulars', () => {
    expect(tidy('Cool-down. one rounds. dumbbell row.')).toBe('Cool-down. One round. Dumbbell row.');
  });

  it('describes gear', () => {
    expect(gearPhrase(['swiss ball', 'dumbbells'])).toBe('the Swiss ball and your dumbbells');
    expect(gearPhrase(['dumbbells', 'bench', 'mat'])).toBe('your dumbbells, the bench and a mat');
    expect(gearPhrase([])).toBe('nothing extra');
  });
});
