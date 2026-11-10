import { describe, expect, it } from 'vitest';
import { applyScenario } from './db';
import { caseId, generateInteraction, hashString, icn, interactionId, mulberry32, npi } from './seed';

const now = new Date('2026-11-10T18:42:00Z');

describe('seeded generator', () => {
  it('is deterministic for the same seed', () => {
    const a = generateInteraction(mulberry32(42), { channel: 'voice', now });
    const b = generateInteraction(mulberry32(42), { channel: 'voice', now });
    expect(a).toEqual(b);
  });

  it('differs across seeds', () => {
    expect(interactionId(mulberry32(1))).not.toEqual(interactionId(mulberry32(2)));
  });

  it('produces IDs in the documented formats', () => {
    const rng = mulberry32(hashString('formats'));
    expect(interactionId(rng)).toMatch(/^INT-[A-Z0-9]{6}$/);
    expect(caseId(rng)).toMatch(/^CS-2026-\d{6}$/);
  });

  it('uses identifier ranges that real records do not use', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 50; i++) {
      expect(icn(rng)).toMatch(/^9999\d{6}V\d{6}$/);
      expect(npi(rng)).toMatch(/^9\d{9}$/);
    }
  });

  it('chat interactions carry no phone number', () => {
    expect(generateInteraction(mulberry32(3), { channel: 'chat', now }).caller.ani).toBeUndefined();
  });
});

describe('scenario variations', () => {
  const base = generateInteraction(mulberry32(9), { channel: 'voice', now });

  it('screenPopPartial drops caller name and IVR reason', () => {
    const i = applyScenario(base, 'screenPopPartial', mulberry32(1));
    expect(i.caller.name).toBeUndefined();
    expect(i.initialReason).toBeUndefined();
  });

  it('transferIn records the prior agent and their case', () => {
    const i = applyScenario(base, 'transferIn', mulberry32(1));
    expect(i.transferredFrom).toBeTruthy();
    expect(i.caseIds).toHaveLength(1);
  });

  it('does not mutate the base payload', () => {
    applyScenario(base, 'authFailed', mulberry32(1));
    expect(base.authState).toBe('verified');
  });
});
