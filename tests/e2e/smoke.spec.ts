import {expect, test} from '@playwright/test';

// Foundation smoke test; Stream G replaces it with the full workout journeys.
test('home lists the four days', async ({page}) => {
  await page.goto('./');
  await expect(page.getByRole('heading', {name: 'Spine Rehab Split'})).toBeVisible();
  await expect(page.locator('.day')).toHaveCount(4);
});
