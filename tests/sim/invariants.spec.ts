/**
 * Invariant tests (subset of mejora-general/files/16_auditoria_ecuaciones.md §3).
 * Run over many random strategies to catch extraction bugs — NaN, out-of-bounds, area drift —
 * independent of any "before/after" numeric baseline (see docs/DESIGN_DECISIONS_LOG.md for why
 * this subset, rather than a live-app diff, is this phase's verification method).
 *
 * The full 14-invariant list, the Monte Carlo balance harness (scripts/simulate.ts) and the
 * calibration report are deferred to phase 5 (mejora-general/files/17_multiples_vias_victoria.md
 * needs the harness to calibrate win routes) — this file covers the invariants that are cheap to
 * check today and catch the highest-value class of bugs (a broken extraction, not an unbalanced
 * game).
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { costShareOf, makeRng, PID_OF, stepYear } from '../../src/sim';
import { PARAMS_V2 } from '../../src/sim/v2/params';
import { Policy, type LandUseType } from '../../src/types';
import { INITIAL_PACTS, INITIAL_POLICIES, TOTAL_LAND_AREA } from '../../src/constants';
import type { Pact, PolicyState } from '../../src/types';
import { freshState, withActivePolicies } from './testHelpers';

const ALL_POLICY_IDS = Object.values(Policy);
const totalArea = (s: { landUses: Record<string, { area: number }> }) =>
  Object.values(s.landUses).reduce((sum, lu) => sum + lu.area, 0);
const YEARS = 20;
const RUNS = 30;

/**
 * Runs `YEARS` simulated years with real seeded randomness, toggling policies on according to
 * `activationPlan`. Random events CAN fire.
 */
function runStrategy(seed: number, activationPlan: { year: number; policy: Policy }[]) {
  let state = freshState(1);
  for (let y = 0; y < YEARS; y++) {
    if (state.gameOverReason) break;
    activationPlan.filter((a) => a.year === y).forEach(({ policy }) => {
      state = withActivePolicies(state, [policy]);
    });
    const rng = makeRng(seed, state.year + 1);
    state = stepYear(state, rng).next;
  }
  return state;
}

/**
 * Same as `runStrategy`, but with random events suppressed (rng pinned near 1, so every
 * `triggerRoll < triggerChance` comparison fails). Isolates the deterministic transition core
 * from event-driven shocks (since phase 37 INV-01 holds with events too).
 */
function runDeterministicStrategy(activationPlan: { year: number; policy: Policy }[]) {
  let state = freshState(1);
  for (let y = 0; y < YEARS; y++) {
    if (state.gameOverReason) break;
    activationPlan.filter((a) => a.year === y).forEach(({ policy }) => {
      state = withActivePolicies(state, [policy]);
    });
    state = stepYear(state, () => 0.999).next;
  }
  return state;
}

describe('sim invariants', () => {
  // INV-01 (model 2.0, phase 37): every land transition is a transfer — the matrix, the events (losses go
  // to fallow) and the situations — so total area is conserved to rounding *with random events active*.
  // Until phase 36 this was checked only on the deterministic core: the severe drought removed CC and CA
  // area with no destination (docs/audit-equations.md L-1, the ±0.01 kHa exception this test used to have).
  it('INV-01: total land area is conserved (1e-9 kHa) every year for 30 years, with random events, 50 seeds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.constantFrom(1, 2, 3),
        fc.array(fc.constantFrom(...ALL_POLICY_IDS), { minLength: 0, maxLength: 5 }),
        (seed, level, policies) => {
          let state = withActivePolicies(freshState(level), policies);
          const total0 = totalArea(state);
          for (let y = 0; y < 30; y++) {
            state = stepYear(state, makeRng(seed, state.year + 1)).next;
            expect(Math.abs(totalArea(state) - total0)).toBeLessThan(1e-9);
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it('INV-01: area is conserved when an event fires every year (rng pinned at 0) and on the deterministic core', () => {
    [() => 0, () => 0.999].forEach((rng) => {
      [1, 2, 3].forEach((level) => {
        let state = withActivePolicies(freshState(level), [Policy.IntensiveAgriculture, Policy.Agroecological]);
        const total0 = totalArea(state);
        for (let y = 0; y < 30; y++) state = stepYear(state, rng).next;
        expect(Math.abs(totalArea(state) - total0)).toBeLessThan(1e-9);
      });
    });
    expect(Math.abs(totalArea(runDeterministicStrategy([])) - TOTAL_LAND_AREA)).toBeLessThan(1e-9);
  });

  it('INV-02: no land use area is ever negative (deterministic core and with random events)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.array(fc.constantFrom(...ALL_POLICY_IDS), { minLength: 0, maxLength: 5 }),
        (seed, policies) => {
          const plan = policies.map((policy, i) => ({ year: i, policy }));
          const state = runStrategy(seed, plan);
          (Object.keys(state.landUses) as LandUseType[]).forEach((k) => {
            expect(state.landUses[k].area).toBeGreaterThanOrEqual(0);
          });
        },
      ),
      { numRuns: RUNS },
    );
  });

  it('INV-03/04: every 0-100 indicator and sectoral pressure stays within bounds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.array(fc.constantFrom(...ALL_POLICY_IDS), { minLength: 0, maxLength: 5 }),
        (seed, policies) => {
          const plan = policies.map((policy, i) => ({ year: i, policy }));
          const state = runStrategy(seed, plan);
          const bounded: (keyof typeof state.indicators)[] = [
            'biodiversity', 'foodSecurity', 'economicSecurity', 'socialWellbeing', 'politicalStability',
            'ppAgricola', 'ppAmbientalista', 'ppSocial',
          ];
          bounded.forEach((k) => {
            expect(state.indicators[k]).toBeGreaterThanOrEqual(0);
            expect(state.indicators[k]).toBeLessThanOrEqual(100);
          });
        },
      ),
      { numRuns: RUNS },
    );
  });

  it('INV-05: no NaN or Infinity anywhere in the resulting indicators or Stella stocks', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.array(fc.constantFrom(...ALL_POLICY_IDS), { minLength: 0, maxLength: 5 }),
        (seed, policies) => {
          const plan = policies.map((policy, i) => ({ year: i, policy }));
          const state = runStrategy(seed, plan);
          [...Object.values(state.indicators), ...Object.values(state.stellaSpecificState).filter((v) => typeof v === 'number')].forEach((v) => {
            expect(Number.isFinite(v as number)).toBe(true);
          });
        },
      ),
      { numRuns: RUNS },
    );
  });

  it('INV-06: policy efficiency stays within 0-1 for every active policy', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.array(fc.constantFrom(...ALL_POLICY_IDS), { minLength: 0, maxLength: 5 }),
        (seed, policies) => {
          const plan = policies.map((policy, i) => ({ year: i, policy }));
          const state = runStrategy(seed, plan);
          Object.values(state.policies).forEach((p) => {
            if (p.isActive && p.currentEfficiency !== undefined) {
              expect(p.currentEfficiency).toBeGreaterThanOrEqual(0);
              expect(p.currentEfficiency).toBeLessThanOrEqual(1.0001);
            }
          });
        },
      ),
      { numRuns: RUNS },
    );
  });

  it('INV-13: no game-over condition triggers on year 0 of a fresh game', () => {
    const state = freshState(1);
    expect(state.gameOverReason).toBeNull();
  });

  // Model 1.1 (phase 34, N-01/T-02): Carbon Neutrality's stellaName was commented out, so it never decayed.
  // Model 2.0 (phase 36): every policy reads its ramp, fatigue and cost from PARAMS_V2 by id, so no policy
  // can silently skip the clocks; this checks every policy has all three.
  it('INV-15: every policy has a ramp, a fatigue and a cost in PARAMS_V2', () => {
    (Object.values(INITIAL_POLICIES) as PolicyState[]).forEach((p) => {
      const pid = PID_OF[p.id];
      expect(pid, p.id).toBeTruthy();
      expect(PARAMS_V2.rampYears[pid], p.id).toBeGreaterThan(0);
      expect(PARAMS_V2.fatigueYears[pid], p.id).toBeGreaterThan(0);
      expect(PARAMS_V2.costShare[pid], p.id).toBeGreaterThan(0);
      expect(costShareOf(pid), p.id).toBeGreaterThan(0); // the scale the engine charges (bridge until phase 44)
    });
  });

  // Model 1.1 (phase 34, N-03/T-03): a pact is at most as strong as the strongest policy on the same indicator.
  // Phase 41: the 1.1 `impulses` (B, F) are gone; every pact effect on an indicator is a target shift (PARAMS_V2.pacts).
  it('INV-16: no pact shift exceeds the largest policy weight on the same indicator', () => {
    (Object.values(INITIAL_PACTS) as Pact[]).forEach((pact) => expect('impulses' in pact, pact.id).toBe(false));
    // Phase 39: E is a logistic target; a pact's shift on it is at most the largest policy weight bE (logit units).
    const maxBE = Math.max(...(Object.values(PARAMS_V2.bE) as number[]).map(Math.abs));
    (Object.values(PARAMS_V2.pacts) as { E?: number }[]).forEach((p) => expect(Math.abs(p.E ?? 0)).toBeLessThanOrEqual(maxBE));
    // Phase 40: same for B, against the largest policy weight qB.
    const maxQB = Math.max(...(Object.values(PARAMS_V2.qB) as number[]).map(Math.abs));
    (Object.values(PARAMS_V2.pacts) as { B?: number }[]).forEach((p) => expect(Math.abs(p.B ?? 0)).toBeLessThanOrEqual(maxQB));
    // And no pact writes B, F, E or political stability as a level any more.
    (Object.values(INITIAL_PACTS) as Pact[]).forEach((pact) => {
      const out = pact.effects(freshState(2).indicators, freshState(2).stellaSpecificState).indicators ?? {};
      ['biodiversity', 'foodSecurity', 'economicSecurity', 'politicalStability'].forEach((k) => expect(k in out, `${pact.id}.${k}`).toBe(false));
    });
  });
});
