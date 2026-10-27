/**
 * Carbon in physical units (mejora-general/files/38_carbono_unidades_fisicas.md §5): src/sim/v2/carbon.ts and
 * step 7 of advance(). Values of the prototype (scripts/reference/modelo_v2.py `carbon`, `budget`).
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CONTROL_PARAMS } from '../../src/constants';
import { advance, createInitialState, makeRng, MONTHLY_DT, stepYear } from '../../src/sim';
import {
  budgetPath, carbonBudgetIndex, CO2_PER_C, computeEmissions, energyTargets, fluxOf, updateEnergyState, type CarbonInput,
} from '../../src/sim/v2/carbon';
import { landFlows, realiseLandFlows, type LandEfficiencies } from '../../src/sim/v2/land';
import { PARAMS_V2 } from '../../src/sim/v2/params';
import { baseEfficiency, type PolicyEfficiency } from '../../src/sim/v2/policies';
import { LandUseType, Policy, type GameState } from '../../src/types';
import { freshState, withActivePolicies } from './testHelpers';

/** c0 of the prototype (new_state, dry run of the first year's land flows). */
const PROTOTYPE_C0: Record<number, number> = { 1: 5.947, 2: 7.135, 3: 5.733 };

const uniform = (eta: number): PolicyEfficiency => ({ base: eta, eta, land: eta, prod: eta, social: eta, elec: eta, other: eta, tax: eta });
const levelStart = (level: number) => createInitialState(level).gameStatePatch;
const inputOf = (s: Pick<GameState, 'currentLevel' | 'landUses'>, over: Partial<CarbonInput> = {}): CarbonInput => ({
  level: s.currentLevel, landUses: s.landUses, population: CONTROL_PARAMS.Poblacion_Inicial, gdp: 1,
  anchors: { gdp0: 1, pop0: CONTROL_PARAMS.Poblacion_Inicial }, energy: { renewableShare: 0, efficiency: 0 }, ...over,
});
const yearFlows = (s: Pick<GameState, 'landUses'>, eff: LandEfficiencies) => realiseLandFlows(s.landUses, landFlows(s, eff, CONTROL_PARAMS), 1);

describe('carbon 2.0 — starting values', () => {
  it.each([1, 2, 3])('c0 of level %i reproduces the prototype (±0.02 t)', (level) => {
    const patch = levelStart(level);
    expect(patch.indicators.co2EqEmissionsPerCapita).toBeCloseTo(PROTOTYPE_C0[level], 1);
    expect(Math.abs(patch.indicators.co2EqEmissionsPerCapita - PROTOTYPE_C0[level])).toBeLessThanOrEqual(0.02);
    expect(patch.indicators.co2EqEmissionsPerCapita).toBe(patch.model!.anchors.c0);
  });

  it('starts the population at CP.Poblacion_Inicial (400 000), also when the facilitator changes it', () => {
    expect(levelStart(2).stellaSpecificState.Poblacion_Total).toBe(400_000);
    const patch = createInitialState(2, { ...CONTROL_PARAMS, Poblacion_Inicial: 500_000 }).gameStatePatch;
    expect(patch.stellaSpecificState.Poblacion_Total).toBe(500_000);
    expect(patch.model!.anchors.pop0).toBe(500_000);
  });

  it('the energy share of the start matches the spec table (energy 4.0 / 5.0 / 4.6 t per person)', () => {
    [1, 2, 3].forEach((level) => {
      const m = levelStart(level).model!;
      expect(m.emissions.energy / CONTROL_PARAMS.Poblacion_Inicial).toBeCloseTo(PARAMS_V2.energy.eps0[level], 9);
      expect(m.emissions.total).toBeCloseTo(m.emissions.energy + m.emissions.afolu + m.emissions.luc, 6);
    });
  });
});

describe('carbon 2.0 — equations', () => {
  it('frozen land, no policies, constant income per capita: energy per capita stays, AFOLU per capita falls with population', () => {
    const s = levelStart(2);
    const P0 = CONTROL_PARAMS.Poblacion_Inicial;
    const P1 = P0 * 1.008 ** 10;
    const a = computeEmissions(inputOf(s, { population: P0, gdp: 1 }), {}, [], 1);
    const b = computeEmissions(inputOf(s, { population: P1, gdp: P1 / P0 }), {}, [], 1);
    expect(b.energy / P1).toBeCloseTo(a.energy / P0, 12);
    expect(b.afolu / P1).toBeCloseTo((a.afolu / P0) * (P0 / P1), 12);
  });

  it('Conservation in its fifth year of activity (η ≈ 0.76) cuts E_luc by at least 70 %', () => {
    const cr = { ...levelStart(2).policies[Policy.NaturalConservation], isActive: true, rampTime: 5, fatigueTime: 5 };
    const eta = baseEfficiency(cr, CONTROL_PARAMS);
    expect(eta).toBeCloseTo(0.763, 3);
    [1, 2, 3].forEach((level) => {
      const s = levelStart(level);
      const without = computeEmissions(inputOf(s), {}, yearFlows(s, {}), 1).luc;
      const withCR = computeEmissions(inputOf(s), { CR: uniform(eta) }, yearFlows(s, { CR: uniform(eta) }), 1).luc;
      expect(without).toBeGreaterThan(0);
      expect(withCR).toBeLessThanOrEqual(0.3 * without);
    });
  });

  it('4 % of the territory under energy parks makes s* = 1, capped at 0.9', () => {
    const s = levelStart(2);
    const total = (Object.values(s.landUses) as { area: number }[]).reduce((sum, lu) => sum + lu.area, 0);
    const landUses = JSON.parse(JSON.stringify(s.landUses)) as GameState['landUses'];
    landUses[LandUseType.EnergyPark].area = 0.04 * total / 0.96; // 4 % of the new total
    const share = landUses[LandUseType.EnergyPark].area / (total + landUses[LandUseType.EnergyPark].area);
    expect(share).toBeCloseTo(0.04, 12);
    expect(energyTargets(landUses, {}).renewableShare).toBe(PARAMS_V2.energy.renewablesCap);
    // Half of that is half of the way.
    landUses[LandUseType.EnergyPark].area /= 2;
    expect(energyTargets(landUses, {}).renewableShare).toBeLessThan(0.55);
    // Carbon Neutrality at full effect plus pacts is capped too.
    expect(energyTargets(s.landUses, { CN: uniform(1) }).renewableShare).toBeCloseTo(PARAMS_V2.energy.renewablesMaxCN, 12);
    expect(energyTargets(s.landUses, { CN: uniform(1) }).efficiency).toBeCloseTo(PARAMS_V2.energy.efficiencyMaxCN, 12);
  });

  it('renewables and efficiency follow their targets with inertia k = 0.15 per year (same yearly and monthly)', () => {
    const s = levelStart(2);
    const eff = { CN: uniform(1) };
    const year = updateEnergyState({ renewableShare: 0, efficiency: 0 }, s.landUses, eff, undefined, 1);
    expect(year.renewableShare).toBeCloseTo(0.15 * 0.6, 12);
    expect(year.efficiency).toBeCloseTo(0.15 * 0.35, 12);
    let m = { renewableShare: 0, efficiency: 0 };
    for (let i = 0; i < 12; i++) m = updateEnergyState(m, s.landUses, eff, undefined, 1 / 12);
    expect(m.renewableShare).toBeCloseTo(year.renewableShare, 12);
    expect(m.efficiency).toBeCloseTo(year.efficiency, 12);
  });

  it('LUC counts only stock losses, × 44/12, as an annual rate (÷ dt)', () => {
    const s = levelStart(1);
    const loss = (PARAMS_V2.stock.BNNP - PARAMS_V2.stock.CC) * CO2_PER_C;
    const one = computeEmissions(inputOf(s), {}, [{ from: 'BNNP', to: 'CC', ha: 1000 }], 1);
    expect(one.luc).toBeCloseTo(1000 * loss, 9);
    // A gain of stock (CC → restoration) is realised by the flux of the new use, not here.
    expect(computeEmissions(inputOf(s), {}, [{ from: 'CC', to: 'RES', ha: 1000 }], 1).luc).toBe(0);
    // The same hectares moved in a month are twelve times the annual rate.
    expect(computeEmissions(inputOf(s), {}, [{ from: 'BNNP', to: 'CC', ha: 1000 / 12 }], 1 / 12).luc).toBeCloseTo(one.luc, 6);
  });

  it('E_luc never sees a bilateral pair: the realised flows are netted (phase 37)', () => {
    const level = fc.constantFrom(1, 2, 3);
    const eta = fc.double({ min: 0, max: 1, noNaN: true });
    fc.assert(fc.property(level, eta, eta, eta, eta, (lvl, as, cr, pai, fra) => {
      const s = levelStart(lvl);
      const eff: LandEfficiencies = { AS: uniform(as), CR: uniform(cr), PAI: uniform(pai), FRA: uniform(fra) };
      const flows = yearFlows(s, eff);
      const keys = new Set(flows.map((f) => `${f.from}>${f.to}`));
      flows.forEach((f) => expect(keys.has(`${f.to}>${f.from}`)).toBe(false));
      expect(computeEmissions(inputOf(s), eff, flows, 1).luc).toBeGreaterThanOrEqual(0);
    }), { numRuns: 60 });
  });

  it('the land flux can be negative and reads the policy multipliers of PARAMS_V2.fluxPolicy', () => {
    expect(fluxOf('CC', { PAI: uniform(1) })).toBeCloseTo(2.5 * 1.3, 12);
    expect(fluxOf('PRG', { GS: uniform(1) })).toBeCloseTo(3.0 * 0.65, 12);
    expect(fluxOf('CA', { AS: uniform(1) })).toBeCloseTo(0.8 * 0.6, 12);
    expect(fluxOf('BNNP', { FRA: uniform(1), CR: uniform(1) })).toBeCloseTo(0.5 * 2 * 0.4, 12);
    expect(fluxOf('FAL', {})).toBe(-2.0);
    const s = levelStart(1);
    const landUses = JSON.parse(JSON.stringify(s.landUses)) as GameState['landUses'];
    landUses[LandUseType.RestorationForest].area = 200;
    expect(computeEmissions(inputOf({ ...s, landUses }), {}, [], 1).afolu).toBeLessThan(0);
  });
});

describe('carbon 2.0 — budget', () => {
  it('B_t = 1 when emissions follow the reference path exactly', () => {
    const E0 = 2.85e6;
    const dt = 1 / 12;
    let cum = 0;
    let t = 0;
    for (let i = 0; i < 360; i++) {
      const mid = t + dt / 2; // linear path: the midpoint rule is exact
      cum += E0 * (1 - (PARAMS_V2.energy.budgetCut2054 * mid) / PARAMS_V2.energy.budgetYears) * dt;
      t += dt;
      if (i % 37 === 0 || i === 359) {
        expect(carbonBudgetIndex({ t, cumulativeEmissions: cum, anchors: { emissions0: E0 } as never })).toBeCloseTo(1, 9);
      }
    }
    expect(budgetPath(E0, 30)).toBeCloseTo(E0 * 30 * (1 - 0.30 / 2), 6);
    expect(carbonBudgetIndex({ t: 0, cumulativeEmissions: 0, anchors: { emissions0: E0 } as never })).toBe(0);
  });

  it('advance() accumulates total emissions × dt and reports the components in model.emissions', () => {
    const s0 = withActivePolicies(freshState(2), [Policy.CarbonNeutrality]);
    const y = advance(s0, 1, null, CONTROL_PARAMS).next; // one step of dt = 1
    const m = y.model!;
    expect(m.cumulativeEmissions).toBeCloseTo(m.emissions.total, 6);
    expect(y.indicators.co2EqEmissionsPerCapita).toBeCloseTo(m.emissions.total / y.stellaSpecificState.Poblacion_Total, 9);
    expect(m.energy.renewableShare).toBeGreaterThan(0);
    let mo = s0;
    let month = 0;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const r = advance(mo, MONTHLY_DT, makeRng(1, i), CONTROL_PARAMS, { month });
      sum += r.next.model!.emissions.total * MONTHLY_DT;
      mo = r.next;
      month = r.month;
    }
    expect(mo.model!.cumulativeEmissions).toBeCloseTo(sum, 3);
    // Population compounds exactly: 12 months = one year.
    expect(mo.stellaSpecificState.Poblacion_Total).toBeCloseTo(y.stellaSpecificState.Poblacion_Total, 6);
  });

  it('re-anchors a pre-phase-38 state (no pop0, 1.1 population of 10 million) to the physical scale', () => {
    const fresh = freshState(2);
    const old = JSON.parse(JSON.stringify(fresh)) as GameState;
    delete (old.model!.anchors as Partial<typeof old.model.anchors>).pop0;
    old.stellaSpecificState.Poblacion_Total = 10_000_000;
    const a = stepYear(old, () => 0.999).next;
    const b = stepYear(fresh, () => 0.999).next;
    expect(a.model!.anchors.pop0).toBe(CONTROL_PARAMS.Poblacion_Inicial);
    expect(a.stellaSpecificState.Poblacion_Total).toBeCloseTo(b.stellaSpecificState.Poblacion_Total, 6);
    expect(a.indicators.co2EqEmissionsPerCapita).toBeCloseTo(b.indicators.co2EqEmissionsPerCapita, 9);
  });

  it('the N2 range of c between extreme strategies is at least 3 t (spec 38 §6)', async () => {
    const { playLevel } = await import('./testHelpers');
    const extractive = playLevel(2, 'extractive', 30).co2EqEmissionsPerCapita;
    const innovation = playLevel(2, 'innovation', 30).co2EqEmissionsPerCapita;
    expect(extractive - innovation).toBeGreaterThanOrEqual(3);
  });
});
