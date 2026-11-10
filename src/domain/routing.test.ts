import { describe, expect, it } from 'vitest';
import { CALL_REASONS, CALL_REASON_RULES, isCallReason } from '@/config/caseTypes';
import { assignWorkgroup, caseTypeFor, initialFinalReason, requiredTemplateFor, ruleFor } from './routing';

describe('routing by final reason', () => {
  it('has a rule for every call reason', () => {
    for (const r of CALL_REASONS) expect(ruleFor(r)).toBe(CALL_REASON_RULES[r]);
  });

  it('returns nothing for an unknown or missing reason (never routes on the dialed TFN)', () => {
    expect(ruleFor('1-877-881-7618')).toBeUndefined();
    expect(ruleFor(undefined)).toBeUndefined();
    expect(caseTypeFor(undefined)).toBeUndefined();
    expect(requiredTemplateFor('nope')).toBeUndefined();
  });

  it('derives case type and required template from the final reason', () => {
    expect(caseTypeFor('pharmacyClaim')).toBe('claim');
    expect(requiredTemplateFor('claimFiling')).toBe('snow-claim-research');
    expect(requiredTemplateFor('referralVerification')).toBeUndefined();
  });

  it('assigns the workgroup by rule', () => {
    expect(assignWorkgroup({ finalReason: 'claimFiling' })).toEqual({ id: 'WG-CLAIMS', assignedBy: 'rule' });
  });

  it('re-routes a rule-assigned workgroup when the final reason changes', () => {
    const wg = assignWorkgroup({ finalReason: 'pharmacyClaim', workgroup: { id: 'WG-CLAIMS', assignedBy: 'rule' } });
    expect(wg).toEqual({ id: 'WG-PHARMACY', assignedBy: 'rule' });
  });

  it('never overwrites a manual workgroup', () => {
    const manual = { id: 'WG-ESCALATIONS', assignedBy: 'manual' as const };
    expect(assignWorkgroup({ finalReason: 'claimFiling', workgroup: manual })).toBe(manual);
  });

  it('falls back to manual selection when no rule assigns a workgroup', () => {
    expect(assignWorkgroup({ finalReason: 'escalationFollowUp' })).toBeUndefined();
    expect(assignWorkgroup({})).toBeUndefined();
  });
});

describe('initial vs final reason', () => {
  it('preselects the final reason from a known IVR initial reason', () => {
    expect(initialFinalReason({ initialReason: 'eligibilityConfirmation' })).toBe('eligibilityConfirmation');
  });

  it('leaves the final reason empty when IVR sent nothing or an unknown reason', () => {
    expect(initialFinalReason({})).toBeUndefined();
    expect(initialFinalReason({ initialReason: 'Main menu' })).toBeUndefined();
  });

  it('recognizes call reasons', () => {
    expect(isCallReason('claimFiling')).toBe(true);
    expect(isCallReason(42)).toBe(false);
  });
});
