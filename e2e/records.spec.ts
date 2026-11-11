import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations, openToolbar, selectByKeyboard, startCall } from './helpers';

async function press(page: Page, name: string | RegExp, exact = true) {
  await page.getByRole('button', { name, exact: typeof name === 'string' ? exact : undefined }).focus();
  await page.keyboard.press('Enter');
}
async function pick(page: Page, name: RegExp) {
  await page.getByRole('radio', { name }).focus();
  await page.keyboard.press('Space');
}

test.describe('Journey 5: UCERN fails a control → recover → success → disclosure script (keyboard only)', () => {
  test('blocked by a named control, recovers with another provider, record attached once', async ({ page }) => {
    await startCall(page, { scenario: 'UCERN control fails' });
    await press(page, 'UCERN');
    await expect(page.getByRole('heading', { name: 'Step 1 of 5: Veteran and eligibility' })).toBeFocused();
    await press(page, 'Continue');

    await expect(page.getByRole('heading', { name: 'Step 2 of 5: Provider and network' })).toBeFocused();
    await pick(page, /QuickCare Urgent Care/);
    await press(page, 'Continue');

    await expect(page.getByText('Creation is blocked: 1 control failed.')).toBeVisible();
    await expect(page.getByText(/^Provider active on date of service: Failed/)).toBeVisible();
    await expect(page.getByText('The provider is not active on the date of service. Choose another provider or check the date.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
    await expectNoAxeViolations(page);

    await press(page, 'Back');
    await pick(page, /Canyon Urgent Care/);
    await press(page, 'Continue');
    await expect(page.getByText('Creation is blocked')).toHaveCount(0);
    await press(page, 'Continue');
    await press(page, 'Create UCERN record');

    await expect(page.getByText(/^UCERN record UC-\d{8} created and attached to this case\.$/)).toBeVisible();
    await expect(page.getByText(/^Your urgent care eligibility record number is UC-\d{8}\. It lets Canyon Urgent Care see you/)).toBeVisible();
    const chips = page.getByRole('list', { name: 'Linked to this case' });
    await expect(chips.getByText(/^UC-\d{8}$/)).toHaveCount(1);
    await press(page, 'Done');
    await expect(page.getByRole('heading', { name: 'Create a UCERN record' })).toHaveCount(0);
  });

  test('a failed create retries without creating a duplicate', async ({ page }) => {
    await startCall(page, { scenario: 'Record creation fails' });
    await press(page, 'UCERN');
    await press(page, 'Continue');
    await pick(page, /Canyon Urgent Care/);
    await press(page, 'Continue');
    await press(page, 'Continue');
    await press(page, 'Create UCERN record');
    await expect(page.getByText("The UCERN record wasn't created. Retrying won't create a duplicate.")).toBeVisible();
    await press(page, 'Retry');
    await expect(page.getByText(/^UCERN record UC-\d{8} created/)).toBeVisible();
    await expect(page.getByRole('list', { name: 'Linked to this case' }).getByText(/^UC-\d{8}$/)).toHaveCount(1);
  });

  test('VPERN requires a VA network pharmacy', async ({ page }) => {
    await startCall(page);
    await press(page, 'VPERN');
    await press(page, 'Continue');
    await pick(page, /Riverside Retail Pharmacy/);
    await press(page, 'Continue');
    await expect(page.getByText(/^VA network source: Failed/)).toBeVisible();
    await press(page, 'Back');
    await pick(page, /Saguaro Community Pharmacy/);
    await press(page, 'Continue');
    await expect(page.getByText('Creation is blocked')).toHaveCount(0);
  });

  test('records are never created outside a case: no Veteran, no record', async ({ page }) => {
    await startCall(page, { scenario: 'Veteran multiple match' });
    await press(page, 'UCERN');
    await expect(page.getByText(/Identify the Veteran in the Context panel first/).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
    await openToolbar(page);
    await selectByKeyboard(page, /\bscenario$/i, 'Happy path');
  });
});
