# 01 · Product, users, domain

## Purpose
Unified internal workspace that receives interaction context from Amazon Connect, keeps caller and
interaction context persistent, supports one interaction with many cases, shows Veteran/provider/
claim/referral data in context (read-only), and routes unresolved work downstream.
**Primary outcome:** less hunting across systems and no duplicate entry, while preserving auditability.
**Not:** a portal, a CRM replacing source systems, workforce management (NICE stays separate), or
deep analytics (link to Power BI). CS never makes clinical or adjudication decisions.

## Principles
1. Journeys organize the experience; features organize delivery.
2. Behavior before pixels. A component existing does not make a feature ready.
3. Authoritative data read-only; CS-owned fields (notes, disposition, call reason, workgroup) editable by role.
4. Show the minimum needed to act; progressive disclosure for detail.
5. Never show a false "not found" when a source is unavailable. Name the source.
6. Automate what the system knows. Agents never re-enter timing, linkage or captured context.
7. Permissions are designed states, not just hidden buttons.
8. Keyboard-first: serves screen-reader users and power users.

## Roles (prototype; switch in Dev Toolbar)
| id | Role | Primary job | Landing mode |
|---|---|---|---|
| csr | CSR / frontline agent (L1) | Inbound calls, cases, research, escalate | Agent |
| csr_plus | Advanced CSR / VA Platinum (L2) | VA staff + complex calls, conference, advanced escalation | Agent + broader visibility |
| supervisor | Supervisor / lead / SME | Team queues, ACW exceptions, escalations, coaching; sometimes takes calls | Supervisor |
| manager | Manager / director | Contract/operational exceptions, trends, sensitive cases | Manager |
| qa | Quality auditor | Recordings, transcripts, notes, audit per segregation rules | QA |
| trainer | Trainer | Lower-environment training | Agent (training banner) |
| admin | System administrator | Roles/config/observability, no case work | Admin |

Permissions live in `src/config/permissions.ts` as a provisional matrix (MOCHA/CRUD not final).
Use role **attributes** (canEscalate, canReopen, canViewRecordings…), never title checks.

## Domain model
- **Contact** (Connect) → **Interaction** (CS): interactionId, contactId, channel, start/end, caller,
  authState, initialReason (IVR), transfers.
- **Interaction 1 : 0..\* Case.** Cases are independent. Shared caller/interaction context copies into
  new cases; case-specific notes/disposition/attachments do **not** copy unless the agent selects them.
- **Case** (CS-owned): readable caseId, caseType, callerType, finalReason, disposition, notes,
  repeatContact, workgroup, status, owner, linked records, escalations, audit history.
- **Initial vs final reason:** initial comes from IVR, preselected and editable; **final reason drives
  workgroup routing** (not the dialed TFN).
- **Authoritative (read-only, linked by reference):** Veteran, Provider, Facility, Eligibility,
  Referral, RFS, Prior auth, UM, ED event, Claim (medical/dental/pharmacy), Document.
- **Downstream (store external ID + status on case):** ServiceNow ticket, other destination (MNSTR,
  configurable), Workflow (orchestration, label "Medallion" is provisional), Correspondence,
  UCERN/VPERN record. 0..* per case.
- **Failure:** if auto-linkage fails, log it, show a non-blocking banner, keep working, queue repair.

## Case lifecycle (proposed; implement as a state machine in src/domain/caseMachine.ts)
Draft → Open → PendingDownstream → ReadyToClose → Closed; Closed → Reopened → Open (role-limited);
Draft → Discarded (empty); Open → Canceled (role-limited).
- Close blocked while required fields or a required escalation template are incomplete.
- Failed downstream submit keeps case Open with error state. Never silently close.

## Interaction lifecycle (proposed)
Offered → Active → (Transferred) → AfterCallWork → Ended. Side path: LinkageFailed → repair.

## Journey (the spine every screen maps to)
1 Entry (role landing) → 2 Screen pop (context arrives) → 3 Identify caller + verify Veteran/provider
→ 4 Initial case → 5 Research without losing case → 6 Add more cases → 7 Escalate/submit downstream
→ 8 Close out each case (disposition, scripts, IDs) → 9 Retrieve later (search, history, audit).
Variants: voice and chat (shared model, channel as context); screen pop bypasses Landing; warm/cold
transfer keeps context; next-day follow-up from search; failure paths at every stage.

## Research signals to design for
Agents keep off-system spreadsheets (unmet follow-up need + PHI risk): landing "my open work" and
search must replace them. Agents copy/paste standard wording: use prepopulated templates/scripts.
Observed call types: referral verification, eligibility confirmation, urgent-care referral creation,
claim filing, pharmacy claims, escalation follow-up, provider enrollment.
