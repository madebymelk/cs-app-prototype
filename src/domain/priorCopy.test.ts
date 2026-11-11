import { describe, expect, it } from 'vitest';
import { completeCase, makeCase, NOW } from '@/test/factories';
import { copyFromPriorCase } from './priorCopy';

const prior = completeCase({
  id: 'CS-2026-000777',
  status: 'closed',
  finalReason: 'claimFiling',
  notes: 'Claim resubmitted with corrected date of service.',
  nextSteps: 'Caller to watch for EOB.',
  linked: [
    { kind: 'veteran', refId: 'VET-1', label: 'Veteran', associatedBy: 'auto' },
    { kind: 'claim', refId: 'CLM-9', label: 'Claim', associatedBy: 'manual' },
  ],
});

describe('copyFromPriorCase', () => {
  it('copies only what is selected and records an audit event', () => {
    const active = makeCase({ notes: '' });
    const r = copyFromPriorCase(active, prior, { notes: true }, 'AGT-1', NOW);
    expect(r?.patch).toEqual({ notes: 'From CS-2026-000777: Claim resubmitted with corrected date of service.' });
    expect(r?.audit).toEqual({
      at: NOW.toISOString(),
      actorId: 'AGT-1',
      action: 'case.copiedFrom',
      changedFields: ['notes'],
      refIds: [active.id, prior.id],
    });
  });

  it('appends to existing text instead of overwriting it', () => {
    const active = makeCase({ notes: 'Caller is following up.', nextSteps: 'Call back Friday.' });
    const r = copyFromPriorCase(active, prior, { notes: true, nextSteps: true }, 'A', NOW);
    expect(r?.patch.notes).toBe('Caller is following up.\n\nFrom CS-2026-000777: Claim resubmitted with corrected date of service.');
    expect(r?.patch.nextSteps).toBe('Call back Friday.\n\nFrom CS-2026-000777: Caller to watch for EOB.');
  });

  it('copies the final reason and merges linked records without duplicates, as manual links', () => {
    const active = makeCase({ linked: [{ kind: 'veteran', refId: 'VET-1', label: 'Veteran', associatedBy: 'auto' }] });
    const r = copyFromPriorCase(active, prior, { finalReason: true, linked: true }, 'A', NOW);
    expect(r?.patch.finalReason).toBe('claimFiling');
    expect(r?.patch.linked).toEqual([
      { kind: 'veteran', refId: 'VET-1', label: 'Veteran', associatedBy: 'auto' },
      { kind: 'claim', refId: 'CLM-9', label: 'Claim', associatedBy: 'manual' },
    ]);
  });

  it('never modifies the prior case', () => {
    const snapshot = structuredClone(prior);
    copyFromPriorCase(makeCase(), prior, { notes: true, nextSteps: true, finalReason: true, linked: true }, 'A', NOW);
    expect(prior).toEqual(snapshot);
  });

  it('returns nothing when the selection has nothing to copy', () => {
    const empty = makeCase({ id: 'CS-EMPTY', notes: ' ', linked: [] });
    expect(copyFromPriorCase(makeCase(), empty, { notes: true, nextSteps: true, finalReason: true, linked: true }, 'A', NOW)).toBeUndefined();
    expect(copyFromPriorCase(makeCase(), prior, {}, 'A', NOW)).toBeUndefined();
    const sameLinks = makeCase({ linked: prior.linked });
    expect(copyFromPriorCase(sameLinks, prior, { linked: true }, 'A', NOW)).toBeUndefined();
  });

  it('defaults the clock', () => {
    expect(copyFromPriorCase(makeCase(), prior, { notes: true }, 'A')?.audit.at).toBeTruthy();
  });
});
