/**
 * Monthly step (src/sim/monthly.ts, mejora-general/files/21_fusion_ecosim.md §3).
 * The key claim is that it is the same model as stepYear, discretised at Δt = 1/12: same land
 * area, same bounds, and — sustained over a full 30-year game — the same destination.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { makeRng, monthlyTriggerChance, stepMonth, stepYear, MONTHS_PER_YEAR } from '../../src/sim';
import { Policy, type GameState, type LandUseType } from '../../src/types';
import { freshState, withActivePolicies } from './testHelpers';

const noEventRng = () => 0.999;
const ALL_POLICY_IDS = Object.values(Policy);
const totalArea = (s: GameState) => (Object.values(s.landUses) as { area: number }[]).reduce((t, lu) => t + lu.area, 0);

function runMonths(state: GameState, months: number, rngFor: (i: number) => () => number = () => noEventRng) {
  let s = state;
  let month = 0;
  for (let i = 0; i < months; i++) {
    if (s.gameOverReason) break;
    const r = stepMonth(s, month, rngFor(i));
    s = r.next;
    month = r.month;
  }
  return s;
}

function runYears(state: GameState, years: number) {
  let s = state;
  for (let y = 0; y < years; y++) {
    if (s.gameOverReason) break;
    s = stepYear(s, noEventRng).next;
  }
  return s;
}

describe('stepMonth', () => {
  it('is pure: never mutates its input state', () => {
    const state = withActivePolicies(freshState(2), [Policy.NaturalConservation]);
    const before = JSON.parse(JSON.stringify(state));
    stepMonth(state, 0, noEventRng);
    expect(JSON.parse(JSON.stringify(state))).toEqual(before);
  });

  it('advances the calendar: the year rolls only after December', () => {
    let s = freshState(2);
    let month = 0;
    for (let i = 0; i < MONTHS_PER_YEAR; i++) {
      const r = stepMonth(s, month, noEventRng);
      expect(r.yearRolled).toBe(i === MONTHS_PER_YEAR - 1);
      s = r.next;
      month = r.month;
    }
    expect(month).toBe(0);
    expect(s.year).toBe(freshState(2).year + 1);
    expect(s.yearsSimulatedInCurrentLevel).toBe(1);
  });

  it('is deterministic: same state + same seeded rng => identical result', () => {
    const state = withActivePolicies(freshState(2), [Policy.Agroecological, Policy.CarbonNeutrality]);
    const a = stepMonth(state, 3, makeRng(42, 2024 * 12 + 3));
    const b = stepMonth(state, 3, makeRng(42, 2024 * 12 + 3));
    expect(JSON.parse(JSON.stringify(a.next))).toEqual(JSON.parse(JSON.stringify(b.next)));
  });

  it('conserves total land area (±0.01 kHa) over a full 30-year game, deterministic core', () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...ALL_POLICY_IDS), { minLength: 0, maxLength: 5 }), (policies) => {
        const start = withActivePolicies(freshState(2), policies);
        const end = runMonths(start, 30 * MONTHS_PER_YEAR);
        expect(Math.abs(totalArea(end) - totalArea(start))).toBeLessThan(0.01);
      }),
      { numRuns: 15 },
    );
  });

  it('keeps every 0-100 indicator in bounds and every number finite, with random events', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.array(fc.constantFrom(...ALL_POLICY_IDS), { minLength: 0, maxLength: 5 }),
        (seed, policies) => {
          const end = runMonths(withActivePolicies(freshState(2), policies), 30 * MONTHS_PER_YEAR, (i) => makeRng(seed, i));
          (['biodiversity', 'foodSecurity', 'economicSecurity', 'socialWellbeing', 'politicalStability', 'ppAgricola', 'ppAmbientalista', 'ppSocial'] as const)
            .forEach((k) => {
              expect(end.indicators[k]).toBeGreaterThanOrEqual(0);
              expect(end.indicators[k]).toBeLessThanOrEqual(100);
            });
          [...Object.values(end.indicators), ...Object.values(end.stellaSpecificState).filter((v) => typeof v === 'number')]
            .forEach((v) => expect(Number.isFinite(v as number)).toBe(true));
          (Object.keys(end.landUses) as LandUseType[]).forEach((k) => expect(end.landUses[k].area).toBeGreaterThanOrEqual(0));
        },
      ),
      { numRuns: 10 },
    );
  });

  it('reaches the same place as stepYear after 30 years (same model, finer time step)', () => {
    // Tolerances measured, not guessed: with these four strategies the largest gaps on the core
    // indicators were < 1 point, CO2 < 0.2 t/cap, score ~11/1000 (see DESIGN_DECISIONS_LOG, v4 F1).
    const strategies: Policy[][] = [
      [],
      [Policy.Agroecological, Policy.NaturalConservation, Policy.CarbonNeutrality],
      [Policy.IntensiveAgriculture, Policy.AgriculturalExports, Policy.ForeignInvestment],
      [Policy.Agroecological, Policy.SustainableWaterManagement, Policy.AgriculturalExports, Policy.SustainableLivestock],
    ];
    strategies.forEach((policies) => {
      const annual = runYears(withActivePolicies(freshState(2), policies), 30);
      const monthly = runMonths(withActivePolicies(freshState(2), policies), 30 * MONTHS_PER_YEAR);
      expect(monthly.year).toBe(annual.year);
      (['biodiversity', 'foodSecurity', 'economicSecurity', 'socialWellbeing', 'politicalStability'] as const).forEach((k) => {
        expect(Math.abs(monthly.indicators[k] - annual.indicators[k])).toBeLessThan(1.5);
      });
      expect(Math.abs(monthly.indicators.co2EqEmissionsPerCapita - annual.indicators.co2EqEmissionsPerCapita)).toBeLessThan(0.5);
      expect(Math.abs(monthly.indicators.generalScore - annual.indicators.generalScore)).toBeLessThan(20);
    });
  });

  it('monthly event chance keeps the annual probability', () => {
    [0, 0.03, 0.09, 0.5, 1].forEach((p) => {
      const m = monthlyTriggerChance(p);
      expect(1 - Math.pow(1 - m, MONTHS_PER_YEAR)).toBeCloseTo(p, 10);
    });
  });

  it('a triggered event applies its full effect in its month', () => {
    const state = freshState(2);
    const quiet = stepMonth(state, 0, noEventRng);
    const shocked = stepMonth(state, 0, () => 0); // every draw fires: first eligible event (drought)
    expect(shocked.event?.id).toBe('drought_severe');
    expect(quiet.event).toBeNull();
    // Drought: foodSecurity −12% — far more than a month of the model's own dynamics moves it.
    expect(shocked.next.indicators.foodSecurity).toBeLessThan(quiet.next.indicators.foodSecurity - 3);
  });

  it('credits a requested loan once, in full', () => {
    const state = { ...freshState(2), loanRequestedThisRound: 1000 };
    const withLoan = stepMonth(state, 0, noEventRng).next;
    const withoutLoan = stepMonth(freshState(2), 0, noEventRng).next;
    expect(withLoan.loanRequestedThisRound).toBe(0);
    expect(withLoan.stellaSpecificState.Deuda - withoutLoan.stellaSpecificState.Deuda).toBeCloseTo(1000, 6);
    expect(withLoan.stellaSpecificState.Reservas_del_Tesoro - withoutLoan.stellaSpecificState.Reservas_del_Tesoro).toBeCloseTo(1000, 6);
  });

  it('fiscal-pressure terms apply only when switched on', () => {
    const taxed = { ...freshState(2), additionalTaxPressurePercentage: 15 };
    const off = runMonths(taxed, 12);
    let on = taxed;
    let month = 0;
    for (let i = 0; i < 12; i++) {
      const r = stepMonth(on, month, noEventRng, undefined, 'es', { fiscalTermsActive: true });
      on = r.next;
      month = r.month;
    }
    expect(on.indicators.economicSecurity).toBeLessThan(off.indicators.economicSecurity);
    expect(on.stellaSpecificState.Conflicto_social).toBeGreaterThan(off.stellaSpecificState.Conflicto_social);
  });
});
