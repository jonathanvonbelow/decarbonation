/**
 * Land use of model 2.0 (mejora-general/files/37_uso_del_suelo_matriz.md §6): the conservative transition
 * matrix with fallow and the agricultural pool by anchored rents (src/sim/v2/land.ts), against the
 * reference prototype (scripts/reference/modelo_v2.py, `land_step`).
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ALL_RANDOM_EVENTS, CONTROL_PARAMS } from '../../src/constants';
import { applyRandomEventEffects, stepYear } from '../../src/sim';
import {
  applyLandEffects, applyLandFlows, landFlows, realiseLandFlows, totalLandArea, transferArea,
} from '../../src/sim/v2/land';
import { computeEfficiencies } from '../../src/sim/v2/policies';
import { LandUseType as LU, Policy, type ControlParams, type GameState } from '../../src/types';
import { freshState, withActivePolicies } from './testHelpers';

const noEvents = () => 0.999;
const AGRI = [LU.ConventionalCrops, LU.AgroecologicalCrops, LU.GrasslandsPastures, LU.ForestPlantations];
const shares = (s: GameState) => {
  const ag = AGRI.reduce((sum, k) => sum + s.landUses[k].area, 0);
  return Object.fromEntries(AGRI.map((k) => [k, (100 * s.landUses[k].area) / ag])) as Record<string, number>;
};
const play = (level: number, policies: Policy[], years = 30, CP: ControlParams = CONTROL_PARAMS) => {
  let s = withActivePolicies(freshState(level), policies);
  for (let y = 0; y < years; y++) s = stepYear(s, noEvents, CP).next;
  return s;
};
const NO_FRONTIER: ControlParams = {
  ...CONTROL_PARAMS,
  Tasa_de_BNNP_a_BNP_Base: 0, Tasa_de_BNNP_a_CC_Base: 0, Tasa_de_BNNP_a_CA_Base: 0, Tasa_de_CA_a_BNNP_Base: 0, Tasa_de_RES_a_BNP_Base: 0,
};

describe('land matrix 2.0 against the prototype', () => {
  // `play(level, ids)` of the prototype, 30 years without events, share of each use in the agricultural area.
  const PROTOTYPE: [number, Policy[], LU, number][] = [
    [1, [], LU.ConventionalCrops, 27.94],
    [2, [], LU.ConventionalCrops, 31.76],
    [1, [Policy.Agroecological], LU.AgroecologicalCrops, 29.48],
    [2, [Policy.Agroecological], LU.AgroecologicalCrops, 17.66],
    [1, [Policy.IntensiveAgriculture, Policy.AgriculturalExports], LU.ConventionalCrops, 35.26],
    [2, [Policy.IntensiveAgriculture, Policy.AgriculturalExports], LU.ConventionalCrops, 38.15],
  ];
  it.each(PROTOTYPE)('level %s with %j: %s ends at %s %% of the agricultural area', (level, policies, use, share) => {
    expect(shares(play(level, policies))[use]).toBeCloseTo(share, 1);
  });

  it('AS raises CA by at least 3 points and PAI + PEA raise CC by at least 7 (spec 37 §6)', () => {
    [1, 2].forEach((level) => {
      const start = shares(freshState(level));
      expect(shares(play(level, [Policy.Agroecological]))[LU.AgroecologicalCrops] - start[LU.AgroecologicalCrops]).toBeGreaterThanOrEqual(3);
      expect(shares(play(level, [Policy.IntensiveAgriculture, Policy.AgriculturalExports]))[LU.ConventionalCrops] - start[LU.ConventionalCrops])
        .toBeGreaterThanOrEqual(7);
    });
  });

  it('anchored equilibrium: without policies and frontier, the agricultural mix moves < 0.1 points in 30 years', () => {
    [1, 2, 3].forEach((level) => {
      const start = shares(freshState(level));
      const end = shares(play(level, [], 30, NO_FRONTIER));
      AGRI.forEach((k) => expect(Math.abs(end[k] - start[k]), `${level} ${k}`).toBeLessThan(0.1));
    });
  });

  it('with the frontier active, CC gains about 3 points in level 1 through deforestation', () => {
    expect(shares(play(1, []))[LU.ConventionalCrops] - 25).toBeCloseTo(2.94, 1);
  });
});

describe('landFlows / applyLandFlows', () => {
  it('nets every pair: no bilateral flow is positive both ways (equilibrium and with policies)', () => {
    fc.assert(fc.property(fc.constantFrom(1, 2, 3), fc.subarray(Object.values(Policy)), fc.integer({ min: 0, max: 40 }), (level, policies, years) => {
      const s = play(level, policies, years);
      const eff = computeEfficiencies(JSON.parse(JSON.stringify(s.policies)), level, CONTROL_PARAMS);
      const flows = landFlows(s, eff, CONTROL_PARAMS);
      const keys = new Set(flows.map((f) => `${f.from}>${f.to}`));
      flows.forEach((f) => {
        expect(f.kHa).toBeGreaterThan(0);
        expect(keys.has(`${f.to}>${f.from}`)).toBe(false);
      });
    }), { numRuns: 25 });
  });

  it('conserves area exactly and never sends a use below zero, whatever dt and rates', () => {
    fc.assert(fc.property(fc.double({ min: 1e-3, max: 1, noNaN: true }), fc.double({ min: 0, max: 50, noNaN: true }), (dt, rate) => {
      const s = freshState(2);
      s.landUses[LU.Fallow].area = 30;
      s.landUses[LU.UnprotectedNativeForest].area -= 30;
      const total = totalLandArea(s.landUses);
      const CP = { ...CONTROL_PARAMS, Tasa_de_BNNP_a_CC_Base: rate, Tasa_de_BNNP_a_BNP_Base: rate };
      const realised = applyLandFlows(s.landUses, landFlows(s, {}, CP), dt);
      expect(Math.abs(totalLandArea(s.landUses) - total)).toBeLessThan(1e-9);
      Object.values(s.landUses).forEach((lu) => expect(lu.area).toBeGreaterThanOrEqual(-1e-12));
      realised.forEach((f) => expect(f.ha).toBeCloseTo(f.kHa * 1000, 9));
    }));
  });

  it('realised flows are the annual rates × dt when no source runs short', () => {
    const s = freshState(1);
    const flows = landFlows(s, {}, CONTROL_PARAMS);
    realiseLandFlows(s.landUses, flows, 1 / 12).forEach((f, i) => expect(f.kHa).toBeCloseTo(flows[i].kHa / 12, 12));
  });

  it('a pact multiplies protection and deforestation (m_protect, m_deforest)', () => {
    const s = freshState(1);
    const base = landFlows(s, {}, CONTROL_PARAMS);
    const pact = landFlows(s, {}, CONTROL_PARAMS, { tasa_BNNP_a_BNP: 1.5, tasa_BNNP_a_CC: 0.5, tasa_BNNP_a_CA: 1, tasa_CA_a_BNNP: 1 });
    const of = (fl: typeof base, to: LU) => fl.find((f) => f.from === LU.UnprotectedNativeForest && f.to === to)!.kHa;
    expect(of(pact, LU.ProtectedNativeForest)).toBeCloseTo(1.5 * of(base, LU.ProtectedNativeForest), 12);
    expect(of(pact, LU.ConventionalCrops)).toBeCloseTo(0.5 * of(base, LU.ConventionalCrops), 12);
  });
});

describe('fallow and land effects (spec 37 §3)', () => {
  const drought = ALL_RANDOM_EVENTS.find((e) => e.id === 'drought_severe')!;

  it('a drought sends the area it takes to fallow, which regrows to BNNP and re-enters the pool', () => {
    const s = freshState(2);
    const total = totalLandArea(s.landUses);
    const cc = s.landUses[LU.ConventionalCrops].area;
    const ca = s.landUses[LU.AgroecologicalCrops].area;
    const transfers = applyRandomEventEffects(drought.effects(s), s.indicators, s.stellaSpecificState, s.landUses, []);
    const fal = s.landUses[LU.Fallow].area;
    expect(fal).toBeCloseTo(cc * 0.03 + ca * 0.05, 12);
    expect(transfers.every((t) => t.to === LU.Fallow)).toBe(true);
    expect(totalLandArea(s.landUses)).toBeCloseTo(total, 12);

    const flows = landFlows(s, {}, CONTROL_PARAMS).filter((f) => f.from === LU.Fallow);
    expect(flows.find((f) => f.to === LU.UnprotectedNativeForest)!.kHa).toBeCloseTo(0.05 * fal, 12);
    expect(flows.filter((f) => AGRI.includes(f.to)).reduce((sum, f) => sum + f.kHa, 0)).toBeCloseTo(0.25 * fal, 12);
    // One year later 30 % of the fallow has left (5 % to forest, 25 % to the pool).
    expect(stepYear(s, noEvents).next.landUses[LU.Fallow].area).toBeCloseTo(0.7 * fal, 9);
  });

  it('± pairs are direct transfers; a loose loss goes to fallow, a loose gain comes from FAL, then PRG, then CC', () => {
    const s = freshState(2);
    const before = JSON.parse(JSON.stringify(s.landUses));
    // Situation pair written gain-first (production.ts: CA +6 before CC −6).
    expect(applyLandEffects(s.landUses, [{ target: LU.AgroecologicalCrops, kHa: 6 }, { target: LU.ConventionalCrops, kHa: -6 }]))
      .toEqual([{ from: LU.ConventionalCrops, to: LU.AgroecologicalCrops, kHa: 6 }]);
    expect(s.landUses[LU.Fallow].area).toBe(0);
    // Loose loss → fallow; loose gain → from fallow first, then pastures.
    applyLandEffects(s.landUses, [{ target: LU.ForestPlantations, kHa: -2 }]);
    expect(s.landUses[LU.Fallow].area).toBeCloseTo(2, 12);
    const moved = applyLandEffects(s.landUses, [{ target: LU.PublicWetland, kHa: 5 }]);
    expect(moved).toEqual([
      { from: LU.Fallow, to: LU.PublicWetland, kHa: 2 },
      { from: LU.GrasslandsPastures, to: LU.PublicWetland, kHa: 3 },
    ]);
    expect(totalLandArea(s.landUses)).toBeCloseTo(totalLandArea(before), 12);
  });

  it('transferArea clamps to what the origin holds', () => {
    const s = freshState(1);
    expect(transferArea(s.landUses, LU.PublicWetland, LU.Fallow, 3)).toBe(0);
    expect(transferArea(s.landUses, LU.ConventionalCrops, LU.Fallow, 1e6)).toBe(100);
    expect(s.landUses[LU.ConventionalCrops].area).toBe(0);
    expect(s.landUses[LU.Fallow].area).toBe(100);
    expect(transferArea(s.landUses, LU.Fallow, LU.Fallow, 5)).toBe(0);
  });
});
