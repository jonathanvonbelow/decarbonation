import { describe, expect, it } from 'vitest';
import { makeRng, stepYear } from '../../src/sim';
import { Policy } from '../../src/types';
import { freshState, withActivePolicies } from './testHelpers';

// A fixed rng that never triggers a random event (all draws near 1), so these tests exercise
// only the deterministic part of the model — the same adaptation used for the manual browser
// verification in phase 1/2 (see docs/DESIGN_DECISIONS_LOG.md).
const noEventRng = () => 0.999;

describe('stepYear', () => {
  it('is pure: never mutates its input state', () => {
    const state = withActivePolicies(freshState(1), [Policy.NaturalConservation]);
    const before = JSON.parse(JSON.stringify(state));
    stepYear(state, noEventRng);
    expect(state).toEqual(before);
  });

  it('advances the year by exactly one', () => {
    const state = freshState(1);
    const { next } = stepYear(state, noEventRng);
    expect(next.year).toBe(state.year + 1);
    expect(next.yearsSimulatedInCurrentLevel).toBe(1);
  });

  it('is deterministic: same state + same seeded rng => identical result (INV-11)', () => {
    const state = withActivePolicies(freshState(1), [Policy.Agroecological, Policy.CarbonNeutrality]);
    const rngA = makeRng(42, state.year + 1);
    const rngB = makeRng(42, state.year + 1);
    const a = stepYear(state, rngA);
    const b = stepYear(state, rngB);
    expect(a.next).toEqual(b.next);
  });

  it('conservation policy raises biodiversity over a few years, all else equal', () => {
    let state = withActivePolicies(freshState(1), [Policy.NaturalConservation]);
    for (let i = 0; i < 5; i++) {
      state = stepYear(state, noEventRng).next;
    }
    expect(state.indicators.biodiversity).toBeGreaterThan(40); // INITIAL_INDICATORS.biodiversity is 40
  });

  it('do-nothing (no active policies) never produces NaN and stays in bounds over 30 years', () => {
    let state = freshState(1);
    for (let i = 0; i < 30; i++) {
      if (state.gameOverReason) break;
      state = stepYear(state, noEventRng).next;
    }
    expect(Number.isFinite(state.indicators.generalScore)).toBe(true);
    expect(state.indicators.biodiversity).toBeGreaterThanOrEqual(0);
    expect(state.indicators.biodiversity).toBeLessThanOrEqual(100);
  });

  it('records a non-empty trace when indicators move', () => {
    const state = withActivePolicies(freshState(1), [Policy.NaturalConservation]);
    const { trace } = stepYear(state, noEventRng);
    expect(trace.year).toBe(state.year + 1);
    expect(Object.keys(trace.deltas).length).toBeGreaterThan(0);
  });
});
