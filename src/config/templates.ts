/** Escalation and correspondence templates (governed content, docs/03 F10/F14). */
export interface EscalationTemplate {
  id: string;
  destination: 'servicenow' | (string & {});
  requiredFields: readonly string[];
  /** Merge keys prefilled from case data. */
  mergeKeys: readonly string[];
}

// DECISION: template set and required fields are placeholders until ServiceNow/MNSTR forms are confirmed.
export const ESCALATION_TEMPLATES: Record<string, EscalationTemplate> = {
  'snow-claim-research': {
    id: 'snow-claim-research',
    destination: 'servicenow',
    requiredFields: ['claimNumber', 'dateOfService', 'issueSummary'],
    mergeKeys: ['caseId', 'veteranId', 'claimNumber'],
  },
  'snow-general': {
    id: 'snow-general',
    destination: 'servicenow',
    requiredFields: ['issueSummary'],
    mergeKeys: ['caseId'],
  },
  'mnstr-general': {
    id: 'mnstr-general',
    destination: 'mnstr',
    requiredFields: ['issueSummary', 'requestedAction'],
    mergeKeys: ['caseId'],
  },
};
