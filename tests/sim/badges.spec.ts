import { describe, expect, it } from 'vitest';
import {
  hasPositiveCarbonBalanceYear,
  hasThreeConsecutivePositiveBalanceYears,
  wonWithoutShortcuts,
  negotiatedAllPressuresDown,
  hasWonAllRoutesOnSomeLevel,
  recordRouteWin,
  forecastAccuracy,
  isSkilledForecaster,
  finishedLevel3WithLowDebt,
  wonWithJustTransition,
  evaluateBadges,
  SHORTCUT_POLICIES,
  type RoutesWonPerLevel,
} from '../../src/game/badges';
import type { LevelOutcome } from '../../src/sim/winRoutes';
import type { HistoricalDataPoint } from '../../src/types';
import { Policy } from '../../src/types';
import type { PredictionResult } from '../../src/components/tutorial/predictions';
import { freshState, withActivePolicies } from './testHelpers';

/** Minimal LevelOutcome fixture -- every badge condition here only reads `.won`. */
function makeOutcome(won: boolean): LevelOutcome {
  return { won, floorsMet: won, failedFloors: [], routes: [], achieved: null, closest: {} as LevelOutcome['closest'] };
}

function point(year: number, co2: number): HistoricalDataPoint {
  return { year, co2EqEmissionsPerCapita: co2 };
}

function pressurePoint(year: number, ppAgricola: number, ppAmbientalista: number, ppSocial: number): HistoricalDataPoint {
  return { year, ppAgricola, ppAmbientalista, ppSocial };
}

describe('Primer Balance (hasPositiveCarbonBalanceYear)', () => {
  it('false with no year at or below zero emissions', () => {
    expect(hasPositiveCarbonBalanceYear([point(2020, 5), point(2021, 3)])).toBe(false);
  });
  it('true the first year co2EqEmissionsPerCapita hits 0 (the clamped stand-in for a positive balance)', () => {
    expect(hasPositiveCarbonBalanceYear([point(2020, 5), point(2021, 0)])).toBe(true);
  });
});

describe('Sumidero Neto (hasThreeConsecutivePositiveBalanceYears)', () => {
  it('false with only two consecutive positive-balance years', () => {
    expect(hasThreeConsecutivePositiveBalanceYears([point(2020, 0), point(2021, 0), point(2022, 1)])).toBe(false);
  });
  it('true with three consecutive positive-balance years', () => {
    expect(hasThreeConsecutivePositiveBalanceYears([point(2020, 0), point(2021, 0), point(2022, 0)])).toBe(true);
  });
  it('a broken streak does not carry over', () => {
    expect(hasThreeConsecutivePositiveBalanceYears([point(2019, 0), point(2020, 5), point(2021, 0), point(2022, 0)])).toBe(false);
  });
});

describe('Sin Atajos (wonWithoutShortcuts)', () => {
  it('false when the level was not won', () => {
    expect(wonWithoutShortcuts(makeOutcome(false), freshState(1).policies)).toBe(false);
  });
  it('true when won with no shortcut policy active', () => {
    expect(wonWithoutShortcuts(makeOutcome(true), freshState(1).policies)).toBe(true);
  });
  it('false when won with a shortcut policy (EnergySubsidies) active', () => {
    const state = withActivePolicies(freshState(1), [Policy.EnergySubsidies]);
    expect(wonWithoutShortcuts(makeOutcome(true), state.policies)).toBe(false);
    expect(SHORTCUT_POLICIES).toContain(Policy.EnergySubsidies);
  });
});

describe('Negociadora (negotiatedAllPressuresDown)', () => {
  it('false on just the year-zero baseline, even if pressures start under 50 (nothing was negotiated yet)', () => {
    expect(negotiatedAllPressuresDown([pressurePoint(2020, 0, 0, 0)])).toBe(false);
  });
  it('false when no simulated year has all three pressures under the threshold', () => {
    const history = [pressurePoint(2020, 70, 70, 70), pressurePoint(2021, 60, 10, 10)];
    expect(negotiatedAllPressuresDown(history)).toBe(false);
  });
  it('true once a simulated year has all three pressures below 50', () => {
    const history = [pressurePoint(2020, 70, 70, 70), pressurePoint(2021, 49, 20, 0)];
    expect(negotiatedAllPressuresDown(history)).toBe(true);
  });
});

describe('Pluralista (hasWonAllRoutesOnSomeLevel / recordRouteWin)', () => {
  it('false with fewer than all three routes recorded for any level', () => {
    let routes: RoutesWonPerLevel = {};
    routes = recordRouteWin(routes, 1, 'conservation');
    routes = recordRouteWin(routes, 1, 'production');
    expect(hasWonAllRoutesOnSomeLevel(routes)).toBe(false);
  });
  it('true once all three base routes are recorded for the same level', () => {
    let routes: RoutesWonPerLevel = {};
    routes = recordRouteWin(routes, 1, 'conservation');
    routes = recordRouteWin(routes, 1, 'production');
    routes = recordRouteWin(routes, 1, 'innovation');
    expect(hasWonAllRoutesOnSomeLevel(routes)).toBe(true);
  });
  it('recordRouteWin is idempotent for a repeated route', () => {
    let routes: RoutesWonPerLevel = {};
    routes = recordRouteWin(routes, 1, 'conservation');
    const again = recordRouteWin(routes, 1, 'conservation');
    expect(again[1]).toEqual(['conservation']);
  });
  it('equilibrium wins on level 3 do not substitute for the three base routes', () => {
    let routes: RoutesWonPerLevel = {};
    routes = recordRouteWin(routes, 3, 'conservation');
    routes = recordRouteWin(routes, 3, 'production');
    routes = recordRouteWin(routes, 3, 'equilibrium');
    expect(hasWonAllRoutesOnSomeLevel(routes)).toBe(false);
  });
});

describe('Pronosticadora (forecastAccuracy / isSkilledForecaster)', () => {
  const result = (correct: boolean): PredictionResult => ({ indicator: 'biodiversity', predicted: 'up', actual: correct ? 'up' : 'down', delta: 1, correct });

  it('accuracy of an empty result set is 0', () => {
    expect(forecastAccuracy([])).toBe(0);
  });
  it('not skilled below the minimum sample size, even at 100% accuracy', () => {
    expect(isSkilledForecaster([result(true), result(true)])).toBe(false);
  });
  it('skilled at >= 80% accuracy with enough samples', () => {
    const results = [result(true), result(true), result(true), result(true), result(false)]; // 4/5 = 80%
    expect(forecastAccuracy(results)).toBeCloseTo(0.8);
    expect(isSkilledForecaster(results)).toBe(true);
  });
  it('not skilled below 80% accuracy', () => {
    const results = [result(true), result(true), result(false), result(false), result(false)]; // 2/5 = 40%
    expect(isSkilledForecaster(results)).toBe(false);
  });
});

describe('Sin Deuda (finishedLevel3WithLowDebt)', () => {
  it('false outside level 3', () => {
    const state = freshState(1);
    state.stellaSpecificState.Deuda = 0;
    expect(finishedLevel3WithLowDebt(state)).toBe(false);
  });
  it('true on level 3 with debt/PBI under 30%', () => {
    const state = freshState(3);
    state.stellaSpecificState.PBI_Real = 10000;
    state.stellaSpecificState.Deuda = 1000; // 10%
    expect(finishedLevel3WithLowDebt(state)).toBe(true);
  });
  it('false on level 3 with debt/PBI at or above 30%', () => {
    const state = freshState(3);
    state.stellaSpecificState.PBI_Real = 10000;
    state.stellaSpecificState.Deuda = 4000; // 40%
    expect(finishedLevel3WithLowDebt(state)).toBe(false);
  });
});

describe('Transición Justa (wonWithJustTransition)', () => {
  it('false when the level was not won even if both indicators clear the bar', () => {
    const indicators = { ...freshState(1).indicators, socialWellbeing: 80, biodiversity: 80 };
    expect(wonWithJustTransition(makeOutcome(false), indicators)).toBe(false);
  });
  it('false when won but one indicator is below 60', () => {
    const indicators = { ...freshState(1).indicators, socialWellbeing: 80, biodiversity: 40 };
    expect(wonWithJustTransition(makeOutcome(true), indicators)).toBe(false);
  });
  it('true when won with both indicators >= 60', () => {
    const indicators = { ...freshState(1).indicators, socialWellbeing: 65, biodiversity: 60 };
    expect(wonWithJustTransition(makeOutcome(true), indicators)).toBe(true);
  });
});

describe('Aprendiz + evaluateBadges (orchestrator)', () => {
  it('includes apprentice whenever debriefingCompleted is true, independent of everything else', () => {
    const earned = evaluateBadges({
      gameState: freshState(1),
      history: [],
      outcome: null,
      predictionResults: [],
      routesWonPerLevel: {},
      debriefingCompleted: true,
    });
    expect(earned).toEqual(['apprentice']);
  });

  it('can report multiple badges at once', () => {
    const state = freshState(3);
    state.stellaSpecificState.PBI_Real = 10000;
    state.stellaSpecificState.Deuda = 1000;
    const earned = evaluateBadges({
      gameState: state,
      history: [point(2040, 0), point(2041, 0), point(2042, 0)],
      outcome: null,
      predictionResults: [],
      routesWonPerLevel: {},
      debriefingCompleted: false,
    });
    expect(earned).toEqual(expect.arrayContaining(['firstBalance', 'netSink', 'noDebt']));
    expect(earned).not.toContain('apprentice');
  });

  it('reports no badges for a plain fresh state with nothing accomplished yet', () => {
    const earned = evaluateBadges({
      gameState: freshState(1),
      history: [],
      outcome: null,
      predictionResults: [],
      routesWonPerLevel: {},
      debriefingCompleted: false,
    });
    expect(earned).toEqual([]);
  });
});
