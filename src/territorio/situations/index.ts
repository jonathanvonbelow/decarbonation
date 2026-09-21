/**
 * The situations system: arrival, wear and resolution (21_fusion_ecosim.md §7, decisión 1).
 *
 * Nothing here pauses the game. A situation arrives, sits in the inbox, and wears the government
 * down every month it stays unresolved — that wear is the whole point: an unresolved problem is not
 * free. When its deadline passes it resolves itself with its last option, the one nobody chose.
 *
 * Pure functions over plain values, so the rules are testable without a browser.
 */
import type { ControlParams, GameState, Indicators, RandomEventEffect, StellaStocks } from '../../types';
import { applyRandomEventEffects, applyDeferredAdjustments, type DeferredAdjustment, type Rng } from '../../sim';
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

/**
 * How much of an authored effect on the saturating variables (pressures, social conflict, the 0-100
 * indicators) actually lands. The catalogue is written at "one dramatic event" scale; applied 60+
 * times a game it pinned every pressure at 0 or 100. Money and land-use effects are not scaled:
 * those are authored in the model's own units and do not saturate.
 */
export const SITUATION_EFFECT_SCALE = 0.5;

const UNSCALED = new Set(['stella.Reservas_del_Tesoro', 'stella.Deuda', 'stella.PBI_Real']);

function scaleEffects(effects: RandomEventEffect[]): RandomEventEffect[] {
  return effects.map((e) => {
    if (!e.indicator || UNSCALED.has(e.indicator)) return e;
    const scaled: RandomEventEffect = { ...e };
    if (e.changeAbsolute !== undefined) scaled.changeAbsolute = e.changeAbsolute * SITUATION_EFFECT_SCALE;
    if (e.changePercentage !== undefined) scaled.changePercentage = e.changePercentage * SITUATION_EFFECT_SCALE;
    return scaled;
  });
}

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

/**
 * One month of wear from everything still unresolved. Mutates the state's pressures and social
 * conflict in place (the caller owns a fresh copy) and returns the points applied per situation.
 */
export function applyWear(
  open: OpenSituation[], stella: StellaStocks, indicators: Indicators, monthIndex: number,
): Record<string, number> {
  const applied: Record<string, number> = {};
  open.forEach((item) => {
    const def = SITUATION_BY_ID[item.defId];
    if (!def) return;
    const { conflict = 0, ppAgricola = 0, ppAmbientalista = 0, ppSocial = 0 } = def.wear;
    // Wear grows the longer it is ignored: it doubles by the month the deadline arrives.
    const deadline = Math.max(1, item.expiresAt - item.openedAt);
    const ageFactor = 1 + Math.min(1, (monthIndex - item.openedAt) / deadline);
    const clamp = (n: number) => Math.max(0, Math.min(100, n));
    stella.Conflicto_social = clamp(stella.Conflicto_social + conflict * ageFactor);
    stella.PP_AGRICOLA = clamp(stella.PP_AGRICOLA + ppAgricola * ageFactor);
    stella.PP_AMBIENTALISTA = clamp(stella.PP_AMBIENTALISTA + ppAmbientalista * ageFactor);
    stella.PP_SOCIAL = clamp(stella.PP_SOCIAL + ppSocial * ageFactor);
    const total = (conflict + ppAgricola + ppAmbientalista + ppSocial) * ageFactor;
    applied[item.id] = total;
  });
  indicators.socialWellbeing = Math.max(0, Math.min(100, 100 - stella.Conflicto_social));
  indicators.ppAgricola = stella.PP_AGRICOLA;
  indicators.ppAmbientalista = stella.PP_AMBIENTALISTA;
  indicators.ppSocial = stella.PP_SOCIAL;
  return applied;
}

export interface ResolutionResult {
  state: GameState;
  /** Deferred effects on recomputed indicators, to apply after the next month's recomputation. */
  deferred: DeferredAdjustment[];
  cost: number;
  ok: boolean;
}

/**
 * What an option costs *now*. The catalogue prices are written for the economy of 2024, and the
 * treasury grows with the economy, so a fixed price stops being a decision after a few years. Costs
 * follow the square root of real GDP growth (capped at 2.5×): they keep mattering without making a
 * grown economy unable to act — measured with `npm run sim:territorio`, a linear scale starved the
 * conservation strategy of every paid option.
 */
export function situationCost(base: number, state: GameState): number {
  if (!base) return 0;
  const pbi0 = state.levelBaseline?.pbi || state.indicators.pbi || 1;
  return base * Math.min(2.5, Math.max(1, Math.sqrt(state.stellaSpecificState.PBI_Real / pbi0)));
}

/**
 * Applies one option of a situation: pays its cost from the treasury and runs its effects through
 * the same path the model's own random events use.
 */
export function resolveSituation(
  state: GameState,
  defId: string,
  optionId: string,
  CP: ControlParams,
  language: 'es' | 'en' = 'es',
): ResolutionResult {
  const def = SITUATION_BY_ID[defId];
  const option = def?.options.find((o) => o.id === optionId) ?? def?.options[def.options.length - 1];
  if (!def || !option) return { state, deferred: [], cost: 0, ok: false };

  const cost = situationCost(option.cost ?? 0, state);
  if (cost > state.stellaSpecificState.Reservas_del_Tesoro) return { state, deferred: [], cost, ok: false };

  const next: GameState = JSON.parse(JSON.stringify(state));
  next.pacts = state.pacts; // JSON round-trip strips the pact effect functions
  next.stellaSpecificState.Reservas_del_Tesoro -= cost;

  const deferred: DeferredAdjustment[] = [];
  const logs: string[] = [];
  applyRandomEventEffects(
    scaleEffects(option.effects), next.indicators, next.stellaSpecificState, next.landUses, logs, language, deferred,
  );
  // Effects on indicators the month recomputes anyway can be applied now: the next step will
  // recompute them from the state this already moved. The rest are handed back to the caller.
  applyDeferredAdjustments(next.indicators, deferred);
  next.indicators.treasuryReserves = next.stellaSpecificState.Reservas_del_Tesoro;
  next.indicators.socialWellbeing = Math.max(0, Math.min(100, 100 - next.stellaSpecificState.Conflicto_social));
  next.indicators.ppAgricola = next.stellaSpecificState.PP_AGRICOLA;
  next.indicators.ppAmbientalista = next.stellaSpecificState.PP_AMBIENTALISTA;
  next.indicators.ppSocial = next.stellaSpecificState.PP_SOCIAL;
  return { state: next, deferred, cost, ok: true };
}

/** The option that applies when nobody decided: the last one in the list. */
export const defaultOption = (def: SituationDef) => def.options[def.options.length - 1];
