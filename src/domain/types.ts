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
  createdAt?: string;
  /** Downstream owner (team or queue) once assigned. */
  owner?: string;
  attachments?: string[];
  error?: { message: string; correlationId?: string };
}

export interface WorkflowRef {
  id: string;
  name: string;
  status: 'submitting' | 'inProgress' | 'pendingAction' | 'slaRisk' | 'blocked' | 'resolved';
  owner?: string;
  blockedReason?: string;
  startedAt: string;
  updatedAt: string;
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
  /** Next steps agreed with the caller (closeout, docs/03). Optional. */
  nextSteps?: string;
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

export interface Address {
  line1: string;
  city: string;
  state: string;
  zip: string;
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
  preferredFacilityName?: string;
  phone?: string;
  address?: Address;
  /** System of record for contact info (shown as the address source link). */
  addressSource?: string;
}

export interface Provider {
  id: string;
  name: string;
  npi: string;
  tin: string;
  specialty: string;
  taxonomy: string;
  placeOfService: string;
  facilityId: string;
  status: 'active' | 'inactive';
  networkSource: string;
  enrollment: 'enrolled' | 'pending' | 'notEnrolled';
  attestation: 'current' | 'expired';
  address?: Address;
  updatedAt: string;
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

/** Authoritative records (read-only, linked by reference). Non-clinical fields only. */
export interface Referral { id: string; number: string; specialty: string; status: 'active' | 'scheduled' | 'pending' | 'expired'; issuedOn: string; expiresOn: string; providerName: string }
export interface Claim { id: string; number: string; kind: 'medical' | 'dental' | 'pharmacy'; status: 'received' | 'inReview' | 'paid' | 'denied'; serviceDate: string; providerName: string }
export interface Rfs { id: string; number: string; specialty: string; status: 'submitted' | 'approved' | 'returned'; submittedOn: string }
export interface PriorAuth { id: string; number: string; service: string; status: 'pending' | 'approved' | 'denied'; requestedOn: string }
export interface UmReview { id: string; number: string; reviewType: string; status: 'inReview' | 'complete'; openedOn: string }
export interface EdEvent { id: string; facilityName: string; arrivedOn: string; notifiedWithin72h: boolean }
export interface EligibilityRecord { id: string; kind: 'ucern' | 'vpern'; number: string; facilityName: string; status: 'active' | 'expired'; createdOn: string }

export interface RecordList<T> {
  items: T[];
  source: string;
  updatedAt: string;
}
