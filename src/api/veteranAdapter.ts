import type { Case, Eligibility, RecordList, Veteran } from '@/domain/types';
import type { RecordKind } from '@/mocks/records';
import { apiGet } from './client';
import { SOURCE_NAMES } from './sources';

export interface VeteranQuery {
  lastName?: string;
  dob?: string;
  ssnLast4?: string;
  icn?: string;
  memberId?: string;
}

const qs = (q: object) =>
  new URLSearchParams(Object.entries(q).filter(([, v]) => typeof v === 'string' && v.trim()) as [string, string][]).toString();

export const veteranAdapter = {
  search: (q: VeteranQuery, signal?: AbortSignal) => apiGet<Veteran[]>(`/veterans?${qs(q)}`, SOURCE_NAMES.profile, { signal }),
  get: (id: string, signal?: AbortSignal) =>
    apiGet<Veteran & { updatedAt: string }>(`/veterans/${encodeURIComponent(id)}`, SOURCE_NAMES.profile, { signal }),
  eligibility: (id: string, signal?: AbortSignal) =>
    apiGet<RecordList<Eligibility>>(`/veterans/${encodeURIComponent(id)}/eligibility`, SOURCE_NAMES.eligibility, { signal }),
  records: <T>(id: string, kind: RecordKind, signal?: AbortSignal) =>
    apiGet<RecordList<T>>(`/veterans/${encodeURIComponent(id)}/${kind}`, SOURCE_NAMES[kind], { signal }),
  priorCases: (id: string, signal?: AbortSignal) =>
    apiGet<RecordList<Case>>(`/veterans/${encodeURIComponent(id)}/cases`, SOURCE_NAMES.cases, { signal }),
};
