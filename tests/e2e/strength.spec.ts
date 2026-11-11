import {expect, test, type Page, type TestInfo} from '@playwright/test';
import {open, setup, NO_SW} from './helpers';

const ROW = 'Chest-supported machine row';

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

test('upper: safety cues, log a session, reuse it next time, delete', async ({page}, info) => {
  await open(page, './#/upper');
  await expect(page.getByRole('heading', {name: 'Upper strength'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Spine and neck warning'})).toBeVisible();
  await expect(page.locator('.warning')).toContainText('Chin tucked');

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
  await field(page, 'Seated chest press machine set 1 weight (kg)').fill('22.');
  await expect(field(page, 'Seated chest press machine set 1 weight (kg)')).toHaveValue('22.');
  await field(page, 'Seated chest press machine set 1 weight (kg)').fill('22.5');

  await first.locator('section[data-key="machine-row"]').getByRole('button', {name: '+ Set'}).click();
  await expect(field(page, `${ROW} set 2 weight (kg)`)).toHaveValue('40');   // the next set repeats the weight
  await field(page, `${ROW} set 2 reps`).fill('9');
  await field(page, `${ROW} set 2 RPE (1 to 10)`).fill('8');
  await expect(first.locator('.toggle')).toContainText('2 exercises · top set 40 kg');
  // Pallof press labels its reps per side
  await expect(field(page, 'Cable Pallof press set 1 reps each side')).toBeVisible();

  // a removed set goes, and the store keeps at least one
  await first.locator('section[data-key="lat-pulldown"]').getByRole('button', {name: '+ Set'}).click();
  await page.getByRole('button', {name: 'Remove Lat pulldown (neutral or wide grip) set 2'}).click();
  await expect(page.getByRole('button', {name: /Remove Lat pulldown/})).toHaveCount(0);

  // persisted across a reload
  await page.reload();
  await expect(cards(page)).toHaveCount(1);
  await expect(field(page, `${ROW} set 1 weight (kg)`)).toHaveValue('40');
  await expect(field(page, `${ROW} set 1 reps`)).toHaveValue('10');
  await expect(field(page, `${ROW} set 1 RPE (1 to 10)`)).toHaveValue('7');
  await expect(field(page, `${ROW} set 2 reps`)).toHaveValue('9');
  await expect(field(page, 'Seated chest press machine set 1 weight (kg)')).toHaveValue('22.5');

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

test('lower: leg press shows its critical cue in the warning colour', async ({page}, info) => {
  await open(page, './#/lower');
  await expect(page.getByRole('heading', {name: 'Lower strength'})).toBeVisible();
  await expect(page.locator('.warning')).toContainText('tailbone');
  const leg = page.locator('.roster li[data-key="leg-press"]');
  await expect(leg).toHaveClass(/critical/);
  const cue = leg.locator('.cue');
  await expect(cue).toContainText('🚨');
  await expect(cue).toContainText('Stop before your tailbone lifts off the seat!');
  await expect(cue).toHaveCSS('color', 'rgb(255, 92, 57)');
  await expect(page.locator('.roster li[data-key="leg-curl"]')).not.toHaveClass(/critical/);

  // the carry logs metres, and Upper's sessions don't show here
  await page.getByRole('button', {name: "Start today's session"}).click();
  await expect(field(page, 'Single-arm suitcase carry set 1 metres each side')).toBeVisible();
  await expect(cards(page).first().locator('section[data-key="leg-press"] .cue')).toHaveCSS('color', 'rgb(255, 92, 57)');
  await expectTidy(page, info);

  await page.goto('./#/upper');
  await expect(page.getByRole('heading', {name: 'Upper strength'})).toBeVisible();
  await expect(cards(page)).toHaveCount(0);
});
