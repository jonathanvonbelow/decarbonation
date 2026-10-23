/**
 * Indicators of model 2.0 by relaxation toward an anchored logistic target
 * (mejora-general/files/39_indicadores_por_relajacion.md). Port of the E, C and Pc blocks of
 * `indicators_step` in scripts/reference/modelo_v2.py.
 *
 *   target    X* = 100·σ(ℓ_X0 + D_X)        ℓ_X0 = logit(X0/100), D_X = 0 at level start with no policies
 *   dynamics  X ← X* + (X − X*)·(1 − k_X)^dt  (exact discretisation, `relax`; 12 monthly steps = 1 annual)
 *
 * D_X is a sum of drivers, each a deviation from the level's starting state (anchors, phase 35) or the
 * effect of a policy (0 while inactive), so a level with no policies and the land standing still does not
 * move. The target lives in (0, 100) with no clip per term. k_X are the facilitator's
 * `CP.Velocidad_Ajuste_*`. Phase 40 applies the same frame to B (src/sim/v2/biodiversity.ts); 41–42 to F and the
 * pressures.
 *
 * Fiscal stress φ (`model.fiscal.stress`) is the prototype's sHigh(interest / tax revenue; 0.20, 0.04) on the 1.1
 * economy's stocks (`interestBurdenOf` / `fiscalStressOf`, a bridge until phase 44 ports the 2.0 economy).
 * Not yet here (each arrives with its phase, and is 0 until then): concentration and just transition in the
 * conflict (45). The wear of open situations enters D_C as a shift (phase 42, `wearC`). Situation impulses
 * (`model.impulses`) are read and capped at ±0.6 logit, but nothing writes them before phase 47.
 *
 * Pure: no React, no randomness, no mutation.
 */
import type { ControlParams, GameState, ModelIndicatorKey, ModelState } from '../../types';
import { LandUseType } from '../../types';
import { relax, sHigh, sLow, target100 } from './math';
import { PARAMS_V2, type Pid } from './params';
import type { PolicyEfficiency } from './policies';
import { pactShift } from './pacts';

type Eff = Partial<Record<Pid, PolicyEfficiency>>;
type Channel = 'prod' | 'social' | 'tax';

/** What the targets read of the state. A GameState with its 2.0 sub-state fits. */
export type IndicatorState = Pick<GameState, 'landUses' | 'indicators' | 'stellaSpecificState' | 'pacts' | 'additionalTaxPressurePercentage'>
  & { model: ModelState };

const R = PARAMS_V2.relaxation;

const ch = (eff: Eff, pid: Pid, channel: Channel): number => eff[pid]?.[channel] ?? 0;

/**
 * One relaxation step of a bounded indicator toward its target (exact for any dt). k is a facilitator value
 * (`CP.Velocidad_Ajuste_*`): it is kept in [0, 1] so a typo can neither overshoot (k > 1), diverge (k < 0) nor
 * give NaN in the monthly step ((1 − k)^(1/12) with 1 − k < 0).
 */
export function stepIndicator(x: number, target: number, k: number, dt: number): number {
  return relax(x, target, Math.min(1, Math.max(0, Number.isFinite(k) ? k : 0)), dt);
}

/**
 * Interest burden = interest / tax revenue (prototype `economy_step`): interest on the debt at the start of the
 * step at the level's rate plus the risk premium over D/Y = 0.6, revenue on this step's GDP at the base tax plus τ.
 */
export function interestBurdenOf(
  debt: number, gdpBefore: number, gdpAfter: number, tax: number, level: number, CP: ControlParams,
): number {
  const f = PARAMS_V2.finance;
  const base = (CP[`Tasa_de_interes_Nivel_${level}` as keyof ControlParams] as number) || 0;
  const rate = base + f.riskPremium * Math.max(0, (gdpBefore > 0 ? debt / gdpBefore : 0) - f.debtThreshold);
  const revenue = gdpAfter * (CP.Tasa_Impositiva_General_Sobre_PBI + tax / 100);
  return revenue > 0 ? (rate * Math.max(0, debt)) / revenue : 0;
}

/** φ_fiscal = sHigh(burden; stressMid, stressWidth); 0 without debt. */
export const fiscalStressOf = (burden: number): number =>
  (burden > 0 ? sHigh(burden, PARAMS_V2.finance.stressMid, PARAMS_V2.finance.stressWidth) : 0);

/** Σ of the situation impulses on one indicator still alive at model time t: d·e^(−(t − t_i)/τ). */
export function impulseSum(model: Pick<ModelState, 't' | 'impulses'>, X: ModelIndicatorKey): number {
  return (model.impulses ?? []).reduce(
    (sum, imp) => sum + (imp.indicator === X ? imp.logit * Math.exp(-(model.t - imp.t) / imp.tau) : 0), 0,
  );
}

/** Situation impulses are capped at ±impulseCap logit units per indicator (spec 39 §1). */
export const capImpulses = (v: number): number => Math.max(-R.impulseCap, Math.min(R.impulseCap, v));

const totalArea = (s: Pick<GameState, 'landUses'>): number =>
  (Object.values(s.landUses) as { area: number }[]).reduce((sum, lu) => sum + (lu?.area ?? 0), 0) || 1;

/** Area-weighted productive value V = Σ v_k·a_k (prototype `productive_value`); also the anchor V0 (anchors.ts). */
export function productiveValue(landUses: GameState['landUses']): number {
  const pv = PARAMS_V2.productiveValue;
  return (Object.keys(pv) as (keyof typeof pv)[]).reduce((sum, k) => sum + pv[k] * (landUses[k as LandUseType]?.area ?? 0), 0)
    / totalArea({ landUses });
}

/** D_E: drive of economic security (spec 39 §2). Reads B and F of this step. */
export function driveE(s: IndicatorState, eff: Eff, CP: ControlParams): number {
  const a = s.model.anchors;
  const r = R.E;
  let d = 0;
  (Object.keys(PARAMS_V2.bE) as Pid[]).forEach((j) => { d += PARAMS_V2.bE[j] * ch(eff, j, 'prod'); });
  d -= r.carbonTax * ch(eff, 'CN', 'tax');
  d += r.growth * (s.model.fiscal.growth - CP.Tasa_Base_Crecimiento_PBI) / r.growthScale;
  d += r.landValue * (productiveValue(s.landUses) / a.productiveValue0 - 1);
  d += r.biodiversity * (s.indicators.biodiversity - a.B0) / r.biodiversityScale;
  d -= r.fiscalStress * s.model.fiscal.stress;
  d -= r.tax * (s.additionalTaxPressurePercentage ?? 0);
  // As a deviation from the start (the prototype's −0.6·sLow(F) was not: −0.014 logit at F0 = 35; fixed there, v6/39).
  d -= r.foodCrisis * (sLow(s.indicators.foodSecurity, r.foodCrisisMid, r.foodCrisisWidth) - sLow(a.F0, r.foodCrisisMid, r.foodCrisisWidth));
  d += pactShift(s.pacts, 'E') + capImpulses(impulseSum(s.model, 'E'));
  return d;
}

/** D_C: drive of social conflict (spec 39 §3). Reads F and E of this step and the previous environmentalist pressure. */
export function driveC(s: IndicatorState, eff: Eff, wear = 0): number {
  const a = s.model.anchors;
  const w = PARAMS_V2.conflictWeights;
  const r = R.C;
  const phi = s.model.fiscal.stress;
  let d = w.food * (a.F0 - s.indicators.foodSecurity) / r.foodScale;
  d += w.econ * (a.E0 - s.indicators.economicSecurity) / r.econScale;
  d += w.envPressure * (s.stellaSpecificState.PP_AMBIENTALISTA - a.pressureEnv0) / r.envPressureScale;
  (Object.keys(PARAMS_V2.conflict) as Pid[]).forEach((j) => { d += PARAMS_V2.conflict[j as keyof typeof PARAMS_V2.conflict] * ch(eff, j, 'social'); });
  d += r.subsidyStress * phi * ch(eff, 'SE', 'social');
  (Object.keys(PARAMS_V2.greenRelief) as Pid[]).forEach((j) => { d -= PARAMS_V2.greenRelief[j as keyof typeof PARAMS_V2.greenRelief] * ch(eff, j, 'social'); });
  const total = totalArea(s);
  d += r.shareCC * ((s.landUses[LandUseType.ConventionalCrops]?.area ?? 0) / total - a.shareCC0);
  d += r.sharePF * ((s.landUses[LandUseType.ForestPlantations]?.area ?? 0) / total - a.sharePF0);
  // [concentration and just transition: phase 45]
  d += r.tax * (s.additionalTaxPressurePercentage ?? 0) + r.fiscalStress * phi;
  // Wear of the open situations (Territorio; wired in phase 42, phase 47 ports the situations as impulses).
  d += wear + capImpulses(impulseSum(s.model, 'C'));
  return d;
}

/**
 * D_Pc: drive of political collapse (spec 39 §4). Reads W and E of this step and the pressures of the
 * previous step (they update after, phase 42).
 */
export function drivePc(s: IndicatorState): number {
  const a = s.model.anchors;
  const r = R.Pc;
  const st = s.stellaSpecificState;
  const W = s.indicators.socialWellbeing;
  const pi = [st.PP_AGRICOLA, st.PP_AMBIENTALISTA, st.PP_SOCIAL];
  const mean = (pi[0] + pi[1] + pi[2]) / 3;
  const polarisation = Math.max(...pi) - Math.min(...pi);
  let d = r.wellbeing * (a.W0 - W) / r.wellbeingScale;
  d += r.econ * (a.E0 - s.indicators.economicSecurity) / r.econScale;
  d += r.fiscalStress * s.model.fiscal.stress;
  d += r.polarisation * (polarisation - a.pressureSpread0) / r.polarisationScale;
  d += r.pressureMean * (mean - a.pressureMean0) / r.pressureMeanScale;
  d += pactShift(s.pacts, 'Pc') + capImpulses(impulseSum(s.model, 'Pc'));
  return d;
}

/** E* (0-100). */
export const targetE = (s: IndicatorState, eff: Eff, CP: ControlParams): number => target100(s.model.anchors.l.E, driveE(s, eff, CP));
/** C* (0-100); W* = 100 − C*. */
export const targetC = (s: IndicatorState, eff: Eff, wear = 0): number => target100(s.model.anchors.l.C, driveC(s, eff, wear));
/** Pc* (0-100); St* = 100 − Pc*. */
export const targetPc = (s: IndicatorState): number => target100(s.model.anchors.l.Pc, drivePc(s));

/**
 * Step 8 (E → C (W) → Pc (St)) of advance(): each reads the ones already updated. Mutates `s.indicators`,
 * `s.stellaSpecificState` and `s.model.targets` (advance() owns the copy). B (phase 40, biodiversity.ts) and F
 * (still model 1.1 until phase 41) are updated before and the pressures after (1.1 until phase 42).
 */
export function updateRelaxedIndicators(s: IndicatorState, eff: Eff, CP: ControlParams, dt: number, wearC = 0): void {
  const st = s.stellaSpecificState;
  const eStar = targetE(s, eff, CP);
  s.indicators.economicSecurity = stepIndicator(s.indicators.economicSecurity, eStar, CP.Velocidad_Ajuste_Seg_Economica, dt);
  const cStar = targetC(s, eff, wearC);
  st.Conflicto_social = stepIndicator(st.Conflicto_social, cStar, CP.Velocidad_Ajuste_Conflicto, dt);
  s.indicators.socialWellbeing = 100 - st.Conflicto_social;
  const pcStar = targetPc(s);
  st.Colapso_politico = stepIndicator(st.Colapso_politico, pcStar, CP.Velocidad_Ajuste_Colapso, dt);
  s.indicators.politicalStability = 100 - st.Colapso_politico;
  s.model.targets = { ...s.model.targets, E: eStar, C: cStar, Pc: pcStar };
}
