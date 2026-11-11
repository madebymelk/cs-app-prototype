import type { Escalation, WorkflowRef } from '@/domain/types';
import { apiGet, apiSend } from './client';

export const DOWNSTREAM_SOURCE = { escalations: 'Escalation service', workflows: 'Workflow service' } as const;

export const downstreamAdapter = {
  submitEscalation: (payload: { caseId: string; destination: string; templateId: string; fields: Record<string, string>; attachments: string[] }) =>
    apiSend<Pick<Escalation, 'externalId' | 'status' | 'owner' | 'lastSyncedAt'>>('POST', '/escalations', payload, DOWNSTREAM_SOURCE.escalations),
  refreshEscalation: (e: Escalation) =>
    apiGet<Pick<Escalation, 'status' | 'owner' | 'lastSyncedAt'>>(
      `/escalations/${encodeURIComponent(e.externalId ?? e.id)}?status=${e.status}`,
      DOWNSTREAM_SOURCE.escalations,
    ),
  startWorkflow: (caseId: string) =>
    apiSend<{ id: string; status: WorkflowRef['status'] }>('POST', '/workflows', { caseId }, DOWNSTREAM_SOURCE.workflows),
  refreshWorkflow: (w: WorkflowRef) =>
    apiGet<Pick<WorkflowRef, 'status' | 'owner' | 'blockedReason'>>(
      `/workflows/${encodeURIComponent(w.id)}?status=${w.status}`,
      DOWNSTREAM_SOURCE.workflows,
    ),
};
