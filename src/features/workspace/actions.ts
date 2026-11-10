import { ApiError } from '@/api/client';
import { caseAdapter, closeIssuesFrom } from '@/api/caseAdapter';
import { useSession } from '@/app/sessionStore';
import { decisions } from '@/config/decisions';
import { auditLog } from '@/domain/audit';
import { canEndInteraction, transition, type TransitionError } from '@/domain/caseMachine';
import { validateClose, type CloseIssue } from '@/domain/closeValidation';
import { permissionsFor } from '@/domain/permissions';
import { assignWorkgroup, caseTypeFor, initialFinalReason } from '@/domain/routing';
import type { Case, Interaction } from '@/domain/types';
import { cancelSave, flush } from './autosave';
import { casesFor, useWorkspace } from './workspaceStore';

const ctx = () => {
  const { userId, roleId } = useSession.getState();
  return { actorId: userId, permissions: permissionsFor(roleId) };
};

/** Fields for a new case: the first case takes the IVR reason (autoDraft); later cases start blank. */
function newCaseFields(i: Interaction, isFirst: boolean): Partial<Case> {
  const finalReason = isFirst && decisions.initialCaseMode === 'autoDraft' ? initialFinalReason(i) : undefined;
  if (!finalReason) return {};
  const workgroup = assignWorkgroup({ finalReason });
  const caseType = caseTypeFor(finalReason);
  return { finalReason, ...(workgroup ? { workgroup } : {}), ...(caseType ? { caseType } : {}) };
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
