import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { RoleId } from '@/domain/types';

/**
 * The signed-in user. Real authentication is out of scope; the Dev Toolbar sets the role.
 * Product code reads this store and never reads the dev store.
 */
export interface SessionState {
  userId: string;
  displayName: string;
  roleId: RoleId;
  setRole: (roleId: RoleId) => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      userId: 'AGT-20417',
      displayName: 'Jordan Ellis',
      roleId: 'csr',
      setRole: (roleId) => { set({ roleId }); },
    }),
    { name: 'cs-session', storage: createJSONStorage(() => sessionStorage) },
  ),
);
