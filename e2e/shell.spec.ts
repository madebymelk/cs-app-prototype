import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, gotoApp } from './helpers';

test.describe('app shell', () => {
  test('renders with tokens and is axe clean', async ({ page }) => {
    await gotoApp(page, '/');
    await expect(page.getByRole('heading', { level: 1, name: /welcome back, jordan/i })).toBeVisible();
    await expect(page.getByText('Systems OK')).toBeVisible();

    // Tokens are applied: shell bar uses --color-primary-darker and Source Sans 3.
    const bar = page.getByRole('banner');
    await expect(bar).toHaveCSS('background-color', 'rgb(22, 46, 81)');
    await expect(bar).toHaveCSS('height', '48px');
    const font = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(font).toContain('Source Sans 3');
    expect(await page.evaluate(() => document.fonts.check('16px "Source Sans 3"'))).toBe(true);

    await expectNoAxeViolations(page);
  });

  test('every nav route is reachable by keyboard', async ({ page }) => {
    await gotoApp(page, '/');
    await expect(page.getByText('Systems OK')).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();

    const reached: string[] = [];
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      reached.push(await page.evaluate(() => document.activeElement?.textContent.trim() ?? ''));
    }
    expect(reached).toEqual(expect.arrayContaining(['Home', 'Cases']));

    await page.getByRole('link', { name: 'Cases' }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/cases$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Cases' })).toBeVisible();
  });

  test('Alt+Shift+S focuses global search and Enter submits it', async ({ page }) => {
    await gotoApp(page, '/');
    await page.keyboard.press('Alt+Shift+S');
    await expect(page.getByRole('searchbox', { name: 'Search cases' })).toBeFocused();
    await page.keyboard.type('CS-2026-004183');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/cases\?q=CS-2026-004183$/);
  });
});
