/**
 * Model 1.1 corrections (mejora-general/files/34_correcciones_modelo_1_1.md). One block per item;
 * each locks in the bug the audit found, so a regression shows up as the old number.
 */
import { describe, expect, it } from 'vitest';
import {
  calculateBiodiversityChange, createInitialState, efficiencyFromCounter, evenEffort, getPolicyEfficiency,
  stepMonth, stepYear,
} from '../../src/sim';
import { ALL_RANDOM_EVENTS, CONTROL_PARAMS, INITIAL_PACTS } from '../../src/constants';
import { LandUseType, Policy, type GameState, type PolicyInstrument, type PolicyState } from '../../src/types';
import { freshState, withActivePolicies } from './testHelpers';

const noEventRng = () => 0.999;
const run = (state: GameState, years: number): GameState => {
  let s = state;
  for (let i = 0; i < years; i++) s = stepYear(s, noEventRng).next;
  return s;
};
const clonePolicy = (p: PolicyState): PolicyState => JSON.parse(JSON.stringify(p));

describe('model 1.1 §1: Carbon Neutrality decays (N-01, T-02)', () => {
  it('CN active 10 years without events ends at e^(-10/20) = 0.607 efficiency', () => {
    const s = run(withActivePolicies(freshState(1), [Policy.CarbonNeutrality]), 10);
    expect(Math.abs(s.policies[Policy.CarbonNeutrality].currentEfficiency! - Math.exp(-10 / 20))).toBeLessThan(0.01);
  });
});

describe('model 1.1 §2: even effort on activation (N-02)', () => {
  it('evenEffort splits 100 % with the remainder on the first instrument', () => {
    const p = clonePolicy(freshState(1).policies[Policy.CarbonNeutrality]);
    evenEffort(p);
    const efforts = (Object.values(p.instruments!) as PolicyInstrument[]).map((i) => i.effortPercentage);
    expect(efforts).toEqual([25, 25, 25, 25]);
    expect(p.totalInstrumentEffortApplied).toBe(100);
    const three = { ...p, instruments: Object.fromEntries(Object.entries(p.instruments!).slice(0, 3)) } as PolicyState;
    evenEffort(three);
    expect((Object.values(three.instruments!) as PolicyInstrument[]).map((i) => i.effortPercentage)).toEqual([34, 33, 33]);
  });

  it('N1, only CN active: year-1 CO2 per capita is below do_nothing', () => {
    const base = freshState(1);
    const cn = JSON.parse(JSON.stringify(base)) as GameState;
    const p = cn.policies[Policy.CarbonNeutrality];
    p.isActive = true;
    evenEffort(p);
    const nothing = stepYear(base, noEventRng).next.indicators.co2EqEmissionsPerCapita;
    const withCn = stepYear(cn, noEventRng).next.indicators.co2EqEmissionsPerCapita;
    expect(withCn).toBeLessThan(nothing);
  });

  it('level 1 efficiency ignores effort, so evenEffort changes nothing else there', () => {
    const p = clonePolicy(freshState(1).policies[Policy.Agroecological]);
    p.isActive = true;
    const before = getPolicyEfficiency(p, 1);
    evenEffort(p);
    expect(getPolicyEfficiency(p, 1)).toBe(before);
  });
});

describe('model 1.1 §3: pacts are impulses, not level jumps (N-03, T-03)', () => {
  it('the biodiversity treaty no longer drives B towards 100 within the level', () => {
    const s0 = withActivePolicies(freshState(2), [Policy.NaturalConservation]);
    s0.pacts.biodiversityTreaty.isActive = true;
    expect(run(s0, 15).indicators.biodiversity).toBeLessThan(60);
  });

  it('an active pact adds its impulse inside the biodiversity function', () => {
    const s = freshState(2);
    const off = calculateBiodiversityChange(s.policies, s.landUses, 40, 2, CONTROL_PARAMS, s.pacts);
    const pacts = { ...s.pacts, biodiversityTreaty: { ...s.pacts.biodiversityTreaty, isActive: true } };
    const on = calculateBiodiversityChange(s.policies, s.landUses, 40, 2, CONTROL_PARAMS, pacts);
    // impulse x policy-impact weight x the function's own gain (1.5)
    expect(on - off).toBeCloseTo(0.4 * CONTROL_PARAMS.Factor_Impacto_Politicas_y_Presiones_en_Biodiversidad_Peso * 1.5, 6);
  });
});

describe('model 1.1 §4: pacts keep their functions from the first year (N-14)', () => {
  it('createInitialState restores effects()', () => {
    [1, 2, 3].forEach((level) => {
      const { pacts } = createInitialState(level).gameStatePatch;
      Object.keys(INITIAL_PACTS).forEach((id) => expect(typeof pacts[id].effects, `${level}/${id}`).toBe('function'));
    });
    expect(typeof createInitialState(2).gameStatePatch.pacts.biodiversityTreaty.effects).toBe('function');
  });
});

describe('model 1.1 §5: drought reads the level area (N-09, T-08)', () => {
  const drought = ALL_RANDOM_EVENTS.find((e) => e.id === 'drought_severe')!;
  it('the +0.02 depends on the CC share of the level itself', () => {
    [1, 2, 3].forEach((level) => {
      const s = freshState(level);
      const total = (Object.values(s.landUses) as { area: number }[]).reduce((sum, lu) => sum + lu.area, 0);
      const share = s.landUses[LandUseType.ConventionalCrops].area / total;
      expect(drought.triggerChance(s)).toBeCloseTo(0.07 + (share > 0.25 ? 0.02 : 0), 10);
    });
  });

  it('level 2 (CC 150 / 600 = 0.25, not above) lost the +0.02 that the fixed 500 kHa gave it', () => {
    expect(drought.triggerChance(freshState(2))).toBeCloseTo(0.07, 10);
  });
});

describe('model 1.1 §6: re-activation does not restore efficiency (T-06)', () => {
  it('efficiencyFromCounter reads the accumulated active time', () => {
    const s = run(withActivePolicies(freshState(1), [Policy.IntensiveAgriculture]), 3);
    const p = s.policies[Policy.IntensiveAgriculture];
    expect(efficiencyFromCounter(p, s.stellaSpecificState)).toBeCloseTo(p.currentEfficiency!, 10);
    expect(efficiencyFromCounter(p, s.stellaSpecificState)).toBeCloseTo(Math.exp(-3 / 5), 10);
  });

  it('a never-activated policy is at its initial efficiency', () => {
    const s = freshState(1);
    expect(efficiencyFromCounter(s.policies[Policy.NaturalConservation], s.stellaSpecificState)).toBe(1);
  });
});

describe('model 1.1 §8: deferred effects decided outside the step (T-12)', () => {
  it('stepMonth applies extraDeferred after recomputing CO2', () => {
    const s = freshState(2);
    const plain = stepMonth(s, 0, noEventRng).next.indicators.co2EqEmissionsPerCapita;
    const cut = stepMonth(s, 0, noEventRng, undefined, 'es', {
      extraDeferred: [{ indicator: 'co2EqEmissionsPerCapita', factor: 0.95 }],
    }).next.indicators.co2EqEmissionsPerCapita;
    expect(cut).toBeCloseTo(plain * 0.95, 6);
  });
});
