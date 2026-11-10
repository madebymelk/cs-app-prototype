import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { caseAdapter } from '@/api/caseAdapter';
import { decisions } from '@/config/decisions';
import type { Interaction } from '@/domain/types';
import { addCase } from './actions';
import { useWorkspace } from './workspaceStore';

const creating = new Set<string>();

/**
 * Cases for an interaction. Local work in the store wins over the server (a reload never loses edits).
 * With decisions.initialCaseMode = 'autoDraft' an interaction with no cases gets a Draft from the IVR reason.
 */
export function useInteractionCases(interaction: Interaction | undefined, enabled: boolean) {
  const id = interaction?.id ?? '';
  const known = useWorkspace((s) => Boolean(s.order[id]));
  const query = useQuery({
    queryKey: ['interactionCases', id],
    queryFn: ({ signal }) => caseAdapter.listForInteraction(id, signal),
    enabled: enabled && Boolean(interaction) && !known,
    retry: false,
  });

  useEffect(() => {
    if (!interaction || known || !query.data) return;
    useWorkspace.getState().loadCases(interaction.id, query.data);
    if (query.data.length === 0 && decisions.initialCaseMode === 'autoDraft' && !creating.has(interaction.id)) {
      creating.add(interaction.id);
      void addCase(interaction, true).finally(() => creating.delete(interaction.id));
    }
  }, [interaction, known, query.data]);

  return { ready: known, loading: !known && query.isPending && enabled, error: query.error, retry: () => void query.refetch() };
}
