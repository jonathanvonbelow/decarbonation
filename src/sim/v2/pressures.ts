/**
 * Sectoral political pressures of model 2.0 (mejora-general/files/42_presiones_sectoriales.md): the agricultural,
 * environmentalist and social pressures relax toward an anchored logistic target — the S response the manual
 * describes — instead of the 1.1 linear impulse with dissipation that left them at 0 or 100. Port of the pressure
 * block of `indicators_step` in scripts/reference/modelo_v2.py, in the frame of phase 39:
 *
 *   σ_prod = a_prod / a_prod,0,   a_prod = (A_CC + A_CA + A_PRG)/ΣA  (PF is not in the productive share)
 *   D_πa = σ_prod·Σ_j φa_j·η_j^social/15 + 0.03·(E0 − E) + 0.02·(F0 − F) + 4.0·(a_prod,0 − a_prod) + wear_a + cap(imp πa)
 *   D_πe =        Σ_j φe_j·η_j^social/15 + 0.035·(B0 − B) + 1.5·(c − c0)/c0                      + wear_e + cap(imp πe)
 *   D_πs =        Σ_j φs_j·η_j^social/15 + 0.04·(W0 − W) + 0.04·τ                                 + wear_s + cap(imp πs)
 *   π_k* = 100·σ(ℓ_πk0 + D_πk);   π_k ← relax(π_k, π_k*, k_π = CP.Velocidad_Ajuste_Presiones, dt)
 *
 * Step 8, last (after B → F → E → C (W) → Pc (St)): the drivers read the B, F, E and W of this step and the c of
 * step 7; D_C and D_Pc read the pressures of the previous step, as in the prototype. Only the policy sum of π_a
 * scales with the sector's size. The prototype uses its uniform `eta`; here the spec's social channel (equal with an
 * even instrument split). The wear of the Territorio situations still open enters as a target shift through `wear`
 * (`AdvanceOptions.wear`, from `wearShift` in src/territorio/situations/index.ts; 0 in the 3-level game).
 *
 * Pure: no React, no randomness; `updatePressures` writes the copy advance() owns.
 */
import type { ControlParams } from '../../types';
import { LandUseType } from '../../types';
import { target100 } from './math';
import { PARAMS_V2, type Pid } from './params';
import type { PolicyEfficiency } from './policies';
import { capImpulses, impulseSum, stepIndicator, type IndicatorState } from './indicators';

type Eff = Partial<Record<Pid, PolicyEfficiency>>;

const PR = PARAMS_V2.pressure;

/** Logit shift of open situations on each pressure's target (phase 47). */
export interface PressureWear { a?: number; e?: number; s?: number }

export interface PressureTargets { a: number; e: number; s: number }

const social = (eff: Eff, pid: Pid): number => eff[pid]?.social ?? 0;

/** Σ_j φ_j·η_j^social / phiScale over one pressure's table (logit units). */
function policySum(table: Partial<Record<Pid, number>>, eff: Eff): number {
  let sum = 0;
  (Object.keys(table) as Pid[]).forEach((j) => { sum += (table[j] ?? 0) * social(eff, j); });
  return sum / PR.phiScale;
}

/** a_prod = (A_CC + A_CA + A_PRG)/ΣA, the prototype's `productive_share` (PF is not in it). */
export function productiveShare(landUses: IndicatorState['landUses']): number {
  const total = (Object.values(landUses) as { area: number }[]).reduce((sum, lu) => sum + (lu?.area ?? 0), 0);
  if (!(total > 0)) return 0;
  const a = (k: LandUseType): number => landUses[k]?.area ?? 0;
  return (a(LandUseType.ConventionalCrops) + a(LandUseType.AgroecologicalCrops) + a(LandUseType.GrasslandsPastures)) / total;
}

const sizeOf = (share: number, share0: number): number => (share0 > 0 ? share / share0 : 1);

/** σ_prod = a_prod / a_prod,0 (1 at level start; 1 if the anchor is 0, so a level with no farmland keeps the policy term). */
export const sectorSize = (s: IndicatorState): number => sizeOf(productiveShare(s.landUses), s.model.anchors.productiveShare0);

/** D_πa, D_πe, D_πs (logit units). */
export function drivePressures(s: IndicatorState, eff: Eff, wear: PressureWear = {}): PressureTargets {
  const a = s.model.anchors;
  const d = PR.drivers;
  const ind = s.indicators;
  const share = productiveShare(s.landUses);
  let da = sizeOf(share, a.productiveShare0) * policySum(PR.a, eff);
  da += d.a.econ * (a.E0 - ind.economicSecurity) + d.a.food * (a.F0 - ind.foodSecurity) + d.a.prodShare * (a.productiveShare0 - share);
  da += (wear.a ?? 0) + capImpulses(impulseSum(s.model, 'pa'));
  let de = policySum(PR.e, eff);
  de += d.e.biodiversity * (a.B0 - ind.biodiversity);
  if (a.c0 > 0) de += d.e.co2 * (ind.co2EqEmissionsPerCapita - a.c0) / a.c0;
  de += (wear.e ?? 0) + capImpulses(impulseSum(s.model, 'pe'));
  let ds = policySum(PR.s, eff);
  ds += d.s.wellbeing * (a.W0 - ind.socialWellbeing) + d.s.tax * (s.additionalTaxPressurePercentage ?? 0);
  ds += (wear.s ?? 0) + capImpulses(impulseSum(s.model, 'ps'));
  return { a: da, e: de, s: ds };
}

/** π_a*, π_e*, π_s* (0-100): `targetPressures(state, eff, wear)` of the spec (k_π is applied in `updatePressures`). */
export function targetPressures(s: IndicatorState, eff: Eff, wear: PressureWear = {}): PressureTargets {
  const l = s.model.anchors.l;
  const d = drivePressures(s, eff, wear);
  return { a: target100(l.pa, d.a), e: target100(l.pe, d.e), s: target100(l.ps, d.s) };
}

/**
 * Step 8, last: the three pressures relax toward their targets (exact for any dt). Mutates
 * `s.stellaSpecificState.PP_*`, `s.indicators.pp*` and `s.model.targets` (advance() owns the copy).
 */
export function updatePressures(s: IndicatorState, eff: Eff, CP: ControlParams, dt: number, wear: PressureWear = {}): void {
  const st = s.stellaSpecificState;
  const t = targetPressures(s, eff, wear);
  const k = CP.Velocidad_Ajuste_Presiones;
  st.PP_AGRICOLA = stepIndicator(st.PP_AGRICOLA, t.a, k, dt);
  st.PP_AMBIENTALISTA = stepIndicator(st.PP_AMBIENTALISTA, t.e, k, dt);
  st.PP_SOCIAL = stepIndicator(st.PP_SOCIAL, t.s, k, dt);
  s.indicators.ppAgricola = st.PP_AGRICOLA;
  s.indicators.ppAmbientalista = st.PP_AMBIENTALISTA;
  s.indicators.ppSocial = st.PP_SOCIAL;
  s.model.targets = { ...s.model.targets, pa: t.a, pe: t.e, ps: t.s };
}
