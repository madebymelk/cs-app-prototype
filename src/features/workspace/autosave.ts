import { caseAdapter } from '@/api/caseAdapter';
import { AUTOSAVE_DEBOUNCE_MS, AUTOSAVE_RETRY_MS } from '@/config/closeout';
import { auditEvent, auditLog } from '@/domain/audit';
import { useWorkspace } from './workspaceStore';

/**
 * Debounced autosave (docs/02): "Saving…" → "Saved 10:42" → "Couldn't save. Retrying…".
 * The store keeps the agent's input the whole time; a failed save retries with backoff until it succeeds.
 */
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const attempts = new Map<string, number>();
let actor = 'unknown';

export function scheduleSave(caseId: string, actorId: string, delay = AUTOSAVE_DEBOUNCE_MS) {
  actor = actorId;
  clearTimeout(timers.get(caseId));
  timers.set(caseId, setTimeout(() => void flush(caseId), delay));
}

export function cancelSave(caseId: string) {
  clearTimeout(timers.get(caseId));
  timers.delete(caseId);
  attempts.delete(caseId);
}

export async function flush(caseId: string): Promise<boolean> {
  clearTimeout(timers.get(caseId));
  timers.delete(caseId);
  const store = useWorkspace.getState();
  const c = store.cases[caseId];
  if (!c) return false;
  const fields = store.dirty[caseId] ?? [];
  const event = fields.length ? auditEvent(actor, 'case.updated', { changedFields: fields, refIds: [c.id] }) : undefined;
  const snapshot = event ? { ...c, audit: [...c.audit, event] } : c;
  store.setSave(caseId, { state: 'saving' });
  try {
    const saved = await caseAdapter.save(snapshot);
    useWorkspace.getState().applyServerCase(saved);
    useWorkspace.getState().clearDirty(caseId, fields);
    useWorkspace.getState().setSave(caseId, { state: 'saved', at: new Date().toISOString() });
    if (event) auditLog.emit(event);
    attempts.delete(caseId);
    return true;
  } catch {
    const n = attempts.get(caseId) ?? 0;
    attempts.set(caseId, n + 1);
    useWorkspace.getState().setSave(caseId, { state: 'retrying' });
    const wait = AUTOSAVE_RETRY_MS[Math.min(n, AUTOSAVE_RETRY_MS.length - 1)] ?? AUTOSAVE_DEBOUNCE_MS;
    timers.set(caseId, setTimeout(() => void flush(caseId), wait));
    return false;
  }
}
