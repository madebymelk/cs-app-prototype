import { describe, expect, it } from 'vitest';
import { completeCase, ctxFor, makeCase, makeEscalation, NOW } from '@/test/factories';
import { availableEvents, canEndInteraction, isEmptyDraft, transition, type CaseEvent } from './caseMachine';
import type { Case, CaseStatus } from './types';

const csr = ctxFor('csr');
const sup = ctxFor('supervisor');

function ok(c: Case, event: CaseEvent, ctx = csr): Case {
  const r = transition(c, event, ctx);
  if (!r.ok) throw new Error(`expected ok, got ${JSON.stringify(r.error)}`);
  return r.value;
}

describe('case lifecycle: happy path', () => {
  it('Draft → Open → PendingDownstream → Open → ReadyToClose → Closed', () => {
    let c = makeCase();
    c = ok(c, { type: 'start' });
    expect(c.status).toBe('open');
    c = ok({ ...c, ...completeCase({ status: 'open' }) }, { type: 'submitDownstream' });
    expect(c.status).toBe('pendingDownstream');
    c = ok(c, { type: 'downstreamResolved' });
    expect(c.status).toBe('open');
    c = ok(c, { type: 'markReady' });
    expect(c.status).toBe('readyToClose');
    c = ok(c, { type: 'close' });
    expect(c.status).toBe('closed');
  });

  it('closes directly from Open when complete', () => {
    expect(ok(completeCase(), { type: 'close' }).status).toBe('closed');
  });

  it('records an audit event and updatedAt on each transition, without mutating the input', () => {
    const before = makeCase();
    const after = ok(before, { type: 'start' });
    expect(before.status).toBe('draft');
    expect(before.audit).toHaveLength(0);
    expect(after.audit).toEqual([
      { at: NOW.toISOString(), actorId: 'AGT-20417', action: 'case.status.open', refIds: [before.id] },
    ]);
    expect(after.updatedAt).toBe(NOW.toISOString());
  });

  it('defaults the clock to now when none is given', () => {
    const r = transition(makeCase(), { type: 'start' }, { actorId: 'A', permissions: csr.permissions });
    expect(r.ok && Date.parse(r.value.updatedAt)).toBeGreaterThan(0);
  });
});

describe('case lifecycle: downstream failure', () => {
  it('a failed submit returns the case to Open with the error kept (never silently closed)', () => {
    const pending = ok(completeCase(), { type: 'submitDownstream' });
    const failed = ok(pending, { type: 'downstreamFailed', error: { message: 'ServiceNow 503', correlationId: 'COR-1' } });
    expect(failed.status).toBe('open');
    expect(failed.downstreamError).toEqual({ message: 'ServiceNow 503', correlationId: 'COR-1' });
  });

  it('a retry clears the previous error', () => {
    const failed = completeCase({ downstreamError: { message: 'x' } });
    expect(ok(failed, { type: 'submitDownstream' }).downstreamError).toBeUndefined();
    const resolved = ok(completeCase({ status: 'pendingDownstream', downstreamError: { message: 'x' } }), {
      type: 'downstreamResolved',
    });
    expect(resolved.downstreamError).toBeUndefined();
  });
});

describe('case lifecycle: guards', () => {
  it('blocks close and markReady while required fields are missing', () => {
    for (const type of ['close', 'markReady'] as const) {
      const r = transition(makeCase({ status: 'open' }), { type }, csr);
      expect(r.ok).toBe(false);
      if (!r.ok && r.error.code === 'closeBlocked') {
        expect(r.error.issues.map((i) => i.field)).toContain('finalReason');
      } else throw new Error('expected closeBlocked');
    }
  });

  it('blocks close while a required escalation template is incomplete', () => {
    const c = completeCase({ finalReason: 'claimFiling', typeFields: { claimNumber: '1', claimType: 'medical' } });
    const r = transition(c, { type: 'close' }, csr);
    expect(!r.ok && r.error.code).toBe('closeBlocked');
    const submitted = { ...c, escalations: [makeEscalation({ status: 'new', externalId: 'INC0012345' })] };
    expect(ok(submitted, { type: 'close' }).status).toBe('closed');
  });

  it('reopen is role-limited (supervisor only by default) and resumes to Open', () => {
    const closed = completeCase({ status: 'closed' });
    expect(transition(closed, { type: 'reopen' }, csr)).toEqual({
      ok: false,
      error: { code: 'notPermitted', permission: 'canReopen' },
    });
    const reopened = ok(closed, { type: 'reopen' }, sup);
    expect(reopened.status).toBe('reopened');
    expect(ok(reopened, { type: 'resume' }, sup).status).toBe('open');
  });

  it('cancel is role-limited', () => {
    const open = completeCase();
    expect(!transition(open, { type: 'cancel' }, csr).ok).toBe(true);
    expect(ok(open, { type: 'cancel' }, sup).status).toBe('canceled');
  });

  it('only empty drafts can be discarded', () => {
    expect(ok(makeCase(), { type: 'discard' }).status).toBe('discarded');
    const r = transition(makeCase({ notes: 'Caller asked about a referral' }), { type: 'discard' }, csr);
    expect(r).toEqual({ ok: false, error: { code: 'draftNotEmpty' } });
  });

  it('rejects transitions that are not allowed from the current status', () => {
    const invalid: [CaseStatus, CaseEvent['type']][] = [
      ['draft', 'close'],
      ['closed', 'start'],
      ['open', 'discard'],
      ['discarded', 'start'],
      ['canceled', 'reopen'],
      ['open', 'resume'],
    ];
    for (const [from, type] of invalid) {
      const r = transition(makeCase({ status: from }), { type } as CaseEvent, sup);
      expect(r).toEqual({ ok: false, error: { code: 'invalidTransition', from, event: type } });
    }
  });

  it('lists the events valid from a status', () => {
    expect(availableEvents('draft').sort()).toEqual(['discard', 'start']);
    expect(availableEvents('closed')).toEqual(['reopen']);
    expect(availableEvents('discarded')).toEqual([]);
  });
});

describe('isEmptyDraft', () => {
  it('is true for an untouched draft, including the IVR-prefilled reason and rule workgroup', () => {
    const c = makeCase({
      finalReason: 'referralVerification',
      workgroup: { id: 'WG-REFERRALS', assignedBy: 'rule' },
      linked: [{ kind: 'veteran', refId: 'VET-1', label: 'Veteran', associatedBy: 'auto' }],
      typeFields: { referralNumber: '  ' },
    });
    expect(isEmptyDraft(c, 'referralVerification')).toBe(true);
  });

  it.each<[string, Partial<Case>]>([
    ['notes', { notes: 'x' }],
    ['changed reason', { finalReason: 'claimFiling' }],
    ['disposition', { disposition: 'resolved' }],
    ['repeat contact', { repeatContact: true }],
    ['manual workgroup', { workgroup: { id: 'WG-CLAIMS', assignedBy: 'manual' } }],
    ['manual link', { linked: [{ kind: 'claim', refId: 'C1', label: 'Claim', associatedBy: 'manual' }] }],
    ['escalation', { escalations: [makeEscalation()] }],
    ['type field', { typeFields: { claimNumber: '123' } }],
  ])('is false once the agent adds %s', (_, overrides) => {
    expect(isEmptyDraft(makeCase(overrides), 'referralVerification')).toBe(false);
  });

  it('is false for any non-draft status', () => {
    expect(isEmptyDraft(makeCase({ status: 'open' }))).toBe(false);
  });
});

describe('canEndInteraction', () => {
  it('allows ending when every case is closed/terminal or an empty draft, and lists drafts to discard', () => {
    const cases = [
      completeCase({ id: 'A', status: 'closed' }),
      makeCase({ id: 'B', status: 'canceled' }),
      makeCase({ id: 'C', status: 'discarded' }),
      makeCase({ id: 'D' }),
    ];
    expect(canEndInteraction(cases)).toEqual({ ok: true, value: { discardIds: ['D'] } });
  });

  it('lists the cases that are still open', () => {
    const cases = [
      completeCase({ id: 'A', status: 'closed' }),
      completeCase({ id: 'B', status: 'pendingDownstream' }),
      makeCase({ id: 'C', notes: 'in progress' }),
    ];
    expect(canEndInteraction(cases)).toEqual({ ok: false, error: { openCaseIds: ['B', 'C'] } });
  });

  it('allows ending an interaction with no cases', () => {
    expect(canEndInteraction([])).toEqual({ ok: true, value: { discardIds: [] } });
  });
});
