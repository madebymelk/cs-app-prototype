import type { CloseIssue } from '@/domain/closeValidation';
import { strings } from '@/content/strings';

const e = strings.workspace.errors;
const f = strings.workspace.form;

/** DOM id for a case field, so ErrorSummary links and inline errors point at the same control. */
export const fieldId = (caseId: string, field: string) => `f-${caseId}-${field.replace(/\./g, '-')}`;

const LABELS: Record<string, string> = {
  callerType: f.callerType,
  callerFirstName: f.callerFirstName,
  finalReason: f.finalReason,
  notes: f.notes,
  repeatContact: f.repeatContact,
  disposition: strings.workspace.closeout.disposition,
  workgroup: f.workgroup,
};
const CHOICES = new Set(['callerType', 'finalReason', 'repeatContact', 'disposition', 'workgroup']);

export function issueMessage(issue: CloseIssue): string {
  switch (issue.code) {
    case 'escalationMissing':
      return e.escalationMissing;
    case 'escalationNotSubmitted':
      return e.escalationNotSubmitted;
    case 'escalationFailed':
      return e.escalationFailed;
    case 'escalationIncomplete':
      return e.escalationIncomplete(issue.field.replace('escalation.', ''));
    case 'required': {
      if (issue.field.startsWith('typeFields.')) {
        const key = issue.field.slice('typeFields.'.length);
        return e.required(strings.typeFields[key] ?? key);
      }
      const label = LABELS[issue.field] ?? issue.field;
      return CHOICES.has(issue.field) ? e.choose(label) : e.required(label);
    }
  }
}

/** Escalation issues point at the closeout checklist; field issues at their control. */
export const issueTarget = (caseId: string, issue: CloseIssue) =>
  issue.field.startsWith('escalation') ? fieldId(caseId, 'escalation') : fieldId(caseId, issue.field);

export const errorFor = (issues: CloseIssue[], field: string, show: boolean) => {
  const issue = show ? issues.find((i) => i.field === field) : undefined;
  return issue ? issueMessage(issue) : undefined;
};
