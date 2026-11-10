import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

export async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

/** Opens the prototype controls with the keyboard shortcut. */
export async function openToolbar(page: Page) {
  await page.keyboard.press('Alt+Shift+D');
  await expect(page.getByRole('heading', { name: /prototype controls/i })).toBeVisible();
}

/** Picks an option from a React Aria select using only the keyboard. */
export async function selectByKeyboard(page: Page, label: RegExp, option: string) {
  const toolbar = page.getByRole('complementary', { name: 'Prototype controls' });
  await toolbar.getByRole('button', { name: label }).focus();
  await page.keyboard.press('Enter');
  const opt = page.getByRole('option', { name: option, exact: true });
  await expect(opt).toBeVisible();
  // Start at the top, then move down until the target option is focused, and select it.
  await page.keyboard.press('Home');
  for (let i = 0; i < 30 && !(await opt.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press('ArrowDown');
  }
  await page.keyboard.press('Enter');
}

/** Navigates and waits until the app has mounted (MSW starts before React renders). */
export async function gotoApp(page: Page, path = '/') {
  await page.goto(path);
  await expect(page.getByRole('banner')).toBeVisible();
}

/** Starts a simulated call from the prototype controls using the keyboard, then collapses the controls. */
export async function startCall(page: Page, opts: { scenario?: string; channel?: 'Voice call' | 'Chat' } = {}) {
  await gotoApp(page, '/');
  await openToolbar(page);
  if (opts.scenario) await selectByKeyboard(page, /\bscenario$/i, opts.scenario);
  await page.getByRole('button', { name: opts.channel ?? 'Voice call' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/interaction\/INT-/);
  await page.keyboard.press('Alt+Shift+D');
  await expect(page.getByRole('heading', { name: /^Active case/ })).toBeVisible();
}

/** Keyboard-only form entry: focus the control, then type (selects use native type-ahead). */
export const control = (page: Page, label: RegExp) =>
  page.getByLabel(label).and(page.locator('input, select, textarea'));

export async function typeInto(page: Page, label: RegExp, text: string) {
  const field = control(page, label);
  await field.focus();
  // Clear text fields first; on a native <select> Ctrl+A would select the whole page instead.
  if ((await field.evaluate((el) => el.tagName)) !== 'SELECT') await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type(text);
}

export async function chooseRadio(page: Page, group: RegExp, option: string) {
  await page.getByRole('group', { name: group }).getByRole('radio', { name: option }).focus();
  await page.keyboard.press('Space');
}

/** Fills everything a case needs to close, for the given final reason and its extra fields. */
export async function completeCase(
  page: Page,
  { reason, typeFields, notes }: { reason: string; typeFields: [RegExp, string][]; notes: string },
) {
  await typeInto(page, /^final reason/i, reason);
  for (const [label, value] of typeFields) await typeInto(page, label, value);
  await typeInto(page, /^notes/i, notes);
  await chooseRadio(page, /^repeat contact/i, 'No');
  await typeInto(page, /^disposition/i, 'Res');
}
