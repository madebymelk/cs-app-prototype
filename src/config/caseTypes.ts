/**
 * Case types, call reasons and routing rules (docs/05: src/config/caseTypes.ts).
 * Labels live in src/content/strings.ts. Every mapping here is a placeholder until the business confirms it.
 */

// DECISION: call reasons are the observed call types from research (docs/01); the final list is not set.
export const CALL_REASONS = [
  'referralVerification',
  'eligibilityConfirmation',
  'urgentCareReferral',
  'claimFiling',
  'pharmacyClaim',
  'escalationFollowUp',
  'providerEnrollment',
] as const;
export type CallReasonId = (typeof CALL_REASONS)[number];

export const isCallReason = (v: unknown): v is CallReasonId =>
  typeof v === 'string' && (CALL_REASONS as readonly string[]).includes(v);

export interface CallReasonRule {
  caseType: CaseTypeId;
  /** Workgroup assigned by rule; undefined means the agent picks one manually. */
  workgroupId?: string;
  /** Escalation template that must be submitted before the case can close. */
  requiredTemplateId?: string;
}

// DECISION: final reason → workgroup and required-escalation rules are placeholders (docs/03 F5 ◇).
export const CALL_REASON_RULES: Record<CallReasonId, CallReasonRule> = {
  referralVerification: { caseType: 'referral', workgroupId: 'WG-REFERRALS' },
  eligibilityConfirmation: { caseType: 'eligibility', workgroupId: 'WG-ELIGIBILITY' },
  urgentCareReferral: { caseType: 'referral', workgroupId: 'WG-URGENT-CARE' },
  claimFiling: { caseType: 'claim', workgroupId: 'WG-CLAIMS', requiredTemplateId: 'snow-claim-research' },
  pharmacyClaim: { caseType: 'claim', workgroupId: 'WG-PHARMACY' },
  escalationFollowUp: { caseType: 'general' }, // no rule: agent selects the workgroup manually
  providerEnrollment: { caseType: 'provider', workgroupId: 'WG-PROVIDER-SERVICES' },
};

export const CASE_TYPES = ['referral', 'eligibility', 'claim', 'provider', 'general'] as const;
export type CaseTypeId = (typeof CASE_TYPES)[number];

// DECISION: extra required fields per case type are examples until intake requirements are final.
export const CASE_TYPE_FIELDS: Record<CaseTypeId, { requiredFields: readonly string[] }> = {
  referral: { requiredFields: ['referralNumber'] },
  eligibility: { requiredFields: ['eligibilityType'] },
  claim: { requiredFields: ['claimNumber', 'claimType'] },
  provider: { requiredFields: ['npi'] },
  general: { requiredFields: [] },
};

// DECISION: workgroup list is a placeholder.
export const WORKGROUPS = [
  'WG-REFERRALS',
  'WG-ELIGIBILITY',
  'WG-URGENT-CARE',
  'WG-CLAIMS',
  'WG-PHARMACY',
  'WG-PROVIDER-SERVICES',
  'WG-ESCALATIONS',
] as const;
