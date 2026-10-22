/**
 * Anchors of model 2.0 (mejora-general/files/35_motor_v2_estructura.md §8): reference values of the
 * level's starting state. Every 2.0 driver is written as a deviation from these, so at t = 0 with no
 * policies each logistic target equals the starting value (00_INDICE_v6 decision 6).
 *
 * Mirrors the anchor block of `new_state` in scripts/reference/modelo_v2.py, including its dry run of
 * the first year's land flows for the starting CO2 (`carbon(s, flows_ha=land_step(deepcopy(s), 1))`).
 * At level start no policy and no pact is active, so every effective efficiency is 0, the renewable
 * share and efficiency gain are 0 and income per capita equals its reference: the dry run below is the
 * prototype's land_step / carbon evaluated at that point. Phases 37–38 port the full matrix and carbon
 * model; they should call those functions here instead (same numbers at t = 0, covered by core.spec.ts).
 *
 * Population: the anchors use CP.Poblacion_Inicial (400 000, decision 4), not the 1.1 Poblacion_Total
 * (10 million), which the 1.1 engine still reads until phase 38 switches it.
 */
import type { ControlParams, GameState, LandUseType, ModelAnchors, ModelState } from '../../types';
import { MODEL_VERSION } from '../version';
import { logit } from './math';
import { AGRI_CODES, PARAMS_V2, type LandCode } from './params';

export type AnchorInput = Pick<GameState, 'currentLevel' | 'landUses' | 'indicators' | 'stellaSpecificState'>;

const LAND_CODES: LandCode[] = ['BNNP', 'BNP', 'CA', 'CC', 'PF', 'PRG', 'HUM', 'RES', 'ENR', 'FAL'];
/** Molar mass ratio CO2 / C. */
const CO2_PER_C = 44 / 12;
/** kHa → ha. */
const HA_PER_KHA = 1000;

type Areas = Record<LandCode, number>;

/** Areas in kHa by land code; FAL (fallow, phase 37) is 0 until the code has it. */
export function areasByCode(landUses: GameState['landUses']): Areas {
  const out = {} as Areas;
  LAND_CODES.forEach((k) => { out[k] = landUses[k as LandUseType]?.area ?? 0; });
  return out;
}

const totalOf = (A: Areas): number => LAND_CODES.reduce((sum, k) => sum + A[k], 0);

/**
 * Realised land flows (ha) of one year from `A` with every efficiency at 0 and no pacts: `land_step` of
 * the prototype at level start (base rates, fallow, anchored-rent reallocation pool, bilateral netting,
 * scaling so no use goes below zero). `A` is not modified.
 */
export function dryRunLandFlows(A: Areas): Map<string, number> {
  const d = PARAMS_V2.land;
  const flows = new Map<string, number>();
  const key = (i: LandCode, j: LandCode) => `${i}>${j}`;
  const add = (i: LandCode, j: LandCode, f: number) => flows.set(key(i, j), (flows.get(key(i, j)) ?? 0) + f);
  add('BNNP', 'BNP', A.BNNP * d.BNNP_BNP);
  add('BNNP', 'CC', A.BNNP * d.BNNP_CC);
  add('BNNP', 'CA', A.BNNP * d.BNNP_CA);
  add('CA', 'BNNP', A.CA * d.CA_BNNP);
  add('RES', 'BNP', A.RES * d.RES_BNP);
  add('FAL', 'BNNP', A.FAL * d.fallowRegen);
  // Reallocation pool: anchored rents are log(A0), so at the anchor the weights are proportional to area.
  const w = {} as Record<string, number>;
  AGRI_CODES.forEach((k) => { w[k] = Math.exp(d.rentBeta * Math.log(Math.max(A[k], 1e-6))); });
  const tw = AGRI_CODES.reduce((sum, k) => sum + w[k], 0);
  const poolFrom: [LandCode, number][] = AGRI_CODES.map((k) => [k, A[k] * d.poolShare] as [LandCode, number]);
  poolFrom.push(['FAL', A.FAL * d.fallowReentry]);
  poolFrom.forEach(([src, amt]) => {
    AGRI_CODES.forEach((k) => { if (k !== src) add(src, k, amt * w[k] / tw); });
  });
  // Net bilateral flows: the pool is an allocation device, only net transitions are real.
  [...flows.keys()].forEach((k) => {
    const [i, j] = k.split('>') as [LandCode, LandCode];
    const back = key(j, i);
    if (flows.has(back) && i < j) {
      const net = flows.get(k)! - flows.get(back)!;
      flows.set(k, Math.max(net, 0));
      flows.set(back, Math.max(-net, 0));
    }
  });
  const out = {} as Record<string, number>;
  flows.forEach((f, k) => { const i = k.split('>')[0]; out[i] = (out[i] ?? 0) + f; });
  const realised = new Map<string, number>();
  flows.forEach((f, k) => {
    const i = k.split('>')[0] as LandCode;
    const scale = out[i] > 0 ? Math.min(1, A[i] / out[i]) : 1;
    realised.set(k, f * scale * HA_PER_KHA);
  });
  return realised;
}

/** Starting emissions (tCO2e/yr) by source: energy at the level's eps0, AFOLU flux and LUC of the dry run. */
export function startingEmissions(level: number, A: Areas, population: number): ModelState['emissions'] {
  const e = PARAMS_V2.energy;
  // No renewables or efficiency yet and income = reference: the electric/other split weighs 1, so
  // energy per capita is the level's eps0 (phase 38 adds the split, renewables and efficiency).
  const eps = e.eps0[level] ?? e.eps0[1];
  const energy = eps * population;
  const afolu = LAND_CODES.reduce((sum, k) => sum + PARAMS_V2.flux[k] * A[k] * HA_PER_KHA, 0);
  let luc = 0;
  dryRunLandFlows(A).forEach((amt, k) => {
    const [i, j] = k.split('>') as [LandCode, LandCode];
    luc += amt * Math.max(0, PARAMS_V2.stock[i] - PARAMS_V2.stock[j]) * CO2_PER_C;
  });
  return { energy, afolu, luc, total: energy + afolu + luc };
}

/** Anchors of the starting state of a level (see the module comment). */
export function computeAnchors(state: AnchorInput, CP: ControlParams): ModelAnchors {
  return anchorsAndEmissions(state, CP).anchors;
}

function anchorsAndEmissions(state: AnchorInput, CP: ControlParams): { anchors: ModelAnchors; emissions: ModelState['emissions'] } {
  const A = areasByCode(state.landUses);
  const total = totalOf(A) || 1;
  const ind = state.indicators;
  const st = state.stellaSpecificState;
  const pop = CP.Poblacion_Inicial;

  const habitat0 = LAND_CODES.reduce((sum, k) => sum + PARAMS_V2.habitat[k] * A[k], 0) / total;
  const pv = PARAMS_V2.productiveValue;
  const productiveValue0 = (Object.keys(pv) as (keyof typeof pv)[]).reduce((sum, k) => sum + pv[k] * A[k], 0) / total;
  const agri = A.CC + A.CA + A.PRG + A.PF || 1;
  const y = PARAMS_V2.food.yield;
  // food_production at t = 0 with no policies and no yield shock, net of the starting export share.
  const food0 = (A.CC * y.CC + A.CA * y.CA + A.PRG * y.PRG) * (1 - PARAMS_V2.food.export0);
  const emissions = startingEmissions(state.currentLevel, A, pop);
  const pressures = [st.PP_AGRICOLA, st.PP_AMBIENTALISTA, st.PP_SOCIAL];
  const agriAreas0 = {} as ModelAnchors['agriAreas0'];
  AGRI_CODES.forEach((k) => { agriAreas0[k] = Math.max(A[k], 1e-6); });

  const anchors: ModelAnchors = {
    l: {
      B: logit(ind.biodiversity / 100),
      F: logit(ind.foodSecurity / 100),
      E: logit(ind.economicSecurity / 100),
      C: logit(st.Conflicto_social / 100),
      Pc: logit(st.Colapso_politico / 100),
      pa: logit(st.PP_AGRICOLA / 100),
      pe: logit(st.PP_AMBIENTALISTA / 100),
      ps: logit(st.PP_SOCIAL / 100),
    },
    B0: ind.biodiversity,
    F0: ind.foodSecurity,
    E0: ind.economicSecurity,
    W0: 100 - st.Conflicto_social,
    habitat0,
    foodPerCapita0: food0 / pop,
    productiveValue0,
    concentration0: (A.CC + A.PF) / agri,
    productiveShare0: (A.CC + A.CA + A.PRG) / total,
    shareCC0: A.CC / total,
    sharePF0: A.PF / total,
    forestShare0: (A.BNNP + A.BNP) / total,
    c0: emissions.total / pop,
    emissions0: emissions.total,
    pressureMean0: (pressures[0] + pressures[1] + pressures[2]) / 3,
    pressureSpread0: Math.max(...pressures) - Math.min(...pressures),
    pressureEnv0: st.PP_AMBIENTALISTA,
    gdp0: st.PBI_Real,
    agriAreas0,
  };
  return { anchors, emissions };
}

/** The 2.0 sub-state of a level at t = 0. */
export function createModelState(state: AnchorInput, CP: ControlParams): ModelState {
  const { anchors, emissions } = anchorsAndEmissions(state, CP);
  return {
    version: MODEL_VERSION,
    t: 0,
    anchors,
    targets: {},
    energy: { renewableShare: 0, efficiency: 0 },
    emissions,
    cumulativeEmissions: 0,
    fiscal: { growth: 0, primaryBalance: 0, interestBurden: 0, stress: 0, breachYears: 0, primaryHistory: [] },
    impulses: [],
    productiveYears: 0,
    yieldShock: 0,
  };
}
