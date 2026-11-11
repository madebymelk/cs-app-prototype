import { describe, expect, it } from 'vitest';
import type { Facility, Provider } from './types';
import { groupByFacility, validateProviderQuery } from './providerSearch';

describe('validateProviderQuery', () => {
  it('asks for at least one criterion', () => {
    expect(validateProviderQuery({})).toEqual([{ field: 'query', code: 'empty' }]);
    expect(validateProviderQuery({ name: '  ' })).toEqual([{ field: 'query', code: 'empty' }]);
  });

  it('explains format problems instead of searching', () => {
    expect(validateProviderQuery({ npi: '12345', tin: '12-34', zip: '8571' })).toEqual([
      { field: 'npi', code: 'npiFormat' },
      { field: 'tin', code: 'tinFormat' },
      { field: 'zip', code: 'zipFormat' },
    ]);
  });

  it('accepts well-formed identifiers, including a TIN with a dash', () => {
    expect(validateProviderQuery({ npi: '9123456789', tin: '12-3456789', zip: '85719' })).toEqual([]);
    expect(validateProviderQuery({ name: 'Northside' })).toEqual([]);
  });
});

const facility = (id: string, name: string, status: Facility['status'] = 'active'): Facility => ({
  id, name, city: 'Tucson', state: 'AZ', zip: '85719', status,
});
const provider = (id: string, name: string, facilityId: string): Provider => ({
  id, name, facilityId, npi: '9000000000', tin: '900000000', specialty: 'Family medicine', taxonomy: '207Q00000X',
  placeOfService: 'Office', status: 'active', networkSource: 'CCN Region 3', enrollment: 'enrolled',
  attestation: 'current', updatedAt: '2026-11-10T00:00:00Z',
});

describe('groupByFacility', () => {
  it('groups by facility, active facilities first, then by name; providers sorted', () => {
    const facilities = [facility('F1', 'Westside Clinic'), facility('F2', 'Northside Clinic', 'inactive'), facility('F3', 'Alder Medical')];
    const groups = groupByFacility(
      [provider('P1', 'Zeller', 'F1'), provider('P2', 'Adams', 'F1'), provider('P3', 'Moss', 'F2'), provider('P4', 'Lee', 'F3')],
      facilities,
    );
    expect(groups.map((g) => g.facility.id)).toEqual(['F3', 'F1', 'F2']);
    expect(groups[1]?.providers.map((p) => p.name)).toEqual(['Adams', 'Zeller']);
  });

  it('drops providers whose facility is unknown', () => {
    expect(groupByFacility([provider('P1', 'X', 'NOPE')], [])).toEqual([]);
  });
});
