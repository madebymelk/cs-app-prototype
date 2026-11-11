import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Per-user UI preferences that persist across navigation and refresh (docs/03 F1). */
import type { CaseSearchQuery } from '@/api/caseAdapter';

interface PrefsState {
  tableSort: Record<string, { key: string; dir: 'asc' | 'desc' }>;
  setTableSort: (id: string, sort: { key: string; dir: 'asc' | 'desc' }) => void;
  /** Case search filters and page, kept across navigation and refresh (docs/03 F6). */
  caseSearch: { query: CaseSearchQuery; expanded: boolean };
  setCaseSearch: (s: Partial<PrefsState['caseSearch']>) => void;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      tableSort: {},
      setTableSort: (id, sort) => {
        set((s) => ({ tableSort: { ...s.tableSort, [id]: sort } }));
      },
      caseSearch: { query: {}, expanded: false },
      setCaseSearch: (next) => {
        set((s) => ({ caseSearch: { ...s.caseSearch, ...next } }));
      },
    }),
    { name: 'cs-prefs', storage: createJSONStorage(() => sessionStorage) },
  ),
);
