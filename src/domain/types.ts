/** Core domain types (docs/05-data-mocks.md). All data is synthetic. M1 extends these with rules. */

export type Channel = 'voice' | 'chat';
export type AuthState =
  | 'notVerified'
  | 'inProgress'
  | 'verified'
  | 'partial'
  | 'failed'
  | 'bypassed'
  | 'callerChanged';
export type CallerType = 'veteran' | 'provider' | 'vaStaff' | 'authorizedRep' | 'other';
export type CaseStatus =
  | 'draft'
  | 'open'
  | 'pendingDownstream'
  | 'readyToClose'
  | 'closed'
  | 'reopened'
  | 'discarded'
  | 'canceled';

export interface SourceState<T> {
  status: 'loading' | 'ok' | 'empty' | 'error' | 'denied' | 'timeout';
  data?: T;
  source: string;
  updatedAt?: string;
  correlationId?: string;
}

export interface Interaction {
  id: string;
  contactId: string;
  channel: Channel;
  startedAt: string;
  endedAt?: string;
  caller: { type: CallerType; name?: string; ani?: string; identifiers: Record<string, string> };
  authState: AuthState;
  initialReason?: string;
  ivrHistory: string[];
  transferredFrom?: string;
  caseIds: string[];
  linkageStatus: 'ok' | 'failed';
}

export interface LinkedRecord {
  kind: 'veteran' | 'provider' | 'facility' | 'referral' | 'claim' | 'document' | 'ucern' | 'vpern';
  refId: string;
  label: string;
  associatedBy: 'auto' | 'manual';
}

export interface Escalation {
  id: string;
  destination: 'servicenow' | (string & {});
  externalId?: string;
  status:
    | 'draft'
    | 'submitting'
    | 'new'
    | 'assigned'
    | 'pending'
    | 'slaRisk'
    | 'blocked'
    | 'resolved'
    | 'rerouted'
    | 'failed';
  templateId: string;
  fields: Record<string, string>;
  lastSyncedAt?: string;
}

export interface WorkflowRef {
  id: string;
  status: string;
}
export interface CorrespondenceRef {
  id: string;
  templateId: string;
  status: string;
}

export interface AuditEvent {
  at: string;
  actorId: string;
  action: string;
  changedFields?: string[];
  refIds?: string[];
}

export interface Case {
  id: string;
  interactionId: string;
  status: CaseStatus;
  caseType?: string;
  callerType: CallerType;
  /** Caller's first name (F5 requires it; not in the docs/05 sketch of Case). */
  callerFirstName?: string;
  /** Stable reference to the caller (Veteran/provider ID) used for duplicate detection. */
  callerRef?: string;
  finalReason?: string;
  disposition?: string;
  notes: string;
  repeatContact?: boolean;
  workgroup?: { id: string; assignedBy: 'rule' | 'manual' };
  /** Case-type-specific fields from src/config/caseTypes.ts (F5). */
  typeFields: Record<string, string>;
  /** Last downstream failure; the case stays Open with this error (docs/01). */
  downstreamError?: { message: string; correlationId?: string };
  linked: LinkedRecord[];
  escalations: Escalation[];
  workflows: WorkflowRef[];
  correspondence: CorrespondenceRef[];
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  audit: AuditEvent[];
}

export interface Veteran {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  dateOfDeath?: string;
  memberId: string;
  ssnLast4: string;
  icn: string;
  preferredFacilityId?: string;
}

export interface Provider {
  id: string;
  name: string;
  npi: string;
  tin: string;
  specialty: string;
  facilityId: string;
  status: 'active' | 'inactive';
}

export interface Facility {
  id: string;
  name: string;
  city: string;
  state: string;
  zip: string;
  status: 'active' | 'inactive';
}

export type RoleId = 'csr' | 'csr_plus' | 'supervisor' | 'manager' | 'qa' | 'trainer' | 'admin';
export type LandingMode = 'agent' | 'supervisor' | 'manager' | 'qa' | 'admin';
export interface Role {
  id: RoleId;
  label: string;
  landingMode: LandingMode;
  trainingBanner?: boolean;
}

export type HealthStatus =
  | { status: 'healthy' }
  | { status: 'degraded'; sources: string[] }
  | { status: 'outage'; sources: string[] };

export type EligibilityType = 'communityCare' | 'urgentCare' | 'pharmacy' | 'dental';
export type EligibilityStatus = 'eligible' | 'notEligible' | 'pending' | 'unknown' | 'unavailable';
/** One entry per eligibility type. Types are separate: one never implies another (F7). */
export interface Eligibility {
  type: EligibilityType;
  status: EligibilityStatus;
  source: string;
  updatedAt?: string;
}

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
