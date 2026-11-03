import {getCurrentScope, onScopeDispose, readonly, ref, type Ref} from 'vue';
import type {Layout} from '@/types';

export interface Viewport {
  width: number;
  height: number;
  hSegments?: number;  // horizontal-viewport-segments: 2 = fold runs top to bottom
  vSegments?: number;  // vertical-viewport-segments: 2 = fold runs across
}

/** Picks the layout from the viewport; breakpoints from the design board's "Other ways to hold it". */
export function pickLayout({width, height, hSegments = 1, vSegments = 1}: Viewport): Layout {
  // a real hinge beats size guesses, so the gutter sits on it
  if (hSegments >= 2) return 'book';
  if (vSegments >= 2) return 'tabletop';
  if (width < 440) return 'compact';
  const landscape = width > height;
  if (landscape && width >= 800) return 'book';
  if (!landscape && width >= 600) return 'tabletop';
  if (width < 600 && height < 720) return 'shortWide';
  // narrow-but-tall (e.g. 500×900) reads best as one column; small landscape (e.g. 700×500) as short-wide
  return landscape ? 'shortWide' : 'compact';
}

const QUERIES = [
  '(orientation: landscape)', '(min-width: 440px)', '(min-width: 600px)', '(min-width: 800px)', '(min-height: 720px)',
] as const;
const H_SEGMENTS = '(horizontal-viewport-segments: 2)';
const V_SEGMENTS = '(vertical-viewport-segments: 2)';

function readViewport(): Viewport {
  const mm = window.matchMedia;
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    hSegments: mm(H_SEGMENTS).matches ? 2 : 1,
    vSegments: mm(V_SEGMENTS).matches ? 2 : 1,
  };
}

/** Current layout, kept up to date by media-query listeners (breakpoints and viewport segments). */
export function useLayout(): Readonly<Ref<Layout>> {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return readonly(ref<Layout>('book'));
  const layout = ref<Layout>(pickLayout(readViewport()));
  const update = () => { layout.value = pickLayout(readViewport()); };
  const lists = [...QUERIES, H_SEGMENTS, V_SEGMENTS].map((q) => window.matchMedia(q));
  lists.forEach((mql) => mql.addEventListener('change', update));
  if (getCurrentScope()) onScopeDispose(() => lists.forEach((mql) => mql.removeEventListener('change', update)));
  return readonly(layout);
}
