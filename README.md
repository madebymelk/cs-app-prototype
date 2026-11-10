# CS App prototype

High-fidelity, working prototype of the VA Community Care Network customer service agent
workspace. All integrations are mocked behind adapters in `src/api/`, and **all data is synthetic**.

Project rules and structure are in [`CLAUDE.md`](CLAUDE.md). Product, design, screens, states,
data, accessibility and the build plan are in [`docs/`](docs).

## Status

| Milestone | Scope | State |
|---|---|---|
| M0 | Scaffold, design tokens, app shell, mock API, Dev Toolbar, test harness | Done |
| M1 | Domain rules: case lifecycle, close validation, routing, permissions, audit (100% unit-tested) | Done |
| M2 | Live workspace: interaction header, caller verification, cases, case form, autosave, closeout | Done |
| M3–M10 | See [`docs/07-build-plan.md`](docs/07-build-plan.md) | Not started |

## Run it

Requires Node 22.

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5173. The dashed **Prototype** pill (bottom-left, or Alt+Shift+D) switches
role and scenario and simulates voice or chat calls.

## Scripts

- `npm run dev`: app with the mock API and prototype controls
- `npm run check`: typecheck, ESLint, Stylelint (design-token enforcement) and unit tests with a
  100% coverage gate on `src/domain`
- `npm run e2e`: Playwright journeys with axe accessibility scans; screenshots go to `screenshots/`
- `npm run build:demo`: static build (in-page mock API, in-memory routing) for sharing as a
  private page

## Deviations from the docs so far

- **Palette contrast:** success and warning text are used only on white, because they fall below
  4.5:1 on their tinted and gray backgrounds; input borders use a new `--color-border-control`
  token, because `#A9AEB1` is 2.3:1 on white. Both rules are checked in `src/design/tokens.test.ts`.
- **Provisional config:** call reasons, workgroups, dispositions, case-type fields, escalation
  templates, verification checks and the permissions matrix are placeholders marked `// DECISION:`
  in `src/config/`.
- **Case model:** `callerFirstName`, `callerRef`, `typeFields`, `nextSteps` and `downstreamError`
  were added to `Case` (needed by F5; not in the docs/05 sketch).
- **Scenario:** `autosaveFails` was added to test autosave retry.
- **Tooling:** ESLint 9 (the jsx-a11y plugin doesn't support 10) and TypeScript 5.9; `tldts` and
  `playwright-core` are pinned via `overrides` in `package.json`.
