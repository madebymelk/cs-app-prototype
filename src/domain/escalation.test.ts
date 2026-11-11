import { describe, expect, it } from 'vitest';
import { DESTINATION_DEFAULT_TEMPLATE, ESCALATION_ROUTES, ESCALATION_TEMPLATES } from '@/config/templates';
import { completeCase, makeEscalation } from '@/test/factories';
import { isSubmitted, missingTemplateFields, prefill, templateFor } from './escalation';

describe('templateFor', () => {
  it('routes by final reason, with a default', () => {
    expect(templateFor('claimFiling').id).toBe('snow-claim-research');
    expect(templateFor('providerEnrollment').destination).toBe('mnstr');
    expect(templateFor('referralVerification').id).toBe('snow-general');
    expect(templateFor(undefined).id).toBe('snow-general');
  });

  it('falls back to the default when config is missing a template', () => {
    expect(templateFor('claimFiling', undefined, {}).id).toBe('snow-general');
    expect(templateFor('claimFiling', 'mnstr', {}).id).toBe('snow-general');
  });

  it('every routed and destination template exists in config', () => {
    for (const id of [...Object.values(ESCALATION_ROUTES), ...Object.values(DESTINATION_DEFAULT_TEMPLATE)]) {
      expect(ESCALATION_TEMPLATES).toHaveProperty(id);
    }
  });

  it('an override switches to that destination’s template; same destination keeps the routed one', () => {
    expect(templateFor('claimFiling', 'mnstr').id).toBe('mnstr-general');
    expect(templateFor('claimFiling', 'servicenow').id).toBe('snow-claim-research');
  });
});

describe('prefill and missing fields', () => {
  const c = completeCase({ id: 'CS-1', finalReason: 'claimFiling', callerRef: 'VET-1', callerFirstName: 'Avery', notes: 'Denied claim', typeFields: { claimNumber: '2026-1' } });

  it('fills merge fields from the case and skips blanks', () => {
    expect(prefill(ESCALATION_TEMPLATES['snow-claim-research']!, c)).toEqual({ caseId: 'CS-1', veteranId: 'VET-1', claimNumber: '2026-1', issueSummary: 'Denied claim' });
    expect(prefill(ESCALATION_TEMPLATES['mnstr-general']!, c)).toEqual({ caseId: 'CS-1', callerName: 'Avery', issueSummary: 'Denied claim' });
    expect(prefill(ESCALATION_TEMPLATES['snow-general']!, { ...c, callerRef: undefined, notes: ' ' })).toEqual({ caseId: 'CS-1' });
  });

  it('lists required fields still empty', () => {
    const t = ESCALATION_TEMPLATES['snow-claim-research']!;
    expect(missingTemplateFields(t, prefill(t, c))).toEqual(['dateOfService']);
    expect(missingTemplateFields(t, { ...prefill(t, c), dateOfService: '2026-10-02' })).toEqual([]);
  });

  it('knows which statuses are submitted', () => {
    expect(isSubmitted(makeEscalation({ status: 'assigned' }))).toBe(true);
    expect(isSubmitted(makeEscalation({ status: 'failed' }))).toBe(false);
  });
});
