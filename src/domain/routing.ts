import { CALL_REASON_RULES, isCallReason, type CallReasonRule, type CaseTypeId } from '@/config/caseTypes';
import type { Case, Interaction } from './types';

/** Routing uses the final reason only, never the dialed TFN (docs/01). */
export function ruleFor(finalReason: string | undefined): CallReasonRule | undefined {
  return isCallReason(finalReason) ? CALL_REASON_RULES[finalReason] : undefined;
}

export function caseTypeFor(finalReason: string | undefined): CaseTypeId | undefined {
  return ruleFor(finalReason)?.caseType;
}

export function requiredTemplateFor(finalReason: string | undefined): string | undefined {
  return ruleFor(finalReason)?.requiredTemplateId;
}

/**
 * Workgroup for a case. A manual choice is never overwritten by a rule. Returns undefined when no rule
 * applies, meaning the agent must pick one (manual fallback, docs/03 F5).
 */
export function assignWorkgroup(c: Pick<Case, 'finalReason' | 'workgroup'>): Case['workgroup'] {
  if (c.workgroup?.assignedBy === 'manual') return c.workgroup;
  const id = ruleFor(c.finalReason)?.workgroupId;
  return id ? { id, assignedBy: 'rule' } : undefined;
}

/** Final reason starts as the IVR initial reason when it is a known call reason; the agent can change it. */
export function initialFinalReason(interaction: Pick<Interaction, 'initialReason'>): string | undefined {
  return isCallReason(interaction.initialReason) ? interaction.initialReason : undefined;
}
