import type { Facility, Provider } from './types';

export interface ProviderQuery {
  name?: string;
  npi?: string;
  tin?: string;
  zip?: string;
  specialty?: string;
  placeOfService?: string;
  networkSource?: string;
}

export type ProviderQueryIssue =
  | { field: 'query'; code: 'empty' }
  | { field: 'npi'; code: 'npiFormat' }
  | { field: 'tin'; code: 'tinFormat' }
  | { field: 'zip'; code: 'zipFormat' };

const filled = (v: string | undefined): v is string => Boolean(v?.trim());

/** Validation reasons instead of a generic "not found" (docs/03 F8). */
export function validateProviderQuery(q: ProviderQuery): ProviderQueryIssue[] {
  const issues: ProviderQueryIssue[] = [];
  if (!Object.values(q).some(filled)) return [{ field: 'query', code: 'empty' }];
  if (filled(q.npi) && !/^\d{10}$/.test(q.npi.trim())) issues.push({ field: 'npi', code: 'npiFormat' });
  if (filled(q.tin) && !/^\d{9}$/.test(q.tin.trim().replace('-', ''))) issues.push({ field: 'tin', code: 'tinFormat' });
  if (filled(q.zip) && !/^\d{5}$/.test(q.zip.trim())) issues.push({ field: 'zip', code: 'zipFormat' });
  return issues;
}

export interface FacilityGroup {
  facility: Facility;
  providers: Provider[];
}

/** Facility-grouped results (F8): active facilities first, then by name; providers by name. */
export function groupByFacility(providers: readonly Provider[], facilities: readonly Facility[]): FacilityGroup[] {
  const byId = new Map(facilities.map((f) => [f.id, f]));
  const groups = new Map<string, FacilityGroup>();
  for (const p of providers) {
    const facility = byId.get(p.facilityId);
    if (!facility) continue;
    const g = groups.get(facility.id) ?? { facility, providers: [] };
    g.providers.push(p);
    groups.set(facility.id, g);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, providers: [...g.providers].sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => {
      if (a.facility.status !== b.facility.status) return a.facility.status === 'active' ? -1 : 1;
      return a.facility.name.localeCompare(b.facility.name);
    });
}
