import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, gotoApp, openToolbar, selectByKeyboard } from './helpers';

test.describe('Dev Toolbar', () => {
  test('switches role without reload: nav and route guard follow', async ({ page }) => {
    await gotoApp(page, '/admin');
    await expect(page.getByRole('heading', { level: 1, name: 'Access denied' })).toBeVisible();

    await openToolbar(page);
    await selectByKeyboard(page, /\brole$/i, 'System administrator');

    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link', { name: 'Admin' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Cases' })).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: 'Administration' })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test('switches scenario and persists it across reload', async ({ page }) => {
    await gotoApp(page, '/');
    await openToolbar(page);
    await selectByKeyboard(page, /\bscenario$/i, 'Profile service down');
    await expect(page.getByText('Degraded: Veteran profile service')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByText('Degraded: Veteran profile service')).toBeVisible();
    await expect(page.getByRole('button', { name: /^profile service down scenario$/i })).toBeVisible();
  });

  test('simulate call screen-pops into the live workspace and survives reload', async ({ page }) => {
    await gotoApp(page, '/');
    await openToolbar(page);
    await page.getByRole('button', { name: 'Voice call' }).focus();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/interaction\/INT-[A-Z0-9]{6}$/);
    await expect(page.getByText('Initial reason (IVR)')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Cases in this interaction' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Active case' })).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Context' })).toBeVisible();
    await expectNoAxeViolations(page);

    await page.reload();
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByText('Initial reason (IVR)')).toBeVisible();

    await page.getByRole('button', { name: 'End interaction' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('failed screen pop names the problem, shows a correlation ID and offers search', async ({ page }) => {
    await gotoApp(page, '/');
    await openToolbar(page);
    await selectByKeyboard(page, /\bscenario$/i, 'Screen pop failed');
    await page.getByRole('button', { name: 'Chat' }).click();
    const alert = page.getByRole('alert');
    await expect(alert).toContainText("Screen pop didn't arrive");
    await expect(alert).toContainText(/COR-/);
    await expect(alert.getByRole('link', { name: 'Search cases' })).toBeVisible();
  });
});
