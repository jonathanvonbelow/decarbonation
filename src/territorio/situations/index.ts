/**
 * The situations system: arrival, wear and resolution (21_fusion_ecosim.md §7, decisión 1).
 *
 * Nothing here pauses the game. A situation arrives, sits in the inbox, and wears the government
 * down every month it stays unresolved — that wear is the whole point: an unresolved problem is not
 * free. When its deadline passes it resolves itself with its last option, the one nobody chose.
 *
 * Pure functions over plain values, so the rules are testable without a browser.
 */
import type { ControlParams, GameState, ModelIndicatorKey, ModelState, RandomEventEffect, TargetImpulse } from '../../types';
import { applyRandomEventEffects, investmentScale, payPublicInvestment, toMapFlow, type LandFlow, type Rng } from '../../sim';
import { toLogitDelta, toPointsDelta } from '../../sim/v2/math';
import { PARAMS_V2 } from '../../sim/v2/params';
import { CLIMATE_SITUATIONS } from './climate';
import { ECONOMY_SITUATIONS } from './economy';
import { PRODUCTION_SITUATIONS } from './production';
import { SOCIETY_SITUATIONS } from './society';
import type { OpenSituation, SituationDef } from './types';

export * from './types';

export const SITUATIONS: SituationDef[] = [
  ...CLIMATE_SITUATIONS, ...PRODUCTION_SITUATIONS, ...SOCIETY_SITUATIONS, ...ECONOMY_SITUATIONS,
];

export const SITUATION_BY_ID: Record<string, SituationDef> = Object.fromEntries(SITUATIONS.map((d) => [d.id, d]));

/** How many can sit in the inbox at once. Past this, nothing new arrives until something is settled. */
export const MAX_OPEN_SITUATIONS = 6;
/**
 * Base monthly chance that a new situation arrives. Calibrated, not guessed: at 0.34 a 30-year game
 * produced ~200 situations, one decision every three seconds of clock — unplayable. At 0.16 a game
 * lands around 60-70, roughly one every five months, and the inbox usually holds one or two.
 */
const BASE_ARRIVAL = 0.16;

/** A territory in trouble generates more situations than a calm one. */
function arrivalChance(state: GameState): number {
  const i = state.indicators;
  let chance = BASE_ARRIVAL;
  if (i.socialWellbeing < 45) chance += 0.05;
  if (i.foodSecurity < 40) chance += 0.04;
  if (i.biodiversity < 35) chance += 0.03;
  if (Math.max(i.ppAgricola, i.ppAmbientalista, i.ppSocial) > 65) chance += 0.05;
  return Math.min(0.4, chance);
}

export interface SituationArrival {
  open: OpenSituation;
  def: SituationDef;
}

/**
 * Rolls whether a new situation arrives this month and which one. Draws are weighted by each
 * definition's `weight` among those whose `when` holds and that are not already open.
 */
export function rollSituation(
  state: GameState,
  openIds: string[],
  monthIndex: number,
  rng: Rng,
  pool: SituationDef[] = SITUATIONS,
): SituationArrival | null {
  if (openIds.length >= MAX_OPEN_SITUATIONS) return null;
  if (rng() >= arrivalChance(state)) return null;

  const eligible = pool.filter((d) => !openIds.includes(d.id) && (!d.when || d.when(state)));
  if (eligible.length === 0) return null;

  const total = eligible.reduce((sum, d) => sum + d.weight, 0);
  let pick = rng() * total;
  const def = eligible.find((d) => (pick -= d.weight) < 0) ?? eligible[eligible.length - 1];
  return {
    def,
    open: { id: `${def.id}-${monthIndex}`, defId: def.id, openedAt: monthIndex, expiresAt: monthIndex + def.deadline, worn: 0 },
  };
}

/** How much an open situation has aged: 1 when it arrives, 2 by the month its deadline arrives (wear doubles). */
const ageFactorOf = (item: OpenSituation, monthIndex: number): number =>
  1 + Math.min(1, Math.max(0, monthIndex - item.openedAt) / Math.max(1, item.expiresAt - item.openedAt));

export interface SituationWearShift { C: number; a: number; e: number; s: number }

/**
 * Wear of everything still unresolved this month, as a shift of the targets (phase 42; the prototype's `wear` of
 * `play_territorio`): `PARAMS_V2.relaxation.wearLogit` logit units per point of the catalogue's wear x age factor, on the
 * conflict (C) and on each pressure (a / e / s). While the situation stays open its targets sit higher; once it is
 * settled the indicators relax back. Until phase 42 the wear was added to the stocks, and the relaxation of phases
 * 39/42 dissipated it within months.
 */
export function wearShift(open: OpenSituation[], monthIndex: number): SituationWearShift {
  const out: SituationWearShift = { C: 0, a: 0, e: 0, s: 0 };
  const k = PARAMS_V2.relaxation.wearLogit;
  open.forEach((item) => {
    const def = SITUATION_BY_ID[item.defId];
    if (!def) return;
    const { conflict = 0, ppAgricola = 0, ppAmbientalista = 0, ppSocial = 0 } = def.wear;
    const f = k * ageFactorOf(item, monthIndex);
    out.C += f * conflict;
    out.a += f * ppAgricola;
    out.e += f * ppAmbientalista;
    out.s += f * ppSocial;
  });
  return out;
}

/** Current value (0-100) of the stock behind a model indicator: C and Pc are conflict / collapse, not W / St. */
function valueOf(state: GameState, X: ModelIndicatorKey): number {
  const st = state.stellaSpecificState;
  const i = state.indicators;
  switch (X) {
    case 'B': return i.biodiversity;
    case 'F': return i.foodSecurity;
    case 'E': return i.economicSecurity;
    case 'C': return st.Conflicto_social;
    case 'Pc': return st.Colapso_politico;
    case 'pa': return st.PP_AGRICOLA;
    case 'pe': return st.PP_AMBIENTALISTA;
    case 'ps': return st.PP_SOCIAL;
    default: return 50;
  }
}

/** Points of an indicator that a logit shift `dl` is worth at its current value (slope of the logistic, 100·p·(1 − p)). */
const pointsOf = toPointsDelta;

/**
 * One month of wear from everything still unresolved, for the desk's tally (`worn`, `wearTotal`): the target shift of
 * `wearShift` (wearLogit x catalogue wear x age factor, on C and on each pressure) converted to points with the slope of
 * the logistic at the indicator's current value (phase 47 §3, as the spec asks: it measures the push on the targets, an
 * upper bound of what the stocks actually moved, since they relax toward the target). Since phase 42 it no longer
 * touches the state.
 */
export function wearTally(open: OpenSituation[], monthIndex: number, state: GameState): Record<string, number> {
  const applied: Record<string, number> = {};
  const k = PARAMS_V2.relaxation.wearLogit;
  const C = valueOf(state, 'C');
  const pa = valueOf(state, 'pa');
  const pe = valueOf(state, 'pe');
  const ps = valueOf(state, 'ps');
  open.forEach((item) => {
    const def = SITUATION_BY_ID[item.defId];
    if (!def) return;
    const { conflict = 0, ppAgricola = 0, ppAmbientalista = 0, ppSocial = 0 } = def.wear;
    const f = k * ageFactorOf(item, monthIndex);
    applied[item.id] = pointsOf(f * conflict, C) + pointsOf(f * ppAgricola, pa) + pointsOf(f * ppAmbientalista, pe)
      + pointsOf(f * ppSocial, ps);
  });
  return applied;
}

export interface ResolutionResult {
  state: GameState;
  cost: number;
  ok: boolean;
  /** Land the option moved (phase 37: ± pairs are transfers, loose losses go to fallow), for the map. */
  flows: LandFlow[];
}

/**
 * What an option costs *now*. The catalogue prices are written for the economy of 2024, and the
 * treasury grows with the economy, so a fixed price stops being a decision after a few years. Costs
 * follow the square root of real GDP growth (capped at 2.5×; `investmentScale`, phase 47): they keep mattering without
 * making a grown economy unable to act — measured with `npm run sim:territorio`, a linear scale starved the
 * conservation strategy of every paid option.
 */
export function situationCost(base: number, state: GameState): number {
  if (!base) return 0;
  return base * investmentScale(state);
}

/** Catalogue indicator → model indicator whose target an effect pushes (sign −1: W and St are 100 − C and 100 − Pc). */
const IMPULSE_TARGET: Record<string, { X: ModelIndicatorKey; sign: 1 | -1 }> = {
  biodiversity: { X: 'B', sign: 1 },
  foodSecurity: { X: 'F', sign: 1 },
  economicSecurity: { X: 'E', sign: 1 },
  'stella.Conflicto_social': { X: 'C', sign: 1 },
  socialWellbeing: { X: 'C', sign: -1 },
  'stella.Colapso_politico': { X: 'Pc', sign: 1 },
  politicalStability: { X: 'Pc', sign: -1 },
  'stella.PP_AGRICOLA': { X: 'pa', sign: 1 },
  ppAgricola: { X: 'pa', sign: 1 },
  'stella.PP_AMBIENTALISTA': { X: 'pe', sign: 1 },
  ppAmbientalista: { X: 'pe', sign: 1 },
  'stella.PP_SOCIAL': { X: 'ps', sign: 1 },
  ppSocial: { X: 'ps', sign: 1 },
};

/** τ in years of a half-life in months: τ = months / 12 / ln 2. */
export const tauOfHalfLife = (months: number): number => months / 12 / Math.LN2;

/**
 * An impulse on the target of model indicator X worth `points` at its current value (phase 47 §2):
 * Δℓ = Δpoints / (100·p·(1 − p)), p ∈ [0.01, 0.99]; born at the model's time, fading with τ.
 */
export function situationImpulse(state: GameState, X: ModelIndicatorKey, points: number, halfLifeMonths: number): TargetImpulse {
  return { indicator: X, logit: toLogitDelta(points, valueOf(state, X)), t: state.model?.t ?? 0, tau: tauOfHalfLife(halfLifeMonths) };
}

/** Drops the impulses older than discardTaus·τ (prototype: 6τ): bounded memory of the state. */
export function pruneImpulses(model: ModelState): ModelState {
  const n = PARAMS_V2.situations.discardTaus;
  const kept = model.impulses.filter((imp) => model.t - imp.t < n * imp.tau);
  return kept.length === model.impulses.length ? model : { ...model, impulses: kept };
}

/**
 * Applies an option's effects to `next` (mutated; a fresh clone), the model 2.0 way (phase 47; prototype
 * `add_situation_effect` + `apply_land_effects`):
 *  - bounded indicators (B, F, E, C/W, Pc/St, the three pressures): a decaying impulse on the target, never a jump;
 *  - money, immediate: treasury incomes (> 0) × √(Y/Y0) like the costs, charges (< 0) fixed, a percentage on the current
 *    stock; debt + absolute or × (1 + %), never below 0; real GDP × (1 + %) (or + absolute): a level shock, like the
 *    events' Y% (the economy grows from there);
 *  - land: transfers (phase 37), through the events' path;
 *  - anything else (CO2, the score) goes through the events' path, which skips what is recomputed every step.
 * Returns the land transfers for the map.
 */
export function applySituationEffects(
  next: GameState,
  effects: RandomEventEffect[],
  halfLifeMonths: number,
  language: 'es' | 'en' = 'es',
): LandFlow[] {
  const rest: RandomEventEffect[] = [];
  const impulses: TargetImpulse[] = [];
  const st = next.stellaSpecificState;
  const scale = investmentScale(next);
  const amount = (value: number, eff: RandomEventEffect): number =>
    eff.changeAbsolute !== undefined ? eff.changeAbsolute : (eff.changePercentage ?? 0) * value;
  effects.forEach((eff) => {
    if (eff.landUseChange || !eff.indicator) { rest.push(eff); return; }
    const target = IMPULSE_TARGET[eff.indicator];
    if (target) {
      // The percentage is of the indicator as written (W for socialWellbeing); the impulse goes on its stock.
      const shown = target.sign === 1 ? valueOf(next, target.X) : 100 - valueOf(next, target.X);
      const points = target.sign * amount(shown, eff);
      if (points !== 0) impulses.push(situationImpulse(next, target.X, points, halfLifeMonths));
      return;
    }
    switch (eff.indicator) {
      case 'stella.Reservas_del_Tesoro': {
        const d = amount(st.Reservas_del_Tesoro, eff);
        st.Reservas_del_Tesoro += eff.changeAbsolute !== undefined && d > 0 ? d * scale : d;
        return;
      }
      case 'stella.Deuda':
        st.Deuda = Math.max(0, st.Deuda + amount(st.Deuda, eff));
        return;
      case 'stella.PBI_Real':
        st.PBI_Real = Math.max(1e-9, st.PBI_Real + amount(st.PBI_Real, eff));
        return;
      default:
        rest.push(eff);
    }
  });
  const logs: string[] = [];
  const transfers = rest.length
    ? applyRandomEventEffects(rest, next.indicators, st, next.landUses, logs, language)
    : [];
  next.indicators.pbi = st.PBI_Real;
  next.indicators.treasuryReserves = st.Reservas_del_Tesoro;
  next.indicators.debt = st.Deuda;
  if (impulses.length && next.model) next.model = { ...next.model, impulses: [...next.model.impulses, ...impulses] };
  return transfers.map(toMapFlow);
}

/**
 * Applies one option of a situation: pays its cost as a public investment (`payPublicInvestment`, refused with
 * `ok: false` when there is no fiscal space) and applies its effects as impulses, money and land (`applySituationEffects`).
 */
export function resolveSituation(
  state: GameState,
  defId: string,
  optionId: string,
  /** Unused since phase 47 (no facilitator value reaches a situation's effects); kept for the callers' signature. */
  _CP?: ControlParams,
  language: 'es' | 'en' = 'es',
): ResolutionResult {
  const def = SITUATION_BY_ID[defId];
  const option = def?.options.find((o) => o.id === optionId) ?? def?.options[def.options.length - 1];
  if (!def || !option) return { state, cost: 0, ok: false, flows: [] };

  const cost = situationCost(option.cost ?? 0, state);
  // Phase 44: a paid option is a public investment — reserves above the floor, then debt while D/Y ≤ 0.6
  // (src/sim/v2/finance.ts); otherwise it is refused ('no-fiscal-space' in the session).
  const paid = payPublicInvestment(state, cost);
  if (!paid.ok) return { state, cost, ok: false, flows: [] };

  const next: GameState = JSON.parse(JSON.stringify(paid.state));
  next.pacts = state.pacts; // keep the caller's pact objects (plain data since phase 43)
  const flows = applySituationEffects(next, option.effects, def.halfLifeMonths ?? PARAMS_V2.situations.halfLifeMonths, language);
  return { state: next, cost, ok: true, flows };
}

/**
 * Neglect of the desk (decisión del usuario 2026-09-19: a neglected desk can topple the government; phase 47): each
 * situation that expired unanswered counts 1, fading with half-life PARAMS_V2.situations.neglectHalfLifeMonths; the
 * target of political collapse shifts by neglectLogit·max(0, N − neglectTolerance) logit units. `expiredAt` holds the
 * month index of each expiry; `monthIndex` is the month being simulated.
 */
export function neglectTally(expiredAt: number[], monthIndex: number): number {
  const tauMonths = PARAMS_V2.situations.neglectHalfLifeMonths / Math.LN2;
  return expiredAt.reduce((sum, m) => sum + Math.exp(-Math.max(0, monthIndex - m) / tauMonths), 0);
}

export function neglectShift(expiredAt: number[], monthIndex: number): number {
  const p = PARAMS_V2.situations;
  return p.neglectLogit * Math.max(0, neglectTally(expiredAt, monthIndex) - p.neglectTolerance);
}

/** Expiries still worth remembering (younger than discardTaus·τ of the neglect tally). */
export function pruneNeglect(expiredAt: number[], monthIndex: number): number[] {
  const horizon = PARAMS_V2.situations.discardTaus * PARAMS_V2.situations.neglectHalfLifeMonths / Math.LN2;
  return expiredAt.filter((m) => monthIndex - m < horizon);
}

/** The option that applies when nobody decided: the last one in the list. */
export const defaultOption = (def: SituationDef) => def.options[def.options.length - 1];
