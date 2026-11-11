import type { ProviderQuery } from '@/domain/providerSearch';
import type { Facility, Provider } from '@/domain/types';
import { apiGet } from './client';
import { SOURCE_NAMES } from './sources';

const qs = (q: object) =>
  new URLSearchParams(Object.entries(q).filter(([, v]) => typeof v === 'string' && v.trim()) as [string, string][]).toString();

export const providerAdapter = {
  search: (q: ProviderQuery, signal?: AbortSignal) =>
    apiGet<{ providers: Provider[]; facilities: Facility[] }>(`/providers?${qs(q)}`, SOURCE_NAMES.providers, { signal }),
  get: (id: string, signal?: AbortSignal) =>
    apiGet<{ provider: Provider; facility?: Facility }>(`/providers/${encodeURIComponent(id)}`, SOURCE_NAMES.providers, { signal }),
};
