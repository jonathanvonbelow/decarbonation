/**
 * Phase 39 — economic security, social conflict and political collapse by relaxation toward an anchored
 * logistic target (src/sim/v2/indicators.ts, mejora-general/files/39_indicadores_por_relajacion.md §6).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pactShift } from '../../src/sim/v2/pacts';
import { CONTROL_PARAMS } from '../../src/constants';
import { makeRng, stepMonth, stepYear } from '../../src/sim';
import { logit, sigmoid } from '../../src/sim/v2/math';
import { PARAMS_V2, PIDS, type Pid } from '../../src/sim/v2/params';
import type { PolicyEfficiency } from '../../src/sim/v2/policies';
import {
  capImpulses, driveC, fiscalStressOf, impulseSum, interestBurdenOf, productiveValue, stepIndicator, targetC, targetE, targetPc,
  updateRelaxedIndicators, type IndicatorState,
} from '../../src/sim/v2/indicators';
import { LandUseType, Policy, type GameState } from '../../src/types';
import { freshState, withActivePolicies } from './testHelpers';

const CP = CONTROL_PARAMS;
const noEventRng = () => 0.999;
const asModel = (s: GameState) => s as IndicatorState;
const eff = (values: Partial<Record<Pid, number>>, cnTax = 0): Record<Pid, PolicyEfficiency> => {
  const out = {} as Record<Pid, PolicyEfficiency>;
  PIDS.forEach((j) => {
    const v = values[j] ?? 0;
    out[j] = { base: v, eta: v, land: v, prod: v, social: v };
  });
  out.CN.tax = cnTax;
  return out;
};

describe('anchored logistic targets', () => {
  [1, 2, 3].forEach((level) => {
    it(`level ${level}: with no policies and nothing moving, E*, C*, Pc* are the starting values`, () => {
      const s = asModel(freshState(level));
      const none = eff({});
      expect(targetE(s, none, CP)).toBeCloseTo(s.indicators.economicSecurity, 9);
      expect(targetC(s, none)).toBeCloseTo(s.stellaSpecificState.Conflicto_social, 9);
      expect(targetPc(s)).toBeCloseTo(s.stellaSpecificState.Colapso_politico, 9);
    });
  });

  it('level 1 starts with Pc = 5 (St = 95) and C = 5, so every logit is finite and away from the clamp', () => {
    const s = freshState(1);
    expect(s.stellaSpecificState.Colapso_politico).toBe(5);
    expect(s.indicators.politicalStability).toBe(95);
    expect(Math.abs(s.model!.anchors.l.Pc)).toBeLessThan(5);
    expect(Math.abs(s.model!.anchors.l.C)).toBeLessThan(5);
  });

  it('Foreign Investment at efficiency 1 (with its +0.01 of growth) lifts E* from 30 to ≈ 48.8', () => {
    const s = asModel(freshState(2));
    s.model.fiscal.growth = CP.Tasa_Base_Crecimiento_PBI + 0.01;
    const e = targetE(s, eff({ PIE: 1 }), CP);
    // drive = bE_PIE + 0.25·(0.01/0.01) = 0.80 logit units: 100·σ(logit(0.3) + 0.8) = 48.83.
    expect(e).toBeCloseTo(100 * sigmoid(logit(0.3) + PARAMS_V2.bE.PIE + PARAMS_V2.relaxation.E.growth), 9);
    expect(Math.abs(e - 48.8)).toBeLessThan(1);
  });

  it('C* is continuous in F: no jump when food security crosses 45 (the old threshold)', () => {
    const s = asModel(freshState(2));
    const none = eff({});
    let prev = NaN;
    let maxStep = 0;
    for (let F = 30; F <= 60; F += 0.01) {
      s.indicators.foodSecurity = F;
      const c = targetC(s, none);
      if (!Number.isNaN(prev)) maxStep = Math.max(maxStep, Math.abs(c - prev));
      prev = c;
    }
    // |dC*/dF| ≤ 100·σ'·0.6/15 ≤ 1 point per point of F: steps of 0.01 move it at most 0.01.
    expect(maxStep).toBeLessThan(0.011);
  });

  it('the additional tax always enters (no level-3-only switch): E* down, C* up', () => {
    const s = asModel(freshState(1));
    const none = eff({});
    const e0 = targetE(s, none, CP);
    const c0 = targetC(s, none);
    s.additionalTaxPressurePercentage = 10;
    expect(targetE(s, none, CP)).toBeLessThan(e0);
    expect(targetC(s, none)).toBeGreaterThan(c0);
  });

  it('green relief lowers C* in proportion to efficiency (no bonus by threshold)', () => {
    const s = asModel(freshState(2));
    const d = (v: number) => driveC(s, eff({ CR: v }));
    expect(d(0.3) - d(0)).toBeCloseTo(-PARAMS_V2.greenRelief.CR * 0.3, 12);
    expect(d(0.6) - d(0)).toBeCloseTo(-PARAMS_V2.greenRelief.CR * 0.6, 12);
  });

  it('pacts shift the targets of E and Pc while active', () => {
    const s = freshState(2);
    expect(pactShift(s.pacts, 'E')).toBe(0);
    s.pacts.techTransferInitiative.isActive = true;
    s.pacts.globalCarbonAccord.isActive = true;
    expect(pactShift(s.pacts, 'E')).toBeCloseTo(PARAMS_V2.pacts.techTransferInitiative.E + PARAMS_V2.pacts.globalCarbonAccord.E, 12);
    expect(pactShift(s.pacts, 'Pc')).toBeCloseTo(PARAMS_V2.pacts.globalCarbonAccord.Pc, 12);
  });

  it('situation impulses decay with their τ and are capped at ±0.6 logit', () => {
    const model = { t: 2, impulses: [
      { indicator: 'E' as const, logit: 0.5, t: 1, tau: 2 },
      { indicator: 'E' as const, logit: 0.5, t: 2, tau: 2 },
      { indicator: 'C' as const, logit: 9, t: 2, tau: 2 },
    ] };
    expect(impulseSum(model, 'E')).toBeCloseTo(0.5 * Math.exp(-0.5) + 0.5, 12);
    expect(capImpulses(impulseSum(model, 'E'))).toBe(0.6);
    expect(capImpulses(-impulseSum(model, 'C'))).toBe(-0.6);
  });

  it('productive value of the starting land equals the anchor', () => {
    [1, 2, 3].forEach((level) => {
      const s = freshState(level);
      expect(productiveValue(s.landUses)).toBeCloseTo(s.model!.anchors.productiveValue0, 12);
    });
  });
});

describe('exact relaxation', () => {
  it('12 monthly steps toward a fixed target are one annual step', () => {
    [0.12, 0.25, 0.3, 0.35].forEach((k) => {
      let x = 30;
      for (let i = 0; i < 12; i++) x = stepIndicator(x, 70, k, 1 / 12);
      expect(x).toBeCloseTo(stepIndicator(30, 70, k, 1), 9);
      expect(stepIndicator(30, 70, k, 1)).toBeCloseTo(30 + k * 40, 12);
    });
  });

  it('advance records E*, C*, Pc* in model.targets and relaxes toward them (annual and monthly)', () => {
    const s0 = withActivePolicies(freshState(2), [Policy.ForeignInvestment]);
    const y = stepYear(s0, noEventRng).next;
    const t = y.model!.targets;
    // One annual step covers k of the way to this step's target.
    expect(y.indicators.economicSecurity).toBeCloseTo(30 + CP.Velocidad_Ajuste_Seg_Economica * (t.E! - 30), 9);
    expect(y.stellaSpecificState.Conflicto_social).toBeCloseTo(40 + CP.Velocidad_Ajuste_Conflicto * (t.C! - 40), 9);
    expect(y.stellaSpecificState.Colapso_politico).toBeCloseTo(30 + CP.Velocidad_Ajuste_Colapso * (t.Pc! - 30), 9);
    const m = stepMonth(s0, 0, noEventRng).next;
    expect(m.indicators.economicSecurity).toBeCloseTo(30 + (1 - Math.pow(1 - CP.Velocidad_Ajuste_Seg_Economica, 1 / 12)) * (m.model!.targets.E! - 30), 9);
  });

  it('W and St stay strictly inside (0, 100) under extreme strategies (no clip needed)', () => {
    const extreme = [Policy.FlexibleEnvironmentalRegulations, Policy.IntensiveAgriculture, Policy.ForeignInvestment, Policy.EnergySubsidies, Policy.AgriculturalExports];
    let s = withActivePolicies(freshState(2), extreme);
    s.additionalTaxPressurePercentage = 20;
    for (let y = 0; y < 30 && !s.gameOverReason; y++) s = stepYear(s, makeRng(3, s.year + 1)).next;
    [s.indicators.socialWellbeing, s.indicators.politicalStability, s.indicators.economicSecurity].forEach((v) => {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(100);
    });
  });
});

describe('fiscal stress bridge and k bounds', () => {
  it('φ = sHigh(interest / revenue; 0.20, 0.04) with the risk premium over D/Y = 0.6 (prototype economy_step)', () => {
    // N3 start: D = 5000, Y = 12 000 → 12 240, i = 0.045, revenue 15 % of Y.
    const b = interestBurdenOf(5000, 12000, 12240, 0, 3, CP);
    expect(b).toBeCloseTo((0.045 * 5000) / (12240 * 0.15), 12);
    expect(fiscalStressOf(b)).toBeCloseTo(1 / (1 + Math.exp(-(b - 0.2) / 0.04)), 12);
    // D/Y = 1: premium 0.05·0.4 = 0.02.
    expect(interestBurdenOf(10000, 10000, 10000, 0, 2, CP)).toBeCloseTo(((0.035 + 0.02) * 10000) / 1500, 12);
    expect(fiscalStressOf(interestBurdenOf(0, 10000, 10200, 0, 2, CP))).toBe(0);
  });

  it('a heavier debt lowers E* and raises C* and Pc*', () => {
    const s = asModel(freshState(2));
    const none = eff({});
    const [e0, c0, p0] = [targetE(s, none, CP), targetC(s, none), targetPc(s)];
    s.model.fiscal.stress = 0.5;
    expect(targetE(s, none, CP)).toBeLessThan(e0);
    expect(targetC(s, none)).toBeGreaterThan(c0);
    expect(targetPc(s)).toBeGreaterThan(p0);
  });

  it('k outside [0, 1] is held at the bound (no overshoot, no NaN monthly)', () => {
    expect(stepIndicator(30, 70, 1.5, 1 / 12)).toBe(70);
    expect(stepIndicator(30, 70, -0.2, 1)).toBe(30);
    expect(Number.isFinite(stepIndicator(30, 70, Number.NaN, 1 / 12))).toBe(true);
  });
});

describe('port of the prototype (scripts/reference/modelo_v2.py, indicators_step: E, C, Pc)', () => {
  type Case = {
    in: {
      level: number; dt: number; eta: Record<Pid, number>; taxChannel: number; areas: Record<string, number>;
      E: number; C: number; Pc: number; pi: { a: number; e: number; s: number }; g: number; tax: number; pacts: string[];
    };
    out: { B: number; F: number; Estar: number; Cstar: number; Pcstar: number; E: number; C: number; Pc: number };
  };
  const cases: Case[] = JSON.parse(readFileSync(new URL('../../scripts/reference/indicators39_cases.json', import.meta.url), 'utf8'));

  it('has cases for every level and both steps', () => {
    expect(cases.length).toBeGreaterThanOrEqual(24);
  });

  cases.forEach((c, i) => {
    it(`case ${i} (level ${c.in.level}, dt = ${c.in.dt === 1 ? '1' : '1/12'}) matches E*, C*, Pc* and the relaxed values`, () => {
      const s = asModel(freshState(c.in.level));
      Object.entries(c.in.areas).forEach(([k, v]) => { s.landUses[k as LandUseType] = { ...s.landUses[k as LandUseType], area: v }; });
      // B and F come from the prototype's own step (the port still computes them with model 1.1, phases 40/41).
      s.indicators.biodiversity = c.out.B;
      s.indicators.foodSecurity = c.out.F;
      s.indicators.economicSecurity = c.in.E;
      s.stellaSpecificState.Conflicto_social = c.in.C;
      s.stellaSpecificState.Colapso_politico = c.in.Pc;
      s.stellaSpecificState.PP_AGRICOLA = c.in.pi.a;
      s.stellaSpecificState.PP_AMBIENTALISTA = c.in.pi.e;
      s.stellaSpecificState.PP_SOCIAL = c.in.pi.s;
      s.model.fiscal.growth = c.in.g;
      s.additionalTaxPressurePercentage = c.in.tax;
      c.in.pacts.forEach((id) => { s.pacts[id].isActive = true; });
      updateRelaxedIndicators(s, eff(c.in.eta, c.in.taxChannel), CP, c.in.dt);
      expect(s.model.targets.E).toBeCloseTo(c.out.Estar, 9);
      expect(s.model.targets.C).toBeCloseTo(c.out.Cstar, 9);
      expect(s.model.targets.Pc).toBeCloseTo(c.out.Pcstar, 9);
      expect(s.indicators.economicSecurity).toBeCloseTo(c.out.E, 9);
      expect(s.stellaSpecificState.Conflicto_social).toBeCloseTo(c.out.C, 9);
      expect(s.stellaSpecificState.Colapso_politico).toBeCloseTo(c.out.Pc, 9);
      expect(s.indicators.socialWellbeing).toBeCloseTo(100 - c.out.C, 9);
      expect(s.indicators.politicalStability).toBeCloseTo(100 - c.out.Pc, 9);
    });
  });
});

it('the k of each indicator is the facilitator parameter (CP.Velocidad_Ajuste_*)', () => {
  const s = asModel(freshState(2));
  s.indicators.foodSecurity = 20; // a food crisis: every target moves
  const run = (cp: typeof CP) => {
    const x = JSON.parse(JSON.stringify(s)) as IndicatorState;
    updateRelaxedIndicators(x, eff({}), cp, 1);
    return x;
  };
  const base = run(CP);
  const fast = run({ ...CP, Velocidad_Ajuste_Seg_Economica: 0.6, Velocidad_Ajuste_Conflicto: 0.7, Velocidad_Ajuste_Colapso: 0.5 });
  expect(Math.abs(fast.indicators.economicSecurity - 30)).toBeGreaterThan(Math.abs(base.indicators.economicSecurity - 30));
  expect(Math.abs(fast.stellaSpecificState.Conflicto_social - 40)).toBeGreaterThan(Math.abs(base.stellaSpecificState.Conflicto_social - 40));
  expect(base.indicators.economicSecurity).toBeCloseTo(30 + 0.3 * (base.model.targets.E! - 30), 9);
});
