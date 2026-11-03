import {expect, test} from '@playwright/test';
import {
  advance, audio, begin, closeSheet, cue, expectFits, expectPanel, open, pause, player, remainingSeconds, resume, setup, sheet,
  timer, NO_SW,
} from './helpers';

test.use(NO_SW);
test.beforeEach(async ({page}) => setup(page));

// Day 2 timeline (s from the end of the ready countdown): cat-camel 0–52, rest 5, bird-dog L 57–103, rest 5,
// R 108–154, rest 5, glute bridge 159–223, rest 5, hip flexor L 228–258, rest 5, R 263–293, transition 293–308.

test('Day 2 runs from Start through the first superset rest', async ({page}, info) => {
  await open(page, './');
  await page.locator('.day').filter({hasText: /Posterior chain/}).click();
  await page.getByRole('button', {name: 'Start workout'}).click();
  await expect(page).toHaveURL(/#\/play\/day-2$/);
  await expect(page.getByText('Tap to begin')).toBeVisible();

  await begin(page, info);
  await expect(player(page).locator('.count')).toHaveText('10');
  // the welcome is either a recorded clip or the device voice
  await expect.poll(async () => {
    const a = await audio(page);
    return a.clips.some((c) => /\/voice\/[0-9a-f]{8}\.mp3$/.test(c)) || a.spoken.some((s) => /Welcome/.test(s));
  }).toBe(true);
  await advance(page, 7100);
  await expect(player(page).locator('.count')).toHaveText('3');
  await expect.poll(async () => (await audio(page)).beeps).toContain('short');

  await advance(page, 3000);
  await expectPanel(page, info, 'guided', {block: 0, side: null});
  await expect(player(page)).toContainText('Cat-camel');
  await expect.poll(async () => (await audio(page)).beeps).toContain('long');
  const counter = player(page).locator('.count-md').first();
  await expect(counter).toHaveText('–/8');
  await advance(page, 4100);
  await expect(counter).toHaveText('1/8');
  await advance(page, 6000);
  await expect(counter).toHaveText('2/8');

  // guided work auto-advances into the short rest, then the next side-by-side move
  await advance(page, 42000);  // 10.2 s in → 52.2
  await expectPanel(page, info, 'rest', {block: 0});
  await advance(page, 5000);
  await expectPanel(page, info, 'guided', {block: 0, side: 'left'});

  await advance(page, 228300 - 57200);  // 57.2 → 228.3, into the hip flexor
  await expectPanel(page, info, 'timed', {block: 0, side: 'left'});
  await expect(player(page)).toContainText('Half-kneeling hip flexor squeeze');
  expect(await remainingSeconds(page)).toBeLessThanOrEqual(30);
  await advance(page, 30000);
  await expectPanel(page, info, 'rest', {block: 0});
  await advance(page, 5000);
  await expectPanel(page, info, 'timed', {block: 0, side: 'right'});

  await advance(page, 30000);
  await expectPanel(page, info, 'transition', {block: 1});
  await expect(player(page)).toContainText('Superset A');
  await advance(page, 15000);
  await expectPanel(page, info, 'reps', {block: 1, side: null});
  await expect(player(page)).toContainText('Swiss ball hamstring curl');

  await player(page).getByRole('button', {name: 'Done set'}).click();
  await expectPanel(page, info, 'rest', {block: 1});
  expect(await remainingSeconds(page)).toBe(45);
  await advance(page, 34000);
  await expect(cue(page)).not.toContainText('Up next');
  await advance(page, 1500);
  await expect(cue(page)).toContainText('Up next');
  await expect(cue(page)).toContainText(/bulgarian split squat/i);
  await expectFits(page, info);

  await advance(page, 10000);
  await expectPanel(page, info, 'reps', {block: 1, side: 'left'});
  await expect(player(page)).toContainText('DB Bulgarian split squat');
});

test('pause, skip, previous, +15 s and voice off', async ({page}, info) => {
  await open(page, '#/play/day-2');
  await begin(page, info);
  await advance(page, 12100);
  await expectPanel(page, info, 'guided', {block: 0});

  // paused: the clock moves, the workout doesn't
  await pause(page);
  await expectFits(page, info);
  const before = await timer(page).getAttribute('aria-label');
  await advance(page, 8000);
  await expect(timer(page)).toHaveAttribute('aria-label', before!);
  await expectPanel(page, info, 'guided', {block: 0, side: null});
  await resume(page);
  await advance(page, 1100);
  await expect(timer(page)).not.toHaveAttribute('aria-label', before!);

  // Skip exercise moves on to the rest after cat-camel
  await pause(page);
  await closeSheet(page, () => sheet(page).getByRole('button', {name: 'Skip exercise'}).click());
  await expectPanel(page, info, 'rest', {block: 0});
  await player(page).getByRole('button', {name: 'Skip rest'}).click();
  await expectPanel(page, info, 'guided', {block: 0, side: 'left'});
  await expect(player(page)).toContainText('McGill bird-dog');

  // Previous within the first seconds goes back to the last exercise
  await pause(page);
  await closeSheet(page, () => sheet(page).getByRole('button', {name: 'Previous exercise'}).click());
  await expectPanel(page, info, 'guided', {block: 0, side: null});
  await expect(player(page)).toContainText('Cat-camel');

  // +15 s stretches the 5 s rest
  await player(page).getByRole('button', {name: 'Next', exact: true}).click();
  await expectPanel(page, info, 'rest', {block: 0});
  expect(await remainingSeconds(page)).toBe(5);
  await player(page).getByRole('button', {name: '+15 s'}).click();
  expect(await remainingSeconds(page)).toBe(20);
  await advance(page, 6100);
  await expectPanel(page, info, 'rest', {block: 0});
  expect(await remainingSeconds(page)).toBe(14);

  // voice off: beeps keep coming, the coach goes quiet
  const said = await audio(page);
  expect(said.clips.length + said.spoken.length).toBeGreaterThan(0);
  await pause(page);
  const voice = sheet(page).getByRole('switch', {name: /Voice coach/});
  await expect(voice).toHaveAttribute('aria-checked', 'true');
  await voice.click();
  await expect(voice).toHaveAttribute('aria-checked', 'false');
  await resume(page);
  const quiet = await audio(page);
  await advance(page, 10500);
  await page.clock.runFor(4000);  // frame by frame through the 3·2·1 so each beep is fresh
  await expectPanel(page, info, 'guided', {block: 0, side: 'left'});
  const after = await audio(page);
  expect(after.clips).toEqual(quiet.clips);
  expect(after.spoken).toEqual(quiet.spoken);
  expect(after.beeps.length).toBeGreaterThan(quiet.beeps.length);
});
