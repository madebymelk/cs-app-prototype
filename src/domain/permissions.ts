import { PERMISSIONS, type PermissionAttribute, type PermissionSet } from '@/config/permissions';
import type { RoleId } from './types';

export function permissionsFor(role: RoleId): PermissionSet {
  return PERMISSIONS[role];
}

export function can(role: RoleId, attribute: PermissionAttribute): boolean {
  return PERMISSIONS[role][attribute];
}

export function canAny(role: RoleId, attributes: readonly PermissionAttribute[]): boolean {
  return attributes.some((a) => can(role, a));
}
