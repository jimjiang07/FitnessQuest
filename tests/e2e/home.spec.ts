import {expect, test} from '@playwright/test';
import {isSplit, open, setup, NO_SW} from './helpers';

const DAY2 = /Posterior chain/;

test.use(NO_SW);
test.beforeEach(async ({page}) => setup(page));

test('home lists the four days and opens Day 2', async ({page}, info) => {
  await open(page, './');
  await expect(page.getByRole('heading', {name: 'Spine Rehab Split'})).toBeVisible();
  const days = page.locator('.day');
  await expect(days).toHaveCount(4);

  // a fresh install starts at Day 1
  await expect(page.locator('.day.next')).toHaveCount(1);
  await expect(page.locator('.day.next .num')).toHaveText('1');
  await expect(page.locator('.day.next')).toContainText('Next up');

  // lengths are real estimates in minutes, never the old hard-coded 58
  for (const d of await days.all()) await expect(d).toContainText(/\d{2} min/);
  await expect(page.locator('body')).not.toContainText('58 min');

  await days.filter({hasText: DAY2}).click();
  if (isSplit(info)) {
    await expect(page).toHaveURL(/#\/(\?|$)/);
    await expect(page.locator('#day-title')).toHaveText(DAY2);
  } else {
    await expect(page).toHaveURL(/#\/day\/day-2$/);
    await expect(page.getByRole('heading', {name: DAY2})).toBeVisible();
  }
  await expect(page.locator('section.detail')).toContainText(/Day 2 · \d{2} min/);
  await expect(page.locator('body')).not.toContainText('58 min');
  await expect(page.getByRole('button', {name: 'Start workout'})).toBeVisible();
});

test('the plan switch opens the quick neck sessions', async ({page}) => {
  await open(page, './');
  const tabs = page.getByRole('tablist', {name: 'Plan'}).first();
  await expect(tabs.getByRole('tab')).toHaveCount(3);
  await tabs.getByRole('tab', {name: 'Quick neck rehab'}).click();
  await expect(tabs.getByRole('tab', {name: 'Quick neck rehab'})).toHaveAttribute('aria-selected', 'true');
  const days = page.locator('.day');
  await expect(days).toHaveCount(3);
  await expect(days.first()).toContainText('Neck control');
  for (const d of await days.all()) await expect(d).toContainText(/\d{1,2} min/);
  // every tab label stays inside the switch at every layout
  for (const t of await tabs.getByRole('tab').all()) {
    const [tb, sb] = [await t.boundingBox(), await tabs.boundingBox()];
    expect(tb!.x + tb!.width).toBeLessThanOrEqual(sb!.x + sb!.width + 1);
  }
  await expect(page.locator('body')).not.toContainText('built into every day');
});
