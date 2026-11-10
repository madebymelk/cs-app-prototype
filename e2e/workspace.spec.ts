import { expect, test } from '@playwright/test';
import { chooseRadio, completeCase, control, expectNoAxeViolations, selectByKeyboard, startCall, typeInto } from './helpers';

test.describe('Journey 1: verified Veteran → referral question → close (keyboard only)', () => {
  test('closes the case with Ctrl+Enter and ends the interaction', async ({ page }) => {
    await startCall(page);
    await expect(page.getByRole('heading', { name: 'Caller verification' })).toBeVisible();
    await expect(page.getByText('Verified by IVR before the call reached you.')).toBeVisible();
    await expectNoAxeViolations(page);

    // Close attempt with gaps: ErrorSummary gets focus and links to fields.
    await page.keyboard.press('ControlOrMeta+Enter');
    const summary = page.getByRole('alert').filter({ hasText: /to fix before closing/ });
    await expect(summary).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(control(page, /^notes/i)).toBeFocused();

    await completeCase(page, {
      reason: 'Referral ver',
      typeFields: [[/referral number/i, 'VA0099887766']],
      notes: 'Caller asked whether their referral is active. Confirmed active, appointment scheduled.',
    });
    await expect(page.getByText('Everything required is complete.')).toBeVisible();
    await expect(page.getByText(/Saved \d/)).toBeVisible();

    await page.keyboard.press('ControlOrMeta+Enter');
    await expect(page.getByText(/^Case CS-2026-\d{6} closed\.$/)).toBeVisible();
    await expectNoAxeViolations(page);

    await page.locator('#interaction').getByRole('button', { name: 'End interaction' }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('Journey 2: one call, several cases (keyboard only)', () => {
  test('pharmacy claim + pharmacy eligibility cases, drafts survive switching, close all, end', async ({ page }) => {
    await startCall(page);
    const caseHeading = page.getByRole('heading', { name: /^Active case/ });
    const firstId = (await caseHeading.textContent())?.match(/CS-2026-\d{6}/)?.[0];

    await typeInto(page, /^notes/i, 'Pharmacy claim was denied at the counter.');

    // Add a second case: shared context only, fresh notes, focus moves to its heading.
    await page.keyboard.press('Alt+Shift+N');
    await expect(caseHeading).not.toContainText(firstId!);
    await expect(caseHeading).toBeFocused();
    await expect(control(page, /^notes/i)).toHaveValue('');
    await expect(control(page, /caller first name/i)).not.toHaveValue('');

    // Switch back: the first draft kept its text.
    await page.keyboard.press('Alt+Shift+1');
    await expect(caseHeading).toContainText(firstId!);
    await expect(control(page, /^notes/i)).toHaveValue('Pharmacy claim was denied at the counter.');

    // End is blocked while cases are open.
    await page.locator('#interaction').getByRole('button', { name: 'End interaction' }).focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Close these cases first' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: `Go to ${firstId!}` })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await completeCase(page, {
      reason: 'Pharm',
      typeFields: [
        [/claim number/i, '20261103-0042'],
        [/claim type/i, 'pharmacy'],
      ],
      notes: 'Pharmacy claim was denied at the counter. Explained resubmission steps.',
    });
    await page.keyboard.press('ControlOrMeta+Enter');
    await expect(page.getByText(`Case ${firstId!} closed.`)).toBeVisible();

    await page.keyboard.press('Alt+Shift+2');
    await completeCase(page, {
      reason: 'Elig',
      typeFields: [[/eligibility type/i, 'pharmacy']],
      notes: 'Confirmed pharmacy eligibility is a separate check; caller is eligible.',
    });
    await page.keyboard.press('ControlOrMeta+Enter');
    await expect(page.getByText(/^Case CS-2026-\d{6} closed\.$/)).toBeVisible();

    const nav = page.getByRole('navigation', { name: 'Cases in this interaction' });
    await expect(nav.getByText('Closed')).toHaveCount(2);
    await expectNoAxeViolations(page);

    await page.locator('#interaction').getByRole('button', { name: 'End interaction' }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('workspace guarantees', () => {
  test('the interaction header never scrolls away', async ({ page }) => {
    await startCall(page);
    await page.getByRole('region', { name: 'Active case' }).evaluate((el) => { el.scrollTop = el.scrollHeight; });
    const box = await page.locator('#interaction').boundingBox();
    expect(box?.y).toBeLessThanOrEqual(60);
    await expect(page.locator('#interaction')).toBeInViewport();
  });

  test('a failed autosave keeps the input and retries until it saves', async ({ page }) => {
    await startCall(page, { scenario: 'Autosave fails' });
    await typeInto(page, /^notes/i, 'Typed while the case service is down.');
    await expect(page.getByText("Couldn't save. Retrying…")).toBeVisible();
    await expect(control(page, /^notes/i)).toHaveValue('Typed while the case service is down.');

    await page.keyboard.press('Alt+Shift+D');
    await selectByKeyboard(page, /\bscenario$/i, 'Happy path');
    await expect(page.getByText(/Saved \d/)).toBeVisible({ timeout: 15_000 });
  });

  test('work survives a page reload', async ({ page }) => {
    await startCall(page);
    await typeInto(page, /^notes/i, 'Do not lose this.');
    await chooseRadio(page, /^repeat contact/i, 'Yes');
    await page.reload();
    await expect(control(page, /^notes/i)).toHaveValue('Do not lose this.');
  });

  test('duplicate case warning offers continue or view', async ({ page }) => {
    await startCall(page, { scenario: 'Duplicate case' });
    const warning = page.getByText('Possible duplicate case');
    await expect(warning).toBeVisible();
    await page.getByRole('button', { name: 'View existing case' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: /^Case CS-2026-/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Continue with new case' }).focus();
    await page.keyboard.press('Enter');
    await expect(warning).toBeHidden();
  });

  test('banners: partial screen pop, linkage failure and transfer are non-blocking', async ({ page }) => {
    await startCall(page, { scenario: 'Linkage failed' });
    await expect(page.getByText(/couldn't be linked to its contact record/)).toBeVisible();
    await expect(control(page, /^notes/i)).toBeEditable();

    await startCall(page, { scenario: 'Transfer in' });
    await expect(page.getByText(/^Transferred from .*Their case is listed/)).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Cases in this interaction' }).getByText(/Started by/)).toBeVisible();
  });

  test('roles without case work see the workspace read-only with a denied message', async ({ page }) => {
    await startCall(page);
    await page.keyboard.press('Alt+Shift+D');
    await selectByKeyboard(page, /\brole$/i, 'Quality auditor');
    await expect(page.getByText("You don't have access to case work. Contact your supervisor if you need it.")).toBeVisible();
    await expect(page.locator('#interaction').getByRole('button', { name: 'End interaction' })).toHaveCount(0);
  });
});

test.describe('narrow window / 200% zoom', () => {
  test.use({ viewport: { width: 640, height: 720 } });

  test('context becomes a drawer, cases move into a header switcher, header stays', async ({ page }) => {
    await startCall(page);
    await expect(page.getByRole('navigation', { name: 'Cases in this interaction' })).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'Active case' })).toBeVisible();
    const context = page.getByRole('complementary', { name: 'Context' });
    await expect(context).toBeHidden();
    await page.keyboard.press('Alt+Shift+C');
    await expect(context).toBeVisible();
    await expectNoAxeViolations(page);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(640);
  });
});
