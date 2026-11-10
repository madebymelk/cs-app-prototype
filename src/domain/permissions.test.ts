import { describe, expect, it } from 'vitest';
import { PERMISSION_ATTRIBUTES } from '@/config/permissions';
import { ROLE_IDS } from './roles';
import { can, canAny, permissionsFor } from './permissions';

describe('permissions matrix', () => {
  it('defines every attribute for every role', () => {
    for (const role of ROLE_IDS) {
      expect(Object.keys(permissionsFor(role)).sort()).toEqual([...PERMISSION_ATTRIBUTES].sort());
    }
  });

  it('reopen follows decisions.reopenRoles (supervisor only by default)', () => {
    expect(ROLE_IDS.filter((r) => can(r, 'canReopen'))).toEqual(['supervisor']);
  });

  it('admin administers but does no case work', () => {
    expect(can('admin', 'canAdminister')).toBe(true);
    expect(can('admin', 'canWorkCases')).toBe(false);
    expect(ROLE_IDS.filter((r) => can(r, 'canAdminister'))).toEqual(['admin']);
  });

  it('trainer has exactly the CSR attributes', () => {
    expect(permissionsFor('trainer')).toEqual(permissionsFor('csr'));
  });

  it('recordings are limited to QA and supervisors', () => {
    expect(ROLE_IDS.filter((r) => can(r, 'canViewRecordings'))).toEqual(['supervisor', 'qa']);
  });

  it('only advanced roles can override an escalation destination', () => {
    expect(can('csr', 'canOverrideDestination')).toBe(false);
    expect(can('csr_plus', 'canOverrideDestination')).toBe(true);
  });

  it('canAny is true when any attribute matches', () => {
    expect(canAny('qa', ['canWorkCases', 'canViewRecordings'])).toBe(true);
    expect(canAny('admin', ['canWorkCases', 'canViewTeam'])).toBe(false);
  });
});
