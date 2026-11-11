import { ApiError } from '@/api/client';
import { downstreamAdapter } from '@/api/downstreamAdapter';
import { useSession } from '@/app/sessionStore';
import { WORKFLOW_NAME, type EscalationTemplate } from '@/config/templates';
import { auditEvent, auditLog } from '@/domain/audit';
import { transition } from '@/domain/caseMachine';
import { permissionsFor } from '@/domain/permissions';
import type { Case, Escalation, WorkflowRef } from '@/domain/types';
import { flush } from './autosave';
import { useWorkspace } from './workspaceStore';

const ctx = () => {
  const { userId, roleId } = useSession.getState();
  return { actorId: userId, permissions: permissionsFor(roleId) };
};

const get = (id: string) => useWorkspace.getState().cases[id];
const put = (c: Case) => { useWorkspace.getState().replaceCase(c); };
const withAudit = (c: Case, action: string, refIds: string[], changedFields?: string[]): Case => {
  const e = auditEvent(ctx().actorId, action, { refIds, ...(changedFields ? { changedFields } : {}) });
  auditLog.emit(e);
  return { ...c, audit: [...c.audit, e] };
};
const step = (c: Case, type: 'submitDownstream' | 'downstreamResolved'): Case => {
  const r = transition(c, { type }, ctx());
  return r.ok ? r.value : c;
};

export type SubmitResult = { ok: true; escalation: Escalation } | { ok: false; correlationId?: string };

/**
 * Submit an escalation (F14): the case goes Pending downstream while sending, then back to Open with the
 * external ID and status stored. A failure keeps the case Open with the error and the escalation for retry.
 */
export async function submitEscalation(
  caseId: string,
  template: EscalationTemplate,
  fields: Record<string, string>,
  attachments: string[],
  retryOf?: string,
): Promise<SubmitResult> {
  let c = get(caseId);
  if (!c) return { ok: false };
  if (c.status === 'draft') {
    const started = transition(c, { type: 'start' }, ctx());
    if (started.ok) c = started.value;
  }
  const id = retryOf ?? `ESC-${String(Date.now()).slice(-6)}`;
  const draft: Escalation = {
    id,
    destination: template.destination,
    templateId: template.id,
    status: 'submitting',
    fields,
    attachments,
    createdAt: new Date().toISOString(),
  };
  const others = c.escalations.filter((e) => e.id !== id);
  c = step({ ...c, escalations: [...others, draft] }, 'submitDownstream');
  put(c);
  try {
    const res = await downstreamAdapter.submitEscalation({ caseId, destination: template.destination, templateId: template.id, fields, attachments });
    const done: Escalation = { ...draft, ...res };
    let next = get(caseId) ?? c;
    next = step({ ...next, escalations: [...others, done], downstreamError: undefined }, 'downstreamResolved');
    put(withAudit(next, 'escalation.submitted', [caseId, done.externalId ?? id], ['escalations']));
    await flush(caseId);
    return { ok: true, escalation: done };
  } catch (e) {
    const correlationId = e instanceof ApiError ? e.correlationId : undefined;
    const failed: Escalation = { ...draft, status: 'failed', error: { message: 'Not sent', ...(correlationId ? { correlationId } : {}) } };
    const cur = get(caseId) ?? c;
    const r = transition({ ...cur, escalations: [...others, failed] }, { type: 'downstreamFailed', error: { message: 'Escalation not sent', ...(correlationId ? { correlationId } : {}) } }, ctx());
    put(withAudit(r.ok ? r.value : { ...cur, escalations: [...others, failed] }, 'escalation.failed', [caseId, id]));
    await flush(caseId);
    return { ok: false, ...(correlationId ? { correlationId } : {}) };
  }
}

export async function refreshEscalation(caseId: string, escalationId: string): Promise<boolean> {
  const c = get(caseId);
  const e = c?.escalations.find((x) => x.id === escalationId);
  if (!c || !e) return false;
  try {
    const res = await downstreamAdapter.refreshEscalation(e);
    const cur = get(caseId) ?? c;
    put({ ...cur, escalations: cur.escalations.map((x) => (x.id === escalationId ? { ...x, ...res } : x)) });
    await flush(caseId);
    return true;
  } catch {
    return false;
  }
}

export async function startWorkflow(caseId: string): Promise<boolean> {
  const c = get(caseId);
  if (!c) return false;
  try {
    const res = await downstreamAdapter.startWorkflow(caseId);
    const now = new Date().toISOString();
    const w: WorkflowRef = { id: res.id, name: WORKFLOW_NAME, status: res.status, startedAt: now, updatedAt: now };
    const cur = get(caseId) ?? c;
    put(withAudit({ ...cur, workflows: [...cur.workflows, w] }, 'workflow.started', [caseId, w.id]));
    await flush(caseId);
    return true;
  } catch {
    return false;
  }
}

export async function refreshWorkflow(caseId: string, workflowId: string): Promise<boolean> {
  const c = get(caseId);
  const w = c?.workflows.find((x) => x.id === workflowId);
  if (!c || !w) return false;
  try {
    const res = await downstreamAdapter.refreshWorkflow(w);
    const cur = get(caseId) ?? c;
    const updatedAt = new Date().toISOString();
    put({ ...cur, workflows: cur.workflows.map((x) => (x.id === workflowId ? { ...x, ...res, updatedAt } : x)) });
    await flush(caseId);
    return true;
  } catch {
    return false;
  }
}

/** Attach a created UCERN/VPERN record to the case automatically (F13) and audit it. */
export async function attachEligibilityRecord(caseId: string, record: { kind: 'ucern' | 'vpern'; number: string }) {
  const c = get(caseId);
  if (!c) return;
  if (c.linked.some((l) => l.refId === record.number)) return;
  const linked = [...c.linked, { kind: record.kind, refId: record.number, label: record.kind.toUpperCase(), associatedBy: 'auto' as const }];
  // A created record is real work: a Draft becomes Open.
  const started = c.status === 'draft' ? transition(c, { type: 'start' }, ctx()) : undefined;
  const base = started?.ok ? started.value : c;
  put(withAudit({ ...base, linked }, 'record.created', [caseId, record.number], ['linked']));
  await flush(caseId);
}
