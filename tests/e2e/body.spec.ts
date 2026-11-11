import {readFile} from 'node:fs/promises';
import {expect, test, type Page} from '@playwright/test';
import {open, setup, NO_SW} from './helpers';

test.use(NO_SW);
test.beforeEach(async ({page}) => setup(page));

const noOverflow = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

const newEntry = (page: Page) => page.locator('section.new');
async function addEntry(page: Page, date: string, weight: string, waist: string, lumbar: number, notes = '') {
  const form = newEntry(page);
  await form.getByLabel('Date').fill(date);
  await form.getByLabel(/Fasting weight/).fill(weight);
  await form.getByLabel(/Navel waist/).fill(waist);
  await form.getByLabel(/Lumbar discomfort/).fill(String(lumbar));
  if (notes) await form.getByLabel('Notes').fill(notes);
  await form.getByRole('button', {name: 'Save entry'}).click();
  await expect(form.locator('.saved')).toContainText('Saved');
}

test('body journal: add, trend, edit, delete, persist', async ({page}) => {
  await open(page, './#/body');
  await expect(page.getByRole('heading', {name: 'Body', exact: true})).toBeVisible();
  // the form starts on today (the fake clock's 2 March)
  await expect(newEntry(page).getByLabel('Date')).toHaveValue('2026-03-02');

  await addEntry(page, '2026-02-01', '86.0', '98.0', 5, 'Stiff after the drive');
  await addEntry(page, '2026-03-01', '84,5', '95.5', 2);

  const items = page.locator('.history .item');
  await expect(items).toHaveCount(2);
  await expect(items.first()).toHaveAttribute('data-date', '2026-03-01');   // newest first
  await expect(items.first()).toContainText('95.5');
  await expect(items.first()).toContainText('84.5');                       // comma accepted
  await expect(items.nth(1)).toContainText('Stiff after the drive');

  const waist = page.locator('[data-trend="waist"]');
  await expect(waist).toContainText('95.5');
  await expect(waist.locator('dd').first()).toHaveText('−2.5 cm');
  await expect(page.locator('[data-trend="weight"] dd').first()).toHaveText('−1.5 kg');
  await expect(waist.locator('svg.spark path')).toHaveAttribute('d', /^M[\d.]+ [\d.]+ L/);

  // edit the older entry inline
  await items.nth(1).getByRole('button', {name: /Edit entry/}).click();
  await items.nth(1).getByLabel(/Navel waist/).fill('97.0');
  await items.nth(1).getByRole('button', {name: 'Save changes'}).click();
  await expect(items.nth(1)).toContainText('97');
  await expect(waist.locator('dd').first()).toHaveText('−1.5 cm');

  // delete asks in the page first
  await items.first().getByRole('button', {name: /Delete entry for/}).click();
  await items.first().getByRole('button', {name: 'Keep it'}).click();
  await expect(items).toHaveCount(2);
  await items.first().getByRole('button', {name: /Delete entry for/}).click();
  await items.first().getByRole('button', {name: 'Delete entry', exact: true}).click();
  await expect(items).toHaveCount(1);

  await page.reload();
  await expect(page.locator('.history .item')).toHaveCount(1);
  await expect(page.locator('.history .item')).toHaveAttribute('data-date', '2026-02-01');
  await noOverflow(page);
});

test('flex mix cards expand and the profile opens', async ({page}) => {
  await open(page, './#/body');
  const card = page.locator('[data-card="incline-walk"]');
  await expect(card.locator('.points')).toBeHidden();
  await card.getByRole('button').click();
  await expect(card.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  await expect(card.locator('.points')).toContainText("Don't hold the rails");

  await page.getByRole('button', {name: /Your back and neck/}).click();
  await expect(page.locator('#profile-body')).toContainText('L4/L5');
  await noOverflow(page);
});

test('data tab: export, clear in two steps, import restores', async ({page}) => {
  await open(page, './#/body');
  await addEntry(page, '2026-02-20', '85.2', '96.0', 3);
  await addEntry(page, '2026-03-02', '84.8', '95.1', 1);

  await page.getByRole('link', {name: 'Data'}).click();
  await expect(page.getByRole('heading', {name: 'Your data'})).toBeVisible();
  await expect(page.getByText(/stays on this device/)).toBeVisible();

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', {name: 'Export data'}).click()]);
  expect(download.suggestedFilename()).toBe('fitness-quest-2026-03-02.json');
  const file = await download.path();
  const json = JSON.parse(await readFile(file, 'utf8'));
  expect(json.version).toBe(1);
  expect(json.body).toHaveLength(2);
  expect(json.body.map((b: {waist: number}) => b.waist).sort()).toEqual([95.1, 96]);

  // clearing takes two taps
  await page.getByRole('button', {name: 'Clear all data'}).click();
  await expect(page.locator('.counts')).toContainText('2');
  await page.getByRole('button', {name: 'Cancel'}).click();
  await page.getByRole('button', {name: 'Clear all data'}).click();
  await page.getByRole('button', {name: 'Delete everything', exact: true}).click();
  await expect(page.getByText('All data cleared.')).toBeVisible();

  // a file that isn't a backup changes nothing
  await page.locator('input[type="file"]').setInputFiles({name: 'junk.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}')});
  await expect(page.getByRole('alert')).toContainText("isn't a Fitness Quest backup");

  await page.locator('input[type="file"]').setInputFiles(file);
  await expect(page.getByRole('status').filter({hasText: 'Imported'})).toContainText('2 body entries');

  // week 1 start snaps to Monday
  await page.getByLabel('Week 1 start date').fill('2026-03-04');
  await page.getByRole('button', {name: 'Set', exact: true}).click();
  await expect(page.locator('.current')).toContainText('Monday 2 March 2026');
  await noOverflow(page);

  await page.getByRole('link', {name: 'Body'}).click();
  await expect(page.locator('.history .item')).toHaveCount(2);
});

test('the cut: weekly average, kg to go and the next milestone', async ({page}) => {
  await open(page, './#/body');
  const goal = page.locator('section.goal');
  await expect(goal).toContainText('75.4 → 68.5 kg');
  await expect(goal.locator('[data-togo]')).toHaveText('6.9 kg to go');
  await expect(goal).toContainText('1,850');
  await addEntry(page, '2026-02-24', '74.0', '90', 1);
  await addEntry(page, '2026-03-01', '73.0', '89', 1);
  // goes by the 7-day average (73.5), not the last weigh-in
  await expect(goal.locator('.val')).toContainText('73.5');
  await expect(goal.locator('[data-togo]')).toHaveText('5.0 kg to go');
  await expect(goal.locator('[data-next]')).toContainText('71.5 kg');
  await expect(goal.locator('.miles .hit')).toHaveCount(1);
  await noOverflow(page);
});
