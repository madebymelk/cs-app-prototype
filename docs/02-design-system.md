# 02 · Design system

Foundation: **USWDS / VA Clinical Design System tokens** (built for VA staff tools, contrast-graded).
Tone: calm, dense, trustworthy, fast. Information first, chrome last. No decorative gradients, no
illustration in work surfaces, no shadows except overlays. Put all tokens in `src/design/tokens.css`.

## Color tokens
| Token | Hex | Use |
|---|---|---|
| --color-primary | #005EA2 | Primary actions, links, selected nav |
| --color-primary-dark | #1A4480 | Hover/pressed |
| --color-primary-darker | #162E51 | Global shell bar |
| --color-primary-lighter | #D9E8F6 | Selected row, active case in navigator |
| --color-ink | #1B1B1B | Body text |
| --color-text-secondary | #565C65 | Secondary text, labels (min for text) |
| --color-text-disabled | #71767A | Disabled text only |
| --color-border-strong | #A9AEB1 | Input borders, dividers that matter |
| --color-border | #DFE1E2 | Panel and table borders |
| --color-surface-canvas | #F0F0F0 | App background behind panels |
| --color-surface | #FFFFFF | Panels, editable fields |
| --color-surface-readonly | #F7F8F9 | Authoritative read-only data blocks |
| --color-focus | #2491FF | Focus ring (2px outline + 2px offset) |
| --color-success / -bg | #008817 / #ECF3EC | Success text+icon / background |
| --color-warning / -bg | #936F38 text, #FFBE2E border/icon / #FAF3D1 | Warnings (never yellow text) |
| --color-error / -bg | #B50909 / #F4E3DB | Errors, blocking |
| --color-info / -bg | #2E6276 text, #00BDE3 border / #E7F6F8 | Info, system notices |
| --color-emergency | #9C3D10 | Sensitive/urgent flags only |

Rules: text contrast ≥ 4.5:1, UI components ≥ 3:1; add a unit test that checks every text/background
token pair used. Status = icon + text + color. Red/green never the only difference. One primary
button per region.

## Typography
Font: **Source Sans 3** (VA standard family), fallback system-ui. IDs, timestamps, counts:
`font-variant-numeric: tabular-nums`; case/interaction IDs in **Roboto Mono** with a copy button.
| Token | Size/line | Weight | Use |
|---|---|---|---|
| --text-xs | 12/16 | 400 | Captions, source/freshness tags only |
| --text-sm | 14/20 | 400 | Dense tables, field labels, metadata |
| --text-md | 16/24 | 400 | Body, form inputs (default) |
| --text-lg | 18/26 | 600 | Panel titles |
| --text-xl | 22/28 | 700 | Page titles |
| --text-2xl | 28/34 | 700 | Landing greeting only |
Sizes in rem. Sentence case everywhere. Max ~80 characters per line for prose.

## Space, size, shape, motion
- Spacing scale (4px base): 4, 8, 12, 16, 24, 32, 48 → `--space-1…7`.
- Controls: height 40 (default), 32 (compact tables/toolbars). Min target 24×24 (WCAG 2.5.8).
- Table rows: 40 default, 32 compact (user toggle, persisted).
- Radius: 4 controls, 8 panels/dialogs, 999 badges.
- Elevation: none on panels (use borders); one shadow token for dropdowns/dialogs/drawers.
- Motion: 120–180ms ease-out for panels/drawers only; honor `prefers-reduced-motion`.
- Icons: one outline set (e.g. Lucide), 16/20px, always paired with text or an aria-label.

## Layout: live interaction workspace (≥1280×720)
```
┌ A Global shell 48px: app name · role nav · global search · notifications · help · user/role · health ┐
├ B Interaction header 64px (sticky, never scrolls away)                                              ┤
│  caller + type · auth state badge · interaction ID · channel · timer · initial→final reason · end  │
├ C Case navigator 240px ┬ D Active case intake (flex) ┬ E Context panel 400px (resizable 320–560) ┤
│  cases in interaction  │  header: case ID, status   │  Veteran/Provider profile (embedded)       │
│  status per case       │  sections w/ progressive   │  tabs: Referrals Claims RFS PA UM ED Docs  │
│  + Add case            │  validation                │  Prior cases. Each section shows source +  │
│  prior cases (r/o)     │  F Escalation / closeout   │  freshness. Details open in panel/window.  │
└────────────────────────┴────────────────────────────┴────────────────────────────────────────────┘
```
At <1280px or 200% zoom: E becomes a toggle drawer; C collapses to a case switcher in B. Never hide B.

## Core components (build in src/components, each with states + a11y test)
AppShell · GlobalNav · InteractionHeader · AuthStatePanel · CaseNavigator · CaseForm (sections,
progressive validation, autosave status) · ErrorSummary (links to fields) · ContextPanel + Tabs ·
ReadOnlyBlock (lock icon + "Source: X · updated 2m ago") · MaskedValue (reveal by permission, audited)
· DataTable (sort, filter, paginate, newest-first default, compact mode, state persisted) ·
StatusBadge · SourceUnavailable · EmptyState (always offers next action) · Skeleton · InlineAlert ·
Banner (one urgent item only) · NeedsAttentionList · Dialog · Drawer · Toast (polite, non-critical) ·
EscalationShell · StepFlow · Timeline · SearchForm · SaveStatus · KeyboardShortcutsDialog (`?`).

## Patterns (decided defaults)
- **Auth:** persistent AuthStatePanel, not a modal. States: Not verified, In progress, Verified,
  Partially verified, Failed, Bypassed (if allowed), Caller changed.
- **Multi-case:** left navigator + one focused case. No tabs (fail beyond ~4 cases).
- **Save:** autosave drafts (debounced 800ms, show "Saved 10:42") + explicit Submit/Close.
- **Initial case:** per `decisions.initialCaseMode` (default `autoDraft`: Draft prefilled from IVR
  reason; empty drafts discarded, not closed).
- **Permissions:** hide what is irrelevant to the role; disable with reason what is relevant but not
  permitted; also guard routes.
- **Escalation:** one shell for all destinations; destination-specific fields inside.
- **Notifications:** banner only for one urgent event; durable items go to NeedsAttentionList.
- **Read-only vs editable:** read-only blocks use --color-surface-readonly, no input chrome, lock icon,
  source tag. Editable fields are white with border.
- **Drill-down:** panel or new window; Back restores scroll, filters and selection.

## Keyboard shortcuts (configurable, listed in `?` dialog, avoid screen-reader conflicts)
Alt+Shift+N add case · Alt+Shift+1–9 switch case · Alt+Shift+S focus search · Alt+Shift+C toggle
context panel · Alt+Shift+E escalate · Ctrl+Enter submit current form.
