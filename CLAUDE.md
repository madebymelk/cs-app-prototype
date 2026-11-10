# CS App: VA CCN NG Customer Service Application (prototype)

Internal agent workspace for VA Community Care Network contact-center agents. Agents handle
Veteran/provider calls from Amazon Connect, document work as **cases**, research authoritative
records (read-only), and escalate to downstream systems. This repo is a **high-fidelity,
platform-agnostic, working prototype** with mocked integrations. Final platform (Nexa vs Palantir
Foundry) is undecided, so all integrations sit behind adapters in `src/api/`.

## Non-negotiables
- **No real data.** Fixtures are synthetic and de-identified. Never add real names, SSNs, ICNs, NPIs.
- **Invariant:** the agent never loses the active interaction, caller, Veteran/provider context or
  completed case work. Drill-down opens in a panel or new window, never replaces the active case.
- **Interaction ≠ Case.** One interaction holds 0..* independent cases (see docs/01-product.md).
- **Authoritative data is read-only** and visually distinct from CS-owned fields.
- **Every UI state is designed** (loading, empty, partial, error, denied, etc.). See docs/04.
- **Accessibility:** WCAG 2.2 AA / Section 508. Keyboard-complete. Status never by color alone.
- **Use design tokens only.** No raw hex, px font sizes or ad-hoc spacing in components.
- Open business decisions are **config flags** in `src/config/decisions.ts`, never hard-coded.

## Stack
React 18 + TypeScript (strict) + Vite · React Router · TanStack Query · Zustand (workspace state)
· React Aria Components (accessible primitives) · CSS Modules + CSS custom-property tokens
· MSW (mock API + scenario switcher) · Vitest + Testing Library + jest-axe · Playwright + @axe-core/playwright.

## Commands
- `npm run dev`: app with mock API and Dev Toolbar (role + scenario switcher)
- `npm run check`: typecheck + lint + unit tests (run before every commit)
- `npm run e2e`: Playwright journeys + axe scans

## Structure
`src/app` shell/routes · `src/features/<feature>` screens and logic · `src/components` shared UI
· `src/design` tokens.css, typography, icons · `src/api` adapters + MSW handlers · `src/mocks`
fixtures + scenarios · `src/domain` types + rules (pure, unit-tested) · `src/config` flags, permissions.

## Docs (read only what the current task needs)
- `docs/01-product.md`: purpose, roles, domain model, lifecycles, journey. Read first, once.
- `docs/02-design-system.md`: tokens, type, layout, components, patterns. Read for any UI work.
- `docs/03-screens.md`: every screen and feature spec with acceptance criteria.
- `docs/04-states-content.md`: state inventory, error/loading rules, copy rules, glossary.
- `docs/05-data-mocks.md`: TS types, mock endpoints, scenarios, fixtures.
- `docs/06-a11y-quality.md`: accessibility spec, testing, Definition of Done.
- `docs/07-build-plan.md`: milestones in order, each with acceptance criteria.

## How to work
1. Work one milestone from docs/07 at a time. Plan first (plan mode), then build, then verify.
2. Write domain rules as pure functions with unit tests before wiring UI.
3. Verify each milestone: `npm run check`, `npm run e2e`, then screenshot key screens and compare to
   docs/02 and docs/03. Fix before moving on. Commit per milestone.
4. Use subagents for broad codebase searches; keep the main context for the current milestone.
5. If a requirement is ambiguous, follow the "Design recommendation" in docs and leave a
   `// DECISION:` comment pointing to `src/config/decisions.ts`. Don't invent business rules.
