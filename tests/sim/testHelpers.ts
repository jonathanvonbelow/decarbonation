import { createInitialState } from '../../src/sim';
import type { GameState, Policy } from '../../src/types';

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
