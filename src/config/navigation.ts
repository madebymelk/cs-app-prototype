import type { RoleId } from '@/domain/types';
import { strings } from '@/content/strings';

/**
 * Provisional nav visibility by role. M1 replaces role lists with permission attributes from
 * src/config/permissions.ts (docs/01: use attributes, never title checks).
 */
export interface NavItem {
  to: string;
  label: string;
  roles: readonly RoleId[];
  end?: boolean;
}

const ALL: readonly RoleId[] = ['csr', 'csr_plus', 'supervisor', 'manager', 'qa', 'trainer', 'admin'];
const CASE_WORKERS: readonly RoleId[] = ['csr', 'csr_plus', 'supervisor', 'manager', 'qa', 'trainer'];

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: strings.nav.home, roles: ALL, end: true },
  { to: '/cases', label: strings.nav.cases, roles: CASE_WORKERS },
  { to: '/admin', label: strings.nav.admin, roles: ['admin'] },
];

export const canSearchCases = (role: RoleId) => CASE_WORKERS.includes(role);
export const navFor = (role: RoleId) => NAV_ITEMS.filter((i) => i.roles.includes(role));
