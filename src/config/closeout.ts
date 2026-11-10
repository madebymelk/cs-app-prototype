/** Closeout and verification config. Labels live in src/content/strings.ts. */

// DECISION: disposition list is a placeholder until the business confirms dispositions (see decisions.dispositionLevel).
export const DISPOSITIONS = [
  'resolved',
  'informationProvided',
  'escalated',
  'transferred',
  'callbackScheduled',
  'callerDisconnected',
] as const;
export type DispositionId = (typeof DISPOSITIONS)[number];

// DECISION: identity verification checklist items are a placeholder until the verification policy is confirmed.
export const AUTH_CHECKS = ['fullName', 'dateOfBirth', 'ssnLast4'] as const;
export type AuthCheckId = (typeof AUTH_CHECKS)[number];

/** Autosave debounce (docs/02 Save pattern). */
export const AUTOSAVE_DEBOUNCE_MS = 800;
/** Retry delays after a failed autosave; the last value repeats until a save succeeds. */
export const AUTOSAVE_RETRY_MS = [2000, 4000, 8000] as const;
/** After this long a load shows "Still loading [source]" with retry (docs/04). */
export const SLOW_LOAD_MS = 10_000;
