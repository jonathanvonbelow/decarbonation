/**
 * 3-level game runner for the balance harness (mejora-general/files/33_arnes_completo.md §2–4).
 * Plays one canonical strategy (strategies.ts) through one level with `stepYear`, the same engine
 * call the game makes in App.tsx `runSimulationRound`, and reports the end state as a `RunResult`.
 *
 * Player actions mirror what App.tsx lets a player do, not what the prototype does:
 *   - a policy is switched on like `togglePolicy` (isActive + currentEfficiency reset; at most
 *     MAX_ACTIVE_POLICIES), with instrument effort set like the instrument panel;
 *   - a pact is joined like `togglePact`: only once `year ≥ unlockYear`, paying `costToJoin` from
 *     reserves and only if reserves cover it (the prototype charges entry × GDP and may borrow);
 *   - the level-3 extra tax is `additionalTaxPressurePercentage`.
 * Events are drawn with `makeRng(seed, year)`, so a (strategy, level, seed) run is reproducible.
 */
import { CONTROL_PARAMS, INITIAL_YEAR, MAX_ACTIVE_POLICIES, YEARS_PER_LEVEL } from '../../src/constants';
import { createInitialState, evaluateLevel, gameOverKind, makeRng, stepMonth, stepYear, type Rng } from '../../src/sim';
import type { ControlParams, GameState, PolicyInstrument, PolicyState } from '../../src/types';
import type { RunResult, Snapshot } from './metrics';
import {
  EFFORT_ORDER, MAIN_ROUTES, PACT_BY_CODE, POLICY_BY_CODE, nivelesTax,
  type EffortVector, type NivelesStrategy, type PolicyCode,
} from './strategies';

/** Fresh GameState for a level, with the UI-only fields App.tsx also carries. */
export function freshLevelState(level: number, CP: ControlParams = CONTROL_PARAMS): GameState {
  const { gameStatePatch } = createInitialState(level, CP);
  return {
    ...gameStatePatch,
    finances: {
      pbi: gameStatePatch.indicators.pbi,
      treasuryReserves: gameStatePatch.indicators.treasuryReserves,
      debt: gameStatePatch.indicators.debt,
    },
    gameLog: [], isSimulating: false, gameOverReason: null, loanRequestedThisRound: 0,
    currentEvent: null, newsHeadlines: [], wonLevels: [], _pendingLevelIntroTrigger: null,
  };
}

/** Even split of a policy's instruments (the "parejo" 25/25/25/25 of 33 §3.1). */
function setEvenEffort(p: PolicyState): void {
  if (!p.instruments) return;
  const ids = Object.keys(p.instruments);
  const share = ids.length > 0 ? 100 / ids.length : 0;
  ids.forEach((id) => { p.instruments![id].effortPercentage = share; });
  p.totalInstrumentEffortApplied = ids.length > 0 ? 100 : 0;
}

function setEffortVector(p: PolicyState, code: PolicyCode, vector: EffortVector): void {
  const order = EFFORT_ORDER[code];
  if (!p.instruments || !order) return setEvenEffort(p);
  (Object.values(p.instruments) as PolicyInstrument[]).forEach((inst) => { inst.effortPercentage = 0; });
  order.forEach((id, i) => { if (p.instruments![id]) p.instruments![id].effortPercentage = vector[i] ?? 0; });
  p.totalInstrumentEffortApplied = Math.min(100,
    (Object.values(p.instruments) as PolicyInstrument[]).reduce((sum, inst) => sum + inst.effortPercentage, 0));
}

/**
 * Switches on `codes` like App.tsx `togglePolicy`. Level 1 has no instrument panel, so effort is
 * always even there (33 §3.1, fase 34 §3.2); from level 2 the strategy's effort vector applies.
 */
export function activatePolicies(
  state: GameState, codes: PolicyCode[], level: number, effort?: Partial<Record<PolicyCode, EffortVector>>,
): void {
  codes.forEach((code) => {
    const p = state.policies[POLICY_BY_CODE[code]];
    if (p.isActive) return;
    const active = (Object.values(state.policies) as PolicyState[]).filter((x) => x.isActive).length;
    if (active >= MAX_ACTIVE_POLICIES) return;
    p.isActive = true;
    p.currentEfficiency = p.initialEfficiency || 1;
    p.previousEfficiencyForNotification = p.currentEfficiency;
    const vector = level >= 2 ? effort?.[code] : undefined;
    if (vector) setEffortVector(p, code, vector);
    else setEvenEffort(p);
  });
}

/** Joins every pact of the list that is unlocked and affordable, like App.tsx `togglePact`. */
export function joinPacts(state: GameState, strategy: NivelesStrategy, level: number): void {
  if (level < 2) return;
  (strategy.pacts ?? []).forEach((code) => {
    const pact = state.pacts[PACT_BY_CODE[code]];
    if (!pact || pact.isActive || state.year < (pact.unlockYear ?? 0)) return;
    const cost = pact.costToJoin ?? 0;
    if (state.stellaSpecificState.Reservas_del_Tesoro < cost) return;
    pact.isActive = true;
    state.stellaSpecificState.Reservas_del_Tesoro -= cost;
  });
}

export function snapshotOf(state: GameState): Snapshot {
  const i = state.indicators;
  const st = state.stellaSpecificState;
  return {
    B: i.biodiversity,
    F: i.foodSecurity,
    E: i.economicSecurity,
    W: i.socialWellbeing,
    St: i.politicalStability,
    c: i.co2EqEmissionsPerCapita,
    // Same convention as winRoutes.ts debtToPbiRatio; the JSON report writes non-finite numbers as strings.
    DY: st.PBI_Real > 0 ? st.Deuda / st.PBI_Real : Infinity,
    score: i.generalScore,
  };
}

export function levelTargetYear(state: GameState, level: number): number {
  return state.activeLevelConfig?.targetYear ?? INITIAL_YEAR + YEARS_PER_LEVEL * level;
}

export function runNiveles(level: number, strategy: NivelesStrategy, seed: number, CP: ControlParams = CONTROL_PARAMS): RunResult {
  let state = freshLevelState(level, CP);
  activatePolicies(state, strategy.ids, level, strategy.effort);
  state.additionalTaxPressurePercentage = nivelesTax(strategy, level);
  const targetYear = levelTargetYear(state, level);

  while (state.year < targetYear && !state.gameOverReason) {
    joinPacts(state, strategy, level);
    state = stepYear(state, makeRng(seed, state.year + 1), CP).next;
  }

  const outcome = evaluateLevel(state, { ...state, indicators: state.levelBaseline });
  const over = !!state.gameOverReason;
  const met = over || !outcome.floorsMet ? [] : outcome.routes.filter((r) => r.met).map((r) => r.route.id as string);
  return {
    game: 'niveles',
    level,
    strategy: strategy.id,
    seed,
    won: !over && outcome.won,
    floorsMet: outcome.floorsMet,
    met,
    achieved: over ? null : outcome.achieved?.id ?? null,
    allRoutes: MAIN_ROUTES.every((r) => met.includes(r)),
    endYear: state.year,
    loss: over ? gameOverKind(state.gameOverReason) ?? 'other' : null,
    final: snapshotOf(state),
  };
}

/* ── Annual vs monthly consistency (33 §4; criterion C9, model 2.x only) ──────────────────── */

export interface ConsistencyRow { strategy: string; year: number; key: keyof Snapshot; annual: number; monthly: number; delta: number }

const NO_EVENTS: Rng = () => 0.999;
const CONSISTENCY_KEYS: (keyof Snapshot)[] = ['B', 'F', 'E', 'W', 'St', 'c'];

/**
 * Level 2, no events: `stepYear` against 12 × `stepMonth` from the same start, compared at years
 * 10 and 30. Only a criterion from model 2.0 on (phase 35); on 1.x it is reported for information.
 */
export function annualMonthlyConsistency(strategies: NivelesStrategy[], CP: ControlParams = CONTROL_PARAMS): ConsistencyRow[] {
  const rows: ConsistencyRow[] = [];
  const checkpoints = [10, 30];
  strategies.forEach((strategy) => {
    let annual = freshLevelState(2, CP);
    activatePolicies(annual, strategy.ids, 2, strategy.effort);
    // Both engines restore the pacts' `effects` functions from INITIAL_PACTS after their own clone.
    let monthly: GameState = JSON.parse(JSON.stringify(annual));
    let month = 0;
    for (let y = 1; y <= 30; y++) {
      annual = stepYear(annual, NO_EVENTS, CP).next;
      for (let m = 0; m < 12; m++) {
        const r = stepMonth(monthly, month, NO_EVENTS, CP);
        monthly = r.next;
        month = r.month;
      }
      if (checkpoints.includes(y)) {
        const a = snapshotOf(annual);
        const b = snapshotOf(monthly);
        CONSISTENCY_KEYS.forEach((key) => rows.push({ strategy: strategy.id, year: y, key, annual: a[key], monthly: b[key], delta: b[key] - a[key] }));
      }
    }
  });
  return rows;
}
