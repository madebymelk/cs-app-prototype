import type { HealthStatus, Interaction } from '@/domain/types';
import { apiGet } from './client';

export const SOURCES = { connect: 'Amazon Connect screen pop', health: 'System health' } as const;

export interface ScreenPop {
  interaction: Interaction;
  /** Screen-pop fields Connect should have sent but didn't (F2: partial pop lists missing fields). */
  missing: ('callerName' | 'initialReason')[];
}

export async function getScreenPop(id: string, signal?: AbortSignal): Promise<ScreenPop> {
  const interaction = await apiGet<Interaction>(`/interactions/${encodeURIComponent(id)}`, SOURCES.connect, { signal });
  const missing: ScreenPop['missing'] = [];
  if (!interaction.caller.name) missing.push('callerName');
  if (!interaction.initialReason) missing.push('initialReason');
  return { interaction, missing };
}

export function getHealth(signal?: AbortSignal): Promise<HealthStatus> {
  return apiGet<HealthStatus>('/health', SOURCES.health, { signal });
}
