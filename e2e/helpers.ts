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
  // Move focus through the list until the target option is focused, then select it.
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
