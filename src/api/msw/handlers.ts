import { delay, http, HttpResponse } from 'msw';
import { useDevStore } from '@/dev/devStore';
import { validateClose } from '@/domain/closeValidation';
import type { Case, HealthStatus } from '@/domain/types';
import { mockDb } from '@/mocks/db';
import { API_BASE } from '../client';

let correlationCounter = 0;
export const correlationId = () => {
  correlationCounter += 1;
  return `COR-${Date.now().toString(36).toUpperCase()}-${String(correlationCounter).padStart(4, '0')}`;
};

/** Latency per the Dev Toolbar: base latency, or 3–12s per source under `slowSources`. */
async function simulateLatency() {
  const { scenario, latencyMs } = useDevStore.getState();
  await delay(scenario === 'slowSources' ? 3000 + Math.random() * 9000 : latencyMs);
}

const json = (body: object, status = 200) =>
  HttpResponse.json(body, { status, headers: { 'x-correlation-id': correlationId() } });

const scenario = () => useDevStore.getState().scenario;
const p = (path: string) => `*${API_BASE}${path}`;

export const handlers = [
  http.get(p('/interactions/:id'), async ({ params }) => {
    await simulateLatency();
    if (scenario() === 'screenPopFailed') return json({ error: 'Screen pop unavailable' }, 503);
    const interaction = mockDb.getInteraction(String(params.id));
    if (!interaction) return json({ error: 'Interaction not found' }, 404);
    return json(interaction);
  }),

  http.get(p('/interactions/:id/cases'), async ({ params }) => {
    await simulateLatency();
    if (!mockDb.getInteraction(String(params.id))) return json({ error: 'Interaction not found' }, 404);
    return json(mockDb.casesForInteraction(String(params.id)));
  }),

  http.post(p('/interactions/:id/cases'), async ({ params, request }) => {
    await simulateLatency();
    const body = (await request.json()) as { fields?: Partial<Case>; ownerId: string };
    const c = mockDb.createCase(String(params.id), body.fields ?? {}, body.ownerId);
    return c ? json(c, 201) : json({ error: 'Interaction not found' }, 404);
  }),

  http.post(p('/interactions/:id/end'), async ({ params }) => {
    await simulateLatency();
    mockDb.endInteraction(String(params.id));
    return json({ ok: true });
  }),

  http.get(p('/cases'), async ({ request }) => {
    await simulateLatency();
    const callerRef = new URL(request.url).searchParams.get('callerRef');
    return json(callerRef ? mockDb.casesForCaller(callerRef) : []);
  }),

  http.patch(p('/cases/:id'), async ({ params, request }) => {
    await simulateLatency();
    if (scenario() === 'autosaveFails') return json({ error: 'Case service unavailable' }, 503);
    const existing = mockDb.getCase(String(params.id));
    if (!existing) return json({ error: 'Case not found' }, 404);
    const body = (await request.json()) as Case;
    return json(mockDb.saveCase({ ...existing, ...body, id: existing.id }));
  }),

  /** Server re-validates (never trust the client): 422 with the same issues the UI shows. */
  http.post(p('/cases/:id/close'), async ({ params, request }) => {
    await simulateLatency();
    const existing = mockDb.getCase(String(params.id));
    if (!existing) return json({ error: 'Case not found' }, 404);
    const body = (await request.json()) as Case;
    const issues = validateClose(body);
    if (issues.length) return json({ issues }, 422);
    return json(mockDb.saveCase({ ...body, id: existing.id, status: 'closed' }));
  }),

  http.get(p('/health'), async () => {
    await delay(50);
    let body: HealthStatus = { status: 'healthy' };
    if (scenario() === 'profileServiceDown') body = { status: 'degraded', sources: ['Veteran profile service'] };
    if (scenario() === 'syncDelayed') body = { status: 'degraded', sources: ['ServiceNow sync'] };
    if (scenario() === 'autosaveFails') body = { status: 'degraded', sources: ['Case service'] };
    return json(body);
  }),
];
