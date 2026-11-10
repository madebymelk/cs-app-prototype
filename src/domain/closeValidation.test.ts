import { describe, expect, it } from 'vitest';
import { completeCase, makeCase, makeEscalation } from '@/test/factories';
import { CALL_REASON_RULES } from '@/config/caseTypes';
import { ESCALATION_TEMPLATES } from '@/config/templates';
import { validateClose } from './closeValidation';

describe('validateClose', () => {
  it('passes a complete referral case', () => {
    expect(validateClose(completeCase())).toEqual([]);
  });

  it('lists every missing always-required field', () => {
    const fields = validateClose(makeCase({ status: 'open' })).map((i) => i.field);
    expect(fields).toEqual(['finalReason', 'callerFirstName', 'notes', 'repeatContact', 'disposition', 'workgroup']);
  });

  it('flags a missing caller type', () => {
    const c = completeCase({ callerType: undefined as unknown as 'veteran' });
    expect(validateClose(c)).toEqual([{ field: 'callerType', code: 'required' }]);
  });

  it('treats whitespace-only notes as missing', () => {
    expect(validateClose(completeCase({ notes: '   ' }))).toEqual([{ field: 'notes', code: 'required' }]);
  });

  it('accepts repeat contact answered "no" (false)', () => {
    expect(validateClose(completeCase({ repeatContact: false }))).toEqual([]);
  });

  it('does not require case-level disposition when disposition is captured per interaction', () => {
    const c = completeCase({ disposition: undefined });
    expect(validateClose(c, { dispositionLevel: 'interaction' })).toEqual([]);
    expect(validateClose(c, { dispositionLevel: 'case' })).toEqual([{ field: 'disposition', code: 'required' }]);
  });

  it('requires case-type fields from config, using the explicit case type when set', () => {
    expect(validateClose(completeCase({ typeFields: {} }))).toEqual([
      { field: 'typeFields.referralNumber', code: 'required' },
    ]);
    expect(validateClose(completeCase({ caseType: 'provider' }))).toEqual([{ field: 'typeFields.npi', code: 'required' }]);
    expect(validateClose(completeCase({ caseType: 'general' }))).toEqual([]);
  });

  it('ignores an unknown case type', () => {
    expect(validateClose(completeCase({ caseType: 'legacy' }))).toEqual([]);
  });

  describe('required escalation (claim filing → ServiceNow claim research)', () => {
    const claim = completeCase({
      finalReason: 'claimFiling',
      workgroup: { id: 'WG-CLAIMS', assignedBy: 'rule' },
      typeFields: { claimNumber: '20261103-0042', claimType: 'medical' },
    });

    it('blocks when no escalation exists', () => {
      expect(validateClose(claim)).toEqual([{ field: 'escalation', code: 'escalationMissing' }]);
    });

    it('blocks with the template fields still missing on a draft escalation', () => {
      const c = { ...claim, escalations: [makeEscalation({ fields: { claimNumber: '20261103-0042' } })] };
      expect(validateClose(c)).toEqual([
        { field: 'escalation.dateOfService', code: 'escalationIncomplete' },
        { field: 'escalation.issueSummary', code: 'escalationIncomplete' },
        { field: 'escalation', code: 'escalationNotSubmitted' },
      ]);
    });

    it('blocks a complete but unsubmitted escalation', () => {
      const fields = { claimNumber: '1', dateOfService: '2026-10-02', issueSummary: 'Denied in error' };
      const c = { ...claim, escalations: [makeEscalation({ status: 'submitting', fields })] };
      expect(validateClose(c)).toEqual([{ field: 'escalation', code: 'escalationNotSubmitted' }]);
    });

    it('blocks when the latest submit failed', () => {
      const c = { ...claim, escalations: [makeEscalation({ status: 'failed' })] };
      expect(validateClose(c)).toEqual([{ field: 'escalation', code: 'escalationFailed' }]);
    });

    it('passes once any matching escalation is submitted, whatever its downstream status', () => {
      for (const status of ['new', 'assigned', 'pending', 'slaRisk', 'blocked', 'resolved', 'rerouted'] as const) {
        const c = { ...claim, escalations: [makeEscalation({ status: 'failed' }), makeEscalation({ id: 'E2', status })] };
        expect(validateClose(c)).toEqual([]);
      }
    });

    it('still requires submission when the template is missing from config', () => {
      const c = { ...claim, escalations: [makeEscalation()] };
      expect(validateClose(c, { dispositionLevel: 'case', templates: {} })).toEqual([
        { field: 'escalation', code: 'escalationNotSubmitted' },
      ]);
    });

    it('every required template in the call-reason rules exists in config', () => {
      for (const rule of Object.values(CALL_REASON_RULES)) {
        if (rule.requiredTemplateId) expect(ESCALATION_TEMPLATES).toHaveProperty(rule.requiredTemplateId);
      }
    });

    it('ignores escalations for other templates', () => {
      const c = { ...claim, escalations: [makeEscalation({ templateId: 'snow-general', status: 'new' })] };
      expect(validateClose(c)).toEqual([{ field: 'escalation', code: 'escalationMissing' }]);
    });
  });
});
