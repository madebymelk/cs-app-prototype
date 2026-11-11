/** UCERN / VPERN creation controls (docs/03 F13). All values are placeholders until the program confirms them. */

// DECISION: how far back a date of service can be (days). A future date is never allowed.
export const DOS_LOOKBACK_DAYS = 3;

// DECISION: required place of service per record type.
export const REQUIRED_PLACE_OF_SERVICE = { ucern: 'Urgent care facility', vpern: 'Pharmacy' } as const;

// DECISION: network sources that satisfy the region/contract control (anything but out of network).
export const CONTRACTED_NETWORKS: readonly string[] = ['CCN Region 1', 'CCN Region 2', 'CCN Region 3', 'VA network'];
