import { STALE_AFTER_MINUTES } from '@/config/sources';

export function minutesSince(iso: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - Date.parse(iso)) / 60_000));
}

/** Stale = older than the configured threshold (docs/04: "Updated 14 min ago" + refresh). */
export function isStale(iso: string | undefined, now: Date, thresholdMinutes: number = STALE_AFTER_MINUTES): boolean {
  if (!iso) return false;
  return minutesSince(iso, now) > thresholdMinutes;
}
