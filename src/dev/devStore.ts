import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ScenarioId } from './scenarios';

/** Prototype-only controls. Persisted per tab in sessionStorage (docs/05). Read by mock handlers. */
export interface DevState {
  scenario: ScenarioId;
  latencyMs: number;
  toolbarOpen: boolean;
  setScenario: (s: ScenarioId) => void;
  setLatency: (ms: number) => void;
  setToolbarOpen: (open: boolean) => void;
}

export const DEV_STORAGE_KEY = 'cs-dev';

export const useDevStore = create<DevState>()(
  persist(
    (set) => ({
      scenario: 'happyPath',
      latencyMs: 300,
      toolbarOpen: false,
      setScenario: (scenario) => { set({ scenario }); },
      setLatency: (latencyMs) => { set({ latencyMs: Math.max(0, Math.min(5000, Math.round(latencyMs))) }); },
      setToolbarOpen: (toolbarOpen) => { set({ toolbarOpen }); },
    }),
    { name: DEV_STORAGE_KEY, storage: createJSONStorage(() => sessionStorage) },
  ),
);
