/** Context-panel data sources and freshness (docs/03 F7, F8; docs/04 Stale). */

// DECISION: how old data can be before it's flagged stale. Placeholder until source SLAs are known.
export const STALE_AFTER_MINUTES = 10;

// DECISION: provider network sources are placeholders until the network list is confirmed.
export const NETWORK_SOURCES = ['CCN Region 1', 'CCN Region 2', 'CCN Region 3', 'VA network', 'Out of network'] as const;
export type NetworkSource = (typeof NETWORK_SOURCES)[number];

/** Network sources that count as "VA network" for VPERN (docs/03 F13). */
export const VA_NETWORK_SOURCES: readonly string[] = ['VA network'];

// DECISION: provider directory records older than this are flagged as stale (placeholder: 30 days).
export const PROVIDER_STALE_AFTER_MINUTES = 60 * 24 * 30;
