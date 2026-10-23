/**
 * Territorio runner for the balance harness (mejora-general/files/33_arnes_completo.md §2–3.2).
 * Plays one canonical strategy (strategies.ts, = TERR_STRATEGIES of the prototype) for 360 months
 * through the real session API (`advanceMonth` and the player actions of src/territorio/session.ts),
 * so every rule of the preview applies: lock-ins, unlock years, treasury checks, the inbox.
 *
 * Order inside a month follows `play_territorio` in scripts/reference/modelo_v2.py: instrument
 * effort (from 2029), pacts, one public-use attempt every `every` months, extra tax (from 2035),
 * settle the inbox, then the month is simulated. Where the prototype and the session API differ
 * the session wins (00_INDICE_v6.md §2): a lot is whatever `declareUse` takes. Since phase 44 pacts, lots and paid
 * situation options follow the prototype's `pay()` (`payPublicInvestment`: reserves above the floor, then debt while
 * D/Y ≤ 0.6).
 */
import { canDeclare, gameOverKind, type PublicUse } from '../../src/sim';
import { evaluateTerritorio } from '../../src/territorio/routes';
import {
  advanceMonth, createSession, decideSituation, declareUse, setInstrumentEffort, setTaxPressure,
  SUSTAINED_REASONS, togglePact, togglePolicy, TOTAL_MONTHS, unlocks, type Session,
} from '../../src/territorio/session';
import { SITUATION_BY_ID } from '../../src/territorio/situations';
import type { PolicyInstrument } from '../../src/types';
import type { RunResult } from './metrics';
import { snapshotOf } from './runNiveles';
import { CONTROL_PARAMS } from '../../src/constants';
import type { ControlParams } from '../../src/types';
import {
  EFFORT_ORDER, MAIN_ROUTES, PACT_BY_CODE, POLICY_BY_CODE, type PolicyCode, type TerritorioStrategy,
} from './strategies';

/** Attempts per public-use declaration before giving up for this month (a parcel can be eligible
 *  on the map and still have no area left in the model: `declareUse` then says 'no-area'). */
const MAX_DECLARE_TRIES = 25;

function tryDeclare(s: Session, use: PublicUse, CP: ControlParams): Session | null {
  let tries = 0;
  for (const p of s.territory.parcels) {
    if (!canDeclare(s.territory, p.x, p.y, use)) continue;
    const r = declareUse(s, p.x, p.y, use, CP);
    if (!r.error) return r.session;
    if (r.error === 'no-fiscal-space' || ++tries >= MAX_DECLARE_TRIES) return null;
  }
  return null;
}

function applyEffort(s: Session, code: PolicyCode, vector: number[], CP: ControlParams): Session {
  const policy = POLICY_BY_CODE[code];
  const order = EFFORT_ORDER[code];
  const instruments = s.game.policies[policy]?.instruments;
  if (!order || !instruments) return s;
  // Zero everything first: setInstrumentEffort caps each instrument at what is left of 100 %.
  (Object.values(instruments) as PolicyInstrument[]).forEach((inst) => { s = setInstrumentEffort(s, policy, inst.id, 0, CP).session; });
  order.forEach((id, i) => { s = setInstrumentEffort(s, policy, id, vector[i] ?? 0, CP).session; });
  return s;
}

function settleInbox(s: Session, CP: ControlParams): Session {
  for (const item of [...s.open]) {
    const def = SITUATION_BY_ID[item.defId];
    if (!def) continue;
    for (const option of def.options) {
      const r = decideSituation(s, item.id, option.id, CP);
      if (!r.error) { s = r.session; break; }
    }
  }
  return s;
}

/** `CP` reaches every action and month; `createSession` itself always starts from CONTROL_PARAMS. */
export function playTerritorio(strategy: TerritorioStrategy, seed: number, CP: ControlParams = CONTROL_PARAMS): Session {
  let s = createSession(seed);
  strategy.ids.forEach((code) => { s = togglePolicy(s, POLICY_BY_CODE[code]).session; });
  let effortPending = strategy.effort ? Object.entries(strategy.effort) as [PolicyCode, number[]][] : [];
  const uses = [...(strategy.uses ?? [])];
  const every = strategy.every ?? 1;

  for (let m = 0; m < TOTAL_MONTHS && !s.outcome; m++) {
    if (effortPending.length > 0 && unlocks(s, CP).instruments) {
      effortPending.forEach(([code, vector]) => { s = applyEffort(s, code, vector, CP); });
      effortPending = [];
    }
    (strategy.pacts ?? []).forEach((code) => {
      const id = PACT_BY_CODE[code];
      const pact = s.game.pacts[id];
      if (pact && !pact.isActive && unlocks(s, CP).pact(id)) {
        const r = togglePact(s, id, CP);
        if (!r.error) s = r.session;
      }
    });
    if (uses.length > 0 && m % every === 0) {
      const declared = tryDeclare(s, uses[0], CP);
      if (declared) { s = declared; uses.shift(); }
    }
    if (strategy.taxFrom2035 && unlocks(s, CP).finance && s.game.additionalTaxPressurePercentage !== strategy.taxFrom2035) {
      s = setTaxPressure(s, strategy.taxFrom2035, CP).session;
    }
    if (strategy.settle === 'first') s = settleInbox(s, CP);
    s = advanceMonth(s, CP);
  }
  return s;
}

const SUSTAINED = new Set<string>(Object.values(SUSTAINED_REASONS));

export function runTerritorio(strategy: TerritorioStrategy, seed: number, CP: ControlParams = CONTROL_PARAMS): RunResult {
  const s = playTerritorio(strategy, seed, CP);
  const routes = s.outcome?.routes ?? evaluateTerritorio(s.game, { ...s.game, indicators: s.game.levelBaseline });
  const collapse = s.outcome?.kind === 'collapse' ? s.outcome.reason : null;
  const met = collapse || !routes.floorsMet ? [] : routes.routes.filter((r) => r.met).map((r) => r.route.id as string);
  const loss = collapse ? (SUSTAINED.has(collapse) ? 'sustained' : gameOverKind(collapse) ?? 'other') : null;
  return {
    game: 'territorio',
    level: 0,
    strategy: strategy.id,
    seed,
    won: s.outcome?.kind === 'won',
    floorsMet: routes.floorsMet,
    met,
    achieved: collapse ? null : routes.achieved?.id ?? null,
    allRoutes: MAIN_ROUTES.every((r) => met.includes(r)),
    endYear: s.game.year + s.month / 12,
    loss,
    final: snapshotOf(s.game),
  };
}
