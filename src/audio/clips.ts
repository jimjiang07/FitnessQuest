/* Recorded voice clips: one clip per sentence, named by a digest of the sentence. Pure; shared by the app and make-voice. */

// FNV-1a, the same digest HeroQuest uses, so the record script and the app agree on clip names
export function fnv1a(s: string): number {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

// a line splits into sentences, so lines that mix fixed and changing parts reuse each other's clips
export const sentences = (text: string): string[] =>
  text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?:])\s+/).filter(Boolean);

// case and curly quotes don't change what's said, so they don't change the clip
export const clipId = (sentence: string): string =>
  fnv1a(sentence.replace(/[’‘]/g, "'").toLowerCase()).toString(16).padStart(8, '0');
