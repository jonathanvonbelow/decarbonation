/**
 * Synthetic players for the prediction-band measurement (mejora-general/files/33_arnes_completo.md §4).
 *
 * Player i (seed 10000 + i) plays one level with `stepYear`. At year 0 and then every 3–6 years
 * (drawn uniformly) it changes 1 or 2 policies: switches one on (if fewer than MAX_ACTIVE_POLICIES
 * are active) or one off (if its lock-in has passed, as App.tsx `togglePolicy` enforces). Effort is
 * always even, there are no pacts and no extra tax. Every simulated year records the change of
 * B, E and c, classified with the game's own band (`actualDirection`, predictions.ts), so the
 * report can say how often the honest answer to the prediction strip is "no change".
 */
import { CONTROL_PARAMS, MAX_ACTIVE_POLICIES, POLICY_LOCK_IN_DURATION } from '../../src/constants';
import { actualDirection, type PredictedIndicatorKey, type PredictionDirection } from '../../src/components/tutorial/predictions';
import { makeRng, stepYear } from '../../src/sim';
import type { ControlParams, GameState, PolicyInstrument, PolicyState } from '../../src/types';
import { activatePolicies, freshLevelState, levelTargetYear } from './runNiveles';
import { POLICY_BY_CODE, type PolicyCode } from './strategies';

export const RANDOM_PLAYER_SEED_BASE = 10000;

export interface YearChange { B: number; E: number; c: number }

export interface RandomPlayerRun {
  seed: number;
  changes: YearChange[];
  directions: { B: PredictionDirection[]; E: PredictionDirection[]; c: PredictionDirection[] };
}

const KEYS: { k: keyof YearChange; ind: PredictedIndicatorKey }[] = [
  { k: 'B', ind: 'biodiversity' },
  { k: 'E', ind: 'economicSecurity' },
  { k: 'c', ind: 'co2EqEmissionsPerCapita' },
];

const CODES = Object.keys(POLICY_BY_CODE) as PolicyCode[];

function deactivate(state: GameState, code: PolicyCode): void {
  const p = state.policies[POLICY_BY_CODE[code]];
  p.isActive = false;
  p.activationYear = undefined;
  if (p.instruments) {
    (Object.values(p.instruments) as PolicyInstrument[]).forEach((inst) => { inst.effortPercentage = 0; });
    p.totalInstrumentEffortApplied = 0;
  }
}

/** One policy change, chosen uniformly among the moves the game allows right now. */
function randomToggle(state: GameState, level: number, rnd: () => number, skip: Set<PolicyCode>): void {
  const active = (Object.values(state.policies) as PolicyState[]).filter((p) => p.isActive).length;
  const moves = CODES.filter((code) => {
    if (skip.has(code)) return false; // two changes in one decision never undo each other
    const p = state.policies[POLICY_BY_CODE[code]];
    if (!p.isActive) return active < MAX_ACTIVE_POLICIES;
    return p.activationYear === undefined || state.year >= p.activationYear + POLICY_LOCK_IN_DURATION;
  });
  if (moves.length === 0) return;
  const code = moves[Math.floor(rnd() * moves.length)];
  skip.add(code);
  if (state.policies[POLICY_BY_CODE[code]].isActive) deactivate(state, code);
  else activatePolicies(state, [code], level);
}

export function runRandomPlayer(level: number, i: number, CP: ControlParams = CONTROL_PARAMS): RandomPlayerRun {
  const seed = RANDOM_PLAYER_SEED_BASE + i;
  const rnd = makeRng(seed, -1); // decisions; events use makeRng(seed, year) as in runNiveles
  let state = freshLevelState(level, CP);
  const target = levelTargetYear(state, level);
  let nextDecision = state.year;
  const run: RandomPlayerRun = { seed, changes: [], directions: { B: [], E: [], c: [] } };

  while (state.year < target && !state.gameOverReason) {
    if (state.year >= nextDecision) {
      const n = 1 + Math.floor(rnd() * 2);
      const touched = new Set<PolicyCode>();
      for (let k = 0; k < n; k++) randomToggle(state, level, rnd, touched);
      nextDecision = state.year + 3 + Math.floor(rnd() * 4);
    }
    const before = state.indicators;
    state = stepYear(state, makeRng(seed, state.year + 1), CP).next;
    const after = state.indicators;
    const change = {} as YearChange;
    KEYS.forEach(({ k, ind }) => {
      change[k] = after[ind] - before[ind];
      run.directions[k].push(actualDirection(ind, before[ind], after[ind]));
    });
    run.changes.push(change);
  }
  return run;
}

export function runRandomPlayers(level: number, count: number, CP: ControlParams = CONTROL_PARAMS): RandomPlayerRun[] {
  return Array.from({ length: count }, (_, i) => runRandomPlayer(level, i, CP));
}
