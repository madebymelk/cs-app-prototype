# 04 · States, errors and content

A screen is not done until every applicable state below exists, is reachable through a Dev Toolbar
scenario, and has a Storybook-style test or story (`*.states.test.tsx`).

## State inventory (● = must build)
| Component | Default | Loading | Empty | Partial | Stale | No match | Multi-match | Error | Denied | Timeout | Source down | Duplicate | Success | Confirm |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| InteractionHeader | ● | ● |  | ● |  |  |  | ● |  | ● | ● |  |  |  |
| AuthStatePanel | ● | ● |  | ● |  | ● | ● | ● | ● | ● | ● |  | ● | ● |
| CaseForm | ● | ● | ● |  |  |  |  | ● | ● | ● |  | ● | ● | ● |
| CaseNavigator | ● |  | ● |  |  |  |  | ● |  |  |  |  | ● | ● |
| Context profiles | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |  |  |  |
| Case search | ● | ● | ● | ● |  | ● | ● | ● | ● | ● | ● |  |  |  |
| EscalationShell | ● | ● |  | ● |  |  |  | ● | ● | ● | ● | ● | ● | ● |
| UCERN/VPERN flow | ● | ● |  |  |  | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| Landing modules | ● | ● | ● | ● | ● |  |  | ● | ● |  | ● |  |  |  |
| Document viewer | ● | ● | ● |  |  |  |  | ● | ● | ● | ● |  |  |  |

## Rules
- **Loading:** skeletons matching final layout; >10s shows "Still loading [source]" + cancel/retry.
  Load each source independently; never block the whole workspace on one source.
- **Partial / source down:** `SourceUnavailable` in that section only: "[Source] isn't responding.
  You can keep working on this case. Retry." Other sections stay usable.
- **Absence vs failure:** "No referrals found" only when the source answered with zero results.
- **Errors:** say what happened, impact, and what to do; include correlation ID (copyable) for system
  errors. Inline field errors + an ErrorSummary at top of form on submit (focus moves to it).
- **Denied:** "You don't have access to [thing]. Contact your supervisor if you need it." No counts or
  hints that leak restricted data.
- **Empty:** explain and offer the next action (e.g., "No open cases. Search cases").
- **Stale:** "Updated 14 min ago" + refresh.
- **Duplicate:** warn, show the possible duplicate, let agent continue or open existing.
- **Confirm:** only for destructive or irreversible actions (discard, cancel case, end interaction with
  open cases). Name the action on the button ("Discard draft"), never "OK".
- **Success:** inline confirmation in context (case ID, ticket ID with copy). Toasts only for
  non-critical background completions; toasts never carry the only copy of an ID.
- **Save status:** "Saving…" → "Saved 10:42" → "Couldn't save. Retrying…" (input preserved).

## Content rules
- Plain, specific, sentence case. Verb-first buttons ("Add case", "Send to ServiceNow").
- Business labels, not system names, except where the system is the action ("Open in ServiceNow").
- Always label **Initial reason (IVR)** vs **Final reason**.
- Every status shows meaning + owner + next action; no orphan statuses.
- Dates `Nov 10, 2026 1:42 PM`; relative time for <24h with full timestamp on hover/focus.
- Content strings live in `src/content/strings.ts` (governed content; no policy text hard-coded in JSX).
- Fixtures use realistic, synthetic content. Never lorem ipsum.

## Glossary (use these words consistently)
Interaction (one engagement) · Case (unit of documented work) · Escalation (sending a case's work to
another team/system) · Ticket (ServiceNow record) · Workflow (downstream business process) · Disposition
(how the case ended) · Workgroup (routing team) · Needs attention (item requiring the user's action) ·
ACW (after-call work) · UCERN / VPERN (urgent-care / pharmacy eligibility records) · ICN, NPI, TIN,
VAMC, RFS, UM, ED, EOB, PQI, FWA as standard program terms.
