/**
 * Open business decisions as config flags (CLAUDE.md). Never hard-code these in components.
 * Read by domain rules from M1 on.
 */
export const decisions = {
  // DECISION: Is an initial case auto-created as a Draft from the IVR reason, or does the agent create it?
  // Default per docs/02 "Initial case" pattern.
  initialCaseMode: 'autoDraft' as 'autoDraft' | 'agentCreates',
  // DECISION: Where wrap-up (ACW) is captured: in CS App or in Amazon Connect.
  wrapUpLocation: 'csApp' as 'csApp' | 'connect',
  // DECISION: Disposition captured per case or per interaction.
  dispositionLevel: 'case' as 'case' | 'interaction',
  // DECISION: Window for duplicate-case warning (same caller + reason), in days.
  duplicateWindowDays: 7,
  // DECISION: Chat uses the same interaction/case patterns as voice.
  chatPatterns: 'shared' as const,
  // DECISION: Correspondence (F10) enabled in this release.
  correspondenceEnabled: true,
  // DECISION: Which roles may reopen a closed case (permissions are provisional).
  reopenRoles: ['supervisor'] as readonly string[],
};

export type Decisions = typeof decisions;
