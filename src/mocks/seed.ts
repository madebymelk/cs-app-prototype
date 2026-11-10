import type { Channel, Interaction, Veteran } from '@/domain/types';
import { strings } from '@/content/strings';
import { FIRST_NAMES, IVR_REASONS, LAST_NAMES } from './names';

/**
 * Seeded synthetic data generator (docs/05). Deterministic for a given seed.
 * Identifiers are fabricated in ranges that real records don't use:
 * ICNs start 9999 and NPIs start 9 (real NPIs start 1 or 2).
 */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) throw new Error('pick() from an empty list');
  return item;
}
const int = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
const digits = (rng: Rng, n: number) => Array.from({ length: n }, () => int(rng, 0, 9)).join('');
const ALNUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const interactionId = (rng: Rng) =>
  `INT-${Array.from({ length: 6 }, () => ALNUM.charAt(Math.floor(rng() * ALNUM.length))).join('')}`;
export const caseId = (rng: Rng, year = 2026) => `CS-${year}-${digits(rng, 6)}`;
export const contactId = (rng: Rng) =>
  `${digits(rng, 8)}-${digits(rng, 4)}-${digits(rng, 4)}-${digits(rng, 4)}-${digits(rng, 12)}`;
export const icn = (rng: Rng) => `9999${digits(rng, 6)}V${digits(rng, 6)}`;
export const npi = (rng: Rng) => `9${digits(rng, 9)}`;
export const ani = (rng: Rng) => `(555) 01${digits(rng, 1)}-${digits(rng, 4)}`; // 555-01xx: reserved fictional

export function generateVeteran(rng: Rng): Veteran {
  const year = int(rng, 1940, 1998);
  return {
    id: `VET-${digits(rng, 7)}`,
    firstName: pick(rng, FIRST_NAMES),
    lastName: pick(rng, LAST_NAMES),
    dob: `${year}-${String(int(rng, 1, 12)).padStart(2, '0')}-${String(int(rng, 1, 28)).padStart(2, '0')}`,
    gender: pick(rng, ['Female', 'Male']),
    memberId: `M${digits(rng, 9)}`,
    ssnLast4: digits(rng, 4),
    icn: icn(rng),
  };
}

export function generateInteraction(rng: Rng, opts: { channel: Channel; now: Date }): Interaction {
  const vet = generateVeteran(rng);
  const reason = pick(rng, IVR_REASONS);
  return {
    id: interactionId(rng),
    contactId: contactId(rng),
    channel: opts.channel,
    startedAt: opts.now.toISOString(),
    caller: {
      type: 'veteran',
      name: `${vet.firstName} ${vet.lastName}`,
      ...(opts.channel === 'voice' ? { ani: ani(rng) } : {}),
      identifiers: { veteranId: vet.id, ssnLast4: vet.ssnLast4 },
    },
    authState: 'verified',
    initialReason: reason,
    ivrHistory: ['Main menu', 'Veteran', strings.callReasons[reason]],
    caseIds: [],
    linkageStatus: 'ok',
  };
}
