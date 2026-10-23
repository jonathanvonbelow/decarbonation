/**
 * Land use of model 2.0 (mejora-general/files/37_uso_del_suelo_matriz.md): a conservative transition
 * matrix with fallow and an agricultural reallocation pool driven by anchored rents. Port of `land_step`,
 * `move_land` and `apply_land_effects` of scripts/reference/modelo_v2.py.
 *
 *   frontier   F(BNNP→BNP) = A_BNNP·(r₁ + 0,05·η_CR)·m_protect
 *              F(BNNP→CC)  = A_BNNP·(r₂ + 0,04·η_PAI + 0,01·η_FRA)·(1 − η_CR)·m_deforest
 *              F(BNNP→CA)  = A_BNNP·(r₃ + 0,02·η_AS)·(1 − η_CR)
 *              F(CA→BNNP)  = A_CA·(r₄ + 0,01·η_AS)
 *              F(RES→BNP)  = A_RES·r₅,   F(FAL→BNNP) = A_FAL·0,05
 *              (η^land; r₁…r₅ are CONTROL_PARAMS Tasa_de_*_Base)
 *   pool       Σ_{k∈CC,CA,PRG,PF} 0,02·A_k + 0,25·A_FAL, split with weights e^{β·r_k},
 *              r_k = ln(A_k,0) + Δr_k(η^prod)  — anchored: with no policy the pool keeps the starting mix
 *   netting    every pair i⇄j keeps only its positive difference (the prototype nets all pairs, also the
 *              frontier BNNP⇄CA, and c₀ of phase 38 depends on it; docs/v6-spec-vs-motor.md, phase 37)
 *   apply      out_i = Σ_j F(i→j)·dt, scale_i = min(1, A_i/out_i); A_i −= F·dt·scale_i, A_j += the same
 *
 * Σ A is conserved exactly (every term moves area from one use to another). Pure: no React, no randomness.
 */
import type { ControlParams, GameState, LandUse, ModelAnchors } from '../../types';
import { LandUseType } from '../../types';
import { AGRI_CODES, PARAMS_V2, type AgriCode, type Pid } from './params';
import type { PolicyEfficiency } from './policies';

/** kHa → ha. */
export const HA_PER_KHA = 1000;

const LU = LandUseType;

/** Every land use, in the order of the enum. */
export const LAND_USE_TYPES = Object.values(LandUseType) as LandUseType[];

/** One annual transition rate between two uses, in kHa/yr (`landFlows`) or kHa moved (`applyLandFlows`). */
export interface TransitionFlow {
  from: LandUseType;
  to: LandUseType;
  kHa: number;
}

/** A transition actually applied this step: kHa moved (× dt, scaled) and the same in hectares. */
export interface RealisedLandFlow extends TransitionFlow {
  ha: number;
}

/**
 * Multipliers of the frontier flows that active pacts set (`pactLandFactors`, src/sim/v2/pacts.ts, phase 43):
 * `tasa_BNNP_a_BNP` is the prototype's m_protect (Π protectFactor), `tasa_BNNP_a_CC` its m_deforest (Π deforestFactor);
 * the CA flows stay 1. 1 by default.
 */
export interface LandUseChangeFactors {
  tasa_BNNP_a_BNP: number;
  tasa_BNNP_a_CC: number;
  tasa_BNNP_a_CA: number;
  tasa_CA_a_BNNP: number;
}

export const DEFAULT_LAND_USE_CHANGE_FACTORS: LandUseChangeFactors = {
  tasa_BNNP_a_BNP: 1, tasa_BNNP_a_CC: 1, tasa_BNNP_a_CA: 1, tasa_CA_a_BNNP: 1,
};

/** Effective efficiencies by policy (a missing policy counts as η = 0, e.g. the level-start dry run). */
export type LandEfficiencies = Partial<Record<Pid, PolicyEfficiency>>;

/** What the matrix reads from the state: the areas and, when the state has one, its anchored agricultural mix. */
export interface LandFlowInput {
  landUses: Record<LandUseType, LandUse>;
  model?: { anchors: Pick<ModelAnchors, 'agriAreas0'> };
}

const areaOf = (landUses: Record<LandUseType, LandUse>, k: LandUseType): number => Math.max(0, landUses[k]?.area ?? 0);

/** Anchored areas of the agricultural pool: the level's starting mix, or the current one when there is no anchor yet. */
function anchorAreas(input: LandFlowInput): Record<AgriCode, number> {
  const stored = input.model?.anchors?.agriAreas0;
  const out = {} as Record<AgriCode, number>;
  AGRI_CODES.forEach((k) => {
    out[k] = Math.max(stored?.[k] ?? areaOf(input.landUses, k as LandUseType), PARAMS_V2.land.zeroAnchor);
  });
  return out;
}

/** Σ_p coef_p·η_p over a coefficient table. */
function weighted(table: Partial<Record<string, number>>, eff: LandEfficiencies, channel: 'land' | 'prod'): number {
  return Object.entries(table).reduce((sum, [pid, coef]) => sum + (coef ?? 0) * (eff[pid as Pid]?.[channel] ?? 0), 0);
}

/**
 * Annual transition rates (kHa/yr) of the conservative matrix for the current areas, after netting.
 * Frontier flows read η^land, the agricultural rents η^prod and CN's carbon tax η_CN^tax. Zero flows are
 * dropped. Does not modify `input`.
 */
export function landFlows(
  input: LandFlowInput,
  eff: LandEfficiencies,
  CP: ControlParams,
  factors: LandUseChangeFactors = DEFAULT_LAND_USE_CHANGE_FACTORS,
): TransitionFlow[] {
  const d = PARAMS_V2.land;
  const A = (k: LandUseType) => areaOf(input.landUses, k);
  const etaCR = eff.CR?.land ?? 0;
  const rates = new Map<string, number>();
  const key = (i: LandUseType, j: LandUseType) => `${i}>${j}`;
  const add = (i: LandUseType, j: LandUseType, f: number) => rates.set(key(i, j), (rates.get(key(i, j)) ?? 0) + f);

  // Frontier and protection (model 1.1 rates).
  add(LU.UnprotectedNativeForest, LU.ProtectedNativeForest,
    A(LU.UnprotectedNativeForest) * (CP.Tasa_de_BNNP_a_BNP_Base + weighted(d.frontier.BNNP_BNP, eff, 'land')) * factors.tasa_BNNP_a_BNP);
  add(LU.UnprotectedNativeForest, LU.ConventionalCrops,
    A(LU.UnprotectedNativeForest) * (CP.Tasa_de_BNNP_a_CC_Base + weighted(d.frontier.BNNP_CC, eff, 'land')) * (1 - etaCR) * factors.tasa_BNNP_a_CC);
  add(LU.UnprotectedNativeForest, LU.AgroecologicalCrops,
    A(LU.UnprotectedNativeForest) * (CP.Tasa_de_BNNP_a_CA_Base + weighted(d.frontier.BNNP_CA, eff, 'land')) * (1 - etaCR) * factors.tasa_BNNP_a_CA);
  add(LU.AgroecologicalCrops, LU.UnprotectedNativeForest,
    A(LU.AgroecologicalCrops) * (CP.Tasa_de_CA_a_BNNP_Base + weighted(d.frontier.CA_BNNP, eff, 'land')) * factors.tasa_CA_a_BNNP);
  add(LU.RestorationForest, LU.ProtectedNativeForest, A(LU.RestorationForest) * CP.Tasa_de_RES_a_BNP_Base);
  add(LU.Fallow, LU.UnprotectedNativeForest, A(LU.Fallow) * d.fallowRegen);

  // Agricultural reallocation pool with anchored rents.
  const A0 = anchorAreas(input);
  const w = {} as Record<AgriCode, number>;
  AGRI_CODES.forEach((k) => {
    let rent = Math.log(A0[k]) + weighted(d.rent[k], eff, 'prod');
    if (k === 'CC') rent += d.rentCarbonTaxCC * (eff.CN?.tax ?? 0);
    w[k] = Math.exp(d.rentBeta * rent);
  });
  const tw = AGRI_CODES.reduce((sum, k) => sum + w[k], 0);
  const poolFrom: [LandUseType, number][] = AGRI_CODES.map((k) => [k as LandUseType, A(k as LandUseType) * d.poolShare]);
  poolFrom.push([LU.Fallow, A(LU.Fallow) * d.fallowReentry]);
  poolFrom.forEach(([src, amt]) => {
    AGRI_CODES.forEach((k) => { if (k !== src) add(src, k as LandUseType, amt * w[k] / tw); });
  });

  // Net every bilateral pair: the pool is an allocation device, only net transitions are real.
  [...rates.keys()].forEach((k) => {
    const [i, j] = k.split('>');
    const back = `${j}>${i}`;
    if (i < j && rates.has(back)) {
      const net = rates.get(k)! - rates.get(back)!;
      rates.set(k, Math.max(net, 0));
      rates.set(back, Math.max(-net, 0));
    }
  });

  const out: TransitionFlow[] = [];
  rates.forEach((kHa, k) => {
    if (!(kHa > 0)) return;
    const [from, to] = k.split('>') as [LandUseType, LandUseType];
    out.push({ from, to, kHa });
  });
  return out;
}

/**
 * Scales one step of `flows` (annual rates × dt) so no use goes below zero: each source loses at most what
 * it holds, `scale_i = min(1, A_i / Σ_j F(i→j)·dt)`. The amounts are what `applyLandFlows` moves.
 */
export function realiseLandFlows(
  landUses: Record<LandUseType, LandUse>,
  flows: TransitionFlow[],
  dt: number,
): RealisedLandFlow[] {
  const out = new Map<LandUseType, number>();
  flows.forEach((f) => out.set(f.from, (out.get(f.from) ?? 0) + f.kHa * dt));
  return flows.map((f) => {
    const total = out.get(f.from) ?? 0;
    const scale = total > 0 ? Math.min(1, areaOf(landUses, f.from) / total) : 1;
    const kHa = f.kHa * dt * scale;
    return { from: f.from, to: f.to, kHa, ha: kHa * HA_PER_KHA };
  });
}

/**
 * Applies one step of the matrix to `landUses` in place (advance() owns the copy) and returns the flows
 * realised, in kHa and ha. Conserves Σ A exactly.
 */
export function applyLandFlows(
  landUses: Record<LandUseType, LandUse>,
  flows: TransitionFlow[],
  dt: number,
): RealisedLandFlow[] {
  const realised = realiseLandFlows(landUses, flows, dt);
  realised.forEach((f) => {
    landUses[f.from].area -= f.kHa;
    landUses[f.to].area += f.kHa;
  });
  return realised;
}

/** Moves `kHa` from `from` to `to`, clamped to what `from` holds. Returns the amount moved. */
export function transferArea(
  landUses: Record<LandUseType, LandUse>,
  from: LandUseType,
  to: LandUseType,
  kHa: number,
): number {
  if (from === to || !landUses[from] || !landUses[to]) return 0;
  const amt = Math.max(0, Math.min(kHa, landUses[from].area));
  if (amt <= 0) return 0;
  landUses[from].area -= amt;
  landUses[to].area += amt;
  return amt;
}

/** Order in which a loose positive land effect takes its area (spec 37 §3). */
export const LOOSE_GAIN_SOURCES: LandUseType[] = [LU.Fallow, LU.GrasslandsPastures, LU.ConventionalCrops];

/** A land effect of an event or a situation option: `kHa` (signed) on `target`. */
export interface LandEffect {
  target: LandUseType;
  kHa: number;
}

/**
 * Applies a list of land effects conservatively (spec 37 §3 + the phase-32 rule of the prototype's
 * `apply_land_effects`). Effects of opposite sign inside one list are pairs: a direct transfer
 * origin → destination (situations write them as ± pairs, e.g. CA +6 / CC −6). What is left unpaired:
 * a loose negative goes to fallow; a loose positive comes from fallow, then PRG, then CC. If an origin is
 * short only what exists moves, and the unmet part of a pair is not taken from anywhere else.
 * Mutates `landUses`; returns the transfers made.
 */
export function applyLandEffects(landUses: Record<LandUseType, LandUse>, effects: LandEffect[]): TransitionFlow[] {
  const moved: TransitionFlow[] = [];
  const move = (from: LandUseType, to: LandUseType, kHa: number): number => {
    const amt = transferArea(landUses, from, to, kHa);
    if (amt > 0) moved.push({ from, to, kHa: amt });
    return amt;
  };
  const neg = effects.filter((e) => e.kHa < 0).map((e) => ({ target: e.target, left: -e.kHa }));
  const pos = effects.filter((e) => e.kHa > 0).map((e) => ({ target: e.target, left: e.kHa }));
  neg.forEach((n) => {
    for (const p of pos) {
      if (n.left <= 0) break;
      if (p.left <= 0 || p.target === n.target) continue;
      const want = Math.min(n.left, p.left);
      move(n.target, p.target, want);
      n.left -= want;
      p.left -= want;
    }
    if (n.left > 0) move(n.target, LU.Fallow, n.left);
  });
  pos.forEach((p) => {
    for (const src of LOOSE_GAIN_SOURCES) {
      if (p.left <= 0) break;
      if (src !== p.target) p.left -= move(src, p.target, p.left);
    }
  });
  return moved;
}

/** Total area of a state, kHa. */
export const totalLandArea = (landUses: GameState['landUses']): number =>
  LAND_USE_TYPES.reduce((sum, k) => sum + (landUses[k]?.area ?? 0), 0);
