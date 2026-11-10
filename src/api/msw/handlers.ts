import { delay, http, HttpResponse } from 'msw';
import { useDevStore } from '@/dev/devStore';
import type { HealthStatus } from '@/domain/types';
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

export const handlers = [
  http.get(`${API_BASE}/interactions/:id`, async ({ params }) => {
    await simulateLatency();
    const { scenario } = useDevStore.getState();
    if (scenario === 'screenPopFailed') return json({ error: 'Screen pop unavailable' }, 503);
    const interaction = mockDb.getInteraction(String(params.id));
    if (!interaction) return json({ error: 'Interaction not found' }, 404);
    return json(interaction);
  }),

  http.get(`${API_BASE}/health`, async () => {
    await delay(50);
    const { scenario } = useDevStore.getState();
    let body: HealthStatus = { status: 'healthy' };
    if (scenario === 'profileServiceDown') body = { status: 'degraded', sources: ['Veteran profile service'] };
    if (scenario === 'syncDelayed') body = { status: 'degraded', sources: ['ServiceNow sync'] };
    return json(body);
  }),
];
