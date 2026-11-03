import {expect, test, type Page, type TestInfo} from '@playwright/test';
import {advance, begin, expectFits, expectPanel, open, pause, resume, setup, sheet, type Panel, NO_SW} from './helpers';

test.use(NO_SW);
test.beforeEach(async ({page}) => setup(page));

test('End workout asks once in the page, then goes home', async ({page}, info) => {
  await open(page, '#/play/day-2');
  await begin(page, info);
  await advance(page, 10100);
  await expectPanel(page, info, 'guided', {block: 0});

  await pause(page);
  await sheet(page).getByRole('button', {name: 'End workout'}).click();
  await expect(sheet(page).getByRole('heading', {name: 'End workout?'})).toBeVisible();
  await expect(page).toHaveURL(/#\/play\/day-2$/);
  await expectFits(page, info);
  await sheet(page).getByRole('button', {name: 'Yes, end workout'}).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.locator('.day')).toHaveCount(4);
  // ending early doesn't move the plan on
  await expect(page.locator('.day.next .num')).toHaveText('1');
});

/** Lets timed work run and taps Done on each reps set until the day hands over to the Complete screen. */
async function finishDay(page: Page, info: TestInfo): Promise<void> {
  const seen = new Set<string>();
  for (let guard = 0; guard < 200; guard++) {
    const at = await page.evaluate(() => ({
      url: location.hash,
      panel: document.querySelector('.player')?.getAttribute('data-panel') as Panel | null,
      block: document.querySelector('.player')?.getAttribute('data-block'),
    }));
    if (at.url.startsWith('#/done/')) return;
    if (at.panel) {
      // check each kind of panel once per block, so every screen the day shows gets a layout check
      const key = `${at.panel}:${at.block}`;
      if (!seen.has(key)) { seen.add(key); await expectFits(page, info); }
    }
    if (at.panel === 'reps') await page.getByRole('button', {name: 'Done set'}).click();
    else await advance(page, 120000);
  }
  throw new Error('the day never finished');
}

test('a whole day reaches Complete; next day and voice survive a reload', async ({page}, info) => {
  await open(page, '#/play/day-2');
  await begin(page, info);

  // turn the coach off first so the reload can prove it was saved
  await pause(page);
  await sheet(page).getByRole('switch', {name: /Voice coach/}).click();
  await resume(page);

  await finishDay(page, info);
  await expect(page).toHaveURL(/#\/done\/day-2$/);
  await expect(page.getByText('Day 2 complete')).toBeVisible();
  const time = page.locator('.stat').filter({hasText: 'time'}).locator('.v');
  await expect(time).toHaveText(/^\d+:\d\d$/);
  const sets = Number(await page.locator('.stat').filter({hasText: 'sets done'}).locator('.v').textContent());
  expect(sets).toBeGreaterThan(0);
  const rows = page.locator('.tl-item');
  await expect(rows).toHaveCount(5);
  await expect(page.locator('.tl-item.done')).toHaveCount(5);
  await expect(page.getByText(/Next time: Day 3 · Upper vertical/)).toBeVisible();
  await expectFits(page, info);

  await page.reload();
  await page.getByRole('button', {name: 'Back to plan'}).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.locator('.day.next .num')).toHaveText('3');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('fitness-quest:settings') ?? '{}'));
  expect(saved).toMatchObject({voice: false, nextDayId: 'day-3'});

  // the switch in the next workout's pause sheet remembers the coach is off
  await open(page, '#/play/day-3');
  await begin(page, info);
  await pause(page);
  await expect(sheet(page).getByRole('switch', {name: /Voice coach/})).toHaveAttribute('aria-checked', 'false');
});
