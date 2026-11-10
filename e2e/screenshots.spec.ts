import { expect, test, type Page } from '@playwright/test';
import { gotoApp } from './helpers';

/** Visual check (docs/06): key screens at 1440, 1280 and 200% zoom. Saved to screenshots/m0/. */
const SIZES = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1280', width: 1280, height: 720 },
  { name: '1280-zoom200', width: 640, height: 360 }, // 200% zoom of a 1280x720 window
];

async function startCall(page: Page) {
  await gotoApp(page, '/');
  await page.keyboard.press('Alt+Shift+D');
  await page.getByRole('button', { name: 'Voice call' }).click();
  await expect(page.getByText('Initial reason (IVR)')).toBeVisible();
  await page.keyboard.press('Alt+Shift+D'); // collapse the toolbar for the shot
}

for (const size of SIZES) {
  test.describe(`screenshots @ ${size.name}`, () => {
    test.use({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 2 });

    test('landing shell', async ({ page }) => {
      await gotoApp(page, '/');
      await expect(page.getByText('Systems OK')).toBeVisible();
      await page.screenshot({ path: `screenshots/m0/landing-${size.name}.png` });
    });

    test('live interaction frame', async ({ page }) => {
      await startCall(page);
      await page.screenshot({ path: `screenshots/m0/interaction-${size.name}.png` });
    });
  });
}

test('dev toolbar open @ 1440', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoApp(page, '/');
  await page.keyboard.press('Alt+Shift+D');
  await expect(page.getByRole('heading', { name: /prototype controls/i })).toBeVisible();
  await page.screenshot({ path: 'screenshots/m0/devtoolbar-1440.png' });
});
