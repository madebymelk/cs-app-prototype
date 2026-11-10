import type { Eligibility, EligibilityStatus, EligibilityType, SourceState } from './types';

export type EligibilityTone = 'success' | 'error' | 'warning' | 'info';

/**
 * Display mapping (F7). "Unknown" and "unavailable" are never shown as "not eligible":
 * absence of an answer is not a negative answer.
 */
export const ELIGIBILITY_DISPLAY: Record<EligibilityStatus, { labelKey: EligibilityStatus; tone: EligibilityTone }> = {
  eligible: { labelKey: 'eligible', tone: 'success' },
  notEligible: { labelKey: 'notEligible', tone: 'error' },
  pending: { labelKey: 'pending', tone: 'info' },
  unknown: { labelKey: 'unknown', tone: 'warning' },
  unavailable: { labelKey: 'unavailable', tone: 'warning' },
};

export function eligibilityDisplay(status: EligibilityStatus) {
  return ELIGIBILITY_DISPLAY[status];
}

/**
 * Status for one eligibility type. Each type stands alone: community care eligibility never implies
 * pharmacy (or any other) access. A failed, timed-out or denied source reads as "unavailable".
 */
export function eligibilityFor(
  state: SourceState<Eligibility[]>,
  type: EligibilityType,
): EligibilityStatus | undefined {
  switch (state.status) {
    case 'loading':
      return undefined;
    case 'error':
    case 'timeout':
    case 'denied':
      return 'unavailable';
    case 'empty':
      return 'unknown';
    case 'ok':
      return state.data?.find((e) => e.type === type)?.status ?? 'unknown';
  }
}
