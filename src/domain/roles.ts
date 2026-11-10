import type { Role, RoleId } from './types';

/** Prototype roles (docs/01). Permissions by attribute arrive in M1 (src/config/permissions.ts). */
export const ROLES: Record<RoleId, Role> = {
  csr: { id: 'csr', label: 'CSR', landingMode: 'agent' },
  csr_plus: { id: 'csr_plus', label: 'Advanced CSR (VA Platinum)', landingMode: 'agent' },
  supervisor: { id: 'supervisor', label: 'Supervisor', landingMode: 'supervisor' },
  manager: { id: 'manager', label: 'Manager', landingMode: 'manager' },
  qa: { id: 'qa', label: 'Quality auditor', landingMode: 'qa' },
  trainer: { id: 'trainer', label: 'Trainer', landingMode: 'agent', trainingBanner: true },
  admin: { id: 'admin', label: 'System administrator', landingMode: 'admin' },
};

export const ROLE_IDS = Object.keys(ROLES) as RoleId[];

export function isRoleId(value: unknown): value is RoleId {
  return typeof value === 'string' && value in ROLES;
}
