# 03 · Screens and feature specs

Format per feature: **Goal** · **Build** · **Rules** (✓ validated · ◇ recommendation) · **AC** (acceptance criteria).
States per component are in docs/04. Open decisions are flags in `src/config/decisions.ts`.

## Routes
`/` Landing (role-aware) · `/interaction/:id` Live workspace · `/cases` Search · `/cases/:id` Case detail
· `/profiles/veteran/:id` and `/profiles/provider/:id` (new-window views) · `/documents/:id` viewer
· `/admin` (admin only). Screen pop → `/interaction/:id` directly. Ending → `/` with closed cases in Recent.

## F1 Shell and foundations
Build: AppShell, role-aware nav, global search entry, notifications, help, user/role menu, system
health indicator (healthy / degraded: named source / outage), session-timeout warning with extend.
Rules: ✓ all lists newest→oldest by default; ✓ persist filters/sort/scroll across navigation and refresh;
✓ user-facing loading/timeout/partial/retry states with correlation ID.
AC: every route reachable by keyboard; timeout warning at T-2min preserves unsaved work; health degraded
names the source.

## F2 Interaction integration (Amazon Connect, mocked)
Build: screen pop from Dev Toolbar ("Simulate call"), InteractionHeader, AuthStatePanel, transfer banner.
Rules: ✓ show initial IVR reason preselected and editable; label initial vs final clearly; ✓ header
persists while cases are created/switched; ✓ timing/linkage captured automatically, failures non-blocking.
AC: partial screen pop lists missing fields; failed pop allows manual start via search; transferred-in
interaction shows prior agent's cases; linkage failure shows non-blocking banner and is logged.

## F3 RBAC
Build: permissions matrix config, `usePermission()`, route guards, MaskedValue, denied/read-only states.
Rules: ✓ authoritative records read-only; ✓ permission checks on cases, documents, reports, profiles,
recordings, workflows; ✓ role attributes not titles.
AC: switching role in Dev Toolbar updates nav, actions and data visibility without reload; direct URL
to forbidden route shows Access denied page; reveals of masked values write an audit event.

## F4 Landing (role-aware)
Build: modules by mode. Agent: Needs attention, My open cases (replaces spreadsheets), Recent, Shortcuts,
Alerts, readiness cue. Supervisor: team workload, ACW exceptions, escalations at SLA risk, quality signals,
tech health. Manager: exceptions, trend summaries, sensitive cases, drill-through links (Power BI).
Rules: ✓ mode-aware sections, not one universal dashboard; ✓ NICE is an external link only; ✓ summary
metrics + drill-through, no deep analytics; ◇ metrics without a definition/owner are hidden.
AC: each module has loading/empty/error/stale states; needs-attention item shows severity by icon+text.

## F5 Case creation and guided intake
Build: CaseForm in region D. Required: caller type, final call reason, caller first name, notes, repeat
contact, disposition (at close), workgroup, plus case-type fields from config. Readable case ID with copy.
Auto-associated context chips. Quick actions: UCERN, VPERN, Join network, Forms.
Rules: ✓ required fields complete before close (progressive validation + completion summary);
✓ escalation templates prefill case data and block close when required; ✓ manual tagging optional,
auto-associate first; ✓ multiple independent cases per interaction; ◇ workgroup auto from final reason
with manual fallback; ◇ duplicate-case warning (same caller + reason within N days, flag configurable).
AC: add case (Alt+Shift+N) creates new case with shared context only; switching cases keeps unsaved
drafts; close attempt with gaps shows ErrorSummary with links; autosave failure keeps input and retries.

## F6 Case search, view and history
Build: SearchForm (case ID, date range, agent/group, status, Veteran/provider/facility IDs, VAMC, case
type, call reason, disposition, workgroup, interaction type), DataTable results, Case detail (header,
status, owner, linked interaction, related records, notes, attachments, tickets, timeline, audit).
Rules: ✓ filters/sort/scroll persist; ✓ prior cases visible during live interaction, selective copy
never overwrites original; ✓ failures/slowness visible with correlation IDs.
AC: no-match suggests next steps; too-many results prompts refine; partial results name the down source.

## F7 Veteran profile (embedded, read-only)
Build: search by approved identifiers, disambiguation for multiple matches (DOB, last-4, ICN masked),
details (name, gender, DOB, date of death, member ID, last-4 SSN, ICN, preferred facility), contact info +
address source link, eligibility, tabs: Referrals, Claims, Cases, RFS, Prior auth, UM, UCERN, VPERN, ED.
Rules: ✓ stays inside the active case (never "go to another app"); ✓ non-clinical status only;
✓ eligibility types separated; must not imply pharmacy access.
AC: eligibility "unknown/unavailable" is never rendered as "not eligible"; deceased indicator visible;
context persists across tabs and drill-down.

## F8 Provider profile (embedded, read-only)
Build: search by name, NPI, TIN, organization, ZIP, place of service, specialty, taxonomy, network
source; facility-grouped results with expandable providers; details incl. network/enrollment/attestation.
Rules: ◇ CS UI may differ from portal; ✓ show validation reasons, not generic not-found; ✓ design
ambiguous, multiple-match, inactive, missing-address, stale-data states.
AC: associating a provider to the case adds a context chip and an audit event.

## F9 Documents (view-only)
Build: list filtered to case context, viewer with metadata (type, dates, source, linked records),
open/download/print per policy.
Rules: ✓ view separate from management; ✓ claims link ADA forms/remittance with relationship metadata.
AC: unsupported/too-large/redacted/denied states; download disabled shows reason.

## F10 Templates and correspondence
Build: template launcher filtered by case type/outcome, preview with merge fields, required-field
validation, send/generate, delivery status in case history.
Rules: ✓ templates are governed content (read from config); ✓ replace copy/paste with prefilled templates.
AC: unresolved merge fields block send and are highlighted; delivery failed offers retry.

## F11 Event Hub (mocked)
Build: domain events emitted to an in-app event log (admin view): case created/updated/closed, linkage,
escalation, workflow, correspondence, failure. Payload = IDs/references only, no PHI.
AC: publish failure is shown in admin with replay.

## F12 Workflow status (orchestration, provisional)
Build: start workflow from case; status card: submitting, submitted, in progress (owner), pending action,
SLA at risk, blocked/failed (reason + retry), resolved.
Rules: ✓ agents see status + next expected action without restricted detail; ✓ close/submit/pending explicit.

## F13 UCERN / VPERN guided flow
Build: StepFlow launched from case: 1 Veteran + eligibility · 2 Provider/facility + network source ·
3 Controls (DOS, region/contract, POS, facility status, active-on-DOS) · 4 Review · 5 Created (record
number, details, disclosure script) → auto-attached to case.
Rules: ✓ block creation when controls fail and name the failed control + recovery; ✓ VPERN requires VA
network source; ✓ never outside an active case.
AC: retry after create failure never duplicates; returning to case preserves all context.

## F14 Escalation: ServiceNow · F15 Other destinations (configurable, e.g. MNSTR)
Build: EscalationShell: destination (auto from final reason + rules, manual override by role),
prefilled template, remaining required fields, attachments, validation, submit → external ID + status
(new, assigned, pending, SLA at risk, blocked, resolved, rerouted), last-synced time.
Rules: ✓ mandatory template fields block case close; ✓ show ticket content/status by role, not just a
link; ✓ do not conflate ServiceNow, VA ticketing and internal routing; ◇ one shell for all destinations;
✓ case stores external reference + status, never a duplicate workflow.
AC: submit failure keeps case Open with retry; sync delay shows last-synced time.

## Closeout (region F)
Completeness review checklist · disposition · next steps · scripts and IDs to read to caller (copy
buttons) · close case · "Create another case". End interaction only when all cases are Closed or Draft
(empty drafts auto-discarded), otherwise list what is open.

## Oversight, QA, Admin (lighter fidelity)
Supervisor/manager drill-through tables; QA workspace listing interactions with recording/transcript
placeholders (role-gated); Admin: roles/permissions viewer, config lists, event log, health.
