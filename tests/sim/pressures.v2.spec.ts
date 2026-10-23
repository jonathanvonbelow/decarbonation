/**
 * Phase 42 — sectoral pressures relaxing toward anchored logistic targets (src/sim/v2/pressures.ts,
 * mejora-general/files/42_presiones_sectoriales.md §3).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONTROL_PARAMS } from '../../src/constants';
import { createTerritory, declarePublicUse, stepYear } from '../../src/sim';
import type { IndicatorState } from '../../src/sim/v2/indicators';
import { logit, sigmoid } from '../../src/sim/v2/math';
import { PARAMS_V2, PIDS, type Pid } from '../../src/sim/v2/params';
import type { PolicyEfficiency } from '../../src/sim/v2/policies';
import { drivePressures, productiveShare, sectorSize, targetPressures, updatePressures } from '../../src/sim/v2/pressures';
import { LandUseType, type GameState } from '../../src/types';
import { NIVELES_STRATEGIES } from '../../scripts/harness/strategies';
import { freshState, playLevel } from './testHelpers';

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

describe('anchored targets', () => {
  [1, 2, 3].forEach((level) => {
    it(`level ${level}: with no policies and everything frozen, π* = π0 for the three pressures`, () => {
      const s = asModel(freshState(level));
      const st = s.stellaSpecificState;
      const t = targetPressures(s, eff({}));
      expect(t.a).toBeCloseTo(st.PP_AGRICOLA, 9);
      expect(t.e).toBeCloseTo(st.PP_AMBIENTALISTA, 9);
      expect(t.s).toBeCloseTo(st.PP_SOCIAL, 9);
      expect(sectorSize(s)).toBeCloseTo(1, 12);
    });
  });

  it('Conservation at efficiency 1 in N2 (π_e0 = 25): π_e* ≈ 12.6, inside [10, 14]; Flexible Regulations: ≈ 43.4', () => {
    const s = asModel(freshState(2));
    const cr = targetPressures(s, eff({ CR: 1 })).e;
    expect(cr).toBeGreaterThanOrEqual(10);
    expect(cr).toBeLessThanOrEqual(14);
    expect(cr).toBeCloseTo(100 * sigmoid(logit(0.25) - 12.5 / 15), 9);
    expect(cr).toBeCloseTo(12.65, 2);
    expect(targetPressures(s, eff({ FRA: 1 })).e).toBeCloseTo(43.4, 1);
  });

  it('Conservation also raises the agricultural pressure (+3.0/15 logit at full efficiency)', () => {
    const s = asModel(freshState(2));
    expect(drivePressures(s, eff({ CR: 1 })).a).toBeCloseTo(3 / 15, 12);
  });

  it('monotonicity: more Flexible Regulations never lowers π_e*', () => {
    const s = asModel(freshState(2));
    let prev = -Infinity;
    for (let x = 0; x <= 1.0001; x += 0.05) {
      const v = targetPressures(s, eff({ FRA: x, CR: 0.4, PAI: 0.3 })).e;
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it('only the policy sum of π_a scales with the size of the productive sector (PF is not productive)', () => {
    const s = asModel(freshState(2));
    const share0 = productiveShare(s.landUses);
    // move 30 kHa of conventional crops into plantations: the productive share falls
    s.landUses[LandUseType.ConventionalCrops].area -= 30;
    s.landUses[LandUseType.ForestPlantations].area += 30;
    const share = productiveShare(s.landUses);
    expect(share).toBeLessThan(share0);
    expect(sectorSize(s)).toBeCloseTo(share / share0, 12);
    const withPolicy = drivePressures(s, eff({ PAI: 1 })).a;
    const without = drivePressures(s, eff({})).a;
    expect(without).toBeCloseTo(PARAMS_V2.pressure.drivers.a.prodShare * (share0 - share), 12);
    expect(withPolicy - without).toBeCloseTo((share / share0) * (-10 / 15), 12);
  });

  it('wear of open situations shifts each target in logit units', () => {
    const s = asModel(freshState(2));
    const base = drivePressures(s, eff({}));
    const worn = drivePressures(s, eff({}), { a: 0.2, e: -0.1, s: 0.3 });
    expect(worn.a - base.a).toBeCloseTo(0.2, 12);
    expect(worn.e - base.e).toBeCloseTo(-0.1, 12);
    expect(worn.s - base.s).toBeCloseTo(0.3, 12);
  });

  it('a facilitator k_π outside [0, 1] is clamped (no overshoot, no NaN monthly)', () => {
    const s = asModel(freshState(2));
    updatePressures(s, eff({ FRA: 1 }), { ...CP, Velocidad_Ajuste_Presiones: 3 }, 1 / 12);
    expect(s.stellaSpecificState.PP_AMBIENTALISTA).toBeCloseTo(s.model.targets.pe!, 9);
    const t = asModel(freshState(2));
    updatePressures(t, eff({ FRA: 1 }), { ...CP, Velocidad_Ajuste_Presiones: -1 }, 1 / 12);
    expect(t.stellaSpecificState.PP_AMBIENTALISTA).toBe(25);
  });
});

it('a 1.1 save pinned at 0 is anchored at the floor, so the pressure can still move', async () => {
  const { createModelState } = await import('../../src/sim/v2/anchors');
  const g = freshState(2);
  g.stellaSpecificState.PP_AMBIENTALISTA = 0;
  g.model = createModelState(g, CP);
  expect(g.model.anchors.l.pe).toBeCloseTo(logit(PARAMS_V2.pressure.anchorFloor / 100), 12);
  expect(targetPressures(asModel(g), eff({ FRA: 1 })).e).toBeGreaterThan(4);
});

describe('prototype cases (scripts/reference/pressures42_cases.json)', () => {
  interface Case {
    in: {
      level: number; dt: number; eta: Record<Pid, number>; areas: Record<string, number>; c: number;
      pi: { a: number; e: number; s: number }; tax: number; wear: { a?: number; e?: number; s?: number };
      after: { B: number; F: number; E: number; W: number };
    };
    out: { pi: { a: number; e: number; s: number }; star: { a: number; e: number; s: number } };
  }
  const cases: Case[] = JSON.parse(readFileSync(new URL('../../scripts/reference/pressures42_cases.json', import.meta.url), 'utf8'));

  it('has cases for every level and both steps', () => {
    expect(cases.length).toBeGreaterThanOrEqual(24);
  });

  cases.forEach((c, i) => {
    it(`case ${i} (level ${c.in.level}, dt = ${c.in.dt === 1 ? '1' : '1/12'}) matches π* and the relaxed π`, () => {
      const s = asModel(freshState(c.in.level));
      Object.entries(c.in.areas).forEach(([k, v]) => { s.landUses[k as LandUseType] = { ...s.landUses[k as LandUseType], area: v }; });
      s.indicators.biodiversity = c.in.after.B;
      s.indicators.foodSecurity = c.in.after.F;
      s.indicators.economicSecurity = c.in.after.E;
      s.indicators.socialWellbeing = c.in.after.W;
      s.indicators.co2EqEmissionsPerCapita = c.in.c;
      s.additionalTaxPressurePercentage = c.in.tax;
      s.stellaSpecificState.PP_AGRICOLA = c.in.pi.a;
      s.stellaSpecificState.PP_AMBIENTALISTA = c.in.pi.e;
      s.stellaSpecificState.PP_SOCIAL = c.in.pi.s;
      updatePressures(s, eff(c.in.eta), CP, c.in.dt, c.in.wear);
      expect(s.model.targets.pa).toBeCloseTo(c.out.star.a, 8);
      expect(s.model.targets.pe).toBeCloseTo(c.out.star.e, 8);
      expect(s.model.targets.ps).toBeCloseTo(c.out.star.s, 8);
      expect(s.stellaSpecificState.PP_AGRICOLA).toBeCloseTo(c.out.pi.a, 9);
      expect(s.stellaSpecificState.PP_AMBIENTALISTA).toBeCloseTo(c.out.pi.e, 9);
      expect(s.stellaSpecificState.PP_SOCIAL).toBeCloseTo(c.out.pi.s, 9);
      expect(s.indicators.ppAmbientalista).toBe(s.stellaSpecificState.PP_AMBIENTALISTA);
    });
  });
});

describe('harness strategies (30 years, no events)', () => {
  [1, 2, 3].forEach((level) => {
    NIVELES_STRATEGIES.forEach((strategy) => {
      it(`N${level} ${strategy.id}: the pressures stay inside (0, 100)${strategy.id === 'extractive' ? ' (extractive up to 90)' : ''}`, () => {
        let lo = Infinity;
        let hi = -Infinity;
        playLevel(level, strategy.id, 30, CP, (state) => {
          const st = state.stellaSpecificState;
          [st.PP_AGRICOLA, st.PP_AMBIENTALISTA, st.PP_SOCIAL].forEach((v) => { lo = Math.min(lo, v); hi = Math.max(hi, v); });
        });
        expect(lo).toBeGreaterThan(0.5);
        expect(hi).toBeLessThan(strategy.id === 'extractive' ? 90 : 99.5);
      });
    });
  });

  it('N2 over 30 years: π_e from ≈ 4 (green) to ≈ 55 (extractive), π_a ≈ 5 → ≈ 22 (prototype §1)', () => {
    const pe = (id: string) => playLevel(2, id, 30).ppAmbientalista;
    const pa = (id: string) => playLevel(2, id, 30).ppAgricola;
    expect(pe('green')).toBeLessThan(8);
    expect(pe('extractive')).toBeGreaterThan(45);
    expect(pa('extractive')).toBeLessThan(10);
    expect(pa('conservation')).toBeGreaterThan(15);
  });
});

describe('integration', () => {
  it('an event shock to a pressure is a level jump the next steps relax away (stock = indicator)', () => {
    const s = freshState(2);
    s.stellaSpecificState.PP_AMBIENTALISTA = 45; // as if an event had added +20
    s.indicators.ppAmbientalista = 45;
    let g = s;
    const values: number[] = [];
    for (let y = 0; y < 15; y++) {
      g = stepYear(g, () => 0.999, CP).next;
      values.push(g.stellaSpecificState.PP_AMBIENTALISTA);
      expect(g.indicators.ppAmbientalista).toBe(g.stellaSpecificState.PP_AMBIENTALISTA);
    }
    expect(values[0]).toBeLessThan(45);
    expect(values[14]).toBeLessThan(27);
  });

  it('declaring a public use no longer pushes the agricultural pressure directly; its target rises instead', () => {
    const state = freshState(2);
    const t = createTerritory(state.landUses, 12);
    const crop = t.parcels.find((p) => p.kind === LandUseType.ConventionalCrops)!;
    const r = declarePublicUse(state, t, crop.x, crop.y, 'restoration', CP);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.stellaSpecificState.PP_AGRICOLA).toBe(state.stellaSpecificState.PP_AGRICOLA);
    const share0 = productiveShare(state.landUses);
    const share = productiveShare(r.state.landUses);
    expect(drivePressures(asModel(r.state), eff({})).a).toBeCloseTo(PARAMS_V2.pressure.drivers.a.prodShare * (share0 - share), 12);
  });
});
