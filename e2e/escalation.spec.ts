import { expect, test } from '@playwright/test';
import { chooseRadio, control, expectNoAxeViolations, openToolbar, selectByKeyboard, startCall, typeInto } from './helpers';

async function claimCase(page: import('@playwright/test').Page) {
  await typeInto(page, /^final reason/i, 'Claim f');
  await typeInto(page, /claim number/i, '20261103-0042');
  await typeInto(page, /claim type/i, 'medical');
  await typeInto(page, /^notes/i, 'Caller says the claim for an Oct 2 visit was denied. Needs claim research.');
  await chooseRadio(page, /^repeat contact/i, 'No');
  await typeInto(page, /^disposition/i, 'Esc');
}

test.describe('Journey 6: ServiceNow escalation with a mandatory template; early close blocked (keyboard only)', () => {
  test('close is blocked until the escalation is sent; then the case closes with the ticket on it', async ({ page }) => {
    await startCall(page);
    await claimCase(page);

    await page.keyboard.press('ControlOrMeta+Enter');
    const summary = page.getByRole('alert').filter({ hasText: /to fix before closing/ });
    await expect(summary).toBeFocused();
    await expect(summary).toContainText('Send the required ServiceNow escalation (use Escalate).');

    await page.keyboard.press('Alt+Shift+E');
    const shell = page.getByRole('region', { name: 'Escalate this case' });
    await expect(page.getByRole('heading', { name: 'Escalate this case' })).toBeFocused();
    await expect(shell.getByText('ServiceNow', { exact: true })).toBeVisible();
    await expect(control(page, /^claim number/i).last()).toHaveValue('20261103-0042');

    // Submit with a required field missing: inline error, focus moves to the field.
    await shell.getByRole('button', { name: 'Send to ServiceNow' }).focus();
    await page.keyboard.press('Enter');
    await expect(shell.getByText('1 required field to complete')).toBeVisible();
    await expect(page.getByLabel(/date of service/i)).toBeFocused();
    await page.keyboard.type('10022026');
    await shell.getByRole('button', { name: 'Send to ServiceNow' }).focus();
    await page.keyboard.press('Enter');

    const card = page.getByRole('article', { name: /^ServiceNow INC\d{7}$/ });
    await expect(card).toBeVisible();
    await expect(card.getByText('New', { exact: true })).toBeVisible();
    await expect(card.getByText('Received and waiting in the queue.')).toBeVisible();
    await card.getByRole('button', { name: 'Refresh status' }).focus();
    await page.keyboard.press('Enter');
    await expect(card.getByText('Assigned', { exact: true })).toBeVisible();
    await expectNoAxeViolations(page);

    await page.keyboard.press('ControlOrMeta+Enter');
    await expect(page.getByText(/^Case CS-2026-\d{6} closed\.$/)).toBeVisible();
  });

  test('submit failure keeps the case open with retry; nothing is lost', async ({ page }) => {
    await startCall(page, { scenario: 'Escalation submit fails' });
    await claimCase(page);
    await page.keyboard.press('Alt+Shift+E');
    await page.getByLabel(/date of service/i).focus();
    await page.keyboard.type('10022026');
    const shell = page.getByRole('region', { name: 'Escalate this case' });
    await shell.getByRole('button', { name: 'Send to ServiceNow' }).focus();
    await page.keyboard.press('Enter');
    await expect(shell.getByText("Couldn't send to ServiceNow. The case is still open and nothing was lost.")).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Active case/ }).locator('..').getByText('Open', { exact: true })).toBeVisible();

    await openToolbar(page);
    await selectByKeyboard(page, /\bscenario$/i, 'Happy path');
    await page.keyboard.press('Alt+Shift+D');
    await shell.getByRole('button', { name: 'Retry sending' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('article', { name: /^ServiceNow INC\d{7}$/ })).toBeVisible();
  });

  test('sync delayed shows when the status was last synced', async ({ page }) => {
    await startCall(page, { scenario: 'Sync delayed' });
    await claimCase(page);
    await page.keyboard.press('Alt+Shift+E');
    await page.getByLabel(/date of service/i).focus();
    await page.keyboard.type('10022026');
    await page.getByRole('button', { name: 'Send to ServiceNow' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText(/^Status may be out of date\. Last synced 47 min ago\.$/)).toBeVisible();
  });

  test('workflow status card walks its lifecycle', async ({ page }) => {
    await startCall(page);
    await page.getByRole('button', { name: 'Start workflow' }).focus();
    await page.keyboard.press('Enter');
    const card = page.getByRole('article', { name: /^Medallion care coordination WF-/ });
    await expect(card.getByText('Submitting', { exact: true })).toBeVisible();
    await card.getByRole('button', { name: 'Refresh status' }).focus();
    await page.keyboard.press('Enter');
    await expect(card.getByText('In progress', { exact: true })).toBeVisible();
    await expect(card.getByText('Care coordination team')).toBeVisible();
  });
});
