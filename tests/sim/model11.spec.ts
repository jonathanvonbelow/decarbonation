/**
 * Model 1.1 corrections (mejora-general/files/34_correcciones_modelo_1_1.md). One block per item;
 * each locks in the bug the audit found, so a regression shows up as the old number.
 */
import { describe, expect, it } from 'vitest';
import {
  createInitialState, evenEffort, getPolicyEfficiency,
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
  // Phase 36 replaced the 1.1 curve e^(-t/20) with the 2.0 one; CN still wears like every other policy:
  // (1 − e^(−10/2.5)) · (0.35 + 0.65 · e^(−10/25)) = 0.772.
  it('CN active 10 years without events wears like the others (2.0 curve)', () => {
    const s = run(withActivePolicies(freshState(1), [Policy.CarbonNeutrality]), 10);
    const expected = (1 - Math.exp(-10 / 2.5)) * (0.35 + 0.65 * Math.exp(-10 / 25));
    expect(s.policies[Policy.CarbonNeutrality].currentEfficiency!).toBeCloseTo(expected, 10);
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

  // Phase 36: effort counts in every level; the even split of level 1 gives χ = 1, so level 1 plays
  // at the base efficiency.
  it('the even split gives level 1 exactly the base efficiency', () => {
    const p = clonePolicy(freshState(1).policies[Policy.Agroecological]);
    p.isActive = true;
    p.currentEfficiency = 0.8;
    evenEffort(p);
    expect(getPolicyEfficiency(p, 1)).toBeCloseTo(0.8, 12);
  });
});

describe('model 1.1 §3: pacts are impulses, not level jumps (N-03, T-03)', () => {
  it('the biodiversity treaty no longer drives B towards 100 within the level', () => {
    const s0 = withActivePolicies(freshState(2), [Policy.NaturalConservation]);
    s0.pacts.biodiversityTreaty.isActive = true;
    expect(run(s0, 15).indicators.biodiversity).toBeLessThan(60);
  });
  // Phase 40: the treaty's impulse inside the 1.1 biodiversity function became a shift of B*
  // (PARAMS_V2.pacts.biodiversityTreaty.B; tests/sim/biodiversity.v2.spec.ts).
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

// §6 (T-06, efficiencyFromCounter) was retired in phase 36: the 2.0 clocks replace the counter and
// re-activation is covered by tests/sim/policies.v2.spec.ts ("re-activation keeps the wear").

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
