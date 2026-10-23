/**
 * International pacts of model 2.0 as shifts of the targets (mejora-general/files/43_pactos_internacionales.md). A pact
 * is pure data (`PARAMS_V2.pacts`, keyed by the pact id of the code); while it is active it shifts the logistic targets
 * of B, E and Pc (logit units), the energy targets s* and u* (renewables / efficiency) and the frontier flows of the land
 * matrix (protectFactor on BNNP → BNP, deforestFactor on BNNP → CC), and it costs a fraction of GDP per year. The effect
 * is stationary: it does not grow with the years of membership. Port of `pact(...)`, the `m_protect` / `m_deforest` of
 * `land_step`, the pact terms of `carbon` and `pact_cost` of `economy_step` in scripts/reference/modelo_v2.py (whose ids
 * are treaty / accord / tech and whose keys s / u / m_protect / m_deforest are renewables / efficiency / protectFactor /
 * deforestFactor here).
 *
 * Since this phase a pact has no functions (`effects`): GameState is plain JSON again, and nothing has to be restored
 * after a JSON clone (`restorePactFunctions` is gone).
 *
 * Pure: no React, no randomness, no mutation.
 */
import type { Pact } from '../../types';
import { PARAMS_V2 } from './params';
import { DEFAULT_LAND_USE_CHANGE_FACTORS, type LandUseChangeFactors } from './land';

export type PactId = keyof typeof PARAMS_V2.pacts;
/** Keys of the target shifts (logit units). */
export type PactTargetKey = 'B' | 'E' | 'Pc';
/** Keys of the energy shifts (fractions added to s* and u*). */
export type PactEnergyKey = 'renewables' | 'efficiency';

interface PactParams {
  entry: number; annual: number;
  B?: number; E?: number; Pc?: number;
  renewables?: number; efficiency?: number;
  protectFactor?: number; deforestFactor?: number;
}

type Pacts = Record<string, Pact> | undefined;

/** The data of one pact (undefined for an id the model does not know). */
export const pactParams = (id: string): PactParams | undefined => (PARAMS_V2.pacts as Record<string, PactParams>)[id];

/** Parameters of the active pacts the model knows. */
function activeParams(pacts: Pacts): PactParams[] {
  if (!pacts) return [];
  return (Object.values(pacts) as Pact[])
    .filter((p) => p?.isActive)
    .map((p) => pactParams(p.id))
    .filter((p): p is PactParams => p !== undefined);
}

/** Σ of the target shift `key` over the active pacts (logit units). */
export const pactShift = (pacts: Pacts, key: PactTargetKey): number =>
  activeParams(pacts).reduce((sum, p) => sum + (p[key] ?? 0), 0);

/** Σ of the energy shift `key` over the active pacts (added to s* / u* before their caps). */
export const pactEnergyShift = (pacts: Pacts, key: PactEnergyKey): number =>
  activeParams(pacts).reduce((sum, p) => sum + (p[key] ?? 0), 0);

/** Multipliers of the frontier flows of the land matrix: Π protectFactor on BNNP → BNP, Π deforestFactor on BNNP → CC. */
export function pactLandFactors(pacts: Pacts): LandUseChangeFactors {
  const active = activeParams(pacts);
  const d = DEFAULT_LAND_USE_CHANGE_FACTORS;
  return {
    ...d,
    tasa_BNNP_a_BNP: active.reduce((m, p) => m * (p.protectFactor ?? 1), d.tasa_BNNP_a_BNP),
    tasa_BNNP_a_CC: active.reduce((m, p) => m * (p.deforestFactor ?? 1), d.tasa_BNNP_a_CC),
  };
}

/** Annual cost of the active pacts at this GDP: Σ annual·Y (money per year). */
export const pactAnnualCost = (pacts: Pacts, gdp: number): number =>
  activeParams(pacts).reduce((sum, p) => sum + p.annual * gdp, 0);

/** One-off cost of joining pact `id` at this GDP: entry·Y (0 for an unknown pact). */
export const pactEntryCost = (id: string, gdp: number): number => (pactParams(id)?.entry ?? 0) * gdp;

/** Annual cost of pact `id` at this GDP, active or not (what the UI shows before joining). */
export const pactYearlyCostOf = (id: string, gdp: number): number => (pactParams(id)?.annual ?? 0) * gdp;
