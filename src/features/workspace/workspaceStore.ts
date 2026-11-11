import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { AUTH_CHECKS, type AuthCheckId } from '@/config/closeout';
import { isEmptyDraft, transition } from '@/domain/caseMachine';
import { assignWorkgroup, caseTypeFor } from '@/domain/routing';
import type { AuthState, Case, Interaction } from '@/domain/types';
import { PERMISSIONS } from '@/config/permissions';

export type SaveState =
  | { state: 'idle' }
  | { state: 'saving' }
  | { state: 'saved'; at: string }
  | { state: 'retrying' };

export interface AuthPanelState {
  state: AuthState;
  checks: Record<AuthCheckId, boolean>;
  /** Verified before the call reached the agent (IVR) vs by the agent. */
  verifiedBy?: 'ivr' | 'agent';
}

const noChecks = () => Object.fromEntries(AUTH_CHECKS.map((c) => [c, false])) as Record<AuthCheckId, boolean>;

/**
 * Live workspace state. Persisted to sessionStorage so a reload never loses case work (CLAUDE.md invariant).
 * Rules come from src/domain; this store only applies them.
 */
export interface WorkspaceState {
  cases: Record<string, Case>;
  order: Record<string, string[]>;
  active: Record<string, string | undefined>;
  save: Record<string, SaveState>;
  /** Fields changed since the last successful save (for the audit event; names only). */
  dirty: Record<string, string[]>;
  auth: Record<string, AuthPanelState>;
  dismissedDuplicates: Record<string, true>;
  ended: Record<string, true>;
  contextOpen: boolean;
  /** Veteran the agent identified when the screen pop couldn't (multiple match, partial pop). */
  veteranFor: Record<string, string>;
  /** Where the context panel is, per interaction, so Back and reloads restore it (docs/02 Drill-down). */
  contextNav: Record<string, ContextNav>;

  loadCases: (interactionId: string, cases: Case[]) => void;
  addCase: (c: Case) => void;
  applyServerCase: (c: Case) => void;
  setActive: (interactionId: string, caseId: string) => void;
  editCase: (caseId: string, patch: Partial<Case>, actorId: string, initialReason?: string) => void;
  replaceCase: (c: Case) => void;
  setSave: (caseId: string, s: SaveState) => void;
  clearDirty: (caseId: string, fields: string[]) => void;
  initAuth: (i: Interaction) => void;
  setAuth: (interactionId: string, next: Partial<AuthPanelState>) => void;
  dismissDuplicate: (caseId: string) => void;
  markEnded: (interactionId: string) => void;
  setContextOpen: (open: boolean) => void;
  setVeteran: (interactionId: string, veteranId: string) => void;
  setContextNav: (interactionId: string, nav: Partial<ContextNav>) => void;
}

export interface ContextNav {
  top: 'veteran' | 'provider';
  tab: string;
  detail?: { kind: string; id: string } | undefined;
}

export const DEFAULT_CONTEXT_NAV: ContextNav = { top: 'veteran', tab: 'referrals' };

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      cases: {},
      order: {},
      active: {},
      save: {},
      dirty: {},
      auth: {},
      dismissedDuplicates: {},
      ended: {},
      contextOpen: true,
      veteranFor: {},
      contextNav: {},

      loadCases: (interactionId, cases) => {
        set((s) => ({
          cases: { ...s.cases, ...Object.fromEntries(cases.map((c) => [c.id, c])) },
          order: { ...s.order, [interactionId]: cases.map((c) => c.id) },
          active: { ...s.active, [interactionId]: s.active[interactionId] ?? firstWorkable(cases)?.id },
        }));
      },

      addCase: (c) => {
        set((s) => ({
          cases: { ...s.cases, [c.id]: c },
          order: { ...s.order, [c.interactionId]: [...(s.order[c.interactionId] ?? []), c.id] },
          active: { ...s.active, [c.interactionId]: c.id },
        }));
      },

      /** Server echo after save: keep the agent's newer local edits, take server-owned fields. */
      applyServerCase: (c) => {
        const local = get().cases[c.id];
        set((s) => ({ cases: { ...s.cases, [c.id]: local ? { ...local, audit: c.audit } : c } }));
      },

      replaceCase: (c) => {
        set((s) => ({ cases: { ...s.cases, [c.id]: c } }));
      },

      setActive: (interactionId, caseId) => {
        set((s) => ({ active: { ...s.active, [interactionId]: caseId } }));
      },

      editCase: (caseId, patch, actorId, initialReason) => {
        const current = get().cases[caseId];
        if (!current) return;
        let next: Case = { ...current, ...patch, typeFields: { ...current.typeFields, ...patch.typeFields } };
        if ('finalReason' in patch) {
          const workgroup = assignWorkgroup(next);
          const caseType = caseTypeFor(next.finalReason);
          next = { ...next };
          if (workgroup) next.workgroup = workgroup;
          else delete next.workgroup;
          if (caseType) next.caseType = caseType;
          else delete next.caseType;
        }
        // A draft becomes Open as soon as it holds agent work (docs/01 lifecycle).
        if (next.status === 'draft' && !isEmptyDraft(next, initialReason)) {
          const r = transition(next, { type: 'start' }, { actorId, permissions: PERMISSIONS.csr });
          if (r.ok) next = r.value;
        }
        const fields = Object.keys(patch).filter((f) => f !== 'audit');
        set((s) => ({
          cases: { ...s.cases, [caseId]: next },
          dirty: { ...s.dirty, [caseId]: [...new Set([...(s.dirty[caseId] ?? []), ...fields])] },
        }));
      },

      setSave: (caseId, st) => {
        set((s) => ({ save: { ...s.save, [caseId]: st } }));
      },

      clearDirty: (caseId, fields) => {
        set((s) => ({ dirty: { ...s.dirty, [caseId]: (s.dirty[caseId] ?? []).filter((f) => !fields.includes(f)) } }));
      },

      initAuth: (i) => {
        if (get().auth[i.id]) return;
        const verified = i.authState === 'verified';
        set((s) => ({
          auth: {
            ...s.auth,
            [i.id]: verified
              ? { state: 'verified', checks: noChecks(), verifiedBy: 'ivr' }
              : { state: i.authState, checks: noChecks() },
          },
        }));
      },

      setAuth: (interactionId, next) => {
        set((s) => {
          const current = s.auth[interactionId] ?? { state: 'notVerified', checks: noChecks() };
          return { auth: { ...s.auth, [interactionId]: { ...current, ...next } } };
        });
      },

      dismissDuplicate: (caseId) => {
        set((s) => ({ dismissedDuplicates: { ...s.dismissedDuplicates, [caseId]: true } }));
      },

      markEnded: (interactionId) => {
        set((s) => ({ ended: { ...s.ended, [interactionId]: true } }));
      },

      setContextOpen: (contextOpen) => {
        set({ contextOpen });
      },

      setVeteran: (interactionId, veteranId) => {
        set((s) => ({ veteranFor: { ...s.veteranFor, [interactionId]: veteranId } }));
      },

      setContextNav: (interactionId, nav) => {
        set((s) => ({
          contextNav: { ...s.contextNav, [interactionId]: { ...DEFAULT_CONTEXT_NAV, ...s.contextNav[interactionId], ...nav } },
        }));
      },
    }),
    {
      name: 'cs-workspace',
      storage: createJSONStorage(() => sessionStorage),
      // Save status is transient; everything else survives a reload.
      partialize: ({ save: _save, ...rest }) => rest,
    },
  ),
);

export const resetAuthChecks = noChecks;

function firstWorkable(cases: Case[]): Case | undefined {
  return cases.find((c) => !['closed', 'discarded', 'canceled'].includes(c.status)) ?? cases[0];
}

export const casesFor = (s: WorkspaceState, interactionId: string): Case[] =>
  (s.order[interactionId] ?? []).flatMap((id) => (s.cases[id] ? [s.cases[id]] : []));
