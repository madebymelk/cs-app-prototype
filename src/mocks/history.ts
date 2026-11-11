import type { Case, Escalation, Veteran } from '@/domain/types';
import { CALL_REASONS, CALL_REASON_RULES, CASE_TYPE_FIELDS, type CallReasonId } from '@/config/caseTypes';
import { auditEvent } from '@/domain/audit';
import { AGENTS, CURRENT_AGENT } from './agents';
import { generateVeteran, mulberry32, pick, randDigits, randInt } from './seed';

/**
 * Synthetic case history over the past five weeks, so search, landing and supervisor views have real-looking
 * data. Deterministic per day, relative to "now". Includes yesterday's cases and the current agent's open work.
 */
const NOTES: Record<CallReasonId, string[]> = {
  referralVerification: ['Confirmed the referral is active and the appointment is scheduled.', 'Referral expired; explained how to request a new one through the VA facility.'],
  eligibilityConfirmation: ['Confirmed community care eligibility for physical therapy.', 'Eligibility pending a decision; told the caller to expect a letter.'],
  urgentCareReferral: ['Explained urgent care benefit and in-network locations near the caller.', 'Created UCERN for same-day urgent care visit.'],
  claimFiling: ['Provider says the claim was denied for timely filing; sent for claim research.', 'Explained how to submit the claim with the referral number.'],
  pharmacyClaim: ['Pharmacy rejected the urgent care prescription; confirmed VPERN and asked pharmacy to resubmit.', 'Caller asked about reimbursement for a prescription paid out of pocket.'],
  escalationFollowUp: ['Followed up on ServiceNow ticket; still with the claims research team.', 'Caller asked for status of an earlier escalation; gave the ticket number.'],
  providerEnrollment: ['Provider asked how to join the network; gave the network administrator contact.', 'Provider enrollment is pending; explained next steps.'],
};
const DISPOSITIONS = ['resolved', 'informationProvided', 'escalated', 'callbackScheduled'];
const VAMCS = ['Tucson VAMC', 'Dayton VAMC', 'Asheville VAMC', 'Boise VAMC'];

export function buildHistory(now: Date): { cases: Case[]; veterans: Veteran[] } {
  const rng = mulberry32(4242);
  const veterans = Array.from({ length: 18 }, () => generateVeteran(rng));
  const agentIds = Object.keys(AGENTS);
  const cases: Case[] = [];
  for (let i = 0; i < 44; i++) {
    const daysAgo = i < 6 ? 1 : randInt(rng, 0, 35); // six cases yesterday
    const created = new Date(now.getTime() - daysAgo * 86_400_000 - randInt(rng, 1, 9) * 3_600_000);
    const vet = pick(rng, veterans);
    const reason = pick(rng, CALL_REASONS);
    const rule = CALL_REASON_RULES[reason];
    const owner = i % 4 === 0 || i < 3 ? CURRENT_AGENT : pick(rng, agentIds);
    const open = i < 3 || rng() < 0.18;
    const id = `CS-2026-${randDigits(rng, 6)}`;
    const typeFields = Object.fromEntries(
      CASE_TYPE_FIELDS[rule.caseType].requiredFields.map((f) => [f, f === 'claimType' ? 'medical' : f === 'eligibilityType' ? 'community care' : randDigits(rng, 10)]),
    );
    const escalations: Escalation[] =
      rule.requiredTemplateId || reason === 'escalationFollowUp'
        ? [{
            id: `ESC-${randDigits(rng, 6)}`,
            destination: 'servicenow',
            templateId: rule.requiredTemplateId ?? 'snow-general',
            externalId: `INC${randDigits(rng, 7)}`,
            status: i % 5 === 0 ? 'slaRisk' : open ? 'assigned' : 'resolved',
            owner: 'Claims research team',
            fields: {},
            createdAt: created.toISOString(),
            lastSyncedAt: new Date(now.getTime() - randInt(rng, 2, 50) * 60_000).toISOString(),
          }]
        : [];
    const at = created.toISOString();
    cases.push({
      id,
      interactionId: `INT-H${randDigits(rng, 5)}`,
      status: open ? (escalations.length ? 'pendingDownstream' : 'open') : 'closed',
      caseType: rule.caseType,
      callerType: rng() < 0.85 ? 'veteran' : 'authorizedRep',
      callerFirstName: vet.firstName,
      callerRef: vet.id,
      finalReason: reason,
      ...(open ? {} : { disposition: pick(rng, DISPOSITIONS) }),
      notes: pick(rng, NOTES[reason]),
      repeatContact: rng() < 0.25,
      ...(rule.workgroupId ? { workgroup: { id: rule.workgroupId, assignedBy: 'rule' as const } } : { workgroup: { id: 'WG-ESCALATIONS', assignedBy: 'manual' as const } }),
      typeFields,
      channel: rng() < 0.8 ? 'voice' : 'chat',
      vamc: pick(rng, VAMCS),
      linked: [{ kind: 'veteran', refId: vet.id, label: 'Veteran', associatedBy: 'auto' }],
      escalations,
      workflows: [],
      correspondence: [],
      ownerId: owner,
      createdAt: at,
      updatedAt: new Date(created.getTime() + 11 * 60_000).toISOString(),
      audit: [
        auditEvent(owner, 'case.created', { refIds: [id] }, created),
        auditEvent(owner, 'case.updated', { changedFields: ['finalReason', 'notes'], refIds: [id] }, new Date(created.getTime() + 4 * 60_000)),
        ...(escalations.length ? [auditEvent(owner, 'escalation.submitted', { refIds: [id, escalations[0]?.externalId ?? ''] }, new Date(created.getTime() + 8 * 60_000))] : []),
        ...(open ? [] : [auditEvent(owner, 'case.status.closed', { refIds: [id] }, new Date(created.getTime() + 11 * 60_000))]),
      ],
    });
  }
  return { cases, veterans };
}
