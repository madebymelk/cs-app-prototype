/** Dev Toolbar scenarios (docs/05). Mock handlers shape responses by the active scenario. */
export const SCENARIO_GROUPS = ['Interaction', 'Authentication', 'Profiles', 'Records', 'Escalation', 'System'] as const;
export type ScenarioGroup = (typeof SCENARIO_GROUPS)[number];

export interface ScenarioDef {
  id: string;
  label: string;
  group: ScenarioGroup;
  description: string;
}

export const SCENARIOS = [
  { id: 'happyPath', label: 'Happy path', group: 'Interaction', description: 'Verified Veteran, every source responds.' },
  { id: 'screenPopPartial', label: 'Screen pop partial', group: 'Interaction', description: 'Screen pop arrives without caller name and IVR reason.' },
  { id: 'screenPopFailed', label: 'Screen pop failed', group: 'Interaction', description: 'Screen pop request fails; agent starts manually.' },
  { id: 'transferIn', label: 'Transfer in', group: 'Interaction', description: 'Warm transfer from another agent with existing cases.' },
  { id: 'linkageFailed', label: 'Linkage failed', group: 'Interaction', description: 'Contact-to-interaction linkage fails; non-blocking banner.' },
  { id: 'duplicateCase', label: 'Duplicate case', group: 'Interaction', description: 'Same caller and reason within the duplicate window.' },
  { id: 'authFailed', label: 'Authentication failed', group: 'Authentication', description: 'Caller fails Veteran verification.' },
  { id: 'authorizedRepCaller', label: 'Authorized representative', group: 'Authentication', description: 'Caller is an authorized representative.' },
  { id: 'veteranMultipleMatch', label: 'Veteran multiple match', group: 'Profiles', description: 'Search returns several possible Veterans.' },
  { id: 'veteranDeceased', label: 'Veteran deceased', group: 'Profiles', description: 'Veteran record has a date of death.' },
  { id: 'eligibilityUnknown', label: 'Eligibility unknown', group: 'Profiles', description: 'Eligibility source cannot determine status.' },
  { id: 'profileServiceDown', label: 'Profile service down', group: 'Profiles', description: 'Veteran profile service is not responding.' },
  { id: 'providerAmbiguousInactive', label: 'Provider ambiguous, inactive', group: 'Profiles', description: 'Provider search is ambiguous; one facility inactive.' },
  { id: 'ucernControlFail', label: 'UCERN control fails', group: 'Records', description: 'UCERN creation blocked by a failed control.' },
  { id: 'createRecordFails', label: 'Record creation fails', group: 'Records', description: 'UCERN/VPERN create request errors.' },
  { id: 'escalationSubmitFails', label: 'Escalation submit fails', group: 'Escalation', description: 'ServiceNow submit returns an error.' },
  { id: 'syncDelayed', label: 'Sync delayed', group: 'Escalation', description: 'Downstream status sync is behind.' },
  // Added for F5 AC "autosave failure keeps input and retries" (not in the docs/05 scenario list).
  { id: 'autosaveFails', label: 'Autosave fails', group: 'System', description: 'Saving a case fails until you switch scenario.' },
  { id: 'slowSources', label: 'Slow sources', group: 'System', description: 'Each source answers in 3 to 12 seconds.' },
  { id: 'sessionTimeout', label: 'Session timeout', group: 'System', description: 'Session expiry warning appears soon.' },
  { id: 'deniedRecording', label: 'Recording denied', group: 'System', description: 'Recording access is denied for this user.' },
] as const satisfies readonly ScenarioDef[];

export type ScenarioId = (typeof SCENARIOS)[number]['id'];

export function getScenario(id: string): ScenarioDef {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
}

export function isScenarioId(value: unknown): value is ScenarioId {
  return SCENARIOS.some((s) => s.id === value);
}
