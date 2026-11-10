# 06 · Accessibility, quality, Definition of Done

Target **WCAG 2.2 AA** (exceeds Section 508's WCAG 2.0 AA baseline).

## Accessibility spec
- **Keyboard:** everything operable; logical order follows regions A→B→C→D→E→F; skip links to
  "Interaction", "Case", "Context"; no traps in drawers/dialogs; Esc closes overlays and returns focus.
- **Focus:** always visible (2px --color-focus + offset); on submit failure focus the ErrorSummary;
  on opening a panel focus its heading; on closing return to the trigger; never lost on re-render.
- **Semantics:** landmarks per region (`header`, `nav`, `main`, `complementary`), one h1 per view,
  proper table headers and `aria-sort`, labelled form controls, `aria-describedby` for hints/errors.
- **Live regions (contact-center specific):** agents using screen readers hear the caller and the
  screen reader in the same headset. Use `polite` for status/save/new items, batch non-urgent updates,
  `assertive` only for blocking errors. Never announce timers.
- **Color/contrast:** tokens only; status = icon + text; test token pairs.
- **Zoom/reflow:** usable at 200% and at 1280px; region E becomes a drawer; header B remains.
- **Targets:** ≥24×24 CSS px. **Motion:** respect reduced motion. **Timeouts:** warn + extend.
- **Masked data:** announce "masked"; reveal is a button with clear label, audited.

## Testing
- Unit (Vitest): domain rules: case state machine, close validation, workgroup routing, permission
  checks, duplicate detection, eligibility display mapping, initial vs final reason.
- Component: every component state + `jest-axe` with zero violations.
- E2E (Playwright + axe) for these journeys, keyboard-only:
  1. Screen pop verified Veteran → referral question → close.
  2. Same call adds claim + pharmacy eligibility cases → close all → end interaction.
  3. Auth fails, then authorized representative calls.
  4. Provider search multiple match + inactive facility.
  5. UCERN fails a control → recover → success → disclosure script.
  6. ServiceNow escalation with mandatory template; early close blocked.
  7. Profile service down mid-call; case work continues.
  8. Next day: find yesterday's case from Landing and search; filters persist.
  9. Supervisor reviews exceptions and an SLA-risk escalation.
  10. Role switch: QA vs CSR visibility and route guard.
- Visual check: after each milestone, screenshot key screens at 1440 and 1280 widths and 200% zoom and
  review against docs/02.

## Definition of Done (per feature)
- Matches docs/03 rules and AC; all docs/04 states reachable by scenario.
- Keyboard-complete; axe clean; focus management verified; announcements polite by default.
- Tokens only; no hard-coded strings outside `src/content`.
- Domain logic unit-tested; journey covered in E2E where listed.
- Audit events emitted for create/update/close, reveals, escalations, associations.
- `npm run check` and `npm run e2e` green; screenshots reviewed.

## Red flags (stop and fix)
Screen without its error/empty/denied states · permission enforced only by hiding a button · "not found"
shown when a source failed · case work lost on navigation · color-only status · a business rule
invented in a component instead of `src/domain` or `src/config`.
