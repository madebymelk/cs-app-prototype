# 07 · Build plan (one milestone per session; /clear between milestones)

Each milestone: plan → build → `npm run check` → `npm run e2e` → screenshots → commit.
Read only the docs listed for that milestone.

| # | Milestone | Read | Done when |
|---|---|---|---|
| M0 | Scaffold: Vite/React/TS strict, lint/format, tokens.css, fonts, AppShell, router, MSW, seeded fixtures, Dev Toolbar (role, scenario, simulate call), test harness (Vitest, jest-axe, Playwright+axe) | 02, 05 | Shell renders with tokens; toolbar switches role/scenario; one axe-clean test passes |
| M1 | Domain core: types, case state machine, close validation, routing rules, permissions, decisions flags, audit emitter | 01, 05 | 100% of domain rules unit-tested |
| M2 | Live workspace: InteractionHeader, AuthStatePanel, CaseNavigator, CaseForm with autosave, add/switch cases, closeout, end interaction | 02, 03 (F2, F5, Closeout), 04 | E2E journeys 1–2 pass keyboard-only; header never scrolls away; drafts survive switching |
| M3 | Context panel: Veteran + Provider profiles, record tabs, prior cases with selective copy, independent per-source loading and failure | 03 (F7, F8, F6 prior cases), 04 | Journeys 3, 4, 7 pass; eligibility unknown ≠ not eligible |
| M4 | Escalation shell (ServiceNow + configurable destination), workflow status, close blocking | 03 (F12, F14, F15) | Journey 6 passes; submit failure keeps case open |
| M5 | UCERN/VPERN StepFlow | 03 (F13) | Journey 5 passes; retry never duplicates |
| M6 | Case search + detail + history, state persistence | 03 (F6) | Journey 8 passes |
| M7 | Landing by role (agent, supervisor, manager), needs attention, health, NICE/Power BI links | 03 (F1, F4) | Journey 9 passes; every module has 4+ states |
| M8 | Documents viewer, templates & correspondence | 03 (F9, F10) | Merge-field and delivery-failure states work |
| M9 | RBAC polish: masking, denied states, route guards, QA and Admin views, event log (F11) | 03 (F3, F11, Oversight) | Journey 10 passes; reveals audited |
| M10 | Hardening: walk the full state inventory, 200% zoom, 1280px, reduced motion, shortcuts dialog, content pass | 04, 06 | All DoD items met; zero axe violations across E2E |

Out of scope for the prototype: real authentication, real integrations, NICE/WFM features, analytics
dashboards, document ingestion/authoring, template authoring.
