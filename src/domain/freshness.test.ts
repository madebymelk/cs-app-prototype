import { describe, expect, it } from 'vitest';
import { NOW } from '@/test/factories';
import { isStale, minutesSince } from './freshness';

const ago = (min: number) => new Date(NOW.getTime() - min * 60_000).toISOString();

describe('freshness', () => {
  it('counts whole minutes and never goes negative', () => {
    expect(minutesSince(ago(14.5), NOW)).toBe(14);
    expect(minutesSince(ago(-3), NOW)).toBe(0);
  });

  it('is stale only beyond the threshold (10 minutes by default)', () => {
    expect(isStale(ago(10), NOW)).toBe(false);
    expect(isStale(ago(11), NOW)).toBe(true);
    expect(isStale(ago(11), NOW, 30)).toBe(false);
  });

  it('treats a missing timestamp as not stale', () => {
    expect(isStale(undefined, NOW)).toBe(false);
  });
});
