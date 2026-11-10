import type { Case, Channel, Interaction } from '@/domain/types';
import type { ScenarioId } from '@/dev/scenarios';
import { auditEvent } from '@/domain/audit';
import { caseId, generateInteraction, hashString, mulberry32, pick } from './seed';
import { FIRST_NAMES, LAST_NAMES } from './names';

/**
 * In-browser mock database, persisted to sessionStorage so a reload keeps the simulated call.
 * Only mock handlers and the Dev Toolbar touch this module.
 */
const KEY = 'cs-mockdb';
const PRIOR_AGENT = 'AGT-11873';

interface Db {
  interactions: Record<string, Interaction>;
  cases: Record<string, Case>;
  counter: number;
}

function load(): Db {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return { cases: {}, ...(JSON.parse(raw) as Partial<Db>) } as Db;
  } catch {
    /* storage unavailable: start empty */
  }
  return { interactions: {}, cases: {}, counter: 0 };
}

function save(db: Db) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* non-fatal in a prototype */
  }
}

/** Applies scenario variations to a freshly generated screen-pop payload. */
export function applyScenario(base: Interaction, scenario: ScenarioId, rng: () => number): Interaction {
  const i = structuredClone(base);
  switch (scenario) {
    case 'screenPopPartial':
      delete i.caller.name;
      delete i.initialReason;
      i.ivrHistory = ['Main menu'];
      break;
    case 'transferIn':
      i.transferredFrom = `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)} (Tier 1)`;
      i.caseIds = [caseId(rng)];
      i.authState = 'verified';
      break;
    case 'authFailed':
      i.authState = 'notVerified';
      break;
    case 'authorizedRepCaller':
      i.caller.type = 'authorizedRep';
      i.caller.name = `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`;
      i.authState = 'notVerified';
      break;
    case 'linkageFailed':
      i.linkageStatus = 'failed';
      break;
    default:
      break;
  }
  return i;
}

export function blankCase(fields: Partial<Case> & Pick<Case, 'id' | 'interactionId' | 'ownerId'>, now: Date): Case {
  return {
    status: 'draft',
    callerType: 'veteran',
    notes: '',
    typeFields: {},
    linked: [],
    escalations: [],
    workflows: [],
    correspondence: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    audit: [],
    ...fields,
  };
}

/** Shared caller/interaction context copied into every new case (docs/01). Nothing case-specific. */
export function sharedContext(i: Interaction): Partial<Case> {
  const veteranId = i.caller.identifiers.veteranId;
  const firstName = i.caller.name?.split(' ')[0];
  return {
    interactionId: i.id,
    callerType: i.caller.type,
    ...(firstName ? { callerFirstName: firstName } : {}),
    ...(veteranId ? { callerRef: veteranId } : {}),
    linked: veteranId ? [{ kind: 'veteran', refId: veteranId, label: 'Veteran', associatedBy: 'auto' }] : [],
  };
}

function seedScenarioCases(db: Db, i: Interaction, scenario: ScenarioId, rng: () => number, now: Date) {
  if (scenario === 'transferIn') {
    for (const id of i.caseIds) {
      db.cases[id] = blankCase(
        {
          ...sharedContext(i),
          id,
          interactionId: i.id,
          ownerId: PRIOR_AGENT,
          status: 'open',
          finalReason: 'referralVerification',
          workgroup: { id: 'WG-REFERRALS', assignedBy: 'rule' },
          notes: 'Caller asked about referral status. Transferring for an authorization question.',
          audit: [auditEvent(PRIOR_AGENT, 'case.created', { refIds: [id] }, now)],
        },
        new Date(now.getTime() - 4 * 60_000),
      );
    }
  }
  if (scenario === 'duplicateCase' && i.caller.identifiers.veteranId && i.initialReason) {
    const id = caseId(rng);
    const created = new Date(now.getTime() - 2 * 86_400_000);
    db.cases[id] = blankCase(
      {
        ...sharedContext(i),
        id,
        interactionId: 'INT-PRIOR1',
        ownerId: PRIOR_AGENT,
        status: 'closed',
        finalReason: i.initialReason,
        disposition: 'informationProvided',
        notes: 'Caller asked the same question two days ago. Information provided.',
        repeatContact: false,
      },
      created,
    );
  }
}

export const mockDb = {
  createInteraction(opts: { channel: Channel; scenario: ScenarioId; now?: Date }): Interaction {
    const db = load();
    db.counter += 1;
    const now = opts.now ?? new Date();
    const rng = mulberry32(hashString(`${opts.scenario}:${String(db.counter)}:${String(Date.now())}`));
    const interaction = applyScenario(generateInteraction(rng, { channel: opts.channel, now }), opts.scenario, rng);
    db.interactions[interaction.id] = interaction;
    seedScenarioCases(db, interaction, opts.scenario, rng, now);
    save(db);
    return interaction;
  },
  getInteraction(id: string): Interaction | undefined {
    return load().interactions[id];
  },
  endInteraction(id: string) {
    const db = load();
    const i = db.interactions[id];
    if (i) {
      i.endedAt = new Date().toISOString();
      save(db);
    }
  },
  casesForInteraction(interactionId: string): Case[] {
    return Object.values(load().cases)
      .filter((c) => c.interactionId === interactionId)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  },
  casesForCaller(callerRef: string): Case[] {
    return Object.values(load().cases)
      .filter((c) => c.callerRef === callerRef)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  },
  createCase(interactionId: string, fields: Partial<Case>, ownerId: string): Case | undefined {
    const db = load();
    const i = db.interactions[interactionId];
    if (!i) return undefined;
    db.counter += 1;
    const now = new Date();
    const id = caseId(mulberry32(hashString(`${interactionId}:${String(db.counter)}:${String(Date.now())}`)));
    const c = blankCase(
      { ...sharedContext(i), ...fields, id, interactionId, ownerId, audit: [auditEvent(ownerId, 'case.created', { refIds: [id] }, now)] },
      now,
    );
    db.cases[id] = c;
    i.caseIds = [...i.caseIds, id];
    save(db);
    return c;
  },
  getCase(id: string): Case | undefined {
    return load().cases[id];
  },
  saveCase(c: Case): Case {
    const db = load();
    db.cases[c.id] = c;
    save(db);
    return c;
  },
  reset() {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* storage unavailable */
    }
  },
};
