/** Synthetic agents and teams. */
export const CURRENT_AGENT = 'AGT-20417';
export const AGENTS: Record<string, { name: string; team: string }> = {
  'AGT-20417': { name: 'Jordan Ellis', team: 'Tier 1 · Tucson' },
  'AGT-11873': { name: 'Priya Lindqvist', team: 'Tier 1 · Tucson' },
  'AGT-30552': { name: 'Marcus Holloway', team: 'Tier 2 · VA Platinum' },
  'AGT-41209': { name: 'Dana Sandoval', team: 'Tier 1 · Dayton' },
  'AGT-52630': { name: 'Rafael Quintero', team: 'Tier 1 · Dayton' },
};
export const agentName = (id: string) => AGENTS[id]?.name ?? id;
