/**
 * Carbon of model 2.0 in physical units (mejora-general/files/38_carbono_unidades_fisicas.md): an inventory in
 * tCO2e/yr with three components — energy, the land flux (AFOLU) and land-use change (LUC) — plus the carbon
 * budget index. Port of `carbon` and `budget` in scripts/reference/modelo_v2.py.
 *
 *   energy   y = (Y/P)/(Y0/P0);  ε = ε0_N · y^0.3 · (1 + 0.15·η_SE^land) · [0.35·(1 − s) + 0.65·(1 − u)];  E_en = ε·P
 *   targets  s* = min(0.9, 0.60·η_CN^elec + min(1, a_ENR/0.04) + Σ pacts.renewables)
 *            u* = min(0.6, 0.35·η_CN^other + Σ pacts.efficiency);   s, u ← relax(·, ·*, 0.15, dt)
 *   AFOLU    E_afolu = Σ_i f_i·A_i[ha], f_i with the policy multipliers of PARAMS_V2.fluxPolicy (may be < 0)
 *   LUC      E_luc = Σ_(i→j) F_ij[ha/yr]·max(0, C_i − C_j)·44/12  (losses of stock only; F_ij = realised flow / dt)
 *   c        (E_en + E_afolu + E_luc) / P
 *   budget   B_t = Σ E_total·dt / [E0·(t − cut·t²/(2·30))]   (linear path to −30 % in 2054)
 *
 * Every number lives in PARAMS_V2 (`flux`, `stock`, `fluxPolicy`, `energy`). Pure: no React, no randomness.
 */
import type { GameState, LandUseType, ModelAnchors, ModelState, Pact } from '../../types';
import { relax } from './math';
import { PARAMS_V2, type LandCode } from './params';
import { HA_PER_KHA, LAND_USE_TYPES, type LandEfficiencies } from './land';

/** Molar mass ratio CO2 / C (audit C-1). */
export const CO2_PER_C = 44 / 12;

/** Every land use of the model (the LandUseType values = the codes of the PARAMS_V2 tables). */
const LAND_CODES = LAND_USE_TYPES as unknown as LandCode[];

export type Emissions = ModelState['emissions'];
export interface EmissionsResult extends Emissions {
  /** Total per capita, t CO2e / person / yr (what `co2EqEmissionsPerCapita` shows). */
  perCapita: number;
}

/** A realised transition of the step (src/sim/v2/land.ts `RealisedLandFlow`): only `from`, `to` and `ha` are read. */
export interface CarbonFlow { from: LandUseType | string; to: LandUseType | string; ha: number }

const areaHa = (landUses: GameState['landUses'], k: LandCode): number =>
  Math.max(0, landUses[k as LandUseType]?.area ?? 0) * HA_PER_KHA;

const totalArea = (landUses: GameState['landUses']): number =>
  LAND_CODES.reduce((sum, k) => sum + Math.max(0, landUses[k as LandUseType]?.area ?? 0), 0);

/** Σ of a pact key over the active pacts of PARAMS_V2.pacts (the prototype's `s` / `u` = `renewables` / `efficiency`). */
function pactSum(pacts: Record<string, Pact> | undefined, key: 'renewables' | 'efficiency'): number {
  if (!pacts) return 0;
  const table = PARAMS_V2.pacts as Record<string, Partial<Record<'renewables' | 'efficiency', number>>>;
  return Object.keys(table).reduce((sum, id) => sum + (pacts[id]?.isActive ? table[id][key] ?? 0 : 0), 0);
}

/** Targets s* and u* of the energy state for the current land, policies and pacts. */
export function energyTargets(
  landUses: GameState['landUses'], eff: LandEfficiencies, pacts?: Record<string, Pact>,
): { renewableShare: number; efficiency: number } {
  const e = PARAMS_V2.energy;
  const total = totalArea(landUses);
  const parkShare = total > 0 ? Math.max(0, landUses['ENR' as LandUseType]?.area ?? 0) / total : 0;
  const renewableShare = Math.min(e.renewablesCap,
    e.renewablesMaxCN * (eff.CN?.elec ?? 0) + Math.min(1, parkShare / e.parksFullShare) + pactSum(pacts, 'renewables'));
  const efficiency = Math.min(e.efficiencyCap, e.efficiencyMaxCN * (eff.CN?.other ?? 0) + pactSum(pacts, 'efficiency'));
  return { renewableShare, efficiency };
}

/**
 * Infrastructure inertia: s and u move toward their targets with the exact discretisation of an annual
 * fraction k = 0.15 (same time constant monthly and yearly). Returns the new energy state.
 */
export function updateEnergyState(
  energy: ModelState['energy'], landUses: GameState['landUses'], eff: LandEfficiencies,
  pacts: Record<string, Pact> | undefined, dt: number,
): ModelState['energy'] {
  const target = energyTargets(landUses, eff, pacts);
  const k = PARAMS_V2.energy.adjust;
  return {
    renewableShare: relax(energy.renewableShare, target.renewableShare, k, dt),
    efficiency: relax(energy.efficiency, target.efficiency, k, dt),
  };
}

/** Land flux of one use after its policy multipliers (tCO2e/ha/yr). */
export function fluxOf(k: LandCode, eff: LandEfficiencies): number {
  const terms = PARAMS_V2.fluxPolicy[k] ?? [];
  return terms.reduce((f, t) => f * (1 + t.coef * (eff[t.pid]?.[t.channel] ?? 0)), PARAMS_V2.flux[k]);
}

export interface CarbonInput {
  level: number;
  landUses: GameState['landUses'];
  /** Current population (inhabitants). */
  population: number;
  /** Current GDP (u.m.). */
  gdp: number;
  /** Level-start GDP and population (income per capita relative to the start). */
  anchors: Pick<ModelAnchors, 'gdp0' | 'pop0'>;
  /** Renewable share and efficiency gain already updated for this step. */
  energy: ModelState['energy'];
}

/**
 * Emissions of the step by source (tCO2e/yr) and per capita. `flows` are the realised transitions of the step
 * (ha moved in this step); dividing by dt gives the annual rate, so a monthly step reports the same annual value.
 */
export function computeEmissions(input: CarbonInput, eff: LandEfficiencies, flows: CarbonFlow[], dt: number): EmissionsResult {
  const e = PARAMS_V2.energy;
  const P = input.population > 0 ? input.population : 1;
  const gdp0 = input.anchors.gdp0 > 0 ? input.anchors.gdp0 : 1;
  const pop0 = input.anchors.pop0 > 0 ? input.anchors.pop0 : P;
  const income = Math.max(0, (input.gdp / P) / (gdp0 / pop0));
  const eps0 = e.eps0[input.level] ?? e.eps0[1];
  const eps = eps0 * Math.pow(income, e.incomeElasticity) * (1 + e.subsidyBoost * (eff.SE?.land ?? 0))
    * (e.electricShare * (1 - input.energy.renewableShare) + (1 - e.electricShare) * (1 - input.energy.efficiency));
  const energy = eps * P;
  const afolu = LAND_CODES.reduce((sum, k) => sum + fluxOf(k, eff) * areaHa(input.landUses, k), 0);
  const stock = PARAMS_V2.stock as Record<string, number>;
  const step = Math.max(dt, 1e-9);
  const luc = flows.reduce((sum, f) => {
    const loss = (stock[f.from as string] ?? 0) - (stock[f.to as string] ?? 0);
    return sum + (f.ha > 0 && loss > 0 ? f.ha * loss * CO2_PER_C : 0);
  }, 0) / step;
  const total = energy + afolu + luc;
  return { energy, afolu, luc, total, perCapita: total / P };
}

/** Cumulative emissions of the reference path up to t years: E0·(t − cut·t²/(2·years)) (prototype `budget`). */
export function budgetPath(emissions0: number, t: number): number {
  const e = PARAMS_V2.energy;
  return emissions0 * (t - (e.budgetCut2054 * t * t) / (2 * e.budgetYears));
}

/** Carbon budget index B_t: > 1 = above the territory's budget. 0 at t = 0 (prototype). */
export function carbonBudgetIndex(model: Pick<ModelState, 't' | 'cumulativeEmissions' | 'anchors'>): number {
  if (!(model.t > 0)) return 0;
  const path = budgetPath(model.anchors.emissions0, model.t);
  return path > 0 ? model.cumulativeEmissions / path : 0;
}
