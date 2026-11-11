import type {
  Claim,
  EdEvent,
  Eligibility,
  EligibilityRecord,
  PriorAuth,
  Referral,
  Rfs,
  UmReview,
} from '@/domain/types';
import { dateDaysAgo, hashString, mulberry32, pick, randDigits, randInt, type Rng } from './seed';

/** Synthetic, non-clinical authoritative records per Veteran. Deterministic per Veteran ID + kind. */
export const RECORD_KINDS = ['referrals', 'claims', 'cases', 'rfs', 'pa', 'um', 'ucern', 'vpern', 'ed'] as const;
export type RecordKind = (typeof RECORD_KINDS)[number];

const SPECIALTIES = ['Cardiology', 'Physical therapy', 'Orthopedics', 'Dermatology', 'Audiology', 'Optometry'];
const PROVIDERS = ['Desert Sky Cardiology', 'Riverbend Physical Therapy', 'Summit Orthopedic Group', 'Clearview Eye Care'];
const URGENT = ['QuickCare Urgent Care', 'Canyon Urgent Care', 'Lakeside Walk-in Clinic'];
const SERVICES = ['MRI, lumbar spine', 'Physical therapy, 12 visits', 'Hearing aid fitting', 'Sleep study'];

const rngFor = (veteranId: string, kind: string) => mulberry32(hashString(`${veteranId}:${kind}`));
const count = (rng: Rng, max: number) => randInt(rng, 0, max);

export function generateRecords(veteranId: string, kind: Exclude<RecordKind, 'cases'>, now: Date): unknown[] {
  const rng = rngFor(veteranId, kind);
  switch (kind) {
    case 'referrals':
      return Array.from({ length: count(rng, 3) + 1 }, (_, i): Referral => {
        const issued = randInt(rng, 5, 200);
        return {
          id: `REF-${randDigits(rng, 6)}`,
          number: `VA00${randDigits(rng, 8)}`,
          specialty: pick(rng, SPECIALTIES),
          status: i === 0 ? 'active' : pick(rng, ['scheduled', 'pending', 'expired'] as const),
          issuedOn: dateDaysAgo(now, issued),
          expiresOn: dateDaysAgo(now, issued - 180),
          providerName: pick(rng, PROVIDERS),
        };
      });
    case 'claims':
      return Array.from({ length: count(rng, 3) + 1 }, (): Claim => ({
        id: `CLM-${randDigits(rng, 6)}`,
        number: `2026${randDigits(rng, 4)}-${randDigits(rng, 4)}`,
        kind: pick(rng, ['medical', 'dental', 'pharmacy'] as const),
        status: pick(rng, ['received', 'inReview', 'paid', 'denied'] as const),
        serviceDate: dateDaysAgo(now, randInt(rng, 3, 120)),
        providerName: pick(rng, PROVIDERS),
      }));
    case 'rfs':
      return Array.from({ length: count(rng, 2) }, (): Rfs => ({
        id: `RFS-${randDigits(rng, 6)}`,
        number: `RFS-${randDigits(rng, 7)}`,
        specialty: pick(rng, SPECIALTIES),
        status: pick(rng, ['submitted', 'approved', 'returned'] as const),
        submittedOn: dateDaysAgo(now, randInt(rng, 2, 60)),
      }));
    case 'pa':
      return Array.from({ length: count(rng, 2) }, (): PriorAuth => ({
        id: `PA-${randDigits(rng, 6)}`,
        number: `PA-${randDigits(rng, 8)}`,
        service: pick(rng, SERVICES),
        status: pick(rng, ['pending', 'approved', 'denied'] as const),
        requestedOn: dateDaysAgo(now, randInt(rng, 2, 90)),
      }));
    case 'um':
      return Array.from({ length: count(rng, 2) + 1 }, (): UmReview => ({
        id: `UM-${randDigits(rng, 6)}`,
        number: `UM-${randDigits(rng, 7)}`,
        reviewType: pick(rng, ['Concurrent review', 'Retrospective review', 'Pre-service review']),
        status: pick(rng, ['inReview', 'complete'] as const),
        openedOn: dateDaysAgo(now, randInt(rng, 1, 45)),
      }));
    case 'ucern':
    case 'vpern':
      return Array.from({ length: count(rng, 1) }, (): EligibilityRecord => ({
        id: `${kind.toUpperCase()}-${randDigits(rng, 6)}`,
        kind,
        number: `${kind === 'ucern' ? 'UC' : 'VP'}-${randDigits(rng, 8)}`,
        facilityName: pick(rng, URGENT),
        status: pick(rng, ['active', 'expired'] as const),
        createdOn: dateDaysAgo(now, randInt(rng, 1, 30)),
      }));
    case 'ed':
      // Most Veterans have no ED events: this source usually answers with zero (empty, not an error).
      return Array.from({ length: rng() < 0.7 ? 0 : 1 }, (): EdEvent => ({
        id: `ED-${randDigits(rng, 6)}`,
        facilityName: pick(rng, ['Saint Agnes Medical Center', 'Mercy General Hospital']),
        arrivedOn: dateDaysAgo(now, randInt(rng, 1, 20)),
        notifiedWithin72h: rng() < 0.6,
      }));
  }
}

export function generateEligibility(veteranId: string, opts: { unknown?: boolean; source: string; now: Date }): Eligibility[] {
  const at = opts.now.toISOString();
  if (opts.unknown) {
    return [
      { type: 'communityCare', status: 'unknown', source: opts.source, updatedAt: at },
      { type: 'urgentCare', status: 'eligible', source: opts.source, updatedAt: at },
      { type: 'pharmacy', status: 'unavailable', source: opts.source, updatedAt: at },
      { type: 'dental', status: 'unknown', source: opts.source, updatedAt: at },
    ];
  }
  const rng = rngFor(veteranId, 'eligibility');
  return [
    { type: 'communityCare', status: 'eligible', source: opts.source, updatedAt: at },
    { type: 'urgentCare', status: 'eligible', source: opts.source, updatedAt: at },
    { type: 'pharmacy', status: pick(rng, ['eligible', 'pending'] as const), source: opts.source, updatedAt: at },
    { type: 'dental', status: pick(rng, ['notEligible', 'eligible'] as const), source: opts.source, updatedAt: at },
  ];
}
