/**
 * Phase 46 — random events 2.0, yield shock and exact monthly step
 * (src/sim/events.ts, src/sim/v2/core.ts; mejora-general/files/46_eventos_y_paso_mensual.md §1–5, §7).
 */
import { describe, expect, it } from 'vitest';
import { ALL_RANDOM_EVENTS, CONTROL_PARAMS } from '../../src/constants';
import {
  applyRandomEventEffects, eventStepChance, makeRng, nextYieldShock, rollEvents, seasonalWeight, standardNormal, stepMonth, stepYear,
} from '../../src/sim';
import { PARAMS_V2 } from '../../src/sim/v2/params';
import { LandUseType, Policy, type GameState, type RandomEvent } from '../../src/types';
import { NIVELES_STRATEGIES, nivelesTax } from '../../scripts/harness/strategies';
import { activatePolicies, freshLevelState } from '../../scripts/harness/runNiveles';
import { freshState, withActivePolicies } from './testHelpers';

const byId = (id: string) => ALL_RANDOM_EVENTS.find((e) => e.id === id)!;
/** The pool with effects removed, so repeated draws on one state keep it fixed. */
const inert = (events: RandomEvent[]) => events.map((e) => ({ ...e, effects: () => [] }));

describe('independent draws (§1)', () => {
  it('in 10 000 years on a fixed state each event fires with its p_k ± 10 % (level 3: no special branch)', () => {
    const s = withActivePolicies(freshState(3), [Policy.EnergySubsidies, Policy.CarbonNeutrality, Policy.FlexibleEnvironmentalRegulations]);
    const pool = inert(ALL_RANDOM_EVENTS);
    const counts: Record<string, number> = {};
    const rng = makeRng(46, 1);
    const N = 10_000;
    for (let i = 0; i < N; i++) {
      rollEvents(s, pool, rng, { dt: 1, month: 0 }).fired.forEach((e) => { counts[e.id] = (counts[e.id] ?? 0) + 1; });
    }
    ALL_RANDOM_EVENTS.forEach((e) => {
      const p = e.triggerChance(s);
      const f = (counts[e.id] ?? 0) / N;
      if (p === 0) expect(f, e.id).toBe(0);
      else expect(Math.abs(f - p) / p, `${e.id} p=${p} f=${f}`).toBeLessThan(0.1);
    });
  });

  it('several events can fire in the same step, one rng() each in list order', () => {
    const s = freshState(2);
    let draws = 0;
    const r = rollEvents(s, inert(ALL_RANDOM_EVENTS), () => { draws++; return 0; }, { dt: 1, month: 0 });
    const eligible = ALL_RANDOM_EVENTS.filter((e) => (e.minLevel ?? 1) <= 2);
    expect(draws).toBe(eligible.length);
    expect(r.fired.length).toBeGreaterThan(1);
    expect(r.chatMessages).toHaveLength(r.fired.length);
  });

  it('12 monthly chances keep the annual p exactly, with and without the seasonal weights', () => {
    const w = PARAMS_V2.events.droughtSeasonality;
    expect(w.reduce((a, b) => a + b, 0) / 12).toBeCloseTo(1, 12);
    [0.03, 0.07, 0.2, 0.5].forEach((p) => {
      let none = 1;
      let seasonal = 1;
      for (let m = 0; m < 12; m++) {
        none *= 1 - eventStepChance(p, 1 / 12);
        seasonal *= 1 - eventStepChance(p, 1 / 12, seasonalWeight('drought_severe', m, true));
      }
      expect(1 - none).toBeCloseTo(p, 12);
      expect(1 - seasonal).toBeCloseTo(p, 12);
    });
    expect(seasonalWeight('drought_severe', 0, true)).toBeGreaterThan(seasonalWeight('drought_severe', 6, true));
    expect(seasonalWeight('bumper_harvest', 0, true)).toBe(1);
    expect(seasonalWeight('drought_severe', 0, false)).toBe(1);
  });

  // Spec §7 asks ± 2 %: read as 2 percentage points of frequency (the algebra above is exact; with 60 000 simulated years
  // the sampling error alone is ≈ 1.5 % relative), checked here at 5 % relative (≈ 0.35 points at p = 0.07).
  it('simulated monthly frequency of the drought ≈ its annual p, with and without the season', () => {
    const s = freshState(2);
    const pool = inert([byId('drought_severe')]);
    const p = byId('drought_severe').triggerChance(s);
    [false, true].forEach((seasonal) => {
      const rng = makeRng(7, seasonal ? 2 : 1);
      const N = 60_000;
      let years = 0;
      for (let y = 0; y < N; y++) {
        let fired = false;
        for (let m = 0; m < 12; m++) if (rollEvents(s, pool, rng, { dt: 1 / 12, month: m, seasonal }).fired.length) fired = true;
        if (fired) years++;
      }
      expect(Math.abs(years / N - p), `seasonal=${seasonal}`).toBeLessThan(0.02);
      expect(Math.abs(years / N - p) / p, `seasonal=${seasonal}`).toBeLessThan(0.05);
    });
  });
});

describe('probabilities and effects (§2)', () => {
  const drought = byId('drought_severe');

  it('the drought grows with the climate trend and with the forest lost (area in force)', () => {
    const s = freshState(2);
    const p0 = drought.triggerChance(s); // 0.03 + 0.04 (no water policy); CC = 25 % is not above
    expect(p0).toBeCloseTo(0.07, 12);
    const later = JSON.parse(JSON.stringify(s)) as GameState;
    later.model!.t = 30;
    expect(drought.triggerChance(later)).toBeCloseTo(0.03 * 1.5 + 0.04, 12);
    const cleared = JSON.parse(JSON.stringify(s)) as GameState;
    // Half of the forest becomes fallow: forest/forest0 = 0.5 → × (1 + 0.6·0.5).
    const half = (cleared.landUses.BNNP.area + cleared.landUses.BNP.area) / 2;
    cleared.landUses.BNNP.area -= half;
    cleared.landUses.FAL.area += half;
    expect(drought.triggerChance(cleared)).toBeCloseTo(0.03 * 1.3 + 0.04, 9);
  });

  it('international scrutiny reads c > 1.5·c0 (the 1.1 threshold of 12 t was unreachable)', () => {
    const scrutiny = byId('international_scrutiny');
    const s = freshState(2);
    expect(scrutiny.triggerChance(s)).toBe(0);
    s.indicators.co2EqEmissionsPerCapita = 1.51 * s.model!.anchors.c0;
    expect(scrutiny.triggerChance(s)).toBeCloseTo(0.05, 12);
  });

  it('the green-tech boom no longer touches CO2', () => {
    const boom = byId('green_tech_investment_boom');
    expect(boom.effects(freshState(2)).some((e) => e.indicator === 'co2EqEmissionsPerCapita')).toBe(false);
  });

  it('the climate-justice movement reads the years since level start of the 2.0 clock', () => {
    const justice = byId('climate_justice_movement');
    const s = freshState(2);
    s.model!.t = 5;
    expect(justice.triggerChance(s)).toBe(0);
    s.model!.t = 5 + 1 / 12;
    expect(justice.triggerChance(s)).toBe(0.05);
  });

  it('effects are level jumps: F and E on the indicator, W/St/pressures/money on their stock', () => {
    const s = freshState(2);
    const C0 = s.stellaSpecificState.Conflicto_social;
    applyRandomEventEffects([
      { indicator: 'foodSecurity', changePercentage: -0.12 },
      { indicator: 'socialWellbeing', changeAbsolute: -4 },
      { indicator: 'politicalStability', changeAbsolute: 2 },
      { indicator: 'treasuryReserves', changeAbsolute: 100 },
      { indicator: 'co2EqEmissionsPerCapita', changePercentage: -0.5 },
    ], s.indicators, s.stellaSpecificState, s.landUses, []);
    expect(s.indicators.foodSecurity).toBeCloseTo(40 * 0.88, 12);
    expect(s.stellaSpecificState.Conflicto_social).toBeCloseTo(C0 + 4, 12);
    expect(s.indicators.socialWellbeing).toBeCloseTo(100 - C0 - 4, 12);
    expect(s.stellaSpecificState.Colapso_politico).toBeCloseTo(30 - 2, 12);
    expect(s.stellaSpecificState.Reservas_del_Tesoro).toBeCloseTo(1100, 9);
    expect(s.indicators.co2EqEmissionsPerCapita).toBe(freshState(2).indicators.co2EqEmissionsPerCapita);
  });

  it('a drought shock on F relaxes away from the shocked value (the prototype: before the indicators step)', () => {
    const s = freshState(2);
    const quiet = stepMonth(s, 0, () => 0.999, CONTROL_PARAMS, 'es', { noShocks: true }).next.indicators.foodSecurity;
    const hit = stepMonth(s, 0, () => 0, CONTROL_PARAMS, 'es', { events: [drought], noShocks: true }).next.indicators.foodSecurity;
    // −12 % of 40 = −4.8 points, minus one month of relaxation toward F* (k_F = 0.35 a year: ≈ 3.5 % of the gap).
    expect(quiet - hit).toBeGreaterThan(4.3);
    expect(quiet - hit).toBeLessThan(4.8);
  });
});

describe('persistent yield shock (§3)', () => {
  it('Box–Muller gives a standard normal from the rng', () => {
    const rng = makeRng(3, 3);
    const N = 40_000;
    let sum = 0;
    let sq = 0;
    for (let i = 0; i < N; i++) { const z = standardNormal(rng); sum += z; sq += z * z; }
    expect(Math.abs(sum / N)).toBeLessThan(0.03);
    expect(Math.abs(sq / N - 1)).toBeLessThan(0.03);
    expect(Math.abs(standardNormal(() => 0.999))).toBeLessThan(1e-3); // the no-event draw: almost 0 (sine branch)
    expect(standardNormal(() => 0)).toBe(0);
  });

  it('AR(1): ε ← 0.5^dt·ε + σ·√dt·z with σ = 0.04·(1 − 0.5·η_AGUA); monthly persistence compounds to the annual', () => {
    expect(nextYieldShock(0.1, 1, 0, 0)).toBeCloseTo(0.05, 12);
    let e = 0.1;
    for (let i = 0; i < 12; i++) e = nextYieldShock(e, 1 / 12, 0, 0);
    expect(e).toBeCloseTo(0.05, 12);
    expect(nextYieldShock(0, 1, 0, 1)).toBeCloseTo(0.04, 12);
    expect(nextYieldShock(0, 1, 1, 1)).toBeCloseTo(0.02, 12);
  });

  it('noShocks (and no rng) hold ε at 0; with an rng ε moves and enters F', () => {
    const s = freshState(2);
    expect(stepYear(s, makeRng(1, 1), CONTROL_PARAMS, 'es', { noShocks: true, events: [] }).next.model!.yieldShock).toBe(0);
    const shocked = stepYear(s, makeRng(1, 1), CONTROL_PARAMS, 'es', { events: [] }).next;
    expect(shocked.model!.yieldShock).not.toBe(0);
    const calm = stepYear(s, makeRng(1, 1), CONTROL_PARAMS, 'es', { noShocks: true, events: [] }).next;
    expect(Math.sign(shocked.indicators.foodSecurity - calm.indicators.foodSecurity)).toBe(Math.sign(shocked.model!.yieldShock));
  });
});

describe('exact monthly step (§5): annual–monthly consistency (C9), N2 without events', () => {
  const run = (strategyId: string, monthly: boolean) => {
    const strategy = NIVELES_STRATEGIES.find((s) => s.id === strategyId)!;
    let s = freshLevelState(2, CONTROL_PARAMS);
    activatePolicies(s, strategy.ids, 2, strategy.effort);
    s.additionalTaxPressurePercentage = nivelesTax(strategy, 2);
    const out: Record<number, GameState> = {};
    let month = 0;
    for (let y = 1; y <= 30; y++) {
      if (monthly) {
        for (let m = 0; m < 12; m++) { const r = stepMonth(s, month, () => 0.999); s = r.next; month = r.month; }
      } else {
        s = stepYear(s, () => 0.999).next;
      }
      if (y === 10 || y === 30) out[y] = s;
    }
    return out;
  };
  ['do_nothing', 'green', 'extractive'].forEach((id) => {
    it(`${id}: |Δ| ≤ 1 point in B, F, E, W, St and ≤ 0.1 t in c at years 10 and 30`, () => {
      const a = run(id, false);
      const m = run(id, true);
      [10, 30].forEach((y) => {
        (['biodiversity', 'foodSecurity', 'economicSecurity', 'socialWellbeing', 'politicalStability'] as const).forEach((k) => {
          expect(Math.abs(a[y].indicators[k] - m[y].indicators[k]), `${k} year ${y}`).toBeLessThanOrEqual(1);
        });
        expect(Math.abs(a[y].indicators.co2EqEmissionsPerCapita - m[y].indicators.co2EqEmissionsPerCapita)).toBeLessThanOrEqual(0.1);
      });
    });
  });

  it('the annual step leaves the year rolled, the month at 0 and the 2.0 clock on whole years', () => {
    const s = freshState(2);
    const y = stepYear(s, () => 0.999).next;
    expect(y.year).toBe(s.year + 1);
    expect(y.yearsSimulatedInCurrentLevel).toBe(s.yearsSimulatedInCurrentLevel + 1);
    expect(y.model!.t).toBeCloseTo(1, 12);
  });

  it('a game over mid-year stops the sub-steps but still closes the round (year + 1)', () => {
    const s = freshState(2);
    s.stellaSpecificState.Colapso_politico = 99; // St = 1: collapse in the first month
    s.indicators.politicalStability = 1;
    const y = stepYear(s, () => 0.999).next;
    expect(y.gameOverReason).toBeTruthy();
    expect(y.year).toBe(s.year + 1);
    expect(y.yearsSimulatedInCurrentLevel).toBe(s.yearsSimulatedInCurrentLevel + 1);
    expect(y.model!.t).toBeLessThan(1);
  });

  it('the 3-level game logs its events with the round year (the 1.1 convention), Territorio with the month', () => {
    const s = freshState(2);
    const drought = [byId('drought_severe')];
    const year = stepYear(s, () => 0, CONTROL_PARAMS, 'es', { events: drought, noShocks: true });
    expect(year.logs.some((l) => l.startsWith(`EVENTO (Año ${s.year + 1})`))).toBe(true);
    const month = stepMonth(s, 2, () => 0, CONTROL_PARAMS, 'en', { events: drought, noShocks: true });
    expect(month.logs.some((l) => l.startsWith(`EVENT (03/${s.year})`))).toBe(true);
  });

  it('a fired event of the year is kept in currentEvent with its functions (N3 events panel)', () => {
    const s = freshState(3);
    const r = stepYear(s, () => 0, CONTROL_PARAMS, 'es', { events: [byId('global_recession')], noShocks: true }).next;
    expect(r.currentEvent?.id).toBe('global_recession');
    expect(typeof r.currentEvent?.effects).toBe('function');
    expect(r.landUses[LandUseType.ConventionalCrops].area).toBeGreaterThan(0);
  });
});
