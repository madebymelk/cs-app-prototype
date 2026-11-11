import { auditEvent } from './audit';
import type { AuditEvent, Case, LinkedRecord } from './types';

export interface CopySelection {
  notes?: boolean;
  finalReason?: boolean;
  nextSteps?: boolean;
  linked?: boolean;
}

/**
 * Selective copy from a prior case into the active case (docs/03 F6). Only what the agent ticks is
 * copied; text appends with its origin; the prior case is never modified. Returns undefined when
 * nothing applicable was selected.
 */
export function copyFromPriorCase(
  active: Case,
  prior: Case,
  selection: CopySelection,
  actorId: string,
  now: Date = new Date(),
): { patch: Partial<Case>; audit: AuditEvent } | undefined {
  const patch: Partial<Case> = {};
  const append = (current: string | undefined, text: string) => {
    const quoted = `From ${prior.id}: ${text}`;
    return current?.trim() ? `${current}\n\n${quoted}` : quoted;
  };

  if (selection.notes && prior.notes.trim()) patch.notes = append(active.notes, prior.notes);
  if (selection.nextSteps && prior.nextSteps?.trim()) patch.nextSteps = append(active.nextSteps, prior.nextSteps);
  if (selection.finalReason && prior.finalReason) patch.finalReason = prior.finalReason;
  if (selection.linked) {
    const key = (l: LinkedRecord) => `${l.kind}:${l.refId}`;
    const existing = new Set(active.linked.map(key));
    const added = prior.linked.filter((l) => !existing.has(key(l))).map((l) => ({ ...l, associatedBy: 'manual' as const }));
    if (added.length) patch.linked = [...active.linked, ...added];
  }

  const changedFields = Object.keys(patch);
  if (!changedFields.length) return undefined;
  return {
    patch,
    audit: auditEvent(actorId, 'case.copiedFrom', { changedFields, refIds: [active.id, prior.id] }, now),
  };
}
