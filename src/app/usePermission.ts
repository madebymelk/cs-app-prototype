import type { PermissionAttribute } from '@/config/permissions';
import { can, canAny } from '@/domain/permissions';
import { useSession } from './sessionStore';

/** True when the signed-in role has the attribute. Re-renders on role switch (no reload). */
export function usePermission(attribute: PermissionAttribute): boolean {
  return useSession((s) => can(s.roleId, attribute));
}

export function useAnyPermission(attributes: readonly PermissionAttribute[]): boolean {
  return useSession((s) => canAny(s.roleId, attributes));
}
