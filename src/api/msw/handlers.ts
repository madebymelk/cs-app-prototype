import { delay, http, HttpResponse } from 'msw';
import { useDevStore } from '@/dev/devStore';
import { validateClose } from '@/domain/closeValidation';
import type { Case, CaseSummary, HealthStatus } from '@/domain/types';
import { agentName } from '@/mocks/agents';
import { mockDb } from '@/mocks/db';
import { directory, searchProviders } from '@/mocks/providers';
import { generateEligibility, generateRecords, RECORD_KINDS, type RecordKind } from '@/mocks/records';
import { SOURCE_NAMES } from '../sources';
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
/** syncDelayed: downstream status sync is 47 minutes behind. */
const syncedAt = () => new Date(Date.now() - (scenario() === 'syncDelayed' ? 47 * 60_000 : 0)).toISOString();

const createdRecords = new Map<string, object>();

function summarize(c: Case, profileDown: boolean): CaseSummary {
  const v = profileDown || !c.callerRef ? undefined : mockDb.getVeteran(c.callerRef);
  const actorNames = Object.fromEntries(c.audit.map((a) => [a.actorId, agentName(a.actorId)]));
  return { ...c, ownerName: agentName(c.ownerId), actorNames, ...(v ? { callerName: `${v.firstName} ${v.lastName}` } : {}) };
}

const TERMINAL = ['closed', 'discarded', 'canceled'];
const PAGE_SIZE = 10;
const TOO_MANY = 30;

/** Mock case search (docs/03 F6). Newest first, paginated; partial results name the down source. */
function searchCases(q: Record<string, string>, profileDown: boolean) {
  const has = (k: string) => Boolean(q[k]?.trim());
  const text = q.q?.trim().toLowerCase();
  const from = has('from') ? Date.parse(`${q.from ?? ''}T00:00:00`) : undefined;
  const to = has('to') ? Date.parse(`${q.to ?? ''}T23:59:59`) : undefined;
  const matches = mockDb.allCases().filter((c) => {
    const created = Date.parse(c.createdAt);
    const v = c.callerRef ? mockDb.getVeteran(c.callerRef) : undefined;
    return (
      (!text || [c.id, c.callerRef, c.callerFirstName, v?.lastName, v ? `${v.firstName} ${v.lastName}` : undefined].some((x) => x?.toLowerCase().includes(text))) &&
      (!has('caseId') || c.id.toLowerCase().includes((q.caseId ?? '').trim().toLowerCase())) &&
      (from === undefined || created >= from) &&
      (to === undefined || created <= to) &&
      (!has('owner') || c.ownerId === q.owner) &&
      (!has('status') || (q.status === 'notClosed' ? !TERMINAL.includes(c.status) : c.status === q.status)) &&
      (!has('veteranId') || c.callerRef === q.veteranId?.trim()) &&
      (!has('providerId') || c.linked.some((l) => l.kind === 'provider' && l.refId === q.providerId?.trim())) &&
      (!has('vamc') || c.vamc === q.vamc) &&
      (!has('caseType') || c.caseType === q.caseType) &&
      (!has('reason') || c.finalReason === q.reason) &&
      (!has('disposition') || c.disposition === q.disposition) &&
      (!has('workgroup') || c.workgroup?.id === q.workgroup) &&
      (!has('channel') || c.channel === q.channel)
    );
  });
  const page = Math.max(1, Number(q.page ?? '1') || 1);
  return {
    items: matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((c) => summarize(c, profileDown)),
    total: matches.length,
    page,
    pageSize: PAGE_SIZE,
    tooMany: matches.length > TOO_MANY,
    ...(profileDown ? { partial: 'Veteran profile service' } : {}),
  };
}
const failedOnce = new Set<string>();

const ESCALATION_FLOW: Record<string, string> = { new: 'assigned', assigned: 'pending', pending: 'resolved', blocked: 'assigned' };
const ESCALATION_OWNERS: Record<string, string> = {
  new: 'VA CCN escalations queue',
  assigned: 'Claims research team',
  pending: 'Claims research team',
  resolved: 'Claims research team',
  slaRisk: 'Claims research team',
  blocked: 'Claims research team',
  rerouted: 'Provider services team',
};
const WORKFLOW_FLOW: Record<string, string> = { submitting: 'inProgress', inProgress: 'pendingAction', pendingAction: 'resolved', blocked: 'inProgress', slaRisk: 'pendingAction' };
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
    const params = new URL(request.url).searchParams;
    const callerRef = params.get('callerRef');
    if (callerRef) return json(mockDb.casesForCaller(callerRef));
    return json(searchCases(Object.fromEntries(params), scenario() === 'profileServiceDown'));
  }),

  http.get(p('/cases/:id'), async ({ params }) => {
    await simulateLatency();
    const c = mockDb.getCase(String(params.id));
    return c ? json(summarize(c, false)) : json({ error: 'Case not found' }, 404);
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

  // ---- Escalations (F14, F15) and workflows (F12) ----
  http.post(p('/escalations'), async ({ request }) => {
    await simulateLatency();
    if (scenario() === 'escalationSubmitFails') return json({ error: 'Destination unavailable' }, 502);
    const body = (await request.json()) as { destination: string; templateId: string };
    const n = String(Math.floor(1_000_000 + Math.random() * 8_999_999));
    const externalId = body.destination === 'servicenow' ? `INC${n}` : `MN-2026-${n.slice(0, 6)}`;
    return json({ externalId, status: 'new', owner: ESCALATION_OWNERS.new, lastSyncedAt: syncedAt() }, 201);
  }),

  // Stateless mock: the next status is derived from the current one, so "Refresh status" walks the lifecycle.
  http.get(p('/escalations/:id'), async ({ request }) => {
    await simulateLatency();
    const current = new URL(request.url).searchParams.get('status') ?? 'new';
    if (scenario() === 'syncDelayed') return json({ status: current, owner: ESCALATION_OWNERS[current] ?? ESCALATION_OWNERS.new, lastSyncedAt: syncedAt() });
    const next = ESCALATION_FLOW[current] ?? current;
    return json({ status: next, owner: ESCALATION_OWNERS[next], lastSyncedAt: syncedAt() });
  }),

  http.post(p('/workflows'), async () => {
    await simulateLatency();
    return json({ id: `WF-${String(Math.floor(100_000 + Math.random() * 899_999))}`, status: 'submitting' }, 201);
  }),

  http.get(p('/workflows/:id'), async ({ request }) => {
    await simulateLatency();
    const current = new URL(request.url).searchParams.get('status') ?? 'submitting';
    if (scenario() === 'escalationSubmitFails' && current === 'inProgress') {
      return json({ status: 'blocked', owner: 'Care coordination team', blockedReason: 'Referral number is missing from the intake. Add it to the case, then retry.' });
    }
    if (scenario() === 'syncDelayed' && current === 'inProgress') return json({ status: 'slaRisk', owner: 'Care coordination team' });
    const next = WORKFLOW_FLOW[current] ?? current;
    return json({ status: next, owner: next === 'submitting' ? undefined : 'Care coordination team' });
  }),

  // ---- UCERN / VPERN (F13): idempotent create; createRecordFails fails the first attempt per key ----
  http.post(p('/eligibility-records'), async ({ request }) => {
    await simulateLatency();
    const body = (await request.json()) as { idempotencyKey: string; kind: 'ucern' | 'vpern'; facilityName: string };
    const existing = createdRecords.get(body.idempotencyKey);
    if (existing) return json(existing); // a retry returns the same record: never a duplicate
    if (scenario() === 'createRecordFails' && !failedOnce.has(body.idempotencyKey)) {
      failedOnce.add(body.idempotencyKey);
      return json({ error: 'Eligibility record service unavailable' }, 503);
    }
    const n = String(Math.floor(10_000_000 + Math.random() * 89_999_999));
    const record = {
      id: `${body.kind.toUpperCase()}-${n.slice(0, 6)}`,
      kind: body.kind,
      number: `${body.kind === 'ucern' ? 'UC' : 'VP'}-${n}`,
      facilityName: body.facilityName,
      status: 'active',
      createdOn: new Date().toISOString().slice(0, 10),
    };
    createdRecords.set(body.idempotencyKey, record);
    return json(record, 201);
  }),

  // ---- Veteran profile (F7): every source answers independently ----
  http.get(p('/veterans'), async ({ request }) => {
    await simulateLatency();
    if (scenario() === 'profileServiceDown') return json({ error: 'Veteran profile service unavailable' }, 503);
    const params = Object.fromEntries(new URL(request.url).searchParams);
    return json(mockDb.searchVeterans(params));
  }),

  http.get(p('/veterans/:id'), async ({ params }) => {
    await simulateLatency();
    if (scenario() === 'profileServiceDown') return json({ error: 'Veteran profile service unavailable' }, 503);
    const v = mockDb.getVeteran(String(params.id));
    return v ? json({ ...v, updatedAt: new Date().toISOString() }) : json({ error: 'Veteran not found' }, 404);
  }),

  http.get(p('/veterans/:id/eligibility'), async ({ params }) => {
    await simulateLatency();
    if (scenario() === 'profileServiceDown') return json({ error: 'Eligibility service unavailable' }, 503);
    const now = new Date();
    return json({
      items: generateEligibility(String(params.id), { unknown: scenario() === 'eligibilityUnknown', source: SOURCE_NAMES.eligibility, now }),
      source: SOURCE_NAMES.eligibility,
      updatedAt: now.toISOString(),
    });
  }),

  http.get(p('/veterans/:id/:kind'), async ({ params }) => {
    await simulateLatency();
    const kind = String(params.kind) as RecordKind;
    if (!RECORD_KINDS.includes(kind)) return json({ error: 'Unknown record type' }, 404);
    const now = new Date();
    if (kind === 'cases') {
      return json({ items: mockDb.casesForCaller(String(params.id)), source: SOURCE_NAMES.cases, updatedAt: now.toISOString() });
    }
    // UM reports an old timestamp so the stale state is reachable (docs/04).
    const updatedAt = kind === 'um' ? new Date(now.getTime() - 14 * 60_000).toISOString() : now.toISOString();
    return json({ items: generateRecords(String(params.id), kind, now), source: SOURCE_NAMES[kind], updatedAt });
  }),

  // ---- Provider directory (F8) ----
  http.get(p('/providers'), async ({ request }) => {
    await simulateLatency();
    const q = Object.fromEntries(new URL(request.url).searchParams);
    return json(searchProviders(q, scenario() === 'providerAmbiguousInactive', scenario() === 'ucernControlFail'));
  }),

  http.get(p('/providers/:id'), async ({ params }) => {
    await simulateLatency();
    const { providers, facilities } = directory(scenario() === 'providerAmbiguousInactive', scenario() === 'ucernControlFail');
    const provider = providers.find((x) => x.id === String(params.id));
    if (!provider) return json({ error: 'Provider not found' }, 404);
    return json({ provider, facility: facilities.find((f) => f.id === provider.facilityId) });
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
