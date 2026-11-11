import type { Facility, Provider } from '@/domain/types';

/** Synthetic provider directory. NPIs start with 9 and TINs with 99 so they can't be real. */
const UPDATED = '2026-11-10T15:00:00Z';

export const FACILITIES: Facility[] = [
  { id: 'FAC-101', name: 'Northside Family Medicine', city: 'Tucson', state: 'AZ', zip: '85719', status: 'active' },
  { id: 'FAC-102', name: 'Northside Family Medicine – Oracle Rd', city: 'Tucson', state: 'AZ', zip: '85704', status: 'active' },
  { id: 'FAC-103', name: 'Desert Sky Cardiology', city: 'Tucson', state: 'AZ', zip: '85712', status: 'active' },
  { id: 'FAC-104', name: 'Riverbend Physical Therapy', city: 'Dayton', state: 'OH', zip: '45402', status: 'active' },
  { id: 'FAC-105', name: 'QuickCare Urgent Care', city: 'Boise', state: 'ID', zip: '83702', status: 'active' },
];

const p = (o: Partial<Provider> & Pick<Provider, 'id' | 'name' | 'npi' | 'facilityId' | 'specialty'>): Provider => ({
  tin: '991234567',
  taxonomy: '207Q00000X',
  placeOfService: 'Office',
  status: 'active',
  networkSource: 'CCN Region 3',
  enrollment: 'enrolled',
  attestation: 'current',
  address: { line1: '2100 N Campbell Ave', city: 'Tucson', state: 'AZ', zip: '85719' },
  updatedAt: UPDATED,
  ...o,
});

export const PROVIDERS: Provider[] = [
  p({ id: 'PRV-2001', name: 'Dana Whitlow, MD', npi: '9100200301', facilityId: 'FAC-101', specialty: 'Family medicine' }),
  p({ id: 'PRV-2002', name: 'Dana Whitlow, MD', npi: '9100200302', facilityId: 'FAC-102', specialty: 'Family medicine',
    address: { line1: '6100 N Oracle Rd', city: 'Tucson', state: 'AZ', zip: '85704' } }),
  p({ id: 'PRV-2003', name: 'Ruben Okonkwo, DO', npi: '9100200303', facilityId: 'FAC-101', specialty: 'Family medicine',
    enrollment: 'pending' }),
  p({ id: 'PRV-2004', name: 'Priya Halvorsen, MD', npi: '9100200304', facilityId: 'FAC-103', specialty: 'Cardiology',
    taxonomy: '207RC0000X', tin: '997654321', address: { line1: '1500 E Grant Rd', city: 'Tucson', state: 'AZ', zip: '85712' } }),
  p({ id: 'PRV-2005', name: 'Marcus Feld, PT', npi: '9100200305', facilityId: 'FAC-104', specialty: 'Physical therapy',
    taxonomy: '225100000X', networkSource: 'CCN Region 1', tin: '993344556',
    address: { line1: '40 W 2nd St', city: 'Dayton', state: 'OH', zip: '45402' } }),
  p({ id: 'PRV-2006', name: 'QuickCare Urgent Care', npi: '9100200306', facilityId: 'FAC-105', specialty: 'Urgent care',
    taxonomy: '261QU0200X', placeOfService: 'Urgent care facility', networkSource: 'CCN Region 2', tin: '995566778',
    address: { line1: '900 W Main St', city: 'Boise', state: 'ID', zip: '83702' } }),
];

/** providerAmbiguousInactive: the Oracle Rd site is inactive, its record lacks an address and is stale. */
export function directory(ambiguous: boolean): { providers: Provider[]; facilities: Facility[] } {
  if (!ambiguous) return { providers: PROVIDERS, facilities: FACILITIES };
  return {
    facilities: FACILITIES.map((f) => (f.id === 'FAC-102' ? { ...f, status: 'inactive' } : f)),
    providers: PROVIDERS.map((pr) => {
      if (pr.id !== 'PRV-2002') return pr;
      const { address: _a, ...rest } = pr;
      return { ...rest, status: 'inactive', attestation: 'expired', updatedAt: '2026-08-02T15:00:00Z' };
    }),
  };
}

export function searchProviders(
  q: { name?: string; npi?: string; tin?: string; zip?: string; specialty?: string; placeOfService?: string; networkSource?: string },
  ambiguous: boolean,
) {
  const { providers, facilities } = directory(ambiguous);
  const fac = new Map(facilities.map((f) => [f.id, f]));
  const has = (v: string | undefined, target: string) => !v?.trim() || target.toLowerCase().includes(v.trim().toLowerCase());
  const matches = providers.filter((pr) => {
    const f = fac.get(pr.facilityId);
    return (
      (has(q.name, pr.name) || has(q.name, f?.name ?? '')) &&
      (!q.npi?.trim() || pr.npi === q.npi.trim()) &&
      (!q.tin?.trim() || pr.tin === q.tin.trim().replace('-', '')) &&
      (!q.zip?.trim() || (pr.address?.zip ?? f?.zip) === q.zip.trim()) &&
      has(q.specialty, pr.specialty) &&
      has(q.placeOfService, pr.placeOfService) &&
      (!q.networkSource || pr.networkSource === q.networkSource)
    );
  });
  return { providers: matches, facilities: facilities.filter((f) => matches.some((m) => m.facilityId === f.id)) };
}
