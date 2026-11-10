import { PERMISSIONS } from '@/config/permissions';
import type { TransitionContext } from '@/domain/caseMachine';
import type { Case, Escalation, RoleId } from '@/domain/types';

export const NOW = new Date('2026-11-10T18:42:00Z');

export function makeCase(overrides: Partial<Case> = {}): Case {
  return {
    id: 'CS-2026-004183',
    interactionId: 'INT-8F3K2Q',
    status: 'draft',
    callerType: 'veteran',
    notes: '',
    typeFields: {},
    linked: [],
    escalations: [],
    workflows: [],
    correspondence: [],
    ownerId: 'AGT-20417',
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    audit: [],
    ...overrides,
  };
}

/** An Open case with every always-required field filled for a referral verification. */
export function completeCase(overrides: Partial<Case> = {}): Case {
  return makeCase({
    status: 'open',
    callerFirstName: 'Avery',
    callerRef: 'VET-1234567',
    finalReason: 'referralVerification',
    notes: 'Confirmed referral is active and scheduled.',
    repeatContact: false,
    disposition: 'resolved',
    workgroup: { id: 'WG-REFERRALS', assignedBy: 'rule' },
    typeFields: { referralNumber: 'VA0012345678' },
    ...overrides,
  });
}

export function makeEscalation(overrides: Partial<Escalation> = {}): Escalation {
  return {
    id: 'ESC-1',
    destination: 'servicenow',
    status: 'draft',
    templateId: 'snow-claim-research',
    fields: {},
    ...overrides,
  };
}

export function ctxFor(role: RoleId, extra: Partial<TransitionContext> = {}): TransitionContext {
  return { actorId: 'AGT-20417', permissions: PERMISSIONS[role], now: NOW, ...extra };
}
