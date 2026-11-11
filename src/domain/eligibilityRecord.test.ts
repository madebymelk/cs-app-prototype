import { describe, expect, it } from 'vitest';
import { NOW } from '@/test/factories';
import type { Facility, Provider } from './types';
import { evaluateControls, failedControls, type ControlInput } from './eligibilityRecord';

const facility: Facility = { id: 'F', name: 'Canyon Urgent Care', city: 'Tucson', state: 'AZ', zip: '85719', status: 'active' };
const provider: Provider = {
  id: 'P', name: 'Canyon Urgent Care', npi: '9000000000', tin: '990000000', specialty: 'Urgent care', taxonomy: '261QU0200X',
  placeOfService: 'Urgent care facility', facilityId: 'F', status: 'active', networkSource: 'CCN Region 3',
  enrollment: 'enrolled', attestation: 'current', updatedAt: NOW.toISOString(),
};
const today = NOW.toISOString().slice(0, 10);
const base: ControlInput = { kind: 'ucern', eligibility: 'eligible', provider, facility, dateOfService: today };

describe('evaluateControls', () => {
  it('passes every UCERN control for an eligible Veteran at an active, contracted urgent care today', () => {
    const r = evaluateControls(base, NOW);
    expect(r.map((x) => x.id)).toEqual(['eligibility', 'dateOfService', 'regionContract', 'placeOfService', 'facilityStatus', 'activeOnDos']);
    expect(failedControls(r)).toEqual([]);
  });

  it('names each failed control', () => {
    expect(failedControls(evaluateControls({ ...base, eligibility: 'unknown' }, NOW))).toEqual(['eligibility']);
    expect(failedControls(evaluateControls({ ...base, facility: { ...facility, status: 'inactive' } }, NOW))).toEqual(['facilityStatus']);
    expect(failedControls(evaluateControls({ ...base, provider: { ...provider, status: 'inactive' } }, NOW))).toEqual(['activeOnDos']);
    expect(failedControls(evaluateControls({ ...base, provider: { ...provider, networkSource: 'Out of network' } }, NOW))).toEqual(['regionContract']);
    expect(failedControls(evaluateControls({ ...base, provider: { ...provider, placeOfService: 'Office' } }, NOW))).toEqual(['placeOfService']);
  });

  it('allows a date of service up to 3 days back, never in the future or unreadable', () => {
    const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString().slice(0, 10);
    expect(failedControls(evaluateControls({ ...base, dateOfService: daysAgo(3) }, NOW))).toEqual([]);
    expect(failedControls(evaluateControls({ ...base, dateOfService: daysAgo(4) }, NOW))).toEqual(['dateOfService', 'activeOnDos']);
    expect(failedControls(evaluateControls({ ...base, dateOfService: daysAgo(-1) }, NOW))).toEqual(['dateOfService', 'activeOnDos']);
    expect(failedControls(evaluateControls({ ...base, dateOfService: 'not a date' }, NOW))).toEqual(['dateOfService', 'activeOnDos']);
  });

  it('VPERN requires a VA network source and a pharmacy', () => {
    const pharmacy = { ...provider, placeOfService: 'Pharmacy', networkSource: 'VA network' };
    expect(failedControls(evaluateControls({ ...base, kind: 'vpern', provider: pharmacy }, NOW))).toEqual([]);
    expect(failedControls(evaluateControls({ ...base, kind: 'vpern', provider: { ...pharmacy, networkSource: 'CCN Region 3' } }, NOW))).toEqual(['networkSource']);
  });

  it('fails provider controls when no provider or facility is chosen', () => {
    expect(failedControls(evaluateControls({ ...base, kind: 'vpern', provider: undefined, facility: undefined }, NOW))).toEqual([
      'regionContract', 'networkSource', 'placeOfService', 'facilityStatus', 'activeOnDos',
    ]);
  });
});
