import type { PermissionAttribute, PermissionSet } from '@/config/permissions';
import { auditEvent } from './audit';
import { validateClose, type CloseIssue } from './closeValidation';
import type { Case, CaseStatus, Result } from './types';

/** Case lifecycle (docs/01). Pure: returns a new case or a reason; never throws, never mutates. */
export type CaseEvent =
  | { type: 'start' }
  | { type: 'submitDownstream' }
  | { type: 'downstreamFailed'; error: { message: string; correlationId?: string } }
  | { type: 'downstreamResolved' }
  | { type: 'markReady' }
  | { type: 'close' }
  | { type: 'reopen' }
  | { type: 'resume' }
  | { type: 'discard' }
  | { type: 'cancel' };

export interface TransitionContext {
  actorId: string;
  permissions: PermissionSet;
  now?: Date;
  /** IVR initial reason of the interaction, used to decide whether a draft is empty. */
  initialReason?: string;
}

export type TransitionError =
  | { code: 'invalidTransition'; from: CaseStatus; event: CaseEvent['type'] }
  | { code: 'notPermitted'; permission: PermissionAttribute }
  | { code: 'closeBlocked'; issues: CloseIssue[] }
  | { code: 'draftNotEmpty' };

interface Rule {
  from: readonly CaseStatus[];
  to: CaseStatus;
  permission?: PermissionAttribute;
  guard?: (c: Case, ctx: TransitionContext) => TransitionError | undefined;
}

const closeGuard = (c: Case): TransitionError | undefined => {
  const issues = validateClose(c);
  return issues.length ? { code: 'closeBlocked', issues } : undefined;
};

const RULES: Record<CaseEvent['type'], Rule> = {
  start: { from: ['draft'], to: 'open' },
  submitDownstream: { from: ['open'], to: 'pendingDownstream' },
  downstreamFailed: { from: ['pendingDownstream'], to: 'open' },
  downstreamResolved: { from: ['pendingDownstream'], to: 'open' },
  markReady: { from: ['open'], to: 'readyToClose', guard: closeGuard },
  close: { from: ['open', 'readyToClose'], to: 'closed', guard: closeGuard },
  reopen: { from: ['closed'], to: 'reopened', permission: 'canReopen' },
  resume: { from: ['reopened'], to: 'open' },
  discard: {
    from: ['draft'],
    to: 'discarded',
    guard: (c, ctx) => (isEmptyDraft(c, ctx.initialReason) ? undefined : { code: 'draftNotEmpty' }),
  },
  cancel: { from: ['open'], to: 'canceled', permission: 'canCancelCase' },
};

export function transition(c: Case, event: CaseEvent, ctx: TransitionContext): Result<Case, TransitionError> {
  const rule = RULES[event.type];
  if (!rule.from.includes(c.status)) return { ok: false, error: { code: 'invalidTransition', from: c.status, event: event.type } };
  if (rule.permission && !ctx.permissions[rule.permission]) {
    return { ok: false, error: { code: 'notPermitted', permission: rule.permission } };
  }
  const blocked = rule.guard?.(c, ctx);
  if (blocked) return { ok: false, error: blocked };

  const now = ctx.now ?? new Date();
  const next: Case = {
    ...c,
    status: rule.to,
    updatedAt: now.toISOString(),
    audit: [...c.audit, auditEvent(ctx.actorId, `case.status.${rule.to}`, { refIds: [c.id] }, now)],
  };
  if (event.type === 'downstreamFailed') next.downstreamError = { ...event.error };
  else if (event.type === 'submitDownstream' || event.type === 'downstreamResolved') delete next.downstreamError;
  return { ok: true, value: next };
}

/** Events valid from the case's current status (permissions and guards not applied). */
export function availableEvents(status: CaseStatus): CaseEvent['type'][] {
  return (Object.keys(RULES) as CaseEvent['type'][]).filter((e) => RULES[e].from.includes(status));
}

/** A draft holds no agent work: the IVR prefill and rule-assigned workgroup don't count. */
export function isEmptyDraft(c: Case, initialReason?: string): boolean {
  if (c.status !== 'draft') return false;
  const reasonChanged = c.finalReason !== undefined && c.finalReason !== initialReason;
  return (
    c.notes.trim() === '' &&
    !reasonChanged &&
    !c.disposition &&
    c.repeatContact === undefined &&
    c.workgroup?.assignedBy !== 'manual' &&
    c.linked.every((l) => l.associatedBy === 'auto') &&
    c.escalations.length === 0 &&
    Object.values(c.typeFields).every((v) => v.trim() === '')
  );
}

const TERMINAL: readonly CaseStatus[] = ['closed', 'discarded', 'canceled'];

/**
 * End interaction only when every case is Closed (or terminal) or an empty draft (auto-discarded).
 * Otherwise list what is still open (docs/03 Closeout).
 */
export function canEndInteraction(
  cases: Case[],
  initialReason?: string,
): Result<{ discardIds: string[] }, { openCaseIds: string[] }> {
  const openCaseIds = cases
    .filter((c) => !TERMINAL.includes(c.status) && !isEmptyDraft(c, initialReason))
    .map((c) => c.id);
  if (openCaseIds.length) return { ok: false, error: { openCaseIds } };
  return { ok: true, value: { discardIds: cases.filter((c) => isEmptyDraft(c, initialReason)).map((c) => c.id) } };
}
