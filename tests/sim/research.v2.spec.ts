/**
 * Phase 48 — research indices (src/sim/v2/research.ts, mejora-general/files/48 §2–3, §6).
 */
import { describe, expect, it } from 'vitest';
import { CONTROL_PARAMS, MAX_ACTIVE_POLICIES } from '../../src/constants';
import {
  advanceYear, brierDeterministic, brierProbabilistic, createResearchTracker, neighbourPolicies, oneYearRegret,
  policyEntropy, predictionSkill, researchIndices, safeJustGap, SKILL_FLOOR, skillScore, togglePolicyIn, trackRegret, trackStep,
} from '../../src/sim';
import { PARAMS_V2 } from '../../src/sim/v2/params';
import { Policy, type GameState } from '../../src/types';
import { freshState, withActivePolicies } from './testHelpers';

const CP = CONTROL_PARAMS;

describe('Brier and skill (§2)', () => {
  it('deterministic Brier: 0 on a hit, 2 on a miss', () => {
    expect(brierDeterministic('up', 'up')).toBe(0);
    expect(brierDeterministic('up', 'flat')).toBe(2);
  });
  it('probabilistic Brier: Σ (p − o)²; a sure right forecast is 0, a sure wrong one 2', () => {
    expect(brierProbabilistic({ down: 0, flat: 0, up: 1 }, 'up')).toBe(0);
    expect(brierProbabilistic({ down: 1, flat: 0, up: 0 }, 'up')).toBe(2);
    expect(brierProbabilistic({ down: 1 / 3, flat: 1 / 3, up: 1 / 3 }, 'flat')).toBeCloseTo(2 / 3, 12);
  });
  it('all hits ⇒ SS = 1 when the baseline misses some', () => {
    expect(skillScore([0, 0, 0], [2, 0, 0])).toBe(1);
  });
  it('perfect baseline ⇒ SS ≤ 0', () => {
    expect(skillScore([0, 0], [0, 0])).toBe(0);
    expect(skillScore([2, 0], [0, 0])).toBe(-Infinity);
    expect(skillScore([2, 0], [0, 2])).toBeLessThanOrEqual(0);
  });
  it('as good as the baseline ⇒ SS = 0; worse ⇒ negative', () => {
    expect(skillScore([2, 0], [0, 2])).toBe(0);
    expect(skillScore([2, 2], [2, 0])).toBe(-1);
  });
  it('predictionSkill aggregates accuracy and both skill scores', () => {
    const clim = { down: 0.3, flat: 0.35, up: 0.35 };
    const s = predictionSkill([
      { predicted: 'up', actual: 'up', persistence: 'up', climatology: clim },
      { predicted: 'down', actual: 'flat', persistence: 'down', climatology: clim },
    ]);
    expect(s.n).toBe(2);
    expect(s.accuracy).toBe(0.5);
    expect(s.accuracyPersistence).toBe(0.5);
    expect(s.skillPersistence).toBe(0);
    const climBrier = (brierProbabilistic(clim, 'up') + brierProbabilistic(clim, 'flat')) / 2;
    expect(s.skillClimatology).toBeCloseTo(1 - 1 / climBrier, 12);
  });
});

describe('oneYearRegret (§3)', () => {
  const state = withActivePolicies(freshState(2), [Policy.Agroecological, Policy.NaturalConservation]);

  it('compares the player with every allowed neighbour, at most 11 steps, with common random numbers', () => {
    let calls = 0;
    const step = (s: GameState, rng: () => number) => { calls += 1; return advanceYear(s, rng, CP).next; };
    const r = oneYearRegret(state, 42, CP, { step });
    expect(calls).toBe(1 + r.alternatives);
    expect(calls).toBeLessThanOrEqual(11);
    expect(r.regret).toBeGreaterThanOrEqual(0);
    expect(r.regret).toBeCloseTo(r.best - r.player, 12);
    // Same seed: the best neighbour, played as the player's portfolio, scores exactly `best`.
    if (r.bestMove) expect(oneYearRegret(togglePolicyIn(state, r.bestMove, CP), 42, CP).player).toBeCloseTo(r.best, 9);
  });

  it('is 0 when the player\'s portfolio is the best of its neighbourhood', () => {
    // Score = 1 while CR is active. CR was just activated (locked in), so no neighbour can drop it: all tie.
    const locked = { ...state, policies: { ...state.policies, [Policy.NaturalConservation]: { ...state.policies[Policy.NaturalConservation], activationYear: state.year } } };
    const r = oneYearRegret(locked, 7, CP, { score: (s) => (s.policies[Policy.NaturalConservation].isActive ? 1 : 0) });
    expect(r.regret).toBe(0);
    expect(r.bestMove).toBeNull();
  });

  it('neighbours respect the maximum of active policies and the lock-in', () => {
    const full = withActivePolicies(freshState(1), [
      Policy.Agroecological, Policy.NaturalConservation, Policy.SustainableLivestock, Policy.CarbonNeutrality, Policy.EnergySubsidies,
    ]);
    full.policies[Policy.CarbonNeutrality].activationYear = full.year; // locked for 5 years
    const moves = neighbourPolicies(full);
    expect(moves).toHaveLength(MAX_ACTIVE_POLICIES - 1); // only switch-offs, CN excluded
    expect(moves).not.toContain(Policy.CarbonNeutrality);
  });

  it('togglePolicyIn never mutates its input', () => {
    const before = JSON.stringify(state);
    togglePolicyIn(state, Policy.IntensiveAgriculture, CP);
    togglePolicyIn(state, Policy.Agroecological, CP);
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe('safe-and-just gap and tracker (§3)', () => {
  const sj = PARAMS_V2.research.safeJust;
  const at = (s: GameState, over: Partial<GameState['indicators']>): GameState => ({ ...s, indicators: { ...s.indicators, ...over } });

  it('is 0 inside the space and adds the normalised shortfalls and overshoots', () => {
    const s = freshState(2);
    const c0 = s.model!.anchors.c0;
    const inside = at(s, { foodSecurity: 80, economicSecurity: 80, socialWellbeing: 80, biodiversity: 80, co2EqEmissionsPerCapita: 0.5 * c0 });
    expect(safeJustGap(inside)).toBeCloseTo(0, 12);
    const outside = at(inside, { foodSecurity: sj.F - 10, co2EqEmissionsPerCapita: sj.cRatio * c0 + 0.5 * c0 });
    expect(safeJustGap(outside)).toBeCloseTo(10 / 100 + 0.5, 9);
  });

  it('a shock on F during an event opens an episode that closes at 90 % recovery', () => {
    const s0 = at(freshState(2), { foodSecurity: 60 });
    let t = createResearchTracker();
    t = trackStep(t, s0, at(s0, { foodSecurity: 50 }), 1, true); // fall of 10 with an event
    expect(t.open).toHaveLength(1);
    t = trackStep(t, at(s0, { foodSecurity: 50 }), at(s0, { foodSecurity: 55 }), 1, false); // 50 % recovered
    expect(t.open).toHaveLength(1);
    t = trackStep(t, at(s0, { foodSecurity: 55 }), at(s0, { foodSecurity: 59.5 }), 1, false); // ≥ 90 %
    expect(t.open).toHaveLength(0);
    expect(t.recoveredTimes).toEqual([3]);
    const ind = researchIndices(t, s0);
    expect(ind.resilience_months).toBe(36);
  });

  it('a fall without an event, or a tiny one, is not a shock', () => {
    const s0 = at(freshState(2), { foodSecurity: 60 });
    expect(trackStep(createResearchTracker(), s0, at(s0, { foodSecurity: 50 }), 1, false).open).toHaveLength(0);
    expect(trackStep(createResearchTracker(), s0, at(s0, { foodSecurity: 59.9 }), 1, true).open).toHaveLength(0);
  });

  it('counts active time and switch-offs (between steps and inside one)', () => {
    const a = withActivePolicies(freshState(1), [Policy.Agroecological, Policy.NaturalConservation]);
    let t = trackStep(createResearchTracker(), a, a, 1, false);
    const b = togglePolicyIn(a, Policy.Agroecological, CP); // the player switches AS off
    t = trackStep(t, b, b, 1, false);
    expect(t.reversals).toBe(1);
    expect(t.activeTime[Policy.NaturalConservation]).toBe(2);
    expect(t.activeTime[Policy.Agroecological]).toBe(1);
  });

  it('policy entropy is 0 with one policy and 1 with all equally used', () => {
    expect(policyEntropy({ a: 3 }, 10)).toBe(0);
    expect(policyEntropy({ a: 1, b: 1 }, 2)).toBeCloseTo(1, 12);
    expect(policyEntropy({}, 10)).toBe(0);
  });

  it('researchIndices is a small flat JSON object (≤ 4 KB, the SQL CHECK) with finite numbers or null', () => {
    let s = withActivePolicies(freshState(1), [Policy.Agroecological]);
    let t = createResearchTracker();
    for (let y = 0; y < 3; y++) {
      const next = advanceYear(s, () => 0.999, CP).next;
      t = trackRegret(trackStep(t, s, next, 1, false), 1.5);
      s = next;
    }
    const ind = researchIndices(t, s);
    expect(JSON.stringify(ind).length).toBeLessThan(4096);
    Object.values(ind).forEach((v) => expect(v === null || Number.isFinite(v)).toBe(true));
    expect(ind.regret_mean).toBe(1.5);
    expect(ind.carbon_budget_used).toBeGreaterThan(0);
    expect(ind.land_concentration).not.toBeNull();
    expect(ind.just_transition).not.toBeNull();
    expect(ind.skill_persistence).toBeNull(); // no prediction passed (Territorio)
  });

  it('a new level resets policies without counting reversals, and closes open shocks (censored)', () => {
    const n1 = at(withActivePolicies(freshState(1), [Policy.Agroecological, Policy.NaturalConservation]), { foodSecurity: 60 });
    let t = trackStep(createResearchTracker(), n1, at(n1, { foodSecurity: 50 }), 1, true);
    expect(t.open).toHaveLength(1);
    const n2 = freshState(2); // level 2 starts with no policies
    t = trackStep(t, n2, n2, 1, false);
    expect(t.reversals).toBe(0);
    expect(t.open).toHaveLength(0);
    expect(t.recoveredTimes).toEqual([1]);
  });

  it('a perfect baseline with an imperfect player is stored at the skill floor, not as null', () => {
    const s0 = freshState(1);
    const ind = researchIndices(createResearchTracker(), s0, { n: 2, accuracy: 0.5, accuracyPersistence: 1, skillPersistence: -Infinity, skillClimatology: 0.2 });
    expect(ind.skill_persistence).toBe(SKILL_FLOOR);
    expect(ind.skill_climatology).toBe(0.2);
  });
});

describe('neighbours never leave the 3-level game without policies', () => {
  it('the only active policy cannot be switched off (minActive 1), but can with minActive 0 (Territorio)', () => {
    const one = withActivePolicies(freshState(1), [Policy.Agroecological]);
    expect(neighbourPolicies(one)).not.toContain(Policy.Agroecological);
    expect(neighbourPolicies(one, undefined, 0)).toContain(Policy.Agroecological);
  });
});
