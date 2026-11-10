import { strings } from '@/content/strings';
import type { PermissionAttribute } from './permissions';

/** Nav items show when the role has ANY of the listed attributes (docs/01: attributes, not titles). */
export interface NavItem {
  to: string;
  label: string;
  anyOf?: readonly PermissionAttribute[];
  end?: boolean;
}

/** Who can find cases: case workers plus oversight and QA roles (retrieve later, docs/01 journey step 9). */
export const CASE_SEARCH_ACCESS: readonly PermissionAttribute[] = ['canWorkCases', 'canViewTeam', 'canViewRecordings'];

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: strings.nav.home, end: true },
  { to: '/cases', label: strings.nav.cases, anyOf: CASE_SEARCH_ACCESS },
  { to: '/admin', label: strings.nav.admin, anyOf: ['canAdminister'] },
];
