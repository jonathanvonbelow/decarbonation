/**
 * Biodiversity of model 2.0 by the countryside species-area relation (mejora-general/files/40_biodiversidad_especies_area.md).
 * Port of the B block of `indicators_step` in scripts/reference/modelo_v2.py, in the logistic frame of phase 39:
 *
 *   H   = Σ h_i·a_i                         effective habitat (affinity h_i ∈ [0, 1], a_i = A_i / ΣA)
 *   γ_H = z / (1 − B0/100)                   z = 0.35: the SAR ΔB/B = z·Δln H written in logit space at B0
 *   D_B = γ_H·ln(H/H0) + Σ qB_j·η_j^land + 0.10·min(η_AS, η_CR) − 0.12·min(η_PAI, η_FRA)
 *       + γ_K·ln(K/K0)                       landscape connectivity, Territorio only (read from the map)
 *       + pact shifts + cap(situation impulses)
 *   B*  = 100·σ(ℓ_B0 + D_B);   B ← relax(B, B*, k_B = CP.Velocidad_Ajuste_Biodiversidad, dt)
 *
 * Source of the form and of z: Pereira, Ziv & Miranda (2014), Conservation Biology 28(3). The habitat affinities, qB
 * and the synergies are PARAMS_V2.habitat / qB / biodiversity (criterio experto, prototype values). The synergies are
 * continuous (min of the two efficiencies); in 1.1 they were a fixed bonus whenever both policies were on.
 *
 * Connectivity K (the map's share of forest in its largest 4-connected patch, `forestConnectivity` in
 * src/sim/territory.ts) enters only when the caller passes it (`AdvanceOptions.connectivity`): the engine does not
 * know the map, and the 3-level game has none, so there the term is 0. The prototype does not model K.
 *
 * Pure: no React, no randomness, no mutation except `updateBiodiversity`, which writes the copy advance() owns.
 */
import type { ControlParams, GameState } from '../../types';
import { LandUseType } from '../../types';
import { target100 } from './math';
import { PARAMS_V2, type LandCode, type Pid } from './params';
import type { PolicyEfficiency } from './policies';
import { capImpulses, impulseSum, stepIndicator, type IndicatorState } from './indicators';
import { pactShift } from './pacts';

type Eff = Partial<Record<Pid, PolicyEfficiency>>;

/** Landscape connectivity of the Territorio map: K now and K0 at the start of the game (both 0-1). */
export interface Connectivity { K: number; K0: number }

const HAB = PARAMS_V2.habitat;
const BIO = PARAMS_V2.biodiversity;

/** H = Σ h_i·A_i / ΣA (prototype `habitat`); also the anchor habitat0 (anchors.ts). */
export function habitatIndex(landUses: GameState['landUses']): number {
  let weighted = 0;
  let total = 0;
  (Object.keys(HAB) as LandCode[]).forEach((k) => {
    const area = landUses[k as LandUseType]?.area ?? 0;
    weighted += HAB[k] * area;
    total += area;
  });
  return total > 0 ? weighted / total : 0;
}

const land = (eff: Eff, pid: Pid): number => eff[pid]?.land ?? 0;

/** γ_K·ln(K/K0), with K floored at `connectivityFloor`·K0 (a map with no forest left stays finite); 0 without a map. */
export function connectivityTerm(connectivity?: Connectivity): number {
  if (!connectivity || !(connectivity.K0 > 0) || !Number.isFinite(connectivity.K)) return 0;
  const K = Math.max(connectivity.K, BIO.connectivityFloor * connectivity.K0);
  return BIO.connectivityGamma * Math.log(K / connectivity.K0);
}

/** D_B: drive of biodiversity (spec 40 §1). */
export function driveB(s: IndicatorState, eff: Eff, connectivity?: Connectivity): number {
  const a = s.model.anchors;
  const gammaH = PARAMS_V2.zSAR / (1 - Math.min(a.B0, BIO.gammaMaxB0) / 100);
  const H = habitatIndex(s.landUses);
  // Every affinity is > 0, so H > 0 whenever there is land; the guard only covers a hand-built empty state.
  let d = a.habitat0 > 0 && H > 0 ? gammaH * Math.log(H / a.habitat0) : 0;
  (Object.keys(PARAMS_V2.qB) as Pid[]).forEach((j) => { d += PARAMS_V2.qB[j] * land(eff, j); });
  d += BIO.synergyAgroConservation * Math.min(land(eff, 'AS'), land(eff, 'CR'));
  d -= BIO.synergyIntensiveFlexible * Math.min(land(eff, 'PAI'), land(eff, 'FRA'));
  d += connectivityTerm(connectivity);
  d += pactShift(s.pacts, 'B') + capImpulses(impulseSum(s.model, 'B'));
  return d;
}

/** B* (0-100). */
export const targetB = (s: IndicatorState, eff: Eff, connectivity?: Connectivity): number =>
  target100(s.model.anchors.l.B, driveB(s, eff, connectivity));

/** Step 8, first indicator: B relaxes toward B*. Mutates `s.indicators.biodiversity` and `s.model.targets.B`. */
export function updateBiodiversity(s: IndicatorState, eff: Eff, CP: ControlParams, dt: number, connectivity?: Connectivity): void {
  const bStar = targetB(s, eff, connectivity);
  s.indicators.biodiversity = stepIndicator(s.indicators.biodiversity, bStar, CP.Velocidad_Ajuste_Biodiversidad, dt);
  s.model.targets = { ...s.model.targets, B: bStar };
}
