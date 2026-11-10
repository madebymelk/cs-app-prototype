# 05 · Data, mocks and scenarios

All data is synthetic. Generate fixtures with a seeded generator (`src/mocks/seed.ts`), don't hand-write
large files. IDs look realistic but are fake (e.g. case `CS-2026-004183`, interaction `INT-8F3K2Q`).

## Core types (src/domain/types.ts)
```ts
type Channel = 'voice' | 'chat';
type AuthState = 'notVerified'|'inProgress'|'verified'|'partial'|'failed'|'bypassed'|'callerChanged';
type CallerType = 'veteran'|'provider'|'vaStaff'|'authorizedRep'|'other';
type CaseStatus = 'draft'|'open'|'pendingDownstream'|'readyToClose'|'closed'|'reopened'|'discarded'|'canceled';
type SourceState<T> = { status: 'loading'|'ok'|'empty'|'error'|'denied'|'timeout'; data?: T;
  source: string; updatedAt?: string; correlationId?: string };

interface Interaction { id: string; contactId: string; channel: Channel; startedAt: string; endedAt?: string;
  caller: { type: CallerType; name?: string; ani?: string; identifiers: Record<string,string> };
  authState: AuthState; initialReason?: string; ivrHistory: string[]; transferredFrom?: string;
  caseIds: string[]; linkageStatus: 'ok'|'failed'; }
interface Case { id: string; interactionId: string; status: CaseStatus; caseType?: string;
  callerType: CallerType; finalReason?: string; disposition?: string; notes: string; repeatContact?: boolean;
  workgroup?: { id: string; assignedBy: 'rule'|'manual' }; linked: LinkedRecord[];
  escalations: Escalation[]; workflows: WorkflowRef[]; correspondence: CorrespondenceRef[];
  ownerId: string; createdAt: string; updatedAt: string; audit: AuditEvent[]; }
interface LinkedRecord { kind: 'veteran'|'provider'|'facility'|'referral'|'claim'|'document'|'ucern'|'vpern';
  refId: string; label: string; associatedBy: 'auto'|'manual'; }
interface Escalation { id: string; destination: 'servicenow'|string; externalId?: string;
  status: 'draft'|'submitting'|'new'|'assigned'|'pending'|'slaRisk'|'blocked'|'resolved'|'rerouted'|'failed';
  templateId: string; fields: Record<string,string>; lastSyncedAt?: string; }
interface AuditEvent { at: string; actorId: string; action: string; changedFields?: string[]; refIds?: string[]; }
```
Also: Veteran, Provider, Facility, Eligibility (by type), Referral, Claim (medical/dental/pharmacy, non-clinical
status), Document, Template, Workgroup, Role, Permission. Keep them small and typed.

## Mock API (src/api; MSW handlers)
| Method | Path | Notes |
|---|---|---|
| GET | /interactions/:id | screen pop payload |
| POST | /interactions/:id/cases | create case (shared context only) |
| PATCH | /cases/:id | autosave |
| POST | /cases/:id/close | validates required fields + required escalations |
| GET | /cases?… | search, paginated, newest first |
| GET | /veterans?q= · /veterans/:id · /veterans/:id/{referrals,claims,rfs,pa,um,ed,cases,eligibility} | each independent |
| GET | /providers?q= · /providers/:id | facility-grouped results |
| GET | /documents?caseId= · /documents/:id | |
| POST | /escalations · GET /escalations/:id | ServiceNow + configurable destinations |
| POST | /workflows · GET /workflows/:id | |
| POST | /eligibility-records (ucern/vpern) | returns failed control codes or record |
| GET | /templates?caseType=&outcome= · POST /correspondence | |
| GET | /landing/:mode | modules with metric definitions |
Adapters (`src/api/*Adapter.ts`) are the only code that knows endpoints, so real integrations can replace mocks.

## Dev Toolbar scenarios (switchable at runtime; persist in sessionStorage)
`happyPath` · `screenPopPartial` · `screenPopFailed` · `transferIn` · `authFailed` · `authorizedRepCaller`
· `veteranMultipleMatch` · `veteranDeceased` · `eligibilityUnknown` · `profileServiceDown` · `slowSources`
(3–12s) · `providerAmbiguousInactive` · `ucernControlFail` · `createRecordFails` · `escalationSubmitFails`
· `syncDelayed` · `linkageFailed` · `sessionTimeout` · `duplicateCase` · `deniedRecording`.
Also: role switcher, "Simulate call (voice/chat)", "End interaction", latency slider.

## Config (src/config)
- `decisions.ts`: `initialCaseMode: 'autoDraft'|'agentCreates'`, `wrapUpLocation: 'csApp'|'connect'`,
  `dispositionLevel: 'case'|'interaction'`, `duplicateWindowDays: 7`, `chatPatterns: 'shared'`,
  `correspondenceEnabled: true`, `reopenRoles: ['supervisor']`. Each flag carries a `// DECISION:` note.
- `permissions.ts`: role → attributes matrix (provisional).
- `caseTypes.ts`: case types → extra required fields; call reasons → workgroup rules.
- `templates.ts`: escalation and correspondence templates with required fields and merge keys.
