import { expect, test, type Page } from '@playwright/test';
import { chooseRadio, completeCase, control, expectNoAxeViolations, openToolbar, selectByKeyboard, startCall, typeInto } from './helpers';

const press = async (page: Page, locator: ReturnType<Page['getByRole']>, key = 'Enter') => {
  await locator.focus();
  await page.keyboard.press(key);
};

/** Case audit events from the persisted workspace (IDs and field names only). */
async function auditActions(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const raw = sessionStorage.getItem('cs-workspace');
    const state = (raw ? JSON.parse(raw) : { state: { cases: {} } }) as { state: { cases: Record<string, { audit: { action: string }[] }> } };
    return Object.values(state.state.cases).flatMap((c) => c.audit.map((a) => a.action));
  });
}

test.describe('Journey 3: authentication fails, then an authorized representative (keyboard only)', () => {
  test('fail → caller changed → rep verified, case continues', async ({ page }) => {
    await startCall(page, { scenario: 'Authentication failed' });
    const auth = page.getByRole('region', { name: 'Caller verification' });
    await press(page, auth.getByRole('button', { name: 'Start verification' }));
    await press(page, auth.getByRole('checkbox', { name: 'Full name matches' }), 'Space');
    await press(page, auth.getByRole('button', { name: 'Verification failed' }));
    await expect(auth.getByText(/don't share protected details/i)).toBeVisible();
    await expect(page.locator('#interaction').getByText('Verification failed')).toBeVisible();

    await press(page, auth.getByRole('button', { name: 'Caller changed' }));
    await expect(auth.getByText(/a different person is on the line/i)).toBeVisible();
    await typeInto(page, /^caller type/i, 'Auth');
    await typeInto(page, /caller first name/i, 'Jordan');
    await expect(control(page, /^caller type/i)).toHaveValue('authorizedRep');

    await press(page, auth.getByRole('button', { name: 'Verify new caller' }));
    for (const check of ['Full name matches', 'Date of birth matches', 'Last 4 of SSN matches']) {
      await press(page, auth.getByRole('checkbox', { name: check }), 'Space');
    }
    await press(page, auth.getByRole('button', { name: 'Mark verified' }));
    await expect(page.locator('#interaction').getByText('Verified', { exact: true })).toBeVisible();
    await expectNoAxeViolations(page);

    await typeInto(page, /^notes/i, 'Veteran failed verification; spouse (authorized representative) verified and asked about a referral.');
    await expect(page.getByText(/Saved \d/)).toBeVisible();
  });

  test('authorized representative scenario explains authority check', async ({ page }) => {
    await startCall(page, { scenario: 'Authorized representative' });
    await expect(page.locator('#interaction').getByText('Authorized representative')).toBeVisible();
    await expect(page.getByText(/confirm their authority before sharing details/i)).toBeVisible();
  });
});

test.describe('Journey 4: provider search with multiple matches and an inactive facility (keyboard only)', () => {
  test('choose the active provider, associate with case: chip + audit', async ({ page }) => {
    await startCall(page, { scenario: 'Provider ambiguous, inactive' });
    await press(page, page.getByRole('tab', { name: 'Provider' }));
    await typeInto(page, /name or organization/i, 'Whitlow');
    await page.keyboard.press('Enter');
    await expect(page.getByText('2 providers at 2 facilities')).toBeVisible();
    await expect(page.getByText('Inactive facility')).toBeVisible();
    await expect(page.getByText('No address on file')).toBeVisible();
    await expectNoAxeViolations(page);

    // Active facility is listed first.
    await press(page, page.locator('#context').getByRole('button', { name: 'Dana Whitlow, MD' }).first());
    await expect(page.getByText('9100200301')).toBeVisible();
    await press(page, page.getByRole('button', { name: 'Associate with case' }));
    await expect(page.getByText('Associated with this case')).toBeVisible();
    const chips = page.getByRole('list', { name: 'Linked to this case' });
    await expect(chips.getByText('PRV-2001')).toBeVisible();
    await expect(chips.getByText('(added)')).toBeVisible();
    await expect.poll(() => auditActions(page)).toContain('case.associated');
  });
});

test.describe('Journey 7: profile service down mid-call; case work continues (keyboard only)', () => {
  test('profile names the source, records still load, health degraded, case closes', async ({ page }) => {
    await startCall(page);
    await expect(page.getByRole('heading', { name: /veteran profile/i })).toBeVisible();

    await openToolbar(page);
    await selectByKeyboard(page, /\bscenario$/i, 'Profile service down');
    await page.keyboard.press('Alt+Shift+D');

    await expect(page.getByText("Veteran profile service isn't responding. You can keep working on this case.")).toBeVisible();
    await expect(page.getByText(/not found/i)).toHaveCount(0);
    await expect(page.getByText('Degraded: Veteran profile service')).toBeVisible();
    await expect(page.getByRole('table', { name: 'Referrals' })).toBeVisible();

    await completeCase(page, {
      reason: 'Referral ver',
      typeFields: [[/referral number/i, 'VA0011223344']],
      notes: 'Profile service was down; confirmed referral details from the referral record.',
    });
    await page.keyboard.press('ControlOrMeta+Enter');
    await expect(page.getByText(/^Case CS-2026-\d{6} closed\.$/)).toBeVisible();
  });
});

test.describe('context panel behaviors', () => {
  test('eligibility unknown is never shown as not eligible', async ({ page }) => {
    await startCall(page, { scenario: 'Eligibility unknown' });
    const eligibility = page.getByRole('region', { name: /^Eligibility/ });
    await expect(eligibility.getByText('Unknown')).toHaveCount(2);
    await expect(eligibility.getByText("Couldn't check")).toBeVisible();
    await expect(eligibility.getByText('Not eligible')).toHaveCount(0);
  });

  test('multiple-match: disambiguate, then the Veteran links to the case', async ({ page }) => {
    await startCall(page, { scenario: 'Veteran multiple match' });
    await expect(page.getByText(/possible matches\. Confirm with the caller/)).toBeVisible();
    await press(page, page.getByRole('button', { name: /^Select / }).first());
    await expect(page.getByRole('heading', { name: /veteran profile/i })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Linked to this case' }).getByText('(added)')).toBeVisible();
    await expect.poll(() => auditActions(page)).toContain('case.associated');
  });

  test('prior case: selective copy appends to the active case; prior stays read-only', async ({ page }) => {
    await startCall(page, { scenario: 'Duplicate case' });
    const prior = page.getByRole('navigation', { name: 'Cases in this interaction' }).getByRole('button', { name: /^View CS-2026-/ });
    await press(page, prior);
    await expect(page.getByText('Prior cases are read-only. Copy what you need into the active case.')).toBeVisible();
    await press(page, page.getByRole('checkbox', { name: 'Notes' }), 'Space');
    await press(page, page.getByRole('button', { name: 'Copy to active case' }));
    await expect(page.getByText(/^Copied 1 item into CS-2026-/)).toBeVisible();
    await expect(page.getByRole('textbox', { name: /^notes/i })).toHaveValue(/^From CS-2026-\d{6}: Caller asked the same question two days ago/);
    await expect.poll(() => auditActions(page)).toContain('case.copiedFrom');
  });

  test('drill-down Back restores the tab and returns focus to the row', async ({ page }) => {
    await startCall(page);
    await press(page, page.getByRole('tab', { name: 'Claims' }));
    const firstRow = page.getByRole('table', { name: 'Claims' }).getByRole('button', { name: /^Open / }).first();
    const label = await firstRow.getAttribute('aria-label');
    await press(page, firstRow);
    await expect(page.getByRole('button', { name: 'Back to Claims' })).toBeVisible();
    await press(page, page.getByRole('button', { name: 'Back to Claims' }));
    await expect(page.getByRole('tab', { name: 'Claims' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: label! })).toBeFocused();
  });

  test('repeat contact and other edits still work alongside the panel', async ({ page }) => {
    await startCall(page);
    await chooseRadio(page, /^repeat contact/i, 'Yes');
    await expect(page.getByText(/Saved \d/)).toBeVisible();
  });
});
