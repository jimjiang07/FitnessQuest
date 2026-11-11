import {expect, test} from '@playwright/test';
import {open, setup, NO_SW} from './helpers';

test.use(NO_SW);
test.beforeEach(async ({page}) => setup(page));

// a short window used to squash panels inside the scrolling halves; 8px allows for big headings' glyph overhang
for (const tab of ['habits', 'upper', 'lower', 'body', 'data']) {
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
