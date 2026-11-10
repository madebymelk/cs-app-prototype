import type { RoleId } from '@/domain/types';
import { decisions } from './decisions';

/**
 * Role → attribute matrix. Code checks attributes, never role titles (docs/01).
 * DECISION: provisional. MOCHA/CRUD permissions are not final; replace this matrix when they are.
 */
export const PERMISSION_ATTRIBUTES = [
  'canWorkCases',
  'canEscalate',
  'canOverrideDestination',
  'canReopen',
  'canCancelCase',
  'canViewTeam',
  'canViewSensitive',
  'canViewRecordings',
  'canViewTranscripts',
  'canRevealMasked',
  'canDownloadDocuments',
  'canAdminister',
] as const;

export type PermissionAttribute = (typeof PERMISSION_ATTRIBUTES)[number];
export type PermissionSet = Readonly<Record<PermissionAttribute, boolean>>;

const none: PermissionSet = Object.fromEntries(PERMISSION_ATTRIBUTES.map((a) => [a, false])) as Record<
  PermissionAttribute,
  boolean
>;

const csr: PermissionSet = { ...none, canWorkCases: true, canEscalate: true, canDownloadDocuments: true };

const base: Record<RoleId, PermissionSet> = {
  // L1 frontline: inbound calls, cases, research, escalate.
  csr,
  // L2 / VA Platinum: broader visibility, advanced escalation (destination override).
  csr_plus: { ...csr, canOverrideDestination: true, canViewSensitive: true, canRevealMasked: true },
  // Supervisor: team queues, escalations, coaching; sometimes takes calls.
  supervisor: {
    ...csr,
    canOverrideDestination: true,
    canCancelCase: true,
    canViewTeam: true,
    canViewSensitive: true,
    canViewRecordings: true,
    canViewTranscripts: true,
    canRevealMasked: true,
  },
  // Manager: operational exceptions and sensitive cases; no frontline case work.
  manager: { ...none, canViewTeam: true, canViewSensitive: true, canDownloadDocuments: true },
  // QA: recordings, transcripts and notes per segregation rules; read-only on cases.
  qa: { ...none, canViewRecordings: true, canViewTranscripts: true },
  // Trainer: same as CSR in a lower environment (training banner shown).
  trainer: csr,
  // Admin: roles, config, observability. No case work.
  admin: { ...none, canAdminister: true },
};

/** `canReopen` follows decisions.reopenRoles so the open decision stays in one place. */
export const PERMISSIONS: Record<RoleId, PermissionSet> = Object.fromEntries(
  Object.entries(base).map(([role, set]) => [role, { ...set, canReopen: decisions.reopenRoles.includes(role) }]),
) as Record<RoleId, PermissionSet>;
