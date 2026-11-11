import { expect, test } from '@playwright/test';
import { completeCase, gotoApp, startCall, typeInto } from './helpers';

/** Visual check (docs/06): key screens at 1440, 1280 and 200% zoom. Saved to screenshots/<milestone>/. */
const DIR = 'screenshots/m3';
const SIZES = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1280', width: 1280, height: 720 },
  { name: '1280-zoom200', width: 640, height: 360 }, // 200% zoom of a 1280x720 window
];

for (const size of SIZES) {
  test.describe(`screenshots @ ${size.name}`, () => {
    test.use({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 2 });

    test('landing shell', async ({ page }) => {
      await gotoApp(page, '/');
      await expect(page.getByText('Systems OK')).toBeVisible();
      await page.screenshot({ path: `${DIR}/landing-${size.name}.png` });
    });

    test('workspace: new call', async ({ page }) => {
      await startCall(page);
      await page.screenshot({ path: `${DIR}/workspace-${size.name}.png` });
    });

    test('workspace: close attempt with gaps', async ({ page }) => {
      await startCall(page);
      await page.keyboard.press('ControlOrMeta+Enter');
      await expect(page.getByRole('alert').filter({ hasText: /to fix before closing/ })).toBeFocused();
      await page.screenshot({ path: `${DIR}/workspace-errors-${size.name}.png` });
    });
  });
}

test('workspace: two cases, one closed @ 1440', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await startCall(page);
  await completeCase(page, {
    reason: 'Referral ver',
    typeFields: [[/referral number/i, 'VA0099887766']],
    notes: 'Caller asked whether their referral is active. Confirmed active, appointment scheduled.',
  });
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(page.getByText(/^Case CS-2026-\d{6} closed\.$/)).toBeVisible();
  await page.keyboard.press('Alt+Shift+N');
  const nav = page.getByRole('navigation', { name: 'Cases in this interaction' });
  await expect(nav.getByRole('listitem')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Add case' })).toBeEnabled();
  await page.keyboard.press('Alt+Shift+1');
  await page.getByText(/^Case CS-2026-\d{6} closed\.$/).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${DIR}/workspace-closed-1440.png` });
});

test('workspace: context drawer @ 200% zoom', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 360 });
  await startCall(page);
  await page.keyboard.press('Alt+Shift+C');
  await expect(page.getByRole('complementary', { name: 'Context' })).toBeVisible();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/workspace-drawer-1280-zoom200.png` });
});

for (const size of SIZES) {
  test(`context: Veteran profile, eligibility and records @ ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await startCall(page);
    if (size.width < 1280) await page.keyboard.press('Alt+Shift+C');
    await expect(page.getByRole('heading', { name: /veteran profile/i })).toBeVisible();
    await page.waitForTimeout(300); // let the drawer finish sliding in
    await page.screenshot({ path: `${DIR}/context-profile-${size.name}.png` });
  });
}

test('context: records tab and drill-down @ 1440', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await startCall(page);
  const tab = page.getByRole('tab', { name: 'Claims' });
  await tab.scrollIntoViewIfNeeded();
  await tab.click();
  await expect(page.getByRole('table', { name: 'Claims' })).toBeVisible();
  await page.getByRole('table', { name: 'Claims' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${DIR}/context-claims-1440.png` });
});

test('context: multiple match @ 1440', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await startCall(page, { scenario: 'Veteran multiple match' });
  await expect(page.getByText(/possible matches/)).toBeVisible();
  await page.screenshot({ path: `${DIR}/context-multiple-match-1440.png` });
});

test('context: provider ambiguous + inactive @ 1440', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await startCall(page, { scenario: 'Provider ambiguous, inactive' });
  await page.getByRole('tab', { name: 'Provider' }).click();
  await typeInto(page, /name or organization/i, 'Whitlow');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Inactive facility')).toBeVisible();
  await page.getByText('Inactive facility').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${DIR}/context-provider-1440.png` });
});

test('context: profile service down @ 1440', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await startCall(page, { scenario: 'Profile service down' });
  await expect(page.getByText(/Veteran profile service isn't responding/)).toBeVisible();
  await page.screenshot({ path: `${DIR}/context-profile-down-1440.png` });
});
