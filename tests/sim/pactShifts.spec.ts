/**
 * Pact effects on CO2 and the targets (moved here from tests/sim/deferred.spec.ts when phase 46 deleted
 * src/sim/deferred.ts: pacts are target shifts since phase 43 and no event writes CO2 any more).
 */
import { describe, expect, it } from 'vitest';
import { stepMonth, stepYear } from '../../src/sim';
import { INITIAL_PACTS } from '../../src/constants';
import { PARAMS_V2 } from '../../src/sim/v2/params';
import { Policy, type GameState } from '../../src/types';
import { freshState, withActivePolicies } from './testHelpers';

const noEventRng = () => 0.999;

function withPact(state: GameState, pactId: string): GameState {
  return { ...state, pacts: { ...state.pacts, [pactId]: { ...INITIAL_PACTS[pactId], isActive: true } } };
}

describe('pact shifts on carbon and the targets', () => {
  // Phase 38: the 1.1 pacts cut CO2 by a flat −5 % / −10 % after the recomputation; in the physical carbon
  // they shift the renewables / efficiency targets (PARAMS_V2.pacts.*.renewables / efficiency), which the
  // energy state follows with inertia (k = 0.15 per year): after one year s = 0.15·Δs*, u = 0.15·Δu*.
  // Phase 39: its +3 of political stability (a level written after the recomputation) became a shift of the
  // collapse target, PARAMS_V2.pacts.globalCarbonAccord.Pc = −0.15 logit, and its −0.10 on E a shift of E*.
  it('the Global Carbon Accord shifts renewables and efficiency, and the targets of collapse and E', () => {
    const base = withActivePolicies(freshState(3), [Policy.IntensiveAgriculture]);
    const without = stepYear(base, noEventRng).next;
    const with_ = stepYear(withPact(base, 'globalCarbonAccord'), noEventRng).next;
    const k = PARAMS_V2.energy.adjust;
    expect(with_.model!.energy.renewableShare - without.model!.energy.renewableShare).toBeCloseTo(k * 0.05, 9);
    expect(with_.model!.energy.efficiency - without.model!.energy.efficiency).toBeCloseTo(k * 0.05, 9);
    expect(with_.indicators.co2EqEmissionsPerCapita).toBeLessThan(without.indicators.co2EqEmissionsPerCapita);
    const lg = (x: number) => Math.log(x / (100 - x));
    const t = (g: GameState) => g.model!.targets;
    // E*: the pact's shift (phase 46: after 11 monthly sub-steps B, F and growth differ by a hair, |Δ| < 1e-4 logit).
    expect(lg(t(with_).E!) - lg(t(without).E!)).toBeCloseTo(PARAMS_V2.pacts.globalCarbonAccord.E, 3);
    // Pc*: the pact's shift plus what the lower E and W of this year add (spec 39 §4); phase 46: the pressures of the
    // sub-steps also differ a little (|Δ| ≈ 0.001 logit), hence 2 decimals.
    const r = PARAMS_V2.relaxation.Pc;
    const viaE = r.econ * (without.indicators.economicSecurity - with_.indicators.economicSecurity) / r.econScale;
    const viaW = r.wellbeing * (without.indicators.socialWellbeing - with_.indicators.socialWellbeing) / r.wellbeingScale;
    expect(lg(t(with_).Pc!) - lg(t(without).Pc!)).toBeCloseTo(PARAMS_V2.pacts.globalCarbonAccord.Pc + viaE + viaW, 2);
    expect(with_.indicators.politicalStability).toBeGreaterThan(without.indicators.politicalStability);
  });

  it('the Technology Transfer Initiative shifts renewables by 0.10 and efficiency by 0.05', () => {
    const base = freshState(3);
    const without = stepYear(base, noEventRng).next;
    const with_ = stepYear(withPact(base, 'techTransferInitiative'), noEventRng).next;
    const k = PARAMS_V2.energy.adjust;
    expect(with_.model!.energy.renewableShare - without.model!.energy.renewableShare).toBeCloseTo(k * 0.10, 9);
    expect(with_.model!.energy.efficiency - without.model!.energy.efficiency).toBeCloseTo(k * 0.05, 9);
    expect(with_.indicators.co2EqEmissionsPerCapita).toBeLessThan(without.indicators.co2EqEmissionsPerCapita);
  });

  it('a pact moves a derived indicator gradually in the monthly engine, not in one jump', () => {
    const base = withPact(freshState(2), 'globalCarbonAccord');
    const plain = stepMonth(freshState(2), 0, noEventRng).next;
    const oneMonth = stepMonth(base, 0, noEventRng).next;
    const ratio = oneMonth.indicators.co2EqEmissionsPerCapita / plain.indicators.co2EqEmissionsPerCapita;
    expect(ratio).toBeLessThan(1);
    expect(ratio).toBeGreaterThan(0.99); // one month of the energy inertia (phase 38), not the whole shift
  });
});
