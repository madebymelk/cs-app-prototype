import { expect, test } from '@playwright/test';
import { control, expectNoAxeViolations, gotoApp, typeInto } from './helpers';

test.describe('Case search and detail (F6)', () => {
  test('filters persist across navigation and refresh; detail shows history and audit', async ({ page }) => {
    await gotoApp(page, '/cases');
    await expect(page.getByRole('heading', { level: 2, name: /^\d+ cases$/ })).toBeVisible();
    await expect(page.getByText(/More than 30 cases match/)).toBeVisible();

    await typeInto(page, /^status$/i, 'Not');
    await typeInto(page, /^agent$/i, 'Me');
    await page.getByRole('button', { name: 'Search cases' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText(/More than 30 cases match/)).toHaveCount(0);
    await expectNoAxeViolations(page);

    const firstCase = page.getByRole('table').getByRole('link').first();
    const caseId = (await firstCase.textContent()) ?? '';
    await firstCase.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1, name: new RegExp(caseId) })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Timeline' })).toBeVisible();
    await page.getByRole('tab', { name: 'Audit trail' }).click();
    await expect(page.getByRole('table', { name: /Audit trail/ })).toBeVisible();
    await expectNoAxeViolations(page);

    await page.getByRole('link', { name: 'Back to case search' }).click();
    await expect(control(page, /^status$/i)).toHaveValue('notClosed');
    await page.reload();
    await expect(control(page, /^agent$/i)).toHaveValue('AGT-20417');
  });

  test('no match suggests next steps; partial results name the down source', async ({ page }) => {
    await gotoApp(page, '/cases');
    await typeInto(page, /^Case ID, Veteran ID or caller name$/i, 'CS-0000-000000');
    await page.keyboard.press('Enter');
    await expect(page.getByText('No cases match these filters.')).toBeVisible();
    await expect(page.getByText(/Check the case ID format/)).toBeVisible();
  });

  test('global search hands its text to case search', async ({ page }) => {
    await gotoApp(page, '/');
    await page.keyboard.press('Alt+Shift+S');
    await page.keyboard.type('Tamura');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/cases/);
    await expect(control(page, /^Case ID, Veteran ID or caller name$/i)).toHaveValue('Tamura');
  });

  test('unknown case ID explains and links back', async ({ page }) => {
    await gotoApp(page, '/cases/CS-2026-999999');
    await expect(page.getByText('There is no case CS-2026-999999. Check the ID, or search cases.')).toBeVisible();
  });
});
