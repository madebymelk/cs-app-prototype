import { describe, expect, it } from 'vitest';
import { DEV_STORAGE_KEY, useDevStore } from './devStore';

describe('devStore', () => {
  it('persists scenario and latency to sessionStorage', () => {
    useDevStore.getState().setScenario('slowSources');
    useDevStore.getState().setLatency(1200);
    const saved = JSON.parse(sessionStorage.getItem(DEV_STORAGE_KEY) ?? '{}') as { state: Record<string, unknown> };
    expect(saved.state).toMatchObject({ scenario: 'slowSources', latencyMs: 1200 });
  });

  it('clamps latency to 0–5000 ms', () => {
    useDevStore.getState().setLatency(99_999);
    expect(useDevStore.getState().latencyMs).toBe(5000);
    useDevStore.getState().setLatency(-5);
    expect(useDevStore.getState().latencyMs).toBe(0);
  });
});
