import {expect, test} from '@playwright/test';
import {open, setup, NO_SW} from './helpers';

test.use(NO_SW);
test.beforeEach(async ({page}) => setup(page));

// a short window used to squash panels inside the scrolling halves; 8px allows for big headings' glyph overhang
for (const tab of ['habits', 'push', 'pull', 'legs', 'body', 'data']) {
  test(`${tab}: no panel is squashed, even on a short screen`, async ({page}) => {
    await page.setViewportSize({width: 1009, height: 548});
    await open(page, `./#/${tab}`);
    await page.locator('.fq-col').first().waitFor();
    const squashed = await page.$$eval('.fq-col > *', els => els
      .filter(el => getComputedStyle(el).display !== 'none' && el.scrollHeight > el.clientHeight + 8)
      .map(el => `${el.tagName.toLowerCase()}.${el.className}: ${el.clientHeight} < ${el.scrollHeight}`));
    expect(squashed).toEqual([]);
  });
}

// iOS home-screen apps can start with a stale size and never fire a breakpoint change
test('switches to the book layout on resize even when no media query fires', async ({page}) => {
  await page.addInitScript(() => { MediaQueryList.prototype.addEventListener = () => {}; });
  await page.setViewportSize({width: 626, height: 890});
  await open(page, './#/habits');
  await expect(page.locator('.fq-page')).not.toHaveClass(/book/);
  await page.setViewportSize({width: 890, height: 626});
  await expect(page.locator('.fq-page')).toHaveClass(/book/);
});

test('a one-column page fills a wide screen instead of leaving side gaps', async ({page}) => {
  await page.setViewportSize({width: 760, height: 1000});
  await open(page, './#/push');
  const box = await page.locator('.fq-page').boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(760);
});
