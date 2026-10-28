/**
 * Reference behaviour of model 2.0 (mejora-general/files/51_validacion_cierre_deploy.md §3): qualitative modes the
 * model must show, with the prototype's numbers as the reference. No events (`noShocks`). Measured values are in
 * reports/sensitivity-2.0.md ("Comportamiento de referencia") and docs/DESIGN_DECISIONS_LOG.md (phase 51).
 */
import { describe, expect, it } from 'vitest';
import { CONTROL_PARAMS } from '../../src/constants';
import { rampFactor, stepYear } from '../../src/sim';
import { PARAMS_V2 } from '../../src/sim/v2/params';
import { LandUseType as LU, Policy, type GameState } from '../../src/types';
import { activatePolicies, freshLevelState } from '../../scripts/harness/runNiveles';

const step = (s: GameState) => stepYear(s, () => 0.999, CONTROL_PARAMS, 'es', { noShocks: true }).next;
const totalArea = (s: GameState) => (Object.values(s.landUses) as { area: number }[]).reduce((sum, l) => sum + l.area, 0);
const forestShare = (s: GameState) => 100 * (s.landUses[LU.UnprotectedNativeForest].area + s.landUses[LU.ProtectedNativeForest].area) / totalArea(s);
const forestArea = (s: GameState) => s.landUses[LU.UnprotectedNativeForest].area + s.landUses[LU.ProtectedNativeForest].area;

describe('reference behaviour (spec 51 §3)', () => {
  it('deforestation without policies ≈ 1.1 %/year of the unprotected forest; < 0.3 % with CR in its tenth year', () => {
    [1, 2, 3].forEach((level) => {
      const s = freshLevelState(level);
      const n = step(s);
      const rate = (forestArea(s) - forestArea(n)) / s.landUses[LU.UnprotectedNativeForest].area;
      // spec ≈ 1.1–1.2 %; measured 1.09 / 1.10 / 1.02 % (N3 starts with less unprotected forest and more protected):
      // a band around 1.1 % wide enough not to pin the current calibration
      expect(rate).toBeGreaterThan(0.009);
      expect(rate).toBeLessThan(0.013);

      let c = freshLevelState(level);
      activatePolicies(c, ['CR'], level);
      for (let y = 0; y < 9; y++) c = step(c);
      const c10 = step(c);
      const rateCR = (forestArea(c) - forestArea(c10)) / c.landUses[LU.UnprotectedNativeForest].area;
      expect(rateCR).toBeLessThan(0.003);   // prototype 0.23 %
    });
  });

  it('forest transition: with AS + CR + GS the total forest stops falling before year 5 and ends above the start at 15 years', () => {
    let a = freshLevelState(2);
    let none = freshLevelState(2);
    const f0 = forestShare(a);
    activatePolicies(a, ['AS', 'CR', 'GS'], 2);
    const path: number[] = [];
    for (let y = 1; y <= 15; y++) { a = step(a); none = step(none); path.push(forestShare(a)); }
    const minYear = path.indexOf(Math.min(...path)) + 1;
    expect(minYear).toBeLessThan(5);
    expect(path[14]).toBeGreaterThan(path[0]);
    expect(path[14]).toBeGreaterThan(16.5);           // prototype 16.5 % → 16.9 %
    expect(forestShare(none)).toBeLessThan(f0 - 1.5); // prototype 16.5 % → 14.7 % without policies
  });

  it('learning curve: a programme (λ = 1.5 years: AS, GS, PIE) reaches ~85 % of its effect in 3 years', () => {
    let s = freshLevelState(2);
    activatePolicies(s, ['AS', 'GS', 'PIE'], 2);
    for (let y = 0; y < 3; y++) s = step(s);
    [Policy.Agroecological, Policy.SustainableLivestock, Policy.ForeignInvestment].forEach((id) => {
      const r = rampFactor(s.policies[id]);
      expect(r).toBeGreaterThan(0.83);
      expect(r).toBeLessThan(0.89);
    });
    expect(1 - Math.exp(-3 / PARAMS_V2.rampYears.AS)).toBeCloseTo(0.865, 3);
  });

  it('recovery after a food shock: with k_F = 0.35, half of the drop back in ≈ 1.6 years and 90 % in ≈ 5.3 years', () => {
    // Analytic part (relax): (1 − k)^t = 0.5 at t = 1.61 and 0.1 at t = 5.35.
    const k = CONTROL_PARAMS.Velocidad_Ajuste_Seg_Alimentaria;
    expect(Math.log(0.5) / Math.log(1 - k)).toBeCloseTo(1.61, 2);
    expect(Math.log(0.1) / Math.log(1 - k)).toBeCloseTo(5.35, 2);
    // Engine: the same state with F 20 points lower; the gap to the unshocked twin closes slightly slower than the pure
    // relaxation (F feeds back through E), never by much.
    let a = freshLevelState(2);
    for (let y = 0; y < 5; y++) a = step(a);
    let b: GameState = JSON.parse(JSON.stringify(a));
    b.indicators.foodSecurity -= 20;
    const gaps = [1];
    for (let y = 1; y <= 6; y++) {
      a = step(a);
      b = step(b);
      gaps.push((a.indicators.foodSecurity - b.indicators.foodSecurity) / 20);
    }
    const crossing = (level: number) => {
      const i = gaps.findIndex((g) => g <= level);
      // log-linear interpolation between the two years around the crossing
      return i - 1 + Math.log(gaps[i - 1] / level) / Math.log(gaps[i - 1] / gaps[i]);
    };
    expect(crossing(0.5)).toBeGreaterThan(1.5);
    expect(crossing(0.5)).toBeLessThan(1.8);
    expect(crossing(0.1)).toBeGreaterThan(5.0);
    expect(crossing(0.1)).toBeLessThan(6.0);
  });
});
