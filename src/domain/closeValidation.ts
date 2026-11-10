import { CASE_TYPE_FIELDS } from '@/config/caseTypes';
import { decisions, type Decisions } from '@/config/decisions';
import { ESCALATION_TEMPLATES, type EscalationTemplate } from '@/config/templates';
import { caseTypeFor, requiredTemplateFor } from './routing';
import type { Case, Escalation } from './types';

export type CloseIssueCode =
  | 'required'
  | 'escalationMissing'
  | 'escalationNotSubmitted'
  | 'escalationIncomplete'
  | 'escalationFailed';

export interface CloseIssue {
  /** Case field (or `escalation.<field>` for template fields) the issue points to. */
  field: string;
  code: CloseIssueCode;
}

const blank = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const NOT_SUBMITTED: readonly Escalation['status'][] = ['draft', 'submitting', 'failed'];

/** Everything that blocks closing a case (F5, F14). Empty list = the case can close. */
export interface CloseOptions extends Pick<Decisions, 'dispositionLevel'> {
  templates?: Record<string, EscalationTemplate>;
}

export function validateClose(c: Case, opts: CloseOptions = decisions): CloseIssue[] {
  const issues: CloseIssue[] = [];
  const require = (field: string, value: unknown) => {
    if (blank(value)) issues.push({ field, code: 'required' });
  };

  require('callerType', c.callerType);
  require('finalReason', c.finalReason);
  require('callerFirstName', c.callerFirstName);
  require('notes', c.notes);
  require('repeatContact', c.repeatContact);
  if (opts.dispositionLevel === 'case') require('disposition', c.disposition);
  require('workgroup', c.workgroup?.id);

  const caseType = c.caseType ?? caseTypeFor(c.finalReason);
  if (caseType && caseType in CASE_TYPE_FIELDS) {
    for (const f of CASE_TYPE_FIELDS[caseType as keyof typeof CASE_TYPE_FIELDS].requiredFields) {
      require(`typeFields.${f}`, c.typeFields[f]);
    }
  }

  const templateId = requiredTemplateFor(c.finalReason);
  if (templateId) issues.push(...requiredEscalationIssues(c.escalations, templateId, opts.templates ?? ESCALATION_TEMPLATES));
  return issues;
}

function requiredEscalationIssues(
  escalations: Escalation[],
  templateId: string,
  templates: Record<string, EscalationTemplate>,
): CloseIssue[] {
  const matching = escalations.filter((e) => e.templateId === templateId);
  if (matching.some((e) => !NOT_SUBMITTED.includes(e.status))) return [];
  const latest = matching.at(-1);
  if (!latest) return [{ field: 'escalation', code: 'escalationMissing' }];
  if (latest.status === 'failed') return [{ field: 'escalation', code: 'escalationFailed' }];
  // A template missing from config can't list fields; the escalation still has to be submitted.
  const missing = (templates[templateId]?.requiredFields ?? [])
    .filter((f) => blank(latest.fields[f]))
    .map((f): CloseIssue => ({ field: `escalation.${f}`, code: 'escalationIncomplete' }));
  return [...missing, { field: 'escalation', code: 'escalationNotSubmitted' }];
}
