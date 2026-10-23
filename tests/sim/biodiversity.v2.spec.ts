/**
 * Phase 40 — biodiversity by the countryside species-area relation (src/sim/v2/biodiversity.ts,
 * mejora-general/files/40_biodiversidad_especies_area.md §4), and the map's connectivity K (src/sim/territory.ts).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONTROL_PARAMS } from '../../src/constants';
import { forestConnectivity, changesTouchForest, stepMonth, stepYear, type Territory } from '../../src/sim';
import { connectivityTerm, driveB, habitatIndex, targetB, updateBiodiversity } from '../../src/sim/v2/biodiversity';
import type { IndicatorState } from '../../src/sim/v2/indicators';
import { logit, sigmoid } from '../../src/sim/v2/math';
import { PARAMS_V2, PIDS, type Pid } from '../../src/sim/v2/params';
import type { PolicyEfficiency } from '../../src/sim/v2/policies';
import { LandUseType, Policy, type GameState } from '../../src/types';
import { createSession, currentConnectivity, advanceMonth } from '../../src/territorio/session';
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
const move = (s: Pick<GameState, 'landUses'>, from: LandUseType, to: LandUseType, kHa: number) => {
  s.landUses[from] = { ...s.landUses[from], area: s.landUses[from].area - kHa };
  s.landUses[to] = { ...s.landUses[to], area: s.landUses[to].area + kHa };
};

describe('species-area target', () => {
  [1, 2, 3].forEach((level) => {
    it(`level ${level}: with no policies and the land standing still, B* = B0`, () => {
      const s = asModel(freshState(level));
      expect(habitatIndex(s.landUses)).toBeCloseTo(s.model.anchors.habitat0, 12);
      expect(targetB(s, eff({}))).toBeCloseTo(s.indicators.biodiversity, 9);
    });
  });

  it('turning 5 kHa of conventional crops into wetland on N2 raises H by 3.01 % and B* by ≈ 0.415 points', () => {
    const s = asModel(freshState(2));
    const H0 = habitatIndex(s.landUses);
    move(s, LandUseType.ConventionalCrops, LandUseType.PublicWetland, 5);
    // ΔH = 5·(1.0 − 0.05)/600 over H0 = 0.263 (prototype: +3.006 %, ΔB* = +0.4154).
    expect(100 * (habitatIndex(s.landUses) / H0 - 1)).toBeCloseTo(3.006, 2);
    expect(targetB(s, eff({})) - 40).toBeCloseTo(0.4154, 3);
  });

  it('γ_H = z/(1 − B0/100): close to the start the logit term is the SAR ΔB/B = z·Δln H', () => {
    const s = asModel(freshState(2));
    move(s, LandUseType.ConventionalCrops, LandUseType.ProtectedNativeForest, 0.5);
    const dlnH = Math.log(habitatIndex(s.landUses) / s.model.anchors.habitat0);
    expect((targetB(s, eff({})) - 40) / 40).toBeCloseTo(PARAMS_V2.zSAR * dlnH, 4);
  });

  it('continuous synergy: η_AS = 0.5 and η_CR = 0.8 add 0.10·0.5 = 0.05 logit', () => {
    const s = asModel(freshState(2));
    const both = driveB(s, eff({ AS: 0.5, CR: 0.8 }));
    const alone = PARAMS_V2.qB.AS * 0.5 + PARAMS_V2.qB.CR * 0.8;
    expect(both - alone).toBeCloseTo(0.05, 12);
    // and the negative one: −0.12·min(η_PAI, η_FRA)
    const neg = driveB(s, eff({ PAI: 1, FRA: 0.25 })) - (PARAMS_V2.qB.PAI + PARAMS_V2.qB.FRA * 0.25);
    expect(neg).toBeCloseTo(-0.12 * 0.25, 12);
  });

  it('the biodiversity treaty shifts B* by +0.25 logit (no impulse in the 1.1 function any more)', () => {
    const s = asModel(freshState(2));
    s.pacts.biodiversityTreaty.isActive = true;
    expect(targetB(s, eff({}))).toBeCloseTo(100 * sigmoid(logit(0.4) + 0.25), 9);
    expect('impulses' in s.pacts.biodiversityTreaty && (s.pacts.biodiversityTreaty as { impulses?: { biodiversity?: number } }).impulses?.biodiversity).toBeFalsy();
  });

  it('k_B is the facilitator parameter and 12 monthly steps equal one annual step', () => {
    const s = asModel(freshState(2));
    const e = eff({ CR: 1 });
    const annual = JSON.parse(JSON.stringify(s)) as IndicatorState;
    updateBiodiversity(annual, e, CP, 1);
    const bStar = annual.model.targets.B!;
    expect(annual.indicators.biodiversity).toBeCloseTo(40 + CP.Velocidad_Ajuste_Biodiversidad * (bStar - 40), 12);
    const monthly = JSON.parse(JSON.stringify(s)) as IndicatorState;
    for (let i = 0; i < 12; i++) updateBiodiversity(monthly, e, CP, 1 / 12);
    expect(monthly.indicators.biodiversity).toBeCloseTo(annual.indicators.biodiversity, 9);
    const fast = JSON.parse(JSON.stringify(s)) as IndicatorState;
    updateBiodiversity(fast, e, { ...CP, Velocidad_Ajuste_Biodiversidad: 0.5 }, 1);
    expect(fast.indicators.biodiversity).toBeCloseTo(40 + 0.5 * (bStar - 40), 12);
  });

  it('a whole level moves B slowly (extinction debt) and in the direction of the strategy', () => {
    const run = (policies: Policy[]) => {
      let s = withActivePolicies(freshState(2), policies);
      for (let y = 0; y < 30; y++) s = stepYear(s, () => 0.999).next;
      return s.indicators.biodiversity;
    };
    const none = run([]);
    const green = run([Policy.NaturalConservation, Policy.Agroecological, Policy.SustainableWaterManagement, Policy.CarbonNeutrality]);
    const extractive = run([Policy.IntensiveAgriculture, Policy.AgriculturalExports, Policy.ForeignInvestment, Policy.FlexibleEnvironmentalRegulations, Policy.EnergySubsidies]);
    expect(green).toBeGreaterThan(none + 10);
    expect(extractive).toBeLessThan(none - 5);
    expect(green - extractive).toBeGreaterThanOrEqual(25);
  });
});

describe('port of the prototype (scripts/reference/modelo_v2.py, indicators_step: B)', () => {
  type Case = {
    in: { level: number; dt: number; eta: Record<Pid, number>; areas: Record<string, number>; B: number; pacts: string[] };
    out: { Bstar: number; B: number };
  };
  const cases: Case[] = JSON.parse(readFileSync(new URL('../../scripts/reference/biodiversity40_cases.json', import.meta.url), 'utf8'));

  it('has cases for every level and both steps', () => {
    expect(cases.length).toBeGreaterThanOrEqual(24);
  });

  cases.forEach((c, i) => {
    it(`case ${i} (level ${c.in.level}, dt = ${c.in.dt === 1 ? '1' : '1/12'}) matches B* and the relaxed B`, () => {
      const s = asModel(freshState(c.in.level));
      Object.entries(c.in.areas).forEach(([k, v]) => { s.landUses[k as LandUseType] = { ...s.landUses[k as LandUseType], area: v }; });
      s.indicators.biodiversity = c.in.B;
      c.in.pacts.forEach((id) => { s.pacts[id].isActive = true; });
      updateBiodiversity(s, eff(c.in.eta), CP, c.in.dt);
      expect(s.model.targets.B).toBeCloseTo(c.out.Bstar, 9);
      expect(s.indicators.biodiversity).toBeCloseTo(c.out.B, 9);
    });
  });
});

describe('connectivity K (Territorio)', () => {
  const grid = (size: number, forest: [number, number][]): Territory => {
    const parcels = Array.from({ length: size * size }, (_, i) => ({ x: i % size, y: (i / size) | 0, kind: LandUseType.ConventionalCrops as LandUseType }));
    forest.forEach(([x, y]) => { parcels[y * size + x].kind = LandUseType.UnprotectedNativeForest; });
    return { size, kHaPerParcel: 0.1, seed: 1, parcels, pending: {}, geo: undefined as never } as unknown as Territory;
  };
  const block: [number, number][] = [];
  for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) block.push([x, y]);

  it('is the share of forest in the largest 4-connected patch', () => {
    expect(forestConnectivity(grid(10, block))).toBeCloseTo(1, 12);
    expect(forestConnectivity(grid(10, [...block, [8, 8]]))).toBeCloseTo(9 / 10, 12);
    // diagonal contact does not connect (4-connected)
    expect(forestConnectivity(grid(10, [...block, [3, 3]]))).toBeCloseTo(9 / 10, 12);
    expect(forestConnectivity(grid(10, []))).toBe(0);
  });

  it('a lot next to the largest patch raises K; an isolated one lowers it', () => {
    const base = [...block, [8, 8]] as [number, number][];
    const K0 = forestConnectivity(grid(10, base));
    const contiguous = grid(10, base);
    contiguous.parcels[0 * 10 + 3].kind = LandUseType.ProtectedNativeForest;
    const isolated = grid(10, base);
    isolated.parcels[5 * 10 + 8].kind = LandUseType.RestorationForest;
    expect(forestConnectivity(contiguous)).toBeGreaterThan(K0);
    expect(forestConnectivity(isolated)).toBeLessThan(K0);
    expect(connectivityTerm({ K: forestConnectivity(contiguous), K0 })).toBeGreaterThan(0);
    expect(connectivityTerm({ K: forestConnectivity(isolated), K0 })).toBeLessThan(0);
    expect(changesTouchForest([{ x: 0, y: 0, from: LandUseType.ConventionalCrops, to: LandUseType.GrasslandsPastures }])).toBe(false);
    expect(changesTouchForest([{ x: 0, y: 0, from: LandUseType.UnprotectedNativeForest, to: LandUseType.ConventionalCrops }])).toBe(true);
  });

  it('enters B* as γ_K·ln(K/K0), floored, and is 0 without a map', () => {
    const s = asModel(freshState(2));
    expect(connectivityTerm(undefined)).toBe(0);
    expect(connectivityTerm({ K: 0.5, K0: 0 })).toBe(0);
    expect(connectivityTerm({ K: 0.4, K0: 0.8 })).toBeCloseTo(0.25 * Math.log(0.5), 12);
    expect(Number.isFinite(connectivityTerm({ K: 0, K0: 0.8 }))).toBe(true);
    expect(driveB(s, eff({}), { K: 0.4, K0: 0.8 })).toBeCloseTo(0.25 * Math.log(0.5), 12);
    // through the monthly step
    const a = stepMonth(s as GameState, 0, () => 0.999, CP, 'es', { connectivity: { K: 0.4, K0: 0.8 } }).next;
    const b = stepMonth(s as GameState, 0, () => 0.999, CP, 'es').next;
    expect(a.indicators.biodiversity).toBeLessThan(b.indicators.biodiversity);
  });

  it('the session anchors K0 on its map, hands K to the model and caches it', () => {
    const s0 = createSession(3);
    expect(s0.connectivity!.K0).toBeGreaterThan(0);
    expect(s0.connectivity!.K0).toBeLessThanOrEqual(1);
    expect(currentConnectivity(s0)).toBe(s0.connectivity);
    const s1 = advanceMonth(s0);
    expect(s1.connectivity!.K0).toBe(s0.connectivity!.K0);
    expect(s1.connectivity!.tick).toBe(s1.lastChanges.tick);
    expect(s1.connectivity!.K).toBeCloseTo(forestConnectivity(s1.territory), 12);
    // a session from before phase 40 (no cache) takes K0 from its current map
    const legacy = { ...s1, connectivity: undefined };
    expect(currentConnectivity(legacy).K0).toBeCloseTo(forestConnectivity(s1.territory), 12);
  });
});

it('a state anchored at B0 = 100 (old save) keeps a finite target (γ_H capped at B0 = 95)', () => {
  const s = asModel(freshState(2));
  s.model.anchors = { ...s.model.anchors, B0: 100 };
  expect(Number.isFinite(driveB(s, eff({})))).toBe(true);
  move(s, LandUseType.ConventionalCrops, LandUseType.PublicWetland, 5);
  expect(Number.isFinite(targetB(s, eff({})))).toBe(true);
});
