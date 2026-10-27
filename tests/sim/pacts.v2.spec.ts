/**
 * Phase 43 — international pacts as target shifts (src/sim/v2/pacts.ts, mejora-general/files/43_pactos_internacionales.md §3).
 */
import { describe, expect, it } from 'vitest';
import { CONTROL_PARAMS, INITIAL_PACTS } from '../../src/constants';
import { advance, createInitialState, stepYear } from '../../src/sim';
import { driveB } from '../../src/sim/v2/biodiversity';
import { energyTargets } from '../../src/sim/v2/carbon';
import { driveE, drivePc, type IndicatorState } from '../../src/sim/v2/indicators';
import { PARAMS_V2 } from '../../src/sim/v2/params';
import {
  pactAnnualCost, pactEnergyShift, pactEntryCost, pactLandFactors, pactShift, pactYearlyCostOf,
} from '../../src/sim/v2/pacts';
import type { GameState } from '../../src/types';
import { activatePolicies, freshLevelState, joinPacts, runNiveles } from '../../scripts/harness/runNiveles';
import type { NivelesStrategy } from '../../scripts/harness/strategies';
import { freshState } from './testHelpers';

const CP = CONTROL_PARAMS;
const asModel = (s: GameState) => s as IndicatorState;
const withPacts = <T extends Pick<GameState, 'pacts'>>(s: T, ids: string[]): T => {
  ids.forEach((id) => { s.pacts[id] = { ...s.pacts[id], isActive: true }; });
  return s;
};

describe('target shifts', () => {
  it('with the treaty active D_B grows by exactly 0.25 and D_E falls by 0.05, whatever the years of membership', () => {
    const s = asModel(freshState(2));
    const b0 = driveB(s, {});
    const e0 = driveE(s, {}, CP);
    withPacts(s, ['biodiversityTreaty']);
    [0, 5, 17.5, 30].forEach((t) => {
      s.model.t = t;
      expect(driveB(s, {}) - b0).toBeCloseTo(0.25, 12);
      expect(driveE(s, {}, CP) - e0).toBeCloseTo(-0.05, 12);
    });
  });

  it('the carbon accord shifts E −0.10 and Pc −0.15; tech transfer E +0.15', () => {
    const s = asModel(freshState(2));
    const e0 = driveE(s, {}, CP);
    const p0 = drivePc(s);
    withPacts(s, ['globalCarbonAccord']);
    expect(driveE(s, {}, CP) - e0).toBeCloseTo(-0.10, 12);
    expect(drivePc(s) - p0).toBeCloseTo(-0.15, 12);
    withPacts(s, ['techTransferInitiative']);
    expect(pactShift(s.pacts, 'E')).toBeCloseTo(0.05, 12);
  });

  it('energy targets: accord +0.05 / +0.05, tech +0.10 / +0.05 on s* and u*', () => {
    const s = freshState(2);
    const base = energyTargets(s.landUses, {}, s.pacts);
    withPacts(s, ['globalCarbonAccord', 'techTransferInitiative']);
    expect(pactEnergyShift(s.pacts, 'renewables')).toBeCloseTo(0.15, 12);
    expect(pactEnergyShift(s.pacts, 'efficiency')).toBeCloseTo(0.10, 12);
    const t = energyTargets(s.landUses, {}, s.pacts);
    expect(t.renewableShare - base.renewableShare).toBeCloseTo(0.15, 12);
    expect(t.efficiency - base.efficiency).toBeCloseTo(0.10, 12);
  });

  it('land frontier: the treaty multiplies BNNP → BNP by 1.5 and BNNP → CC by 0.5; no pact, 1', () => {
    const s = freshState(2);
    expect(pactLandFactors(s.pacts)).toEqual({ tasa_BNNP_a_BNP: 1, tasa_BNNP_a_CC: 1, tasa_BNNP_a_CA: 1, tasa_CA_a_BNNP: 1 });
    withPacts(s, ['biodiversityTreaty']);
    expect(pactLandFactors(s.pacts)).toEqual({ tasa_BNNP_a_BNP: 1.5, tasa_BNNP_a_CC: 0.5, tasa_BNNP_a_CA: 1, tasa_CA_a_BNNP: 1 });
  });

  it('a pact id the model does not know does nothing', () => {
    const pacts = { mystery: { id: 'mystery', name: 'x', description: '', isActive: true } };
    expect(pactShift(pacts, 'B')).toBe(0);
    expect(pactAnnualCost(pacts, 1e4)).toBe(0);
    expect(pactEntryCost('mystery', 1e4)).toBe(0);
  });
});

describe('costs as fractions of GDP', () => {
  it('entry 0.03 / 0.05 / 0.10 and annual 0.002 / 0.004 / 0.008 of GDP, scaling with it', () => {
    [10_000, 17_335].forEach((gdp) => {
      expect(pactEntryCost('biodiversityTreaty', gdp)).toBeCloseTo(0.03 * gdp, 9);
      expect(pactEntryCost('globalCarbonAccord', gdp)).toBeCloseTo(0.05 * gdp, 9);
      expect(pactEntryCost('techTransferInitiative', gdp)).toBeCloseTo(0.10 * gdp, 9);
      expect(pactYearlyCostOf('techTransferInitiative', gdp)).toBeCloseTo(0.008 * gdp, 9);
    });
    const s = withPacts(freshState(2), ['biodiversityTreaty', 'globalCarbonAccord']);
    expect(pactAnnualCost(s.pacts, 10_000)).toBeCloseTo(60, 9);
    expect(pactAnnualCost(s.pacts, 20_000)).toBeCloseTo(120, 9);
  });

  // Phase 44: the fee is charged on the GDP after this step's growth (prototype `economy_step`), × dt.
  it('the yearly fee leaves the treasury × dt in the step, on the grown GDP (prototype order)', () => {
    const base = freshState(2);
    const joined = withPacts(freshState(2), ['techTransferInitiative']);
    // One step of dt = 1 (the 3-level game runs 12 monthly sub-steps since phase 46; the order is the same).
    const nextBase = advance(base, 1, null, CP).next.stellaSpecificState;
    const fee = pactAnnualCost(joined.pacts, nextBase.PBI_Real);
    const b = advance(joined, 1, null, CP).next.stellaSpecificState.Reservas_del_Tesoro;
    expect(nextBase.Reservas_del_Tesoro - b).toBeCloseTo(fee, 6);
    const m = advance(base, 1 / 12, null, CP).next.stellaSpecificState;
    const mj = advance(joined, 1 / 12, null, CP).next.stellaSpecificState.Reservas_del_Tesoro;
    expect(m.Reservas_del_Tesoro - mj).toBeCloseTo(pactAnnualCost(joined.pacts, m.PBI_Real) / 12, 6);
  });
});

describe('plain data', () => {
  it('JSON.parse(JSON.stringify(state)) is a complete clone: stepping the clone gives the same year', () => {
    const s = withPacts(freshState(2), ['biodiversityTreaty', 'globalCarbonAccord']);
    const clone = JSON.parse(JSON.stringify(s)) as GameState;
    expect(clone.pacts).toEqual(s.pacts);
    expect(JSON.stringify(stepYear(clone, () => 0.999, CP).next)).toBe(JSON.stringify(stepYear(s, () => 0.999, CP).next));
    expect(JSON.stringify(advance(clone, 1 / 12, null, CP).next)).toBe(JSON.stringify(advance(s, 1 / 12, null, CP).next));
  });

  it('INITIAL_PACTS and createInitialState carry only id, name, description, unlockYear, isActive', () => {
    Object.values(createInitialState(3).gameStatePatch.pacts).forEach((p) => {
      expect(Object.keys(p).sort()).toEqual(['description', 'id', 'isActive', 'name', 'unlockYear']);
    });
    expect(Object.keys(INITIAL_PACTS).sort()).toEqual(Object.keys(PARAMS_V2.pacts).sort());
  });
});

/** Plays 30 years of N2 with no events (like the prototype's golden), joining `pacts` as they unlock. */
function play(ids: NivelesStrategy['ids'], pacts: NivelesStrategy['pacts'] = []): GameState {
  const strategy: NivelesStrategy = { id: 'pact-test', ids, pacts };
  let s = freshLevelState(2, CP);
  activatePolicies(s, strategy.ids, 2, strategy.effort);
  for (let y = 0; y < 30 && !s.gameOverReason; y++) {
    joinPacts(s, strategy, 2);
    s = stepYear(s, () => 0.999, CP).next;
  }
  return s;
}

describe('prototype references (N2, year 30, no events)', () => {
  it('the treaty alone takes B from 39.2 to ≈ 45.4; conservation ends ≈ 60.3 with it and ≈ 54.2 without', () => {
    expect(play([]).indicators.biodiversity).toBeCloseTo(39.18, 0);
    expect(play([], ['treaty']).indicators.biodiversity).toBeCloseTo(45.42, 0);
    expect(play(['CR', 'AS', 'GS'], ['treaty']).indicators.biodiversity).toBeCloseTo(60.30, 0);
    expect(play(['CR', 'AS', 'GS']).indicators.biodiversity).toBeCloseTo(54.24, 0);
  });

  it('the effect is stationary: B with the treaty alone settles (no growth with the years of membership)', () => {
    const b25 = (() => { let s = play([], ['treaty']); return s.indicators.biodiversity; })();
    let s = play([], ['treaty']);
    for (let y = 0; y < 30; y++) s = stepYear(s, () => 0.999, CP).next;
    expect(s.indicators.biodiversity - b25).toBeLessThan(1);
  });
});

describe('pacts alone win no route (spec §4, with events)', () => {
  ([2, 3] as const).forEach((level) => {
    // Phase 49: with the final routes (conservation B ≥ 52, ROUTES3) neither the treaty alone nor the three pacts win
    // anything (before, the provisional B ≥ 41–42 let them win conservation in some seeds).
    ([['treaty'], ['treaty', 'accord', 'tech']] as const).forEach((pacts) => {
      it(`N${level} with only ${pacts.join(' + ')}: no route, B far from 52`, () => {
        const strategy: NivelesStrategy = { id: 'pacts_only', ids: [], pacts: [...pacts] };
        for (let seed = 1; seed <= 5; seed++) {
          const r = runNiveles(level, strategy, seed, CP);
          expect(r.met, `seed ${seed}`).toEqual([]);
          expect(r.won, `seed ${seed}`).toBe(false);
          expect(r.final.B, `seed ${seed}`).toBeLessThan(47);
        }
      });
    });
  });
});
