import { describe, expect, it } from 'vitest';
import { ELIGIBILITY_DISPLAY, eligibilityDisplay, eligibilityFor } from './eligibility';
import type { Eligibility, EligibilityStatus, SourceState } from './types';

const source = 'Eligibility service';
const ok = (data: Eligibility[]): SourceState<Eligibility[]> => ({ status: 'ok', data, source });

describe('eligibility display mapping', () => {
  it('never renders unknown or unavailable as "not eligible"', () => {
    for (const s of ['unknown', 'unavailable', 'pending'] as EligibilityStatus[]) {
      expect(eligibilityDisplay(s).labelKey).not.toBe('notEligible');
      expect(eligibilityDisplay(s).tone).not.toBe('error');
    }
  });

  it('maps each status to its own label', () => {
    for (const s of Object.keys(ELIGIBILITY_DISPLAY) as EligibilityStatus[]) {
      expect(eligibilityDisplay(s).labelKey).toBe(s);
    }
    expect(eligibilityDisplay('eligible').tone).toBe('success');
    expect(eligibilityDisplay('notEligible').tone).toBe('error');
  });
});

describe('eligibilityFor', () => {
  it('returns the status for the requested type', () => {
    expect(eligibilityFor(ok([{ type: 'communityCare', status: 'eligible', source }]), 'communityCare')).toBe('eligible');
  });

  it('never implies pharmacy access from community care eligibility', () => {
    const state = ok([{ type: 'communityCare', status: 'eligible', source }]);
    expect(eligibilityFor(state, 'pharmacy')).toBe('unknown');
  });

  it('reads a failed, timed-out or denied source as unavailable, never as not eligible', () => {
    for (const status of ['error', 'timeout', 'denied'] as const) {
      expect(eligibilityFor({ status, source }, 'communityCare')).toBe('unavailable');
    }
  });

  it('reads an empty answer as unknown and gives nothing while loading', () => {
    expect(eligibilityFor({ status: 'empty', source }, 'dental')).toBe('unknown');
    expect(eligibilityFor({ status: 'loading', source }, 'dental')).toBeUndefined();
    expect(eligibilityFor({ status: 'ok', source }, 'dental')).toBe('unknown');
  });
});
