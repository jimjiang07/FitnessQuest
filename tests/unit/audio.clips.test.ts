import {describe, expect, it} from 'vitest';
import {clipId, fnv1a, sentences} from '@/audio/clips';

describe('clip ids', () => {
  it('is stable for a known sentence, so recorded clips keep their names', () => {
    expect(clipId('Switch sides.')).toBe('7320ab2d');
  });

  it('ignores case and curly quotes', () => {
    expect(clipId('Don’t arch your back.')).toBe(clipId("don't arch your back."));
  });

  it('is eight hex characters', () => {
    expect(clipId('Go!')).toMatch(/^[0-9a-f]{8}$/);
    expect(fnv1a('')).toBe(2166136261);
  });
});

describe('sentences', () => {
  it('splits a line into sentences and squashes whitespace', () => {
    expect(sentences('  Nice.  Rest,\n sixty seconds. Go!')).toEqual(['Nice.', 'Rest, sixty seconds.', 'Go!']);
  });

  it('returns nothing for an empty line', () => {
    expect(sentences('   ')).toEqual([]);
  });
});
