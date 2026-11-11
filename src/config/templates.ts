/** Escalation and correspondence templates (governed content, docs/03 F10/F14). Labels live in strings. */
import type { CallReasonId } from './caseTypes';

export type TemplateFieldKind = 'text' | 'textarea' | 'date' | 'select';

export interface TemplateField {
  key: string;
  kind: TemplateFieldKind;
  required: boolean;
  /** Prefilled from case data (merge field). The agent can still correct it. */
  mergeFrom?: 'caseId' | 'veteranId' | 'callerName' | 'notes' | `typeFields.${string}`;
  options?: readonly string[];
}

export interface EscalationTemplate {
  id: string;
  destination: DestinationId;
  fields: readonly TemplateField[];
  requiredFields: readonly string[];
  /** Merge keys prefilled from case data. */
  mergeKeys: readonly string[];
}

// DECISION: downstream destinations. ServiceNow is confirmed; MNSTR is the configurable "other destination" example.
export const DESTINATIONS = ['servicenow', 'mnstr'] as const;
export type DestinationId = (typeof DESTINATIONS)[number];

const tpl = (id: string, destination: DestinationId, fields: TemplateField[]): EscalationTemplate => ({
  id,
  destination,
  fields,
  requiredFields: fields.filter((f) => f.required).map((f) => f.key),
  mergeKeys: fields.flatMap((f) => (f.mergeFrom ? [f.mergeFrom] : [])),
});

// DECISION: template set and required fields are placeholders until ServiceNow/MNSTR forms are confirmed.
export const ESCALATION_TEMPLATES: Record<string, EscalationTemplate> = {
  'snow-claim-research': tpl('snow-claim-research', 'servicenow', [
    { key: 'caseId', kind: 'text', required: true, mergeFrom: 'caseId' },
    { key: 'veteranId', kind: 'text', required: false, mergeFrom: 'veteranId' },
    { key: 'claimNumber', kind: 'text', required: true, mergeFrom: 'typeFields.claimNumber' },
    { key: 'dateOfService', kind: 'date', required: true },
    { key: 'issueSummary', kind: 'textarea', required: true, mergeFrom: 'notes' },
    { key: 'priority', kind: 'select', required: false, options: ['standard', 'expedited'] },
  ]),
  'snow-general': tpl('snow-general', 'servicenow', [
    { key: 'caseId', kind: 'text', required: true, mergeFrom: 'caseId' },
    { key: 'veteranId', kind: 'text', required: false, mergeFrom: 'veteranId' },
    { key: 'issueSummary', kind: 'textarea', required: true, mergeFrom: 'notes' },
    { key: 'priority', kind: 'select', required: false, options: ['standard', 'expedited'] },
  ]),
  'mnstr-general': tpl('mnstr-general', 'mnstr', [
    { key: 'caseId', kind: 'text', required: true, mergeFrom: 'caseId' },
    { key: 'callerName', kind: 'text', required: false, mergeFrom: 'callerName' },
    { key: 'issueSummary', kind: 'textarea', required: true, mergeFrom: 'notes' },
    { key: 'requestedAction', kind: 'textarea', required: true },
  ]),
};

// DECISION: final reason → escalation destination/template routing is a placeholder (docs/03 F14 "auto from final reason + rules").
export const ESCALATION_ROUTES: Partial<Record<CallReasonId, string>> = {
  claimFiling: 'snow-claim-research',
  pharmacyClaim: 'snow-claim-research',
  providerEnrollment: 'mnstr-general',
};
export const DEFAULT_ESCALATION_TEMPLATE = 'snow-general';
export const DEFAULT_TEMPLATE = ESCALATION_TEMPLATES[DEFAULT_ESCALATION_TEMPLATE] as EscalationTemplate;

/** Default template per destination, used when an agent with override permission changes destination. */
export const DESTINATION_DEFAULT_TEMPLATE: Record<DestinationId, string> = {
  servicenow: 'snow-general',
  mnstr: 'mnstr-general',
};

// DECISION: "Medallion" is the provisional label for the orchestration workflow (docs/01).
export const WORKFLOW_NAME = 'Medallion care coordination';
