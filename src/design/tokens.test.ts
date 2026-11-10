import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8');
const tokens = Object.fromEntries(
  [...css.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1]!, m[2]!.toLowerCase()]),
);

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Every text/background pair the UI uses. Add a row whenever a new pairing appears. */
const TEXT_PAIRS: [fg: string, bg: string][] = [
  ...['ink', 'text-secondary', 'primary', 'primary-dark', 'error', 'info', 'emergency'].flatMap((fg) =>
    ['surface', 'surface-readonly', 'surface-canvas'].map((bg) => [`color-${fg}`, `color-${bg}`] as [string, string]),
  ),
  // Success and warning text: white surface only (see tokens.css contrast rule).
  ['color-success', 'color-surface'],
  ['color-warning', 'color-surface'],
  ['color-ink', 'color-primary-lighter'],
  ['color-primary-dark', 'color-primary-lighter'],
  ['color-text-inverse', 'color-primary'],
  ['color-text-inverse', 'color-primary-dark'],
  ['color-text-inverse', 'color-primary-darker'],
  ['color-error', 'color-error-bg'],
  ['color-info', 'color-info-bg'],
  ['color-ink', 'color-success-bg'],
  ['color-ink', 'color-warning-bg'],
  ['color-ink', 'color-error-bg'],
  ['color-ink', 'color-info-bg'],
  ['color-ink', 'color-warning-border'],
];

/** Non-text UI components (borders that matter, focus ring, icons): 3:1. */
const UI_PAIRS: [string, string][] = [
  ['color-border-control', 'color-surface'],
  ['color-border-control', 'color-surface-readonly'],
  ['color-focus', 'color-surface'],
  ['color-focus', 'color-primary-darker'],
  ['color-success', 'color-surface'],
  ['color-error', 'color-surface'],
  ['color-info', 'color-surface'],
  ['color-success', 'color-success-bg'],
  ['color-warning', 'color-warning-bg'],
  ['color-error', 'color-error-bg'],
  ['color-info', 'color-info-bg'],
];

describe('design token contrast', () => {
  it('parses the color tokens', () => {
    expect(Object.keys(tokens).length).toBeGreaterThanOrEqual(25);
  });

  it.each(TEXT_PAIRS)('%s on %s meets 4.5:1 for text', (fg, bg) => {
    expect(tokens[fg]).toBeDefined();
    expect(tokens[bg]).toBeDefined();
    expect(contrast(tokens[fg]!, tokens[bg]!)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(UI_PAIRS)('%s on %s meets 3:1 for UI components', (fg, bg) => {
    expect(contrast(tokens[fg]!, tokens[bg]!)).toBeGreaterThanOrEqual(3);
  });
});
