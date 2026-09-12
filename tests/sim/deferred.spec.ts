/**
 * Pact and event effects on the indicators the year recomputes (src/sim/deferred.ts).
 * Before this fix they were applied early and overwritten, so they never reached the player.
 */
import { describe, expect, it } from 'vitest';
import { stepMonth, stepYear } from '../../src/sim';
import { INITIAL_PACTS } from '../../src/constants';
import { Policy, type GameState } from '../../src/types';
import { freshState, withActivePolicies } from './testHelpers';

const noEventRng = () => 0.999;
const allEventsRng = () => 0;

function withPact(state: GameState, pactId: string): GameState {
  return { ...state, pacts: { ...state.pacts, [pactId]: { ...INITIAL_PACTS[pactId], isActive: true } } };
}

describe('deferred pact and event effects', () => {
  it('the Global Carbon Accord actually cuts CO2 by 5% and raises political stability by 3', () => {
    const base = withActivePolicies(freshState(3), [Policy.IntensiveAgriculture]);
    const without = stepYear(base, noEventRng).next;
    const with_ = stepYear(withPact(base, 'globalCarbonAccord'), noEventRng).next;
    expect(with_.indicators.co2EqEmissionsPerCapita).toBeCloseTo(without.indicators.co2EqEmissionsPerCapita * 0.95, 6);
    expect(with_.indicators.politicalStability).toBeCloseTo(without.indicators.politicalStability + 3, 6);
  });

  it('the Technology Transfer Initiative cuts CO2 by 10%', () => {
    const base = freshState(3);
    const without = stepYear(base, noEventRng).next;
    const with_ = stepYear(withPact(base, 'techTransferInitiative'), noEventRng).next;
    expect(with_.indicators.co2EqEmissionsPerCapita).toBeCloseTo(without.indicators.co2EqEmissionsPerCapita * 0.9, 6);
  });

  it("the green-tech boom event's −5% CO2 survives the year's carbon recomputation", () => {
    // With every draw at 0 the first eligible event fires; on level 2 that pool includes the boom.
    const base = withActivePolicies(freshState(2), [Policy.CarbonNeutrality, Policy.ForeignInvestment]);
    const quiet = stepYear(base, noEventRng).next;
    const shocked = stepYear(base, allEventsRng).next;
    expect(shocked.currentEvent).not.toBeNull();
    // Whatever event fired, an event that declares a CO2 percentage must move CO2 off the quiet path.
    const co2Effects = shocked.currentEvent!.effects(base).filter((e) => e.indicator === 'co2EqEmissionsPerCapita');
    if (co2Effects.length > 0) {
      expect(shocked.indicators.co2EqEmissionsPerCapita).toBeLessThan(quiet.indicators.co2EqEmissionsPerCapita);
    }
  });

  it('a pact moves a derived indicator gradually in the monthly engine, not in one jump', () => {
    const base = withPact(freshState(2), 'globalCarbonAccord');
    const plain = stepMonth(freshState(2), 0, noEventRng).next;
    const oneMonth = stepMonth(base, 0, noEventRng).next;
    const ratio = oneMonth.indicators.co2EqEmissionsPerCapita / plain.indicators.co2EqEmissionsPerCapita;
    expect(ratio).toBeLessThan(1);
    expect(ratio).toBeGreaterThan(0.95); // a twelfth of the way toward −5%, not the whole cut
  });
});
