import {afterEach, describe, expect, it, vi} from 'vitest';
import {effectScope} from 'vue';
import {pickLayout, useLayout} from '@/composables/useLayout';

describe('pickLayout', () => {
  it.each([
    [890, 626, 'book'],        // Duo inner, landscape
    [390, 844, 'compact'],     // iPhone 13
    [466, 678, 'shortWide'],   // Duo outer
    [626, 890, 'tabletop'],    // Duo inner, upright
    [1280, 800, 'book'],       // desktop
    [1920, 1080, 'book'],
    [844, 390, 'book'],        // phone landscape
    [700, 500, 'shortWide'],   // small landscape tablet window
    [500, 900, 'compact'],     // narrow and tall
    [439, 600, 'compact'],
    [440, 719, 'shortWide'],
    [599, 719, 'shortWide'],
    [600, 600, 'tabletop'],    // square counts as portrait
  ] as const)('%i×%i → %s', (width, height, want) => {
    expect(pickLayout({width, height})).toBe(want);
  });

  it('prefers viewport segments over size', () => {
    expect(pickLayout({width: 626, height: 890, hSegments: 2})).toBe('book');
    expect(pickLayout({width: 390, height: 844, hSegments: 2})).toBe('book');
    expect(pickLayout({width: 890, height: 626, vSegments: 2})).toBe('tabletop');
    expect(pickLayout({width: 466, height: 678, vSegments: 2})).toBe('tabletop');
  });
});

describe('useLayout', () => {
  type Listener = () => void;
  const listeners = new Map<string, Set<Listener>>();
  let segmentsH = false;

  function stubWindow(width: number, height: number) {
    vi.stubGlobal('window', {
      innerWidth: width,
      innerHeight: height,
      addEventListener: (e: string, fn: Listener) => { const k = `window:${e}`; if (!listeners.has(k)) listeners.set(k, new Set()); listeners.get(k)!.add(fn); },
      removeEventListener: (e: string, fn: Listener) => listeners.get(`window:${e}`)?.delete(fn),
      matchMedia: (q: string) => ({
        matches: q.includes('horizontal-viewport-segments') ? segmentsH : false,
        addEventListener: (_: string, fn: Listener) => { if (!listeners.has(q)) listeners.set(q, new Set()); listeners.get(q)!.add(fn); },
        removeEventListener: (_: string, fn: Listener) => listeners.get(q)?.delete(fn),
      }),
    });
    vi.stubGlobal('requestAnimationFrame', (fn: Listener) => fn());
    vi.stubGlobal('document', {documentElement: {clientWidth: 0, clientHeight: 0}});
  }
  const fire = () => listeners.forEach((set) => set.forEach((fn) => fn()));

  afterEach(() => { vi.unstubAllGlobals(); listeners.clear(); segmentsH = false; });

  it('follows matchMedia changes and cleans up with its scope', () => {
    stubWindow(890, 626);
    const scope = effectScope();
    const layout = scope.run(() => useLayout())!;
    expect(layout.value).toBe('book');

    (window as {innerWidth: number}).innerWidth = 390;
    (window as {innerHeight: number}).innerHeight = 844;
    fire();
    expect(layout.value).toBe('compact');

    segmentsH = true;
    fire();
    expect(layout.value).toBe('book');

    // a plain resize (no breakpoint change) still re-reads the size
    segmentsH = false;
    (window as {innerWidth: number}).innerWidth = 890;
    (window as {innerHeight: number}).innerHeight = 626;
    listeners.get('window:resize')!.forEach((fn) => fn());
    expect(layout.value).toBe('book');

    scope.stop();
    expect([...listeners.values()].every((s) => s.size === 0)).toBe(true);
  });

  it('falls back to book without matchMedia', () => {
    vi.stubGlobal('window', {innerWidth: 300, innerHeight: 300});
    expect(useLayout().value).toBe('book');
  });
});
