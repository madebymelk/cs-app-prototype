import { describe, expect, it } from 'vitest';
import { completeCase, NOW } from '@/test/factories';
import { findDuplicates } from './duplicates';

const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();
const candidate = { id: 'NEW', callerRef: 'VET-1234567', finalReason: 'referralVerification' };

describe('findDuplicates', () => {
  it('finds same caller + same reason within the window, newest first', () => {
    const prior = [
      completeCase({ id: 'OLD', createdAt: daysAgo(6) }),
      completeCase({ id: 'RECENT', status: 'closed', createdAt: daysAgo(1) }),
    ];
    expect(findDuplicates(candidate, prior, NOW).map((c) => c.id)).toEqual(['RECENT', 'OLD']);
  });

  it('uses the configured window (7 days by default) and accepts an override', () => {
    const prior = [completeCase({ id: 'P', createdAt: daysAgo(8) })];
    expect(findDuplicates(candidate, prior, NOW)).toEqual([]);
    expect(findDuplicates(candidate, prior, NOW, 10)).toHaveLength(1);
  });

  it('ignores other callers, other reasons, itself, discarded/canceled and future-dated cases', () => {
    const prior = [
      completeCase({ id: 'A', callerRef: 'VET-7654321' }),
      completeCase({ id: 'B', finalReason: 'claimFiling' }),
      completeCase({ id: 'NEW' }),
      completeCase({ id: 'C', status: 'discarded' }),
      completeCase({ id: 'D', status: 'canceled' }),
      completeCase({ id: 'E', createdAt: daysAgo(-1) }),
    ];
    expect(findDuplicates(candidate, prior, NOW)).toEqual([]);
  });

  it('cannot detect duplicates without a caller or a reason', () => {
    const prior = [completeCase()];
    expect(findDuplicates({ ...candidate, callerRef: undefined }, prior, NOW)).toEqual([]);
    expect(findDuplicates({ ...candidate, finalReason: undefined }, prior, NOW)).toEqual([]);
  });
});
