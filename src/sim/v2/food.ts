/**
 * Food security of model 2.0 by the balance of domestic supply and demand (mejora-general/files/41_seguridad_alimentaria_balance.md).
 * Port of `food_production` and of the F block of `indicators_step` in scripts/reference/modelo_v2.py, in the
 * logistic frame of phase 39:
 *
 *   Q   = (1 − x)·[A_CC·1.0·(1 + 0.25·η_PAI) + A_CA·0.7·(1 + 0.15·η_AS) + A_PRG·0.25·(1 + 0.20·η_GS)]
 *             ·(1 + 0.06·η_AGUA)·(1 + 0.006)^t·(1 + ε)                 domestic supply (η on the prod channel)
 *   x   = 0.30 + 0.20·η_PEA                                            exported share
 *   ρ   = max(Q/P, 0.001·ρ0)                                           availability per capita (floor: no ln 0)
 *   D_F = 3.0·ln(ρ/ρ0) + 0.6·(E − E0)/50 + cap(situation impulses)     supply and access by income
 *   F*  = 100·σ(ℓ_F0 + D_F);   F ← relax(F, F*, k_F = CP.Velocidad_Ajuste_Seg_Alimentaria, dt)
 *
 * t is the model time at the start of the step (`model.t`), P the population after this step's growth, and ε the
 * yield shock `model.yieldShock` (AR(1), drawn by the events step since phase 46, src/sim/events.ts). E is the value of the previous
 * step: F is updated after B and before E (step 8: B → F → E → C → Pc), as in the prototype. No pact moves F.
 *
 * Pure: no React, no randomness, no mutation except `updateFoodSecurity`, which writes the copy advance() owns.
 */
import type { ControlParams, GameState } from '../../types';
import { LandUseType } from '../../types';
import { target100 } from './math';
import { PARAMS_V2, type Pid } from './params';
import type { PolicyEfficiency } from './policies';
import { capImpulses, impulseSum, stepIndicator, type IndicatorState } from './indicators';

type Eff = Partial<Record<Pid, PolicyEfficiency>>;

const FOOD = PARAMS_V2.food;
const prod = (eff: Eff, pid: Pid): number => eff[pid]?.prod ?? 0;
const area = (landUses: GameState['landUses'], k: LandUseType): number => landUses[k]?.area ?? 0;

/** Σ A_k·y_k·(1 + m_k·η_k^prod) over the food-producing uses (CC, CA, PRG), before water, trend, shock and exports. */
function grossYield(landUses: GameState['landUses'], eff: Eff): number {
  const y = FOOD.yield;
  const m = FOOD.yieldPolicy;
  return area(landUses, LandUseType.ConventionalCrops) * y.CC * (1 + m.PAI * prod(eff, 'PAI'))
    + area(landUses, LandUseType.AgroecologicalCrops) * y.CA * (1 + m.AS * prod(eff, 'AS'))
    + area(landUses, LandUseType.GrasslandsPastures) * y.PRG * (1 + m.GS * prod(eff, 'GS'));
}

/** Exported share x = 0.30 + 0.20·η_PEA^prod. */
export const exportShare = (eff: Eff): number => FOOD.export0 + FOOD.exportPEA * prod(eff, 'PEA');

/**
 * Domestic food supply Q (production units per year, net of exports): the prototype's `food_production`. `t` is
 * years since level start (yield trend), `shock` the yield shock ε (fraction).
 */
export function domesticSupply(landUses: GameState['landUses'], eff: Eff, t: number, shock: number): number {
  const m = FOOD.yieldPolicy;
  const q = grossYield(landUses, eff) * (1 + m.AGUA * prod(eff, 'AGUA')) * Math.pow(1 + FOOD.yieldTrend, t) * (1 + shock);
  return (1 - exportShare(eff)) * q;
}

/** Area-weighted relative yield Σ y_k·A_k / ΣA (no policies, no trend): the mean the Territorio food overlay centres on. */
export function meanYield(landUses: GameState['landUses']): number {
  const total = (Object.values(landUses) as { area: number }[]).reduce((sum, lu) => sum + (lu?.area ?? 0), 0);
  return total > 0 ? grossYield(landUses, {}) / total : 0;
}

/** ρ = max(Q/P, 0.001·ρ0): food available per person (production units per person per year). */
export function foodPerCapita(s: IndicatorState, eff: Eff): number {
  const rho0 = s.model.anchors.foodPerCapita0;
  const pop = s.stellaSpecificState.Poblacion_Total;
  const q = domesticSupply(s.landUses, eff, s.model.t, s.model.yieldShock ?? 0);
  return Math.max(pop > 0 ? q / pop : 0, FOOD.rhoFloor * rho0);
}

/** D_F: drive of food security (spec 41 §1). Reads E of the previous step. */
export function driveF(s: IndicatorState, eff: Eff): number {
  const a = s.model.anchors;
  if (!(a.foodPerCapita0 > 0)) return capImpulses(impulseSum(s.model, 'F'));
  let d = FOOD.kappa1 * Math.log(foodPerCapita(s, eff) / a.foodPerCapita0);
  d += FOOD.kappa2 * (s.indicators.economicSecurity - a.E0) / FOOD.econScale;
  d += capImpulses(impulseSum(s.model, 'F'));
  return d;
}

/** F* (0-100). */
export const targetF = (s: IndicatorState, eff: Eff): number => target100(s.model.anchors.l.F, driveF(s, eff));

/** Step 8, second indicator: F relaxes toward F*. Mutates `s.indicators.foodSecurity` and `s.model.targets.F`. */
export function updateFoodSecurity(s: IndicatorState, eff: Eff, CP: ControlParams, dt: number): void {
  const fStar = targetF(s, eff);
  s.indicators.foodSecurity = stepIndicator(s.indicators.foodSecurity, fStar, CP.Velocidad_Ajuste_Seg_Alimentaria, dt);
  s.model.targets = { ...s.model.targets, F: fStar };
}
