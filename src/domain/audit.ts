import type { AuditEvent } from './types';

/**
 * Audit events carry IDs and field names only, never field values (no PHI in audit or Event Hub payloads).
 */
export function auditEvent(
  actorId: string,
  action: string,
  opts: { changedFields?: string[]; refIds?: string[] } = {},
  now: Date = new Date(),
): AuditEvent {
  return {
    at: now.toISOString(),
    actorId,
    action,
    ...(opts.changedFields?.length ? { changedFields: [...opts.changedFields] } : {}),
    ...(opts.refIds?.length ? { refIds: [...opts.refIds] } : {}),
  };
}

type Listener = (event: AuditEvent) => void;

/** In-memory emitter. M9's Event Hub view subscribes; adapters can forward to a real bus later. */
export function createAuditEmitter() {
  const listeners = new Set<Listener>();
  return {
    emit(event: AuditEvent) {
      listeners.forEach((l) => { l(event); });
    },
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export const auditLog = createAuditEmitter();
