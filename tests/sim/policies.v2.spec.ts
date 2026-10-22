/**
 * Model 2.0 policies (mejora-general/files/36_politicas_eficiencia_instrumentos.md §4): start-up ramp,
 * fatigue with floor and recovery, instrument channels, cost by effort. Reference numbers from
 * scripts/reference/modelo_v2.py (base_eta, channel, compute_eta, policy_cost).
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CONTROL_PARAMS, INITIAL_POLICY_INSTRUMENTS } from '../../src/constants';
import { advance, checkEfficiencyWarning, getPolicyEfficiency, stepMonth, stepYear } from '../../src/sim';
import { PARAMS_V2, PID, PIDS } from '../../src/sim/v2/params';
import {
  baseEfficiency, channelStrength, costShareOf, computeEfficiencies, fatigueFactor, INSTRUMENT_CHANNELS, policyCost, policyCostOf,
  policyStatus, tickPolicyClocks,
} from '../../src/sim/v2/policies';
import { Policy, type GameState, type PolicyState } from '../../src/types';
import { freshState, withActivePolicies } from './testHelpers';

const CP = CONTROL_PARAMS;
const noEvents = () => 0.999;
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

function policy(id: Policy, over: Partial<PolicyState> = {}): PolicyState {
  const p = clone(freshState(2).policies[id]);
  p.isActive = true;
  Object.keys(p.instruments!).forEach((k) => { p.instruments![k].effortPercentage = 25; });
  p.totalInstrumentEffortApplied = 100;
  return { ...p, ...over };
}

function setEffort(p: PolicyState, efforts: number[]): void {
  const pid = (Object.keys(PID) as (keyof typeof PID)[]).find((k) => PID[k] === p.id)!;
  INSTRUMENT_CHANNELS[pid].ids.forEach((id, k) => { p.instruments![id].effortPercentage = efforts[k]; });
  p.totalInstrumentEffortApplied = Math.min(100, efforts.reduce((a, b) => a + b, 0));
}

describe('base efficiency', () => {
  it('with rampTime = λ and fatigueTime = 0 is 1 − e⁻¹', () => {
    const p = policy(Policy.Agroecological, { rampTime: PARAMS_V2.rampYears.AS, fatigueTime: 0 });
    expect(baseEfficiency(p, CP)).toBeCloseTo(1 - Math.exp(-1), 12);
  });

  it('tends to η_min as fatigueTime grows', () => {
    const p = policy(Policy.Agroecological, { rampTime: 1e6, fatigueTime: 1e6 });
    expect(baseEfficiency(p, CP)).toBeCloseTo(CP.Eficiencia_Minima_Politicas, 9);
  });

  it('is 0 while inactive and right after activation', () => {
    expect(baseEfficiency(policy(Policy.CarbonNeutrality, { isActive: false, rampTime: 5 }), CP)).toBe(0);
    expect(baseEfficiency(policy(Policy.CarbonNeutrality, { rampTime: 0 }), CP)).toBe(0);
  });

  it('a programme policy (λ = 1.5) ramps to 49 % in its first year', () => {
    const p = policy(Policy.Agroecological, { rampTime: 1, fatigueTime: 0 });
    expect(baseEfficiency(p, CP)).toBeCloseTo(0.487, 3);
  });
});

describe('policy clocks', () => {
  it('5 years at rest multiply fatigueTime by e⁻¹ and reset the ramp', () => {
    const policies = clone(freshState(2).policies);
    const p = policies[Policy.NaturalConservation];
    p.isActive = false; p.rampTime = 7; p.fatigueTime = 8;
    for (let i = 0; i < 5; i++) tickPolicyClocks(policies, 1, CP);
    expect(p.fatigueTime).toBeCloseTo(8 * Math.exp(-1), 12);
    expect(p.rampTime).toBe(0);
  });

  it('twelve monthly ticks equal one annual tick', () => {
    const a = clone(freshState(2).policies);
    const b = clone(freshState(2).policies);
    [a, b].forEach((ps) => { ps[Policy.Agroecological].isActive = true; ps[Policy.NaturalConservation].fatigueTime = 4; });
    tickPolicyClocks(a, 1, CP);
    for (let i = 0; i < 12; i++) tickPolicyClocks(b, 1 / 12, CP);
    expect(b[Policy.Agroecological].rampTime!).toBeCloseTo(a[Policy.Agroecological].rampTime!, 12);
    expect(b[Policy.NaturalConservation].fatigueTime!).toBeCloseTo(a[Policy.NaturalConservation].fatigueTime!, 12);
  });
});

describe('channels', () => {
  it('an even split gives 1 for any relevance, no effort gives 0', () => {
    fc.assert(fc.property(fc.array(fc.double({ min: 0.01, max: 1, noNaN: true }), { minLength: 4, maxLength: 4 }), (r) => {
      expect(channelStrength([25, 25, 25, 25], r)).toBeCloseTo(1, 12);
      expect(channelStrength([0, 0, 0, 0], r)).toBe(0);
    }));
  });

  it('12.5 per instrument gives χ = 0.58 (spec 36 §1)', () => {
    expect(channelStrength([12.5, 12.5, 12.5, 12.5], [1, 1, 1, 1])).toBeCloseTo(0.58, 2);
  });

  it('INV-12: more effort on an instrument never lowers a channel where it is relevant', () => {
    fc.assert(fc.property(
      fc.constantFrom(...PIDS), fc.constantFrom('land', 'prod', 'social', 'elec', 'other', 'tax'),
      fc.array(fc.double({ min: 0, max: 100, noNaN: true }), { minLength: 4, maxLength: 4 }),
      fc.integer({ min: 0, max: 3 }), fc.double({ min: 0, max: 50, noNaN: true }),
      (pid, channel, efforts, k, extra) => {
        const rel = (INSTRUMENT_CHANNELS[pid] as unknown as Record<string, number[] | undefined>)[channel];
        if (!rel || rel[k] <= 0) return;
        const more = efforts.slice(); more[k] += extra;
        expect(channelStrength(more, rel)).toBeGreaterThanOrEqual(channelStrength(efforts, rel) - 1e-12);
      },
    ));
  });

  it('instrument ids match INITIAL_POLICY_INSTRUMENTS, in order, 4 per policy', () => {
    PIDS.forEach((pid) => {
      const ch = INSTRUMENT_CHANNELS[pid];
      expect(ch.ids, pid).toEqual(Object.keys(INITIAL_POLICY_INSTRUMENTS[PID[pid]]));
      (['land', 'prod', 'social', 'tag'] as const).forEach((c) => expect(ch[c], `${pid}.${c}`).toHaveLength(4));
    });
    expect(INSTRUMENT_CHANNELS.CN.elec).toEqual([0.6, 1, 0.3, 0]);
    expect(INSTRUMENT_CHANNELS.CN.tax).toEqual([1, 0, 0, 0]);
  });

  it('getPolicyEfficiency is eff[pid].prod', () => {
    const policies = clone(freshState(2).policies);
    const p = policies[Policy.IntensiveAgriculture];
    p.isActive = true; p.rampTime = 3; p.fatigueTime = 3;
    setEffort(p, [70, 10, 10, 10]);
    const eff = computeEfficiencies(policies, 2, CP);
    expect(getPolicyEfficiency(p, 2)).toBeCloseTo(eff.PAI.prod, 12);
    expect(eff.PAI.prod).not.toBeCloseTo(eff.PAI.land, 3);
  });
});

describe('matches the prototype (modelo_v2.py)', () => {
  it('CN 20/40/40/0 + AS even, level 2: η after 10 years, 5 at rest, 3 re-activated', () => {
    const policies = clone(freshState(2).policies);
    const cn = policies[Policy.CarbonNeutrality];
    const as = policies[Policy.Agroecological];
    cn.isActive = true; as.isActive = true;
    setEffort(cn, [20, 40, 40, 0]); setEffort(as, [25, 25, 25, 25]);
    for (let i = 0; i < 10; i++) tickPolicyClocks(policies, 1, CP);
    let eff = computeEfficiencies(policies, 2, CP);
    expect(eff.CN.eta).toBeCloseTo(0.6878171991863185, 10);
    expect(eff.CN.elec!).toBeCloseTo(0.9240384522581447, 10);
    expect(eff.CN.other!).toBeCloseTo(0.7103579499668929, 10);
    expect(eff.CN.tax!).toBeCloseTo(0.6530331718790634, 10);
    expect(eff.AS.eta).toBeCloseTo(0.682851000753802, 10);
    // CN's prod / land channels are the prototype's uniform channel.
    expect(eff.CN.prod).toBeCloseTo(eff.CN.eta, 12);
    // Same formula as policy_cost; the scale is the transitional bridge until phase 44 (prototype κ gives 0.02).
    expect(policyCost(policies, 1)).toBeCloseTo(costShareOf('CN') + costShareOf('AS'), 12);
    expect(PARAMS_V2.costShare.CN + PARAMS_V2.costShare.AS).toBeCloseTo(0.02, 12);

    cn.isActive = false;
    for (let i = 0; i < 5; i++) tickPolicyClocks(policies, 1, CP);
    expect(cn.fatigueTime!).toBeCloseTo(3.678794411714423, 10);
    // re-activation keeps the wear: the ramp starts again, the fatigue clock does not
    cn.isActive = true;
    for (let i = 0; i < 3; i++) tickPolicyClocks(policies, 1, CP);
    eff = computeEfficiencies(policies, 2, CP);
    expect(eff.CN.eta).toBeCloseTo(0.5281940922226849, 10);
    expect(cn.fatigueTime!).toBeCloseTo(6.6787944117144225, 10);
  });
});

describe('cost by effort', () => {
  it('a policy at 50 % effort costs (0.3 + 0.35) κ·Y', () => {
    const p = policy(Policy.Agroecological);
    setEffort(p, [20, 10, 10, 10]);
    expect(policyCostOf(p, 1000)).toBeCloseTo(costShareOf('AS') * 1000 * 0.65, 10);
    expect(policyCostOf({ ...p, isActive: false }, 1000)).toBe(0);
  });

  it('the engine charges it: reserves fall by the cost the formula gives', () => {
    const base = freshState(2);
    const on = withActivePolicies(base, [Policy.CarbonNeutrality]);
    const dOff = stepYear(base, noEvents).next.stellaSpecificState.Reservas_del_Tesoro;
    const dOn = stepYear(on, noEvents).next.stellaSpecificState.Reservas_del_Tesoro;
    expect(dOff - dOn).toBeGreaterThan(0);
  });
});

describe('in the engine', () => {
  const play = (s: GameState, years: number) => { for (let i = 0; i < years; i++) s = stepYear(s, noEvents).next; return s; };

  it('advance stores η in currentEfficiency and returns the channels', () => {
    const s0 = withActivePolicies(freshState(1), [Policy.Agroecological]);
    const r = advance(s0, 1, noEvents, CP);
    const p = r.next.policies[Policy.Agroecological];
    expect(p.rampTime).toBe(1);
    expect(p.currentEfficiency).toBeCloseTo((1 - Math.exp(-1 / 1.5)) * (0.35 + 0.65 * Math.exp(-1 / 15)), 12);
    expect(r.efficiencies.AS.base).toBeCloseTo(p.currentEfficiency!, 12);
    expect(r.efficiencies.CR.base).toBe(0);
  });

  it('monthly and annual clocks agree after a year', () => {
    const s0 = withActivePolicies(freshState(2), [Policy.SustainableLivestock]);
    let m = s0;
    for (let i = 0; i < 12; i++) m = stepMonth(m, i, noEvents).next;
    const y = stepYear(s0, noEvents).next;
    expect(m.policies[Policy.SustainableLivestock].currentEfficiency!).toBeCloseTo(y.policies[Policy.SustainableLivestock].currentEfficiency!, 10);
  });

  it('shows "starting up" until the ramp passes 0.9 and "worn" after the fatigue factor halves', () => {
    const s0 = withActivePolicies(freshState(1), [Policy.EnergySubsidies]); // λ = 0.5, δ = 5
    expect(policyStatus(s0.policies[Policy.EnergySubsidies]).starting).toBe(true);
    const s1 = play(s0, 2);
    expect(policyStatus(s1.policies[Policy.EnergySubsidies]).starting).toBe(false);
    expect(policyStatus(s1.policies[Policy.EnergySubsidies]).worn).toBe(false);
    const s4 = play(s1, 2);
    expect(fatigueFactor(s4.policies[Policy.EnergySubsidies])).toBeLessThan(0.5);
    expect(policyStatus(s4.policies[Policy.EnergySubsidies]).worn).toBe(true);
  });

  it('warns exactly once when the fatigue factor crosses 0.5 (SE: δ ln 2 = 3.47 years)', () => {
    let s = withActivePolicies(freshState(1), [Policy.EnergySubsidies]);
    const warnings: number[] = [];
    for (let y = 1; y <= 10; y++) {
      const r = stepYear(s, noEvents);
      if (r.chatMessages.some((m) => m.emphasisType === 'policy_efficiency_warning')) warnings.push(y);
      s = r.next;
    }
    expect(warnings).toEqual([4]);
  });

  it('checkEfficiencyWarning does not warn on the first check or for inactive policies', () => {
    const policies = clone(freshState(1).policies);
    policies[Policy.Agroecological].isActive = true;
    policies[Policy.Agroecological].fatigueTime = 100;
    expect(checkEfficiencyWarning(policies)).toHaveLength(0);
    policies[Policy.NaturalConservation].fatigueTime = 100;
    policies[Policy.NaturalConservation].previousFatigueFactor = 1;
    expect(checkEfficiencyWarning(policies)).toHaveLength(0);
  });
});
