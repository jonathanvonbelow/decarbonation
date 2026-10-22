import { CONTROL_PARAMS } from '../../src/constants';
import { createInitialState, stepYear } from '../../src/sim';
import type { ControlParams, GameState, Indicators, Policy } from '../../src/types';
import { activatePolicies, freshLevelState, joinPacts } from '../../scripts/harness/runNiveles';
import { NIVELES_STRATEGIES, nivelesTax } from '../../scripts/harness/strategies';

/** Builds a fresh level-1 GameState, with the UI-only fields runSimulationRound also carries. */
export function freshState(level = 1): GameState {
  const { gameStatePatch } = createInitialState(level);
  return {
    ...gameStatePatch,
    finances: { pbi: gameStatePatch.indicators.pbi, treasuryReserves: gameStatePatch.indicators.treasuryReserves, debt: gameStatePatch.indicators.debt },
    gameLog: [],
    isSimulating: false,
    gameOverReason: null,
    loanRequestedThisRound: 0,
    currentEvent: null,
    newsHeadlines: [],
    wonLevels: [],
    _pendingLevelIntroTrigger: null,
  };
}

/** Returns a copy of `state` with the given policies switched on (mirrors togglePolicy's isActive+currentEfficiency reset). */
export function withActivePolicies(state: GameState, policyIds: Policy[]): GameState {
  const next = JSON.parse(JSON.stringify(state)) as GameState;
  policyIds.forEach((id) => {
    const p = next.policies[id];
    p.isActive = true;
    p.currentEfficiency = p.initialEfficiency ?? 1;
    if (p.instruments) {
      const ids = Object.keys(p.instruments);
      const share = ids.length > 0 ? 100 / ids.length : 0;
      ids.forEach((instId) => { p.instruments![instId].effortPercentage = share; });
      p.totalInstrumentEffortApplied = 100;
    }
  });
  return next;
}

/**
 * Plays `years` years of a canonical harness strategy (scripts/harness/strategies.ts) on `level` with
 * no events (`rng = () => 0.999`: in the prototype, `--golden` runs without rng), joining the
 * strategy's pacts as they unlock, and returns the final indicators. Used by the golden test of
 * model 2.0 (tests/sim/golden.v2.spec.ts, phase 35); stops early on game over, like the prototype.
 */
export function playLevel(level: number, strategyId: string, years: number, CP: ControlParams = CONTROL_PARAMS): Indicators {
  const strategy = NIVELES_STRATEGIES.find((s) => s.id === strategyId);
  if (!strategy) throw new Error(`unknown harness strategy: ${strategyId}`);
  let state = freshLevelState(level, CP);
  activatePolicies(state, strategy.ids, level, strategy.effort);
  state.additionalTaxPressurePercentage = nivelesTax(strategy, level);
  for (let y = 0; y < years && !state.gameOverReason; y++) {
    joinPacts(state, strategy, level);
    state = stepYear(state, () => 0.999, CP).next;
  }
  return state.indicators;
}
