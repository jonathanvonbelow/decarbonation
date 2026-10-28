/**
 * Phase 41 — food security by the balance of domestic supply and demand (src/sim/v2/food.ts,
 * mejora-general/files/41_seguridad_alimentaria_balance.md §3).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONTROL_PARAMS } from '../../src/constants';
import { evaluateGameOver, GAME_OVER_REASONS, stepYear } from '../../src/sim';
import { domesticSupply, driveF, exportShare, foodPerCapita, meanYield, targetF, updateFoodSecurity } from '../../src/sim/v2/food';
import type { IndicatorState } from '../../src/sim/v2/indicators';
import { logit, sigmoid } from '../../src/sim/v2/math';
import { PARAMS_V2, PIDS, type Pid } from '../../src/sim/v2/params';
import type { PolicyEfficiency } from '../../src/sim/v2/policies';
import { LandUseType, Policy, type GameState } from '../../src/types';
import { BREACH_MONTHS, SUSTAINED_REASONS } from '../../src/territorio/session';
import { freshState, withActivePolicies } from './testHelpers';

const CP = CONTROL_PARAMS;
const asModel = (s: GameState) => s as IndicatorState;
const eff = (values: Partial<Record<Pid, number>>): Record<Pid, PolicyEfficiency> => {
  const out = {} as Record<Pid, PolicyEfficiency>;
  PIDS.forEach((j) => {
    const v = values[j] ?? 0;
    out[j] = { base: v, eta: v, land: v, prod: v, social: v };
  });
  return out;
};

describe('supply/demand target', () => {
  [1, 2, 3].forEach((level) => {
    it(`level ${level}: with no policies, frozen land, t = 0 and no population growth, F* = F0`, () => {
      const s = asModel(freshState(level));
      expect(s.stellaSpecificState.Poblacion_Total).toBe(CP.Poblacion_Inicial);
      expect(foodPerCapita(s, eff({}))).toBeCloseTo(s.model.anchors.foodPerCapita0, 12);
      expect(targetF(s, eff({}))).toBeCloseTo(s.indicators.foodSecurity, 9);
    });
  });

  it('ρ0 is the starting supply net of the 30 % export share, per inhabitant', () => {
    const s = freshState(2);
    // N2: CC 150·1.0 + CA 70·0.7 + PRG 160·0.25 = 239, × 0.7 = 167.3 per 400 000 people.
    expect(s.model!.anchors.foodPerCapita0).toBeCloseTo(167.3 / 400_000, 12);
    expect(domesticSupply(s.landUses, {}, 0, 0)).toBeCloseTo(167.3, 9);
  });

  it('+20 % of ρ with E = E0 lifts F* from 40 to ≈ 53.5 (κ1 = 3.0 since v6/49b; 51.3 with 2.5)', () => {
    const s = asModel(freshState(2));
    s.stellaSpecificState.Poblacion_Total = CP.Poblacion_Inicial / 1.2;
    const f = targetF(s, eff({}));
    expect(f).toBeCloseTo(100 * sigmoid(logit(0.4) + 3.0 * Math.log(1.2)), 9);
    expect(f).toBeCloseTo(53.53, 2);
  });

  it('Agricultural Exports at efficiency 1: x 0.30 → 0.50, ρ × 0.714, F* 40 → ≈ 19.5 before the E compensation (22.3 with κ1 = 2.5)', () => {
    const s = asModel(freshState(2));
    expect(exportShare(eff({ PEA: 1 }))).toBeCloseTo(0.5, 12);
    expect(foodPerCapita(s, eff({ PEA: 1 })) / s.model.anchors.foodPerCapita0).toBeCloseTo(0.5 / 0.7, 12);
    expect(targetF(s, eff({ PEA: 1 }))).toBeCloseTo(19.55, 2);
    // access by income: +20 points of E add 0.6·20/50 = 0.24 logit
    s.indicators.economicSecurity += 20;
    expect(driveF(s, eff({ PEA: 1 }))).toBeCloseTo(3.0 * Math.log(0.5 / 0.7) + 0.24, 12);
  });

  it('yields respond to their policies, water to all, and the trend compounds 0.6 %/year', () => {
    const L = freshState(2).landUses;
    const base = domesticSupply(L, {}, 0, 0);
    expect(domesticSupply(L, eff({ PAI: 1 }), 0, 0) - base).toBeCloseTo(0.7 * 150 * 0.25, 9);
    expect(domesticSupply(L, eff({ AS: 1 }), 0, 0) - base).toBeCloseTo(0.7 * 70 * 0.7 * 0.15, 9);
    expect(domesticSupply(L, eff({ GS: 1 }), 0, 0) - base).toBeCloseTo(0.7 * 160 * 0.25 * 0.20, 9);
    expect(domesticSupply(L, eff({ AGUA: 1 }), 0, 0) / base).toBeCloseTo(1.06, 12);
    expect(domesticSupply(L, {}, 10, 0) / base).toBeCloseTo(Math.pow(1.006, 10), 12);
    // the yield shock hook of phase 46 (model.yieldShock)
    expect(domesticSupply(L, {}, 0, -0.1) / base).toBeCloseTo(0.9, 12);
  });

  it('a territory with no farmland keeps a finite target (ρ floored at 0.001·ρ0)', () => {
    const s = asModel(freshState(2));
    [LandUseType.ConventionalCrops, LandUseType.AgroecologicalCrops, LandUseType.GrasslandsPastures].forEach((k) => {
      s.landUses[LandUseType.ProtectedNativeForest].area += s.landUses[k].area;
      s.landUses[k] = { ...s.landUses[k], area: 0 };
    });
    expect(foodPerCapita(s, eff({}))).toBeCloseTo(1e-3 * s.model.anchors.foodPerCapita0, 15);
    const f = targetF(s, eff({}));
    expect(Number.isFinite(f)).toBe(true);
    expect(f).toBeGreaterThan(0);
    expect(f).toBeLessThan(1e-3);
  });

  it('k_F is the facilitator parameter and 12 monthly steps equal one annual step', () => {
    const s = asModel(freshState(2));
    const e = eff({ PAI: 1 });
    const annual = JSON.parse(JSON.stringify(s)) as IndicatorState;
    updateFoodSecurity(annual, e, CP, 1);
    const fStar = annual.model.targets.F!;
    expect(annual.indicators.foodSecurity).toBeCloseTo(40 + CP.Velocidad_Ajuste_Seg_Alimentaria * (fStar - 40), 12);
    const monthly = JSON.parse(JSON.stringify(s)) as IndicatorState;
    for (let i = 0; i < 12; i++) updateFoodSecurity(monthly, e, CP, 1 / 12);
    expect(monthly.indicators.foodSecurity).toBeCloseTo(annual.indicators.foodSecurity, 9);
  });

  it('a whole level: N1 with no policies drifts 35 → ≈ 37.5 (the frontier keeps up with population)', () => {
    let s = freshState(1);
    expect(s.indicators.foodSecurity).toBe(35);
    for (let y = 0; y < 30; y++) s = stepYear(s, () => 0.999).next;
    expect(Math.abs(s.indicators.foodSecurity - 37.56)).toBeLessThan(1);
  });

  it('extraction feeds more people than a green portfolio on N2 (and the range is ≥ 10 points)', () => {
    const run = (policies: Policy[]) => {
      let s = withActivePolicies(freshState(2), policies);
      for (let y = 0; y < 30; y++) s = stepYear(s, () => 0.999).next;
      return s.indicators.foodSecurity;
    };
    const green = run([Policy.NaturalConservation, Policy.Agroecological, Policy.SustainableWaterManagement, Policy.CarbonNeutrality]);
    const extractive = run([Policy.IntensiveAgriculture, Policy.AgriculturalExports, Policy.ForeignInvestment, Policy.FlexibleEnvironmentalRegulations, Policy.EnergySubsidies]);
    expect(extractive - green).toBeGreaterThanOrEqual(10);
  });

  it('the overlay mean yield is Σ y·A / ΣA', () => {
    const L = freshState(2).landUses;
    expect(meanYield(L)).toBeCloseTo(239 / 600, 12);
  });
});

describe('the game-over rules on F are unchanged', () => {
  it('famine at F ≤ 10 from level 2, not on level 1; Territorio sustained breach at F < 20 for 12 months', () => {
    const s2 = freshState(2);
    s2.indicators.foodSecurity = 10;
    expect(evaluateGameOver(s2)).toBe(GAME_OVER_REASONS.famine);
    const s1 = freshState(1);
    s1.indicators.foodSecurity = 10;
    expect(evaluateGameOver(s1)).not.toBe(GAME_OVER_REASONS.famine);
    expect(BREACH_MONTHS).toBe(12);
    expect(SUSTAINED_REASONS.foodSecurity).toContain('20');
  });
});

describe('port of the prototype (scripts/reference/modelo_v2.py, food_production + indicators_step: F)', () => {
  type Case = {
    in: { level: number; dt: number; eta: Record<Pid, number>; areas: Record<string, number>; F: number; E: number; pop: number; t: number; shock: number };
    out: { Fstar: number; F: number };
  };
  const cases: Case[] = JSON.parse(readFileSync(new URL('../../scripts/reference/food41_cases.json', import.meta.url), 'utf8'));

  it('has cases for every level and both steps', () => {
    expect(cases.length).toBeGreaterThanOrEqual(24);
  });

  cases.forEach((c, i) => {
    it(`case ${i} (level ${c.in.level}, dt = ${c.in.dt === 1 ? '1' : '1/12'}) matches F* and the relaxed F`, () => {
      const s = asModel(freshState(c.in.level));
      Object.entries(c.in.areas).forEach(([k, v]) => { s.landUses[k as LandUseType] = { ...s.landUses[k as LandUseType], area: v }; });
      s.indicators.foodSecurity = c.in.F;
      s.indicators.economicSecurity = c.in.E;
      s.stellaSpecificState.Poblacion_Total = c.in.pop;
      s.model.t = c.in.t;
      s.model.yieldShock = c.in.shock;
      updateFoodSecurity(s, eff(c.in.eta), CP, c.in.dt);
      expect(s.model.targets.F).toBeCloseTo(c.out.Fstar, 9);
      expect(s.indicators.foodSecurity).toBeCloseTo(c.out.F, 9);
    });
  });
});

it('PARAMS_V2.food mirrors the prototype', () => {
  expect(PARAMS_V2.food.yield).toEqual({ CC: 1.0, CA: 0.7, PRG: 0.25 });
  expect(PARAMS_V2.food.kappa1).toBe(3.0); // v6/49b (criterion C6), was 2.5
  expect(PARAMS_V2.food.kappa2).toBe(0.6);
  expect(CP.Velocidad_Ajuste_Seg_Alimentaria).toBe(0.35);
});

it('a state re-anchored mid-game (population already grown) keeps F* = F0 at the anchor', async () => {
  const { createModelState } = await import('../../src/sim/v2/anchors');
  const g = freshState(2);
  g.stellaSpecificState.Poblacion_Total *= 1.17;
  g.model = createModelState(g, CP);
  expect(targetF(asModel(g), eff({}))).toBeCloseTo(g.indicators.foodSecurity, 9);
});
