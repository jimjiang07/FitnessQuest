import {expect, test, type Page, type TestInfo} from '@playwright/test';
import {open, setup, NO_SW} from './helpers';

const ROW = 'Chest-supported row (low row)';
const FLY = 'Reverse pec deck (rear delt fly)';

test.use(NO_SW);
test.beforeEach(async ({page}) => setup(page));

const cards = (page: Page) => page.locator('article[data-session]');
const field = (page: Page, label: string) => page.getByLabel(label, {exact: true});

/** No sideways scroll anywhere; book keeps the page itself still (each half scrolls) and nothing tappable on the fold. */
async function expectTidy(page: Page, info: TestInfo) {
  const r = await page.evaluate(() => {
    const se = document.scrollingElement!;
    const mid = innerWidth / 2;
    const crossing = Array.from(document.querySelectorAll('main button, main input')).filter(el => {
      const b = el.getBoundingClientRect();
      return b.width > 0 && b.left < mid && b.right > mid;
    }).map(el => el.outerHTML.slice(0, 60));
    return {sw: se.scrollWidth, sh: se.scrollHeight, W: innerWidth, H: innerHeight, crossing};
  });
  expect(r.sw, 'page scrolls horizontally').toBeLessThanOrEqual(r.W + 1);
  if (info.project.name === 'duo-landscape') {
    expect(r.sh, 'book page scrolls; only the halves should').toBeLessThanOrEqual(r.H + 1);
    expect(r.crossing, 'tap targets across the fold').toEqual([]);
  }
}

test('pull: safety cues, log a session, reuse it next time, delete', async ({page}, info) => {
  await open(page, './#/pull');
  await expect(page.getByRole('heading', {name: 'Pull', exact: true})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Spine and neck warning'})).toBeVisible();
  await expect(page.locator('.warning')).toContainText('chin tucked');

  // every exercise shows its cue; the badge reveals the clinical reason
  const rowItem = page.locator('.roster li[data-key="machine-row"]');
  await expect(rowItem).toContainText('Sternum glued to the chest pad');
  const badge = rowItem.getByRole('button', {name: 'Clinical safety cue'});
  await expect(badge).toHaveAttribute('aria-expanded', 'false');
  await expect(rowItem.locator('.why')).toBeHidden();
  await badge.click();
  await expect(badge).toHaveAttribute('aria-expanded', 'true');
  await expect(rowItem.locator('.why')).toContainText('L4–S1');

  await expect(page.locator('.empty')).toBeVisible();
  await expectTidy(page, info);

  // start and log
  await page.getByRole('button', {name: "Start today's session"}).click();
  await expect(cards(page)).toHaveCount(1);
  const first = cards(page).first();
  await expect(first.locator('input[type="date"]')).toHaveValue('2026-03-02');
  await expect(first.locator('.toggle')).toHaveAttribute('aria-expanded', 'true');

  await field(page, `${ROW} set 1 weight (kg)`).fill('40');
  await field(page, `${ROW} set 1 reps`).fill('10');
  await field(page, `${ROW} set 1 RPE (1 to 10)`).fill('7');
  // half-typed decimals stay put while you type
  await field(page, `${FLY} set 1 weight (kg)`).fill('22.');
  await expect(field(page, `${FLY} set 1 weight (kg)`)).toHaveValue('22.');
  await field(page, `${FLY} set 1 weight (kg)`).fill('22.5');

  await first.locator('section[data-key="machine-row"]').getByRole('button', {name: '+ Set'}).click();
  await expect(field(page, `${ROW} set 2 weight (kg)`)).toHaveValue('40');   // the next set repeats the weight
  await field(page, `${ROW} set 2 reps`).fill('9');
  await field(page, `${ROW} set 2 RPE (1 to 10)`).fill('8');
  await expect(first.locator('.toggle')).toContainText('2 exercises · top set 40 kg');
  // the walk logs minutes, not reps
  await expect(field(page, 'Incline treadmill walk set 1 minutes')).toBeVisible();

  // a removed set goes, and the store keeps at least one
  await first.locator('section[data-key="lat-pulldown"]').getByRole('button', {name: '+ Set'}).click();
  await page.getByRole('button', {name: 'Remove Lat pulldown (neutral grip) set 2'}).click();
  await expect(page.getByRole('button', {name: /Remove Lat pulldown/})).toHaveCount(0);

  // persisted across a reload
  await page.reload();
  await expect(cards(page)).toHaveCount(1);
  await expect(field(page, `${ROW} set 1 weight (kg)`)).toHaveValue('40');
  await expect(field(page, `${ROW} set 1 reps`)).toHaveValue('10');
  await expect(field(page, `${ROW} set 1 RPE (1 to 10)`)).toHaveValue('7');
  await expect(field(page, `${ROW} set 2 reps`)).toHaveValue('9');
  await expect(field(page, `${FLY} set 1 weight (kg)`)).toHaveValue('22.5');

  // move it to yesterday, then come back today
  await cards(page).first().locator('input[type="date"]').fill('2026-03-01');
  await expect(cards(page).first().locator('input[type="date"]')).toHaveValue('2026-03-01');
  await page.getByRole('button', {name: "Start today's session"}).click();
  await expect(cards(page)).toHaveCount(2);
  const [today, older] = [cards(page).nth(0), cards(page).nth(1)];
  await expect(today.locator('input[type="date"]')).toHaveValue('2026-03-02');
  await expect(today.locator('.toggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(older.locator('.toggle')).toHaveAttribute('aria-expanded', 'false');
  await expect(older.locator('.toggle')).toContainText('2 exercises · top set 40 kg');
  await expect(older.locator('.body')).toHaveCount(0);

  const row = today.locator('section[data-key="machine-row"]');
  await expect(row.locator('.last')).toContainText('Last: 40 kg × 10 @ 7, 40 × 9 @ 8');
  await expect(row.locator('.best')).toHaveText('Best 40 kg');
  await row.getByRole('button', {name: 'Same as last'}).click();
  await expect(field(page, `${ROW} set 1 weight (kg)`).first()).toHaveValue('40');
  await expect(today.getByLabel(`${ROW} set 2 reps`, {exact: true})).toHaveValue('9');
  await expect(today.getByLabel(`${ROW} set 1 RPE (1 to 10)`, {exact: true})).toHaveValue('');   // RPE is yours to rate again
  await expectTidy(page, info);

  // the older card opens on tap
  await older.locator('.toggle').click();
  await expect(older.locator('.toggle')).toHaveAttribute('aria-expanded', 'true');
  await older.locator('.toggle').click();

  // delete asks in the page first
  await today.getByRole('button', {name: 'Delete session'}).click();
  const confirm = today.getByRole('alertdialog');
  await expect(confirm).toContainText("can't be undone");
  await confirm.getByRole('button', {name: 'Cancel'}).click();
  await expect(cards(page)).toHaveCount(2);
  await today.getByRole('button', {name: 'Delete session'}).click();
  await today.getByRole('alertdialog').getByRole('button', {name: 'Delete', exact: true}).click();
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).first().locator('input[type="date"]')).toHaveValue('2026-03-01');
});

test('legs: leg press shows its critical cue in the warning colour', async ({page}, info) => {
  await open(page, './#/legs');
  await expect(page.getByRole('heading', {name: 'Legs', exact: true})).toBeVisible();
  await expect(page.locator('.warning')).toContainText('tailbone');
  const leg = page.locator('.roster li[data-key="leg-press"]');
  await expect(leg).toHaveClass(/critical/);
  const cue = leg.locator('.cue');
  await expect(cue).toContainText('🚨');
  await expect(cue).toContainText('Stop before your tailbone lifts off the seat!');
  await expect(cue).toHaveCSS('color', 'rgb(255, 92, 57)');
  await expect(page.locator('.roster li[data-key="leg-curl"]')).not.toHaveClass(/critical/);

  // the carry logs seconds, and Push's sessions don't show here
  await page.getByRole('button', {name: "Start today's session"}).click();
  await expect(field(page, 'Single-arm suitcase carry set 1 seconds each side')).toBeVisible();
  await expect(cards(page).first().locator('section[data-key="leg-press"] .cue')).toHaveCSS('color', 'rgb(255, 92, 57)');
  await expectTidy(page, info);

  await page.goto('./#/push');
  await expect(page.getByRole('heading', {name: 'Push', exact: true})).toBeVisible();
  await expect(cards(page)).toHaveCount(0);
});

test('push, pull and legs: the moves, their order and their own units', async ({page}) => {
  const order = async () => page.locator('.roster [data-key]').evaluateAll(els => els.map(e => e.getAttribute('data-key')));
  await open(page, './#/push');
  await expect.poll(order).toEqual(['chest-press', 'incline-press', 'lateral-raise', 'triceps-pushdown', 'rkc-plank', 'incline-walk']);
  const roster = page.locator('.roster');
  await expect(roster.locator('[data-key="chest-press"]')).toContainText('3 × 8–10');
  await expect(roster.locator('[data-key="rkc-plank"]')).toContainText('3 × 20 s');
  await expect(page.getByLabel('Machine taken?')).toContainText('pec deck');
  await page.getByRole('button', {name: /Start today/}).click();
  const card = page.locator('[data-session]').first();
  await expect(card.locator('[data-key="incline-walk"] .h').nth(1)).toHaveText('Incline (%)');
  await expect(card.locator('[data-key="rkc-plank"] .h').nth(2)).toHaveText('Seconds');
  await expect(card.locator('[data-key="incline-walk"]')).toContainText('Target 15–20 min · 4% · 5.2 km/h');
  // incline isn't a lift: it never becomes the session's top set
  await card.getByLabel('Incline treadmill walk set 1 incline (%)').fill('5');
  await expect(card.locator('.sum')).not.toContainText('kg');

  await page.getByRole('link', {name: /Pull/}).click();
  await expect.poll(order).toEqual(['lat-pulldown', 'machine-row', 'rear-delt-fly', 'incline-curl', 'knee-raise', 'incline-walk']);
  const knee = page.locator('.roster [data-key="knee-raise"]');
  await expect(knee).toHaveClass(/critical/);
  await expect(knee).toContainText('Stop at 90°');

  await page.getByRole('link', {name: /Legs/}).click();
  await expect.poll(order).toEqual(['leg-press', 'leg-curl', 'hip-abductor', 'suitcase-carry', 'incline-walk']);
  await expect(page.getByRole('link', {name: /Legs/})).toHaveAttribute('aria-current', 'page');
});

test('the Gym tab opens the next strength day, old links still work, and history follows the exercise', async ({page}) => {
  // a session logged before the split, on the old Upper day
  await page.addInitScript(() => localStorage.setItem('fitness-quest:tracker', JSON.stringify({version: 1, startDate: '2026-02-23', habits: {}, body: [],
    sessions: [{id: 'old', routine: 'upper', date: '2026-02-24', sets: {'machine-row': [{weight: 45, reps: 10, rpe: 7}]}}]})));
  await open(page, './#/habits');
  await page.getByRole('link', {name: 'Gym'}).click();
  // the fake clock is Monday, so Tuesday's Push is next
  await expect(page).toHaveURL(/#\/push$/);
  await expect(page.getByRole('link', {name: 'Gym'})).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('[data-session]')).toHaveCount(1);   // the old Upper session lives under Push now

  await page.goto('./#/lower');
  await expect(page).toHaveURL(/#\/legs$/);
  await page.goto('./#/pull');
  await page.getByRole('button', {name: /Start today/}).click();
  await expect(page.locator('[data-session] [data-key="machine-row"] .last')).toContainText('45 kg × 10');
});

test('outer screen: tabs open at the top, rules fold away, and a second tap continues today', async ({page}, info) => {
  test.skip(info.project.name !== 'duo-outer' && info.project.name !== 'phone', 'single-column layouts only');
  await open(page, './#/body');
  await page.evaluate(() => scrollTo({top: 2000, behavior: 'instant'}));
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(200);
  await page.getByRole('link', {name: 'Gym'}).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);

  const rules = page.getByRole('button', {name: /Spine and neck warning/});
  await expect(rules).toHaveAttribute('aria-expanded', 'false');
  await rules.click();
  await expect(page.locator('#spine-rules')).toBeVisible();

  const start = page.getByRole('button', {name: /today's session/});
  await start.click();
  await expect(start).toHaveText(/Continue today's session/);
  await start.click();
  await expect(page.locator('article[data-session]')).toHaveCount(1);
});

test('every exercise shows a picture you can open full screen', async ({page}) => {
  await open(page, './#/legs');
  const pics = page.locator('.roster .ex .pic img:not(.b)');
  await expect(pics).toHaveCount(5);
  await expect.poll(() => pics.evaluateAll(els => els.every(e => (e as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.locator('.roster [data-key="leg-press"] .pic').click();
  await expect(page.getByRole('button', {name: 'Close picture'})).toBeVisible();
  await page.getByRole('button', {name: 'Close picture'}).click();
  await page.getByRole('button', {name: /Start today/}).click();
  await expect(page.locator('[data-session] [data-key="leg-press"] .thumb')).toBeVisible();
});
