import { ApiError } from '@/api/client';
import { caseAdapter, closeIssuesFrom } from '@/api/caseAdapter';
import { useSession } from '@/app/sessionStore';
import { decisions } from '@/config/decisions';
import { auditEvent, auditLog } from '@/domain/audit';
import { copyFromPriorCase, type CopySelection } from '@/domain/priorCopy';
import { canEndInteraction, transition, type TransitionError } from '@/domain/caseMachine';
import { validateClose, type CloseIssue } from '@/domain/closeValidation';
import { permissionsFor } from '@/domain/permissions';
import { assignWorkgroup, caseTypeFor, initialFinalReason } from '@/domain/routing';
import type { AuditEvent, Case, Interaction, LinkedRecord, Provider, Veteran } from '@/domain/types';
import { cancelSave, flush, scheduleSave } from './autosave';
import { casesFor, useWorkspace } from './workspaceStore';

const ctx = () => {
  const { userId, roleId } = useSession.getState();
  return { actorId: userId, permissions: permissionsFor(roleId) };
};

/** Fields for a new case: the first case takes the IVR reason (autoDraft); later cases start blank. */
function newCaseFields(i: Interaction, isFirst: boolean): Partial<Case> {
  const identified = useWorkspace.getState().veteranFor[i.id];
  const veteranFields: Partial<Case> = identified
    ? { callerRef: identified, linked: [{ kind: 'veteran', refId: identified, label: 'Veteran', associatedBy: 'manual' }] }
    : {};
  const finalReason = isFirst && decisions.initialCaseMode === 'autoDraft' ? initialFinalReason(i) : undefined;
  if (!finalReason) return veteranFields;
  const workgroup = assignWorkgroup({ finalReason });
  const caseType = caseTypeFor(finalReason);
  return { ...veteranFields, finalReason, ...(workgroup ? { workgroup } : {}), ...(caseType ? { caseType } : {}) };
}

const WORKABLE = (c: Case) => !['closed', 'discarded', 'canceled'].includes(c.status);

/** Apply a patch plus an audit event to a case, save it, and publish the event. */
function editWithAudit(c: Case, patch: Partial<Case>, event: AuditEvent, initialReason?: string) {
  useWorkspace.getState().editCase(c.id, { ...patch, audit: [...c.audit, event] }, event.actorId, initialReason);
  scheduleSave(c.id, event.actorId);
  auditLog.emit(event);
}

/** The agent identified the Veteran: link them to every open case in this interaction (F7). */
export function identifyVeteran(i: Interaction, veteran: Veteran) {
  const { actorId } = ctx();
  useWorkspace.getState().setVeteran(i.id, veteran.id);
  for (const c of casesFor(useWorkspace.getState(), i.id).filter(WORKABLE)) {
    const linked: LinkedRecord[] = [
      ...c.linked.filter((l) => l.kind !== 'veteran'),
      { kind: 'veteran', refId: veteran.id, label: 'Veteran', associatedBy: 'manual' },
    ];
    editWithAudit(c, { callerRef: veteran.id, linked }, auditEvent(actorId, 'case.associated', { changedFields: ['linked'], refIds: [c.id, veteran.id] }), i.initialReason);
  }
}

/** Associate a provider with a case: context chip + audit event (F8 AC). Idempotent. */
export function associateProvider(caseId: string, provider: Provider, initialReason?: string): boolean {
  const c = useWorkspace.getState().cases[caseId];
  if (!c || !WORKABLE(c)) return false;
  if (c.linked.some((l) => l.kind === 'provider' && l.refId === provider.id)) return true;
  const { actorId } = ctx();
  const linked: LinkedRecord[] = [...c.linked, { kind: 'provider', refId: provider.id, label: provider.name, associatedBy: 'manual' }];
  editWithAudit(c, { linked }, auditEvent(actorId, 'case.associated', { changedFields: ['linked'], refIds: [c.id, provider.id] }), initialReason);
  return true;
}

/** Selective copy from a prior case (F6). Returns the number of fields copied. */
export function copyPrior(caseId: string, prior: Case, selection: CopySelection, initialReason?: string): number {
  const c = useWorkspace.getState().cases[caseId];
  if (!c || !WORKABLE(c)) return 0;
  const r = copyFromPriorCase(c, prior, selection, ctx().actorId);
  if (!r) return 0;
  editWithAudit(c, r.patch, r.audit, initialReason);
  return Object.keys(r.patch).length;
}

export async function addCase(i: Interaction, isFirst = false): Promise<Case> {
  const c = await caseAdapter.create(i.id, newCaseFields(i, isFirst), ctx().actorId);
  useWorkspace.getState().addCase(c);
  return c;
}

export type CloseResult =
  | { ok: true; case: Case }
  | { ok: false; issues: CloseIssue[] }
  | { ok: false; error: TransitionError | { code: 'serverError'; correlationId?: string } };

export async function closeCase(caseId: string): Promise<CloseResult> {
  const current = useWorkspace.getState().cases[caseId];
  if (!current) return { ok: false, error: { code: 'serverError' } };
  // Validate first so a close attempt always explains what's missing, even on a Draft.
  const issues = validateClose(current);
  if (issues.length) return { ok: false, issues };
  let c = current;
  if (c.status === 'draft') {
    const started = transition(c, { type: 'start' }, ctx());
    if (started.ok) c = started.value;
  }
  const r = transition(c, { type: 'close' }, ctx());
  if (!r.ok) return r.error.code === 'closeBlocked' ? { ok: false, issues: r.error.issues } : { ok: false, error: r.error };
  cancelSave(caseId);
  try {
    const closed = await caseAdapter.close(r.value);
    useWorkspace.getState().replaceCase({ ...r.value, ...closed });
    useWorkspace.getState().clearDirty(caseId, useWorkspace.getState().dirty[caseId] ?? []);
    useWorkspace.getState().setSave(caseId, { state: 'saved', at: new Date().toISOString() });
    r.value.audit.slice(current.audit.length).forEach((e) => { auditLog.emit(e); });
    return { ok: true, case: closed };
  } catch (e) {
    const issues = closeIssuesFrom(e);
    if (issues) return { ok: false, issues };
    return { ok: false, error: { code: 'serverError', ...(e instanceof ApiError && e.correlationId ? { correlationId: e.correlationId } : {}) } };
  }
}

export async function cancelCase(caseId: string): Promise<boolean> {
  const c = useWorkspace.getState().cases[caseId];
  if (!c) return false;
  const r = transition(c, { type: 'cancel' }, ctx());
  if (!r.ok) return false;
  useWorkspace.getState().replaceCase(r.value);
  return flush(caseId);
}

export type EndResult = { ok: true } | { ok: false; openCaseIds: string[] };

/** End only when every case is closed or an empty draft; empty drafts are discarded, not closed. */
export async function endInteraction(i: Interaction): Promise<EndResult> {
  const store = useWorkspace.getState();
  const cases = casesFor(store, i.id);
  const r = canEndInteraction(cases, i.initialReason);
  if (!r.ok) return { ok: false, openCaseIds: r.error.openCaseIds };
  for (const id of r.value.discardIds) {
    const c = store.cases[id];
    if (!c) continue;
    const d = transition(c, { type: 'discard' }, { ...ctx(), initialReason: i.initialReason });
    if (d.ok) {
      useWorkspace.getState().replaceCase(d.value);
      await flush(id);
    }
  }
  await caseAdapter.endInteraction(i.id).catch(() => undefined); // Connect owns the contact; a failed notify is non-blocking
  useWorkspace.getState().markEnded(i.id);
  return { ok: true };
}
