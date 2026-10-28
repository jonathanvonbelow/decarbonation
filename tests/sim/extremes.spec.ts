/**
 * Extreme conditions of model 2.0 (mejora-general/files/51_validacion_cierre_deploy.md §2), plus the usual guards
 * (no NaN, bounded indicators in 0–100, conservation of area) under every extreme. Level 2 unless stated, no events
 * (`noShocks`), like the golden. The "expected" values of the spec come from the prototype (scripts/reference/modelo_v2.py);
 * the TS engine reproduces them (docs/DESIGN_DECISIONS_LOG.md, phase 51).
 *
 * Test setup note: the prototype anchors the agricultural pool lazily (`Aag0`, at the first land step), the engine at
 * `createInitialState` (`model.anchors.agriAreas0`). When a test rewrites the whole map after creating the state, it re-anchors
 * the pool to the new mix (`reanchorPool`), as the prototype would; every other anchor (H0, ρ0, c0…) stays the level's.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { CONTROL_PARAMS } from '../../src/constants';
import { GAME_OVER_REASONS, stepYear } from '../../src/sim';
import { PARAMS_V2 } from '../../src/sim/v2/params';
import { LandUseType as LU, Policy, type ControlParams, type GameState } from '../../src/types';
import { activatePolicies, freshLevelState, snapshotOf } from '../../scripts/harness/runNiveles';

const NO_EVENTS = () => 0.999;
const BOUNDED = ['biodiversity', 'foodSecurity', 'economicSecurity', 'socialWellbeing', 'politicalStability'] as const;
const totalArea = (s: GameState) => (Object.values(s.landUses) as { area: number }[]).reduce((sum, l) => sum + l.area, 0);

/** Every guard of the invariants suite on one state. */
function expectSane(s: GameState, area0: number): void {
  BOUNDED.forEach((k) => {
    const v = s.indicators[k];
    expect(Number.isFinite(v), `${k} finite`).toBe(true);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(100);
  });
  (Object.values(s.indicators) as unknown[]).forEach((v) => { if (typeof v === 'number') expect(Number.isNaN(v)).toBe(false); });
  (Object.values(s.landUses) as { area: number }[]).forEach((l) => expect(l.area).toBeGreaterThanOrEqual(0));
  expect(totalArea(s)).toBeCloseTo(area0, 6);
  expect(Number.isFinite(s.indicators.co2EqEmissionsPerCapita)).toBe(true);
}

/** Plays `years` years (or until game over), checking the guards every year. */
function play(state: GameState, years: number, CP: ControlParams = CONTROL_PARAMS, onYear?: (s: GameState, y: number) => void): GameState {
  const area0 = totalArea(state);
  let s = state;
  for (let y = 1; y <= years && !s.gameOverReason; y++) {
    s = stepYear(s, NO_EVENTS, CP, 'es', { noShocks: true }).next;
    expectSane(s, area0);
    onYear?.(s, y);
  }
  return s;
}

/** Puts the whole territory in one use and re-anchors the agricultural pool to that mix (see the header). */
function allIn(level: number, use: LU): GameState {
  const s = freshLevelState(level);
  const total = totalArea(s);
  (Object.values(s.landUses) as { area: number }[]).forEach((l) => { l.area = 0; });
  s.landUses[use].area = total;
  const a0 = s.model!.anchors.agriAreas0;
  (Object.keys(a0) as (keyof typeof a0)[]).forEach((k) => { a0[k] = Math.max(s.landUses[k as LU].area, PARAMS_V2.land.zeroAnchor); });
  return s;
}

describe('extreme conditions (spec 51 §2)', () => {
  it('whole territory in conventional crops: B < 25, F high, c ≈ 8.5, nothing out of range', () => {
    let cAt5 = 0;
    const end = play(allIn(2, LU.ConventionalCrops), 30, CONTROL_PARAMS, (s, y) => { if (y === 5) cAt5 = s.indicators.co2EqEmissionsPerCapita; });
    expect(end.gameOverReason).toBeNull();
    const h = snapshotOf(end);
    expect(h.B).toBeLessThan(25);            // prototype 20.6 at 30 years
    expect(h.B).toBeGreaterThan(15);
    expect(h.F).toBeGreaterThan(80);         // prototype 91
    expect(h.c).toBeGreaterThan(8);          // prototype 8.5
    expect(h.c).toBeLessThan(9);
    expect(cAt5).toBeGreaterThan(8.3);
  });

  it('whole territory in protected forest: famine within a few years (prototype 2028), B rises, c ≈ 3.6', () => {
    const start = allIn(2, LU.ProtectedNativeForest);
    const end = play(start, 30);
    expect(end.gameOverReason).toBe(GAME_OVER_REASONS.famine);
    expect(end.year).toBeLessThanOrEqual(2029);
    expect(end.indicators.foodSecurity).toBeLessThanOrEqual(10);
    expect(end.indicators.biodiversity).toBeGreaterThan(start.indicators.biodiversity);
    expect(end.indicators.co2EqEmissionsPerCapita).toBeGreaterThan(3.2);
    expect(end.indicators.co2EqEmissionsPerCapita).toBeLessThan(4.0);
  });

  it('τ = 20 for 30 years on level 3: E ≈ 15, conflict ≈ 72, almost no debt', () => {
    const s = freshLevelState(3);
    s.additionalTaxPressurePercentage = 20;
    const end = play(s, 30);
    expect(end.gameOverReason).toBeNull();
    const h = snapshotOf(end);
    expect(h.E).toBeGreaterThan(12);
    expect(h.E).toBeLessThan(18);
    expect(100 - h.W).toBeGreaterThan(68);
    expect(100 - h.W).toBeLessThan(76);
    expect(h.DY).toBeLessThan(0.05);
  });

  it('CR, AGUA, CN, SE and AS at once without extra tax: bankruptcy before 2054 on level 3, none on level 2 (D/Y ≈ 0.7)', () => {
    const codes = ['CR', 'AGUA', 'CN', 'SE', 'AS'] as const;
    const n3 = freshLevelState(3);
    activatePolicies(n3, [...codes], 3);
    n3.additionalTaxPressurePercentage = 0;
    const end3 = play(n3, 30);
    expect(end3.gameOverReason).toBe(GAME_OVER_REASONS.bankruptcy);
    expect(end3.year).toBeLessThan(2054);    // prototype 2041
    const n2 = freshLevelState(2);
    activatePolicies(n2, [...codes], 2);
    const end2 = play(n2, 30);
    expect(end2.gameOverReason).toBeNull();
    const dy = snapshotOf(end2).DY;
    expect(dy).toBeGreaterThan(0.6);
    expect(dy).toBeLessThan(0.85);
  });

  it('population × 10: the AFOLU per-capita component falls ÷ 10 (c0 7.13 → 5.21 on level 2)', () => {
    const base = freshLevelState(2);
    const big = freshLevelState(2, { ...CONTROL_PARAMS, Poblacion_Inicial: 10 * CONTROL_PARAMS.Poblacion_Inicial });
    const c0 = base.indicators.co2EqEmissionsPerCapita;
    const c10 = big.indicators.co2EqEmissionsPerCapita;
    expect(c0).toBeCloseTo(7.13, 2);
    expect(c10).toBeCloseTo(5.21, 2);
    // c = energy per capita (ε0, independent of population at t = 0) + AFOLU / population: only the second term ÷ 10
    const eps0 = PARAMS_V2.energy.eps0[2];
    expect(c10 - eps0).toBeCloseTo((c0 - eps0) / 10, 6);
    play(big, 10);
  });

  it('the reachable maximum (5 policies with a valid effort split, every pact, maximum tax) on each level: bounded and conservative', () => {
    const portfolios = [['PAI', 'PEA', 'PIE', 'FRA', 'SE'], ['CR', 'AS', 'AGUA', 'CN', 'GS'], ['CR', 'CN', 'SE', 'PAI', 'AGUA']] as const;
    [1, 2, 3].forEach((level) => portfolios.forEach((codes) => {
      const s = freshLevelState(level);
      activatePolicies(s, [...codes], level); // UI rules: ≤ MAX_ACTIVE_POLICIES, even effort summing to 100
      Object.values(s.pacts).forEach((p) => { p.isActive = true; });
      s.additionalTaxPressurePercentage = CONTROL_PARAMS.Max_Additional_Tax_Rate_Percentage;
      play(s, 30);
    }));
  });

  it('stress beyond what the UI allows (all 10 policies, every instrument at 100 %): still bounded and conservative', () => {
    [1, 2, 3].forEach((level) => {
      const s = freshLevelState(level);
      (Object.values(Policy) as Policy[]).forEach((id) => {
        s.policies[id].isActive = true;
        if (s.policies[id].instruments) Object.values(s.policies[id].instruments!).forEach((i) => { i.effortPercentage = 100; });
      });
      Object.values(s.pacts).forEach((p) => { p.isActive = true; });
      s.additionalTaxPressurePercentage = CONTROL_PARAMS.Max_Additional_Tax_Rate_Percentage;
      play(s, 30);
    });
  });

  it('every facilitator speed at 0 and at 1: no NaN, bounded', () => {
    const keys = ['Velocidad_Ajuste_Biodiversidad', 'Velocidad_Ajuste_Seg_Alimentaria', 'Velocidad_Ajuste_Seg_Economica',
      'Velocidad_Ajuste_Conflicto', 'Velocidad_Ajuste_Colapso', 'Velocidad_Ajuste_Presiones'] as const;
    [0, 1].forEach((k) => {
      const CP = { ...CONTROL_PARAMS, ...Object.fromEntries(keys.map((key) => [key, k])), Eficiencia_Minima_Politicas: k };
      const s = freshLevelState(2, CP);
      activatePolicies(s, ['CR', 'AS', 'PAI', 'CN'], 2, undefined, CP);
      play(s, 30, CP);
    });
  });
});

describe('convergence without exogenous trends (spec 51 §2, last row)', () => {
  const yieldTrend = PARAMS_V2.food.yieldTrend;
  afterEach(() => { (PARAMS_V2.food as { yieldTrend: number }).yieldTrend = yieldTrend; });

  /** Max |Δ| per year of B, F, E, W, St and c from year 61 to 100, no events, no policies. */
  function tailDrift(CP: ControlParams): number {
    let s = freshLevelState(2, CP);
    let prev = snapshotOf(s);
    let max = 0;
    for (let y = 1; y <= 100; y++) {
      s = stepYear(s, NO_EVENTS, CP, 'es', { noShocks: true }).next;
      const h = snapshotOf(s);
      if (y > 60) (['B', 'F', 'E', 'W', 'St', 'c'] as const).forEach((k) => { max = Math.max(max, Math.abs(h[k] - prev[k])); });
      prev = h;
    }
    expect(s.gameOverReason).toBeNull();
    return max;
  }

  it('with population, GDP, yields and the forest frontier constant, every variable converges (|Δ| < 0.01 from year 60)', () => {
    (PARAMS_V2.food as { yieldTrend: number }).yieldTrend = 0;
    const CP = {
      ...CONTROL_PARAMS, Tasa_Crecimiento_Poblacional_Base: 0, Tasa_Base_Crecimiento_PBI: 0,
      Tasa_de_BNNP_a_BNP_Base: 0, Tasa_de_BNNP_a_CA_Base: 0, Tasa_de_BNNP_a_CC_Base: 0, Tasa_de_CA_a_BNNP_Base: 0,
    };
    expect(tailDrift(CP)).toBeLessThan(0.01);
  });

  it('with only population and GDP constant the forest frontier keeps moving (also in the prototype): slow drift, not divergence', () => {
    (PARAMS_V2.food as { yieldTrend: number }).yieldTrend = 0;
    const drift = tailDrift({ ...CONTROL_PARAMS, Tasa_Crecimiento_Poblacional_Base: 0, Tasa_Base_Crecimiento_PBI: 0 });
    // prototype: max |Δ| 0.056 (St) from year 60, the unprotected forest still falls ~1 %/year
    expect(drift).toBeGreaterThan(0.01);
    expect(drift).toBeLessThan(0.1);
  });
});
