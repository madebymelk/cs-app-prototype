import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Per-user UI preferences that persist across navigation and refresh (docs/03 F1). */
interface PrefsState {
  tableSort: Record<string, { key: string; dir: 'asc' | 'desc' }>;
  setTableSort: (id: string, sort: { key: string; dir: 'asc' | 'desc' }) => void;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      tableSort: {},
      setTableSort: (id, sort) => {
        set((s) => ({ tableSort: { ...s.tableSort, [id]: sort } }));
      },
    }),
    { name: 'cs-prefs', storage: createJSONStorage(() => sessionStorage) },
  ),
);
