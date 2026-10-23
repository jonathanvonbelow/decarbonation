/**
 * Distributive conflict of model 2.0 (mejora-general/files/45_conflicto_distributivo.md): land concentration and
 * just transition. Port of `concentration()` and of the restriction / support / just block of `indicators_step` in
 * scripts/reference/modelo_v2.py.
 *
 *   G       = (A_CC + A_PF) / (A_CC + A_CA + A_PRG + A_PF)          concentration of the productive land in scale uses
 *   R_load  = Σ_j w_j^R · η_j · χ_j^R                                load of the instruments tagged `restriction`
 *   Support = Σ_j w_j^S · η_j · χ_j^S                                weight of the instruments tagged `support`
 *   J       = Support / (Support + R_load)   (1 when both are 0)    just-transition index ∈ [0, 1]
 *
 * χ_j^R / χ_j^S are channel strengths (policies.ts `channelStrength`) whose relevance is the 0/1 mask of the
 * INSTRUMENT_CHANNELS tags of policy j: with an even 25/25/25/25 split they are 1, so R_load and Support are exactly the
 * prototype's constants (w^R: CR 1.0, CN 0.5, AGUA 0.3; w^S: AS 0.5, GS 0.5 — PARAMS_V2.justTransition). Moving the
 * effort changes them: Natural Conservation with all of it in PSA (support) has χ^R = 0, all in park rangers χ^R ≈ 0.99.
 * Spec §1 says "each restriction instrument adds η_j·e_jk/100": with an even split that gives CR 0.5, CN 0.25,
 * AS 1.0 … — not the prototype's constants the spec says it reproduces; the masked channel does (log, phase 45).
 *
 * D_C += ν_G·(G − G0) + ν_J·(1 − J)·R_load   (conflictWeights.gini / .just; indicators.ts driveC).
 *
 * Pure: no React, no randomness, no mutation.
 */
import type { GameState, LandUseType, PolicyState } from '../../types';
import { AGRI_CODES, INSTRUMENT_CHANNELS, PARAMS_V2, PID, type LandCode, type Pid } from './params';
import { channelStrength, effortsOf, type PolicyEfficiency } from './policies';

type Eff = Partial<Record<Pid, PolicyEfficiency>>;

/** G: share of the productive land (CC + CA + PRG + PF) in conventional crops and plantations. 0 with no productive land. */
export function landConcentration(landUses: GameState['landUses']): number {
  const a = (k: LandCode): number => landUses[k as LandUseType]?.area ?? 0;
  const prod = AGRI_CODES.reduce((sum, k) => sum + a(k), 0);
  return prod > 0 ? (a('CC') + a('PF')) / prod : 0;
}

export interface JustTransition {
  /** R_load (dimensionless, ≈ efficiency units). */
  restrictionLoad: number;
  /** Support (same units). */
  support: number;
  /** J ∈ [0, 1]; 1 when no restriction and no support is active. */
  justTransition: number;
}

const maskOf = (pid: Pid, tag: 'support' | 'restriction'): number[] => INSTRUMENT_CHANNELS[pid].tag.map((t) => (t === tag ? 1 : 0));

function loadOf(policies: Record<string, PolicyState>, eff: Eff, weights: Partial<Record<Pid, number>>, tag: 'support' | 'restriction'): number {
  let sum = 0;
  (Object.keys(weights) as Pid[]).forEach((pid) => {
    const base = eff[pid]?.base ?? 0;
    const p = policies[PID[pid]];
    if (!(base > 0) || !p) return;
    sum += (weights[pid] ?? 0) * base * channelStrength(effortsOf(p, pid), maskOf(pid, tag));
  });
  return sum;
}

/** R_load, Support and J of the active policies this step (see the module comment). */
export function justTransition(policies: Record<string, PolicyState>, eff: Eff): JustTransition {
  const w = PARAMS_V2.justTransition;
  const restrictionLoad = loadOf(policies, eff, w.restriction, 'restriction');
  const support = loadOf(policies, eff, w.support, 'support');
  const den = support + restrictionLoad;
  return { restrictionLoad, support, justTransition: den > 0 ? support / den : 1 };
}

/** G and the just-transition index of one step, computed once (driveC and `model.social` read the same values). */
export interface SocialIndices { concentration: number; jt: JustTransition }

export function socialIndices(landUses: GameState['landUses'], policies: Record<string, PolicyState>, eff: Eff): SocialIndices {
  return { concentration: landConcentration(landUses), jt: justTransition(policies, eff) };
}

/** The two distributive terms of D_C: ν_G·(G − G0) + ν_J·(1 − J)·R_load. */
export function distributiveDrive(G: number, G0: number, jt: JustTransition): number {
  const cw = PARAMS_V2.conflictWeights;
  return cw.gini * (G - G0) + cw.just * (1 - jt.justTransition) * jt.restrictionLoad;
}
