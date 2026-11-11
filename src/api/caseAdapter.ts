import type { CloseIssue } from '@/domain/closeValidation';
import type { Case, CaseSummary } from '@/domain/types';
import { ApiError, apiGet, apiSend } from './client';

export const CASE_SOURCE = 'Case service';

export interface CaseSearchQuery {
  q?: string;
  caseId?: string;
  from?: string;
  to?: string;
  owner?: string;
  status?: string;
  veteranId?: string;
  providerId?: string;
  vamc?: string;
  caseType?: string;
  reason?: string;
  disposition?: string;
  workgroup?: string;
  channel?: string;
  page?: number;
}

export interface CaseSearchResult {
  items: CaseSummary[];
  total: number;
  page: number;
  pageSize: number;
  tooMany: boolean;
  /** A source that didn't answer; results are partial. */
  partial?: string;
}

const qs = (q: object) =>
  new URLSearchParams(
    Object.entries(q)
      .filter(([, v]) => v !== undefined && String(v).trim() !== '')
      .map(([k, v]) => [k, String(v)]),
  ).toString();

export const caseAdapter = {
  search: (q: CaseSearchQuery, signal?: AbortSignal) => apiGet<CaseSearchResult>(`/cases?${qs(q)}`, CASE_SOURCE, { signal }),
  get: (id: string, signal?: AbortSignal) => apiGet<CaseSummary>(`/cases/${encodeURIComponent(id)}`, CASE_SOURCE, { signal }),
  listForInteraction: (interactionId: string, signal?: AbortSignal) =>
    apiGet<Case[]>(`/interactions/${encodeURIComponent(interactionId)}/cases`, CASE_SOURCE, { signal }),
  listForCaller: (callerRef: string, signal?: AbortSignal) =>
    apiGet<Case[]>(`/cases?callerRef=${encodeURIComponent(callerRef)}`, CASE_SOURCE, { signal }),
  create: (interactionId: string, fields: Partial<Case>, ownerId: string) =>
    apiSend<Case>('POST', `/interactions/${encodeURIComponent(interactionId)}/cases`, { fields, ownerId }, CASE_SOURCE),
  save: (c: Case) => apiSend<Case>('PATCH', `/cases/${encodeURIComponent(c.id)}`, c, CASE_SOURCE),
  close: (c: Case) => apiSend<Case>('POST', `/cases/${encodeURIComponent(c.id)}/close`, c, CASE_SOURCE),
  endInteraction: (interactionId: string) =>
    apiSend<{ ok: true }>('POST', `/interactions/${encodeURIComponent(interactionId)}/end`, {}, CASE_SOURCE),
};

/** Close issues the server returned with a 422, if that's what the error is. */
export function closeIssuesFrom(error: unknown): CloseIssue[] | undefined {
  if (error instanceof ApiError && error.status === 422) {
    const body = error.body as { issues?: CloseIssue[] } | undefined;
    return body?.issues;
  }
  return undefined;
}
