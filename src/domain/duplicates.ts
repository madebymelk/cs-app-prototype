import { decisions } from '@/config/decisions';
import type { Case } from './types';

const DAY_MS = 86_400_000;

/**
 * Possible duplicates: same caller + same final reason within the configured window
 * (decisions.duplicateWindowDays). Discarded and canceled cases don't count. Newest first.
 */
export function findDuplicates(
  candidate: Pick<Case, 'id' | 'callerRef' | 'finalReason'>,
  priorCases: readonly Case[],
  now: Date,
  windowDays: number = decisions.duplicateWindowDays,
): Case[] {
  if (!candidate.callerRef || !candidate.finalReason) return [];
  const since = now.getTime() - windowDays * DAY_MS;
  return priorCases
    .filter(
      (c) =>
        c.id !== candidate.id &&
        c.callerRef === candidate.callerRef &&
        c.finalReason === candidate.finalReason &&
        c.status !== 'discarded' &&
        c.status !== 'canceled' &&
        Date.parse(c.createdAt) >= since &&
        Date.parse(c.createdAt) <= now.getTime(),
    )
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
