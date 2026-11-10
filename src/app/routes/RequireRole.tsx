import type { ReactNode } from 'react';
import type { RoleId } from '@/domain/types';
import { useSession } from '../sessionStore';
import { AccessDeniedPage } from './AccessDeniedPage';

/** Route guard: a direct URL to a forbidden route shows Access denied (F3). M1/M9 move to permissions. */
export function RequireRole({ roles, thing, children }: { roles: readonly RoleId[]; thing: string; children: ReactNode }) {
  const roleId = useSession((s) => s.roleId);
  return roles.includes(roleId) ? children : <AccessDeniedPage thing={thing} />;
}
