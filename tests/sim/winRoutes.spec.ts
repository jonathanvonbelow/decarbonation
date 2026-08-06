import { describe, expect, it } from 'vitest';
import { evaluateLevel, evaluateRoute, LEVEL_ROUTES, type WinRoute } from '../../src/sim/winRoutes';
import { Policy } from '../../src/types';
import { freshState, withActivePolicies } from './testHelpers';

// Synthetic routes, independent of LEVEL_ROUTES' calibrated thresholds -- these test
// evaluateRoute's own logic (met/progress/bottleneck/minConditionsMet), not any particular
// level's numbers.
const lowRoute: WinRoute = {
  id: 'conservation', nameKey: 'x', taglineKey: 'x', descriptionKey: 'x', accent: 'chlorophyll', scoreMultiplier: 1,
  conditions: [{ labelKey: 'x', read: (s) => s.indicators.biodiversity, target: 10, dir: 'min' }],
};
const highRoute: WinRoute = {
  id: 'production', nameKey: 'x', taglineKey: 'x', descriptionKey: 'x', accent: 'ochre', scoreMultiplier: 2,
  conditions: [{ labelKey: 'x', read: (s) => s.indicators.biodiversity, target: 90, dir: 'min' }],
};
const multiConditionRoute: WinRoute = {
  id: 'innovation', nameKey: 'x', taglineKey: 'x', descriptionKey: 'x', accent: 'hydro', scoreMultiplier: 1,
  conditions: [
    { labelKey: 'a', read: (s) => s.indicators.biodiversity, target: 90, dir: 'min' }, // hard, won't be met at 40
    { labelKey: 'b', read: (s) => s.indicators.foodSecurity, target: 10, dir: 'min' }, // easy, met
    { labelKey: 'c', read: (s) => s.indicators.economicSecurity, target: 10, dir: 'min' }, // easy, met
  ],
  minConditionsMet: 2, // "2 of 3" — matches the equilibrium route's N-of-M pattern
};

describe('evaluateRoute', () => {
  it('reports met=true and progress=1 when the single condition is already satisfied', () => {
    const state = freshState(1); // biodiversity 40 by default
    const rp = evaluateRoute(lowRoute, state, state);
    expect(rp.met).toBe(true);
    expect(rp.progress).toBe(1);
    expect(rp.bottleneck).toBeNull();
  });

  it('reports met=false with the unmet condition as the bottleneck when unreachable', () => {
    const state = freshState(1); // biodiversity 40, target 90
    const rp = evaluateRoute(highRoute, state, state);
    expect(rp.met).toBe(false);
    expect(rp.bottleneck?.target).toBe(90);
  });

  it('minConditionsMet allows a route to be met without every condition passing (N of M)', () => {
    const state = freshState(1);
    const rp = evaluateRoute(multiConditionRoute, state, state);
    // 2 of 3 conditions met (foodSecurity, economicSecurity), biodiversity=90 not met
    expect(rp.conditions.filter((c) => c.met)).toHaveLength(2);
    expect(rp.met).toBe(true);
  });

  it('progress is monotonic: improving any condition never decreases route progress', () => {
    const baseline = freshState(1);
    const before = evaluateRoute(highRoute, baseline, baseline);
    const improved = { ...baseline, indicators: { ...baseline.indicators, biodiversity: 60 } };
    const after = evaluateRoute(highRoute, improved, baseline);
    expect(after.progress).toBeGreaterThanOrEqual(before.progress);
  });

  it('progress is measured from the baseline, not from zero', () => {
    // baseline already at biodiversity 40, target 90: naive "value/target" would show ~44%
    // progress on year zero. Baseline-relative progress must show 0% instead.
    const baseline = freshState(1);
    const rp = evaluateRoute(highRoute, baseline, baseline);
    expect(rp.progress).toBe(0);
  });
});

describe('evaluateLevel (integration, against the real calibrated LEVEL_ROUTES)', () => {
  it('a state that fails the floors never wins, even if a route would otherwise be met', () => {
    let state = freshState(1);
    // Tank economic security below the level-1 floor (15) while leaving everything else healthy.
    state = { ...state, indicators: { ...state.indicators, economicSecurity: 0 } };
    const outcome = evaluateLevel(state, freshState(1));
    expect(outcome.floorsMet).toBe(false);
    expect(outcome.won).toBe(false);
  });

  it('when multiple routes are met, achieved is the one with the highest scoreMultiplier', () => {
    // Innovation (1.1x) and conservation (1.0x) at level 1 share a similar bar; push every
    // relevant indicator comfortably past both routes' thresholds and past the floors.
    let state = withActivePolicies(freshState(1), [Policy.NaturalConservation, Policy.Agroecological]);
    state = {
      ...state,
      indicators: { ...state.indicators, biodiversity: 90, co2EqEmissionsPerCapita: 0.1, economicSecurity: 90, generalScore: 900 },
    };
    const outcome = evaluateLevel(state, freshState(1));
    expect(outcome.won).toBe(true);
    expect(outcome.achieved?.id).toBe('innovation'); // 1.1x beats conservation's 1.0x
  });

  it('LEVEL_ROUTES is defined for all three levels with at least one route each', () => {
    for (const level of [1, 2, 3]) {
      expect(LEVEL_ROUTES[level]).toBeDefined();
      expect(LEVEL_ROUTES[level].routes.length).toBeGreaterThan(0);
    }
  });

  it('level 3 equilibrium route requires only 6 of its 10 conditions (matches the pre-phase-5 "6 of 10" rule)', () => {
    const equilibrium = LEVEL_ROUTES[3].routes.find((r) => r.id === 'equilibrium')!;
    expect(equilibrium.conditions).toHaveLength(10);
    expect(equilibrium.minConditionsMet).toBe(6);
  });
});
