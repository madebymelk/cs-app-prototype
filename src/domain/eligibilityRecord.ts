import { VA_NETWORK_SOURCES } from '@/config/sources';
import { CONTRACTED_NETWORKS, DOS_LOOKBACK_DAYS, REQUIRED_PLACE_OF_SERVICE } from '@/config/eligibilityRecords';
import type { EligibilityStatus, Facility, Provider } from './types';

export type RecordKind = 'ucern' | 'vpern';
export type ControlId =
  | 'eligibility'
  | 'dateOfService'
  | 'regionContract'
  | 'networkSource'
  | 'placeOfService'
  | 'facilityStatus'
  | 'activeOnDos';

export interface ControlInput {
  kind: RecordKind;
  /** Urgent care eligibility for UCERN, pharmacy eligibility for VPERN. */
  eligibility: EligibilityStatus | undefined;
  provider: Provider | undefined;
  facility: Facility | undefined;
  dateOfService: string; // YYYY-MM-DD
}

export interface ControlResult {
  id: ControlId;
  passed: boolean;
}

const DAY = 86_400_000;
const dayStart = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

/**
 * Creation controls for an eligibility record (F13). Creation is blocked when any control fails; the UI
 * names each failed control and how to recover. VPERN additionally requires a VA network source.
 */
export function evaluateControls(input: ControlInput, now: Date): ControlResult[] {
  const { kind, provider, facility } = input;
  const dos = Date.parse(`${input.dateOfService}T00:00:00Z`);
  const today = dayStart(now);
  const dosOk = !Number.isNaN(dos) && dos <= today && dos >= today - DOS_LOOKBACK_DAYS * DAY;

  const results: ControlResult[] = [
    { id: 'eligibility', passed: input.eligibility === 'eligible' },
    { id: 'dateOfService', passed: dosOk },
    { id: 'regionContract', passed: Boolean(provider && CONTRACTED_NETWORKS.includes(provider.networkSource)) },
  ];
  if (kind === 'vpern') {
    results.push({ id: 'networkSource', passed: Boolean(provider && VA_NETWORK_SOURCES.includes(provider.networkSource)) });
  }
  results.push(
    { id: 'placeOfService', passed: provider?.placeOfService === REQUIRED_PLACE_OF_SERVICE[kind] },
    { id: 'facilityStatus', passed: facility?.status === 'active' },
    { id: 'activeOnDos', passed: provider?.status === 'active' && dosOk },
  );
  return results;
}

export const failedControls = (results: ControlResult[]) => results.filter((r) => !r.passed).map((r) => r.id);
