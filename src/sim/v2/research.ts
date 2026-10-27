/**
 * Phase 48 — research indices of a session (mejora-general/files/48_prediccion_e_indices.md §2–3).
 *
 * The prototype (scripts/reference/modelo_v2.py) implements none of this (no prediction bands, Brier scores or
 * regret): everything here is defined by the spec and computed with the TS engine.
 *
 * - Prediction skill: categorical Brier score of a deterministic prediction (0 hit, 2 miss), of the persistence
 *   baseline (last year's actual direction) and of the climatology baseline (the level's a-priori proportions, a
 *   probabilistic forecast); skill SS = 1 − mean(Brier_player) / mean(Brier_baseline).
 * - Regret: from the state about to be stepped, simulate one year (same seed for every alternative) of the player's
 *   portfolio and of every neighbour portfolio (switch one policy on or off, respecting the maximum and the lock-in);
 *   regret = max(S over all) − S_player ≥ 0.
 * - Safe-and-just gap, resilience after shocks, carbon budget used, land concentration G and just transition J (phase
 *   45), policy entropy and reversals: accumulated step by step in a JSON-serialisable `ResearchTracker`.
 *
 * Pure: no React, no Math.random / Date.now (the regret takes a seed), never mutates its inputs.
 */
import { MAX_ACTIVE_POLICIES, POLICY_LOCK_IN_DURATION } from '../../constants';
import type { ControlParams, GameState, Policy, PolicyInstrument, PolicyState } from '../../types';
import { evenEffort } from '../policies';
import { makeRng, type Rng } from '../rng';
import { carbonBudgetIndex } from './carbon';
import { advanceYear } from './core';
import { PARAMS_V2 } from './params';
import { baseEfficiency, fatigueFactor } from './policies';
import { landConcentration } from './social';

export type Direction = 'down' | 'flat' | 'up';
export type DirectionProbabilities = Record<Direction, number>;

/* ── Prediction skill (§2) ─────────────────────────────────────────────────────────────────── */

/** Categorical Brier score (3 classes) of a deterministic prediction: 0 if it hits, 2 if it misses. */
export function brierDeterministic(predicted: Direction, actual: Direction): number {
  return predicted === actual ? 0 : 2;
}

/** Categorical Brier score of a probabilistic forecast: Σ_k (p_k − o_k)². */
export function brierProbabilistic(p: DirectionProbabilities, actual: Direction): number {
  return (['down', 'flat', 'up'] as const).reduce((sum, k) => sum + (p[k] - (k === actual ? 1 : 0)) ** 2, 0);
}

const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/**
 * Skill score 1 − mean(player) / mean(baseline). > 0: the player beats the baseline. A perfect baseline (mean 0)
 * gives 0 if the player is perfect too and −∞ otherwise; null when there are no items.
 */
export function skillScore(player: number[], baseline: number[]): number | null {
  if (player.length === 0 || baseline.length === 0) return null;
  const b = mean(baseline);
  const p = mean(player);
  if (b === 0) return p === 0 ? 0 : -Infinity;
  return 1 - p / b;
}

export interface PredictionItem {
  predicted: Direction;
  actual: Direction;
  /** Persistence baseline: the actual direction of the previous year for that indicator. */
  persistence: Direction;
  /** Climatology baseline: the a-priori proportions of the level and indicator. */
  climatology: DirectionProbabilities;
}

export interface PredictionSkill {
  n: number;
  accuracy: number | null;
  accuracyPersistence: number | null;
  skillPersistence: number | null;
  skillClimatology: number | null;
}

export function predictionSkill(items: PredictionItem[]): PredictionSkill {
  if (items.length === 0) return { n: 0, accuracy: null, accuracyPersistence: null, skillPersistence: null, skillClimatology: null };
  const player = items.map((i) => brierDeterministic(i.predicted, i.actual));
  return {
    n: items.length,
    accuracy: items.filter((i) => i.predicted === i.actual).length / items.length,
    accuracyPersistence: items.filter((i) => i.persistence === i.actual).length / items.length,
    skillPersistence: skillScore(player, items.map((i) => brierDeterministic(i.persistence, i.actual))),
    skillClimatology: skillScore(player, items.map((i) => brierProbabilistic(i.climatology, i.actual))),
  };
}

/* ── Regret (§3) ───────────────────────────────────────────────────────────────────────────── */

export interface RegretOptions {
  /** Advances the state one year with the given rng; default: the 3-level `advanceYear`. */
  step?: (state: GameState, rng: Rng) => GameState;
  /** Whether an active policy may be switched off now; default: the 3-level lock-in (activationYear + 5 years). */
  canDeactivate?: (state: GameState, p: PolicyState) => boolean;
  /** Score compared at the end of the year; default `indicators.generalScore`. */
  score?: (state: GameState) => number;
  /**
   * Fewest active policies a neighbour may have (default 1: the 3-level game refuses to simulate with none, so
   * switching off the last policy is not a move the player has). Territorio runs with none: 0.
   */
  minActive?: number;
}

const defaultCanDeactivate = (state: GameState, p: PolicyState): boolean =>
  p.activationYear === undefined || state.year >= p.activationYear + POLICY_LOCK_IN_DURATION;

/** The state with one policy switched on (even effort, as App.tsx / session.ts `togglePolicy`) or off. */
export function togglePolicyIn(state: GameState, id: Policy, CP: ControlParams): GameState {
  const policies = JSON.parse(JSON.stringify(state.policies)) as GameState['policies'];
  const p = policies[id];
  if (!p.isActive) {
    p.isActive = true;
    p.currentEfficiency = baseEfficiency(p, CP);
    p.previousFatigueFactor = fatigueFactor(p);
    evenEffort(p);
  } else {
    p.isActive = false;
    p.activationYear = undefined;
    if (p.instruments) {
      (Object.values(p.instruments) as PolicyInstrument[]).forEach((inst) => { inst.effortPercentage = 0; });
      p.totalInstrumentEffortApplied = 0;
    }
  }
  return { ...state, policies };
}

/** Portfolios one move away from the player's: each allowed single switch on or off. */
export function neighbourPolicies(state: GameState, canDeactivate = defaultCanDeactivate, minActive = 1): Policy[] {
  const all = Object.values(state.policies) as PolicyState[];
  const active = all.filter((p) => p.isActive).length;
  return all
    .filter((p) => (p.isActive ? active - 1 >= minActive && canDeactivate(state, p) : active < MAX_ACTIVE_POLICIES))
    .map((p) => p.id);
}

export interface RegretResult { regret: number; player: number; best: number; bestMove: Policy | null; alternatives: number }

/**
 * One-year regret of the player's portfolio (§3): at most 1 + number of policies calls to `step`, all with
 * `makeRng(seed, year + 1)` (common random numbers). 0 when the player's portfolio is the best of its neighbourhood.
 */
export function oneYearRegret(stateBefore: GameState, seed: number, CP: ControlParams, opts: RegretOptions = {}): RegretResult {
  const step = opts.step ?? ((s: GameState, rng: Rng) => advanceYear(s, rng, CP).next);
  const score = opts.score ?? ((s: GameState) => s.indicators.generalScore);
  const run = (s: GameState) => score(step(s, makeRng(seed, stateBefore.year + 1)));
  const player = run(stateBefore);
  let best = player;
  let bestMove: Policy | null = null;
  const moves = neighbourPolicies(stateBefore, opts.canDeactivate, opts.minActive ?? 1);
  moves.forEach((id) => {
    const s = run(togglePolicyIn(stateBefore, id, CP));
    if (s > best) { best = s; bestMove = id; }
  });
  return { regret: best - player, player, best, bestMove, alternatives: moves.length };
}

/* ── Safe-and-just gap (§3) ────────────────────────────────────────────────────────────────── */

const forestShare = (state: GameState): number => {
  const a = (k: string) => state.landUses[k as keyof GameState['landUses']]?.area ?? 0;
  const total = (Object.values(state.landUses) as { area: number }[]).reduce((s, l) => s + l.area, 0);
  return total > 0 ? (a('BNNP') + a('BNP')) / total : 0;
};

/**
 * Sum of the normalised shortfalls below the social floors (F, E, W; scale 100) and of the overshoots of the
 * ecological ceilings (c above ratio·c0, scale c0; B below its floor, scale 100; forest share below the level's
 * start, scale forest0). 0 = inside the safe-and-just space. Needs `state.model` (anchors); 0 without it.
 */
export function safeJustGap(state: GameState): number {
  const m = state.model;
  if (!m) return 0;
  const sj = PARAMS_V2.research.safeJust;
  const i = state.indicators;
  const below = (x: number, floor: number, scale: number) => (scale > 0 ? Math.max(0, floor - x) / scale : 0);
  const cCeil = sj.cRatio * m.anchors.c0;
  return below(i.foodSecurity, sj.F, 100) + below(i.economicSecurity, sj.E, 100) + below(i.socialWellbeing, sj.W, 100)
    + below(i.biodiversity, sj.B, 100)
    + (m.anchors.c0 > 0 ? Math.max(0, i.co2EqEmissionsPerCapita - cCeil) / m.anchors.c0 : 0)
    + below(forestShare(state), m.anchors.forestShare0, m.anchors.forestShare0);
}

/* ── Tracker (§3) ──────────────────────────────────────────────────────────────────────────── */

type ShockKey = 'F' | 'E';
const SHOCK_FIELD: Record<ShockKey, 'foodSecurity' | 'economicSecurity'> = { F: 'foodSecurity', E: 'economicSecurity' };

export interface ShockEpisode { key: ShockKey; pre: number; trough: number; start: number }

/** Session accumulators. Plain JSON (it lives in React state / a Territorio session). Times in years. */
export interface ResearchTracker {
  time: number;
  gapIntegral: number;
  regretSum: number;
  regretCount: number;
  /** Years each policy has been active. */
  activeTime: Record<string, number>;
  reversals: number;
  /** Policies active after the last tracked step: one of them inactive at the next step was switched off. */
  lastActive: string[] | null;
  /** Level and model time (`model.t`) after the last tracked step, to tell a new or restarted level from a decision. */
  lastLevel: number | null;
  lastT: number | null;
  open: ShockEpisode[];
  recoveredTimes: number[];
}

export function createResearchTracker(): ResearchTracker {
  return { time: 0, gapIntegral: 0, regretSum: 0, regretCount: 0, activeTime: {}, reversals: 0, lastActive: null, lastLevel: null, lastT: null, open: [], recoveredTimes: [] };
}

const activeIds = (s: GameState): string[] => (Object.values(s.policies) as PolicyState[]).filter((p) => p.isActive).map((p) => p.id);

/**
 * Accounts one step of `dt` years from `before` to `after`. `eventFired`: a random event fired in the step (the
 * engine's `currentEvent` / Territorio's `event`); a fall of F or E of at least `shockMinDrop` points in such a step
 * opens a shock episode, which closes when the indicator recovers `recovery` of its fall.
 */
export function trackStep(t: ResearchTracker, before: GameState, after: GameState, dt: number, eventFired: boolean): ResearchTracker {
  const r = PARAMS_V2.research;
  const time = t.time + dt;
  const activeTime = { ...t.activeTime };
  const beforeActive = activeIds(before);
  beforeActive.forEach((id) => { activeTime[id] = (activeTime[id] ?? 0) + dt; });
  // A new level (or a restarted one) resets the policies and the indicators: neither is the player's decision.
  const newLevel = t.lastLevel !== null && (before.currentLevel !== t.lastLevel || (before.model?.t ?? 0) < (t.lastT ?? 0) - 1e-9);
  // Switch-offs between the previous step and this one (the player's decisions) and inside the step.
  const beforeSet = new Set(beforeActive);
  const afterActive = activeIds(after);
  const afterSet = new Set(afterActive);
  const reversals = t.reversals + (newLevel ? 0 : (t.lastActive ?? []).filter((id) => !beforeSet.has(id)).length)
    + beforeActive.filter((id) => !afterSet.has(id)).length;

  const recoveredTimes = [...t.recoveredTimes];
  const open: ShockEpisode[] = [];
  // Episodes still open when the level ended count with the time elapsed (right-censored, as at the end).
  if (newLevel) t.open.forEach((ep) => recoveredTimes.push(t.time - ep.start));
  (newLevel ? [] : t.open).forEach((ep) => {
    const x = after.indicators[SHOCK_FIELD[ep.key]];
    const trough = Math.min(ep.trough, x);
    if (x >= ep.pre - (1 - r.recovery) * (ep.pre - trough)) recoveredTimes.push(time - ep.start);
    else open.push({ ...ep, trough });
  });
  if (eventFired) {
    (['F', 'E'] as const).forEach((key) => {
      const pre = before.indicators[SHOCK_FIELD[key]];
      const x = after.indicators[SHOCK_FIELD[key]];
      if (pre - x >= r.shockMinDrop && !open.some((ep) => ep.key === key)) open.push({ key, pre, trough: x, start: time - dt });
    });
  }
  return {
    ...t, time, gapIntegral: t.gapIntegral + safeJustGap(after) * dt, activeTime, reversals, lastActive: afterActive,
    lastLevel: after.currentLevel, lastT: after.model?.t ?? null, open, recoveredTimes,
  };
}

export function trackRegret(t: ResearchTracker, regret: number): ResearchTracker {
  return { ...t, regretSum: t.regretSum + regret, regretCount: t.regretCount + 1 };
}

/** Normalised entropy of the share of active time of each policy (0: one policy or none; 1: all equal). */
export function policyEntropy(activeTime: Record<string, number>, policyCount: number): number {
  const xs = Object.values(activeTime).filter((x) => x > 0);
  const total = xs.reduce((a, b) => a + b, 0);
  if (total <= 0 || policyCount < 2 || xs.length < 2) return 0;
  const h = -xs.reduce((s, x) => s + (x / total) * Math.log(x / total), 0);
  return h / Math.log(policyCount);
}

/** Session indices as stored in `research_indices` (JSONB ≤ 4 KB): snake_case, rounded, null when undefined. */
export interface ResearchIndices {
  skill_persistence: number | null;
  skill_climatology: number | null;
  accuracy: number | null;
  accuracy_persistence: number | null;
  n_predictions: number;
  regret_mean: number | null;
  safe_just_gap: number | null;
  resilience_months: number | null;
  carbon_budget_used: number | null;
  land_concentration: number | null;
  just_transition: number | null;
  policy_entropy: number;
  policy_reversals: number;
}

const round = (x: number | null | undefined, d = 3): number | null =>
  (x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 10 ** d) / 10 ** d);

/**
 * Floor of a stored skill score: −∞ (perfect baseline, imperfect player) would become null in JSON and be confused with
 * "no predictions"; any SS below the floor reads the same in the analysis (far worse than the naive rule).
 */
export const SKILL_FLOOR = -10;
const floorSkill = (x: number | null | undefined) => (x === null || x === undefined ? x : Math.max(SKILL_FLOOR, x));

/**
 * Final indices. Shock episodes still open at the end count with the time elapsed so far (right-censored).
 * `skill`: the prediction skill of the session (the 3-level game; Territorio has no prediction, spec §7).
 */
export function researchIndices(t: ResearchTracker, finalState: GameState, skill?: PredictionSkill): ResearchIndices {
  const resilience = [...t.recoveredTimes, ...t.open.map((ep) => t.time - ep.start)];
  const m = finalState.model;
  return {
    skill_persistence: round(floorSkill(skill?.skillPersistence)),
    skill_climatology: round(floorSkill(skill?.skillClimatology)),
    accuracy: round(skill?.accuracy),
    accuracy_persistence: round(skill?.accuracyPersistence),
    n_predictions: skill?.n ?? 0,
    regret_mean: round(t.regretCount ? t.regretSum / t.regretCount : null),
    safe_just_gap: round(t.time > 0 ? t.gapIntegral / t.time : null),
    resilience_months: round(resilience.length ? mean(resilience) * 12 : null, 1),
    carbon_budget_used: round(m ? carbonBudgetIndex(m) : null),
    land_concentration: round(m?.social?.concentration ?? landConcentration(finalState.landUses)),
    just_transition: round(m?.social?.justTransition ?? null),
    policy_entropy: round(policyEntropy(t.activeTime, Object.keys(finalState.policies).length)) ?? 0,
    policy_reversals: t.reversals,
  };
}
