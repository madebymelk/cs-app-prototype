/** The only fetch wrapper. Adapters call it; components call adapters through TanStack Query. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly correlationId: string | undefined,
    readonly source: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const API_BASE = '/api';

export async function apiGet<T>(path: string, source: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    const headers = new Headers(init?.headers);
    headers.set('Accept', 'application/json');
    res = await fetch(new URL(`${API_BASE}${path}`, window.location.origin), { ...init, headers });
  } catch (e) {
    throw new ApiError(e instanceof Error ? e.message : 'Network error', 0, undefined, source);
  }
  const correlationId = res.headers.get('x-correlation-id') ?? undefined;
  if (!res.ok) throw new ApiError(`${source} responded ${String(res.status)}`, res.status, correlationId, source);
  return (await res.json()) as T;
}
