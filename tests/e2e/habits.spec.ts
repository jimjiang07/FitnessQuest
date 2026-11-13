import {expect, test, type Page} from '@playwright/test';
import {open, setup, NO_SW} from './helpers';

// setup() fixes today at Mon 2 Mar 2026; starting on 5 Jan makes that week 9
const SEED = {
  version: 1, startDate: '2026-01-05', sessions: [], body: [],
  habits: {
    '2026-02-16': 'strength', '2026-02-18': 'swim', '2026-02-20': 'pilates',   // week 7
    '2026-02-23': 'strength', '2026-02-25': 'cardio', '2026-02-27': 'strength', // week 8
  },
};

test.use(NO_SW);
test.beforeEach(async ({page}) => {
  await setup(page);
  // seed once, so a reload keeps what the test logged
  await page.addInitScript((seed) => {
    if (!localStorage.getItem('fitness-quest:tracker')) localStorage.setItem('fitness-quest:tracker', seed);
  }, JSON.stringify(SEED));
});

const thisWeek = (page: Page) => page.locator('.wall [data-current]');
const badge = (page: Page) => thisWeek(page).locator('.badge');

async function log(page: Page, day: string, choice: string | RegExp) {
  await thisWeek(page).getByRole('button', {name: new RegExp(`^${day}:`)}).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', {name: choice}).click();
  await expect(sheet).toBeHidden();
}

async function expectNoSideScroll(page: Page) {
  const r = await page.evaluate(() => ({sw: document.documentElement.scrollWidth, w: innerWidth}));
  expect(r.sw).toBeLessThanOrEqual(r.w);
}

test('the habit wall logs a week to its target and keeps it', async ({page}) => {
  await page.goto('./#/habits');
  await expect(page.getByRole('heading', {name: 'Habit wall'})).toBeVisible();
  await expect(page.locator('.fq-head')).toContainText('Week 9');

  // opens on the current week, with weeks 7 and 8 as a streak
  await expect(thisWeek(page)).toBeInViewport();
  await expect(thisWeek(page)).toContainText('Week 9');
  await expect(page.locator('.streak')).toHaveText('2-week streak · hit this week to keep it');
  await expect(page.locator('.wall .week').filter({hasText: 'Week 8'}).locator('.badge')).toHaveText('🌟 Target achieved');
  await expect(page.locator('.wall .week')).toHaveCount(52);
  await expect(badge(page)).toHaveText('0 / 3 sessions');
  await expect(thisWeek(page).getByRole('button', {name: 'Mon 2 Mar: not logged'})).toHaveAttribute('aria-current', 'date');
  await expectNoSideScroll(page);

  await log(page, 'Mon 2 Mar', 'Strength (gym)');
  await expect(thisWeek(page).getByRole('button', {name: 'Mon 2 Mar: Gym'})).toBeVisible();
  await expect(badge(page)).toHaveText('1 / 3 sessions');

  // a rest day is logged but doesn't count toward the target
  await log(page, 'Tue 3 Mar', /^Rest day/);
  await expect(thisWeek(page).getByRole('button', {name: 'Tue 3 Mar: Rest'})).toBeVisible();
  await expect(badge(page)).toHaveText('1 / 3 sessions');

  await log(page, 'Wed 4 Mar', 'Reformer Pilates');
  await log(page, 'Thu 5 Mar', 'Swim and spa');
  await expect(badge(page)).toHaveText('🌟 Target achieved');
  await expect(page.locator('.status')).toHaveText('🌟 Target achieved');
  await expect(page.locator('.streak')).toHaveText('3-week streak');

  // Clear empties the day and the target drops back
  await thisWeek(page).getByRole('button', {name: 'Thu 5 Mar: Swim'}).click();
  await page.getByRole('dialog').getByRole('button', {name: 'Clear'}).click();
  await expect(thisWeek(page).getByRole('button', {name: 'Thu 5 Mar: not logged'})).toBeVisible();
  await expect(badge(page)).toHaveText('2 / 3 sessions');

  // Escape closes the picker without changing anything
  await thisWeek(page).getByRole('button', {name: 'Fri 6 Mar: not logged'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();

  await log(page, 'Fri 6 Mar', 'Cardio or cycle');
  await expect(badge(page)).toHaveText('🌟 Target achieved');
  await expectNoSideScroll(page);

  await page.reload();
  await expect(badge(page)).toHaveText('🌟 Target achieved');
  for (const name of ['Mon 2 Mar: Gym', 'Tue 3 Mar: Rest', 'Wed 4 Mar: Pilates', 'Thu 5 Mar: not logged', 'Fri 6 Mar: Cardio'])
    await expect(thisWeek(page).getByRole('button', {name})).toBeVisible();
  await expectNoSideScroll(page);
});

test('day cells are big enough to tap', async ({page}) => {
  await page.goto('./#/habits');
  for (const cell of await thisWeek(page).locator('.day').all()) {
    const b = (await cell.boundingBox())!;
    expect(b.width).toBeGreaterThanOrEqual(44);
    expect(b.height).toBeGreaterThanOrEqual(44);
  }
});

test('the Habits tab opens from Coach', async ({page}) => {
  await page.goto('./');
  await page.getByRole('navigation', {name: 'Sections'}).getByRole('link', {name: 'Habits'}).click();
  await expect(page).toHaveURL(/#\/habits$/);
  await expect(page.getByRole('heading', {name: 'Habit wall'})).toBeVisible();
  await expect(page.getByRole('link', {name: 'Habits'})).toHaveAttribute('aria-current', 'page');
});

test('the habit wall shows the weekly plan with today marked', async ({page}, info) => {
  await open(page, './#/habits');
  const plan = page.locator('section.plan');
  if (info.project.name !== 'duo-landscape') {
    // one column shows today only, the whole week on request
    await expect(plan.locator('li')).toHaveCount(1);
    await plan.getByRole('button', {name: 'Whole week'}).click();
  }
  await expect(plan.locator('li')).toHaveCount(7);
  await expect(plan).toContainText('Pull (evening)');
  await expect(plan).toContainText('Legs (2–3 pm, off-peak)');
  await expect(plan.locator('li[aria-current="date"]')).toHaveCount(1);
});
