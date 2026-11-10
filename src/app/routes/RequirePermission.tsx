import type { ReactNode } from 'react';
import type { PermissionAttribute } from '@/config/permissions';
import { useAnyPermission } from '../usePermission';
import { AccessDeniedPage } from './AccessDeniedPage';

/** Route guard: a direct URL to a forbidden route shows Access denied (F3). */
export function RequirePermission({
  anyOf,
  thing,
  children,
}: {
  anyOf: readonly PermissionAttribute[];
  thing: string;
  children: ReactNode;
}) {
  return useAnyPermission(anyOf) ? children : <AccessDeniedPage thing={thing} />;
}
