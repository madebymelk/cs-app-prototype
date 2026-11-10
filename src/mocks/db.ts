import type { Channel, Interaction } from '@/domain/types';
import type { ScenarioId } from '@/dev/scenarios';
import { caseId, generateInteraction, hashString, mulberry32, pick } from './seed';
import { FIRST_NAMES, LAST_NAMES } from './names';

/**
 * In-browser mock database, persisted to sessionStorage so a reload keeps the simulated call.
 * Only mock handlers and the Dev Toolbar touch this module.
 */
const KEY = 'cs-mockdb';

interface Db {
  interactions: Record<string, Interaction>;
  counter: number;
}

function load(): Db {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Db;
  } catch {
    /* storage unavailable: start empty */
  }
  return { interactions: {}, counter: 0 };
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
      i.authState = 'failed';
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

export const mockDb = {
  createInteraction(opts: { channel: Channel; scenario: ScenarioId; now?: Date }): Interaction {
    const db = load();
    db.counter += 1;
    const rng = mulberry32(hashString(`${opts.scenario}:${String(db.counter)}:${String(Date.now())}`));
    const interaction = applyScenario(
      generateInteraction(rng, { channel: opts.channel, now: opts.now ?? new Date() }),
      opts.scenario,
      rng,
    );
    db.interactions[interaction.id] = interaction;
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
  reset() {
    sessionStorage.removeItem(KEY);
  },
};
