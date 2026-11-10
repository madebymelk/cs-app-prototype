import { describe, expect, it } from 'vitest';
import { isRoleId, ROLE_IDS, ROLES } from './roles';

describe('roles', () => {
  it('lists the seven prototype roles', () => {
    expect(ROLE_IDS).toEqual(['csr', 'csr_plus', 'supervisor', 'manager', 'qa', 'trainer', 'admin']);
  });

  it('validates role IDs', () => {
    expect(isRoleId('qa')).toBe(true);
    expect(isRoleId('owner')).toBe(false);
    expect(isRoleId(3)).toBe(false);
  });

  it('shows the training banner for trainers only', () => {
    expect(ROLE_IDS.filter((r) => ROLES[r].trainingBanner)).toEqual(['trainer']);
  });
});
