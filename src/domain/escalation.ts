import {
  DEFAULT_ESCALATION_TEMPLATE,
  DEFAULT_TEMPLATE,
  DESTINATION_DEFAULT_TEMPLATE,
  ESCALATION_ROUTES,
  ESCALATION_TEMPLATES,
  type DestinationId,
  type EscalationTemplate,
} from '@/config/templates';
import { isCallReason } from '@/config/caseTypes';
import type { Case, Escalation } from './types';

/**
 * Escalation template for a case: the required one for its final reason if any, else the route for the
 * reason, else the default. An override destination (role-gated in the UI) picks that destination's template.
 */
export function templateFor(
  finalReason: string | undefined,
  override?: DestinationId,
  templates: Record<string, EscalationTemplate> = ESCALATION_TEMPLATES,
): EscalationTemplate {
  const routed = isCallReason(finalReason) ? ESCALATION_ROUTES[finalReason] : undefined;
  const id = routed ?? DEFAULT_ESCALATION_TEMPLATE;
  // A template missing from config falls back to the default rather than breaking escalation.
  const template = templates[id] ?? DEFAULT_TEMPLATE;
  if (!override || override === template.destination) return template;
  return templates[DESTINATION_DEFAULT_TEMPLATE[override]] ?? template;
}

/** Prefill merge fields from the case (docs/03 F5: templates prefill case data). */
export function prefill(template: EscalationTemplate, c: Case): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of template.fields) {
    if (!f.mergeFrom) continue;
    let v: string | undefined;
    if (f.mergeFrom === 'caseId') v = c.id;
    else if (f.mergeFrom === 'veteranId') v = c.callerRef;
    else if (f.mergeFrom === 'callerName') v = c.callerFirstName;
    else if (f.mergeFrom === 'notes') v = c.notes;
    else v = c.typeFields[f.mergeFrom.slice('typeFields.'.length)];
    if (v?.trim()) out[f.key] = v;
  }
  return out;
}

export function missingTemplateFields(template: EscalationTemplate, fields: Record<string, string>): string[] {
  return template.requiredFields.filter((k) => !fields[k]?.trim());
}

/** Statuses that count as "with the downstream team" (submitted, not failed or draft). */
export const isSubmitted = (e: Escalation) => !['draft', 'submitting', 'failed'].includes(e.status);
