/**
 * General score of model 2.0 (phase 49, src/sim/score.ts; prototype `score()` in scripts/reference/modelo_v2.py).
 */
import { describe, expect, it } from 'vitest';
import { computeScore, SCORE_WEIGHTS, scoreComponents } from '../../src/sim/score';
import { freshState } from './testHelpers';

describe('score (phase 49)', () => {
  it('INV-14: the weights of every level sum to 1', () => {
    for (const w of Object.values(SCORE_WEIGHTS)) {
      expect((Object.values(w) as number[]).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    }
  });

  it('the carbon component is anchored to the level start: 25 at c0, 0 at 1.25·c0, 100 at 0.25·c0 and below', () => {
    for (const level of [1, 2, 3]) {
      const s = freshState(level);
      const anchors = s.model!.anchors;
      expect(s.indicators.co2EqEmissionsPerCapita).toBeCloseTo(anchors.c0, 12);
      expect(scoreComponents(s.indicators, anchors).carbon).toBeCloseTo(25, 9);
      const at = (c: number) => scoreComponents({ ...s.indicators, co2EqEmissionsPerCapita: c }, anchors).carbon;
      expect(at(1.25 * anchors.c0)).toBeCloseTo(0, 9);
      expect(at(2 * anchors.c0)).toBe(0);
      expect(at(0.25 * anchors.c0)).toBeCloseTo(100, 9);
      expect(at(-1)).toBe(100);
    }
  });

  it('the GDP component rewards doubling the starting GDP, capped at 100', () => {
    const s = freshState(3);
    const anchors = s.model!.anchors;
    const gdp = (y: number) => scoreComponents({ ...s.indicators, pbi: y }, anchors).gdp;
    expect(gdp(anchors.gdp0)).toBeCloseTo(50, 9);
    expect(gdp(2 * anchors.gdp0)).toBeCloseTo(100, 9);
    expect(gdp(5 * anchors.gdp0)).toBe(100);
  });

  it('matches the prototype formula at the start of each level', () => {
    for (const level of [1, 2, 3]) {
      const s = freshState(level);
      const i = s.indicators;
      const pbar = (i.ppAgricola + i.ppAmbientalista + i.ppSocial) / 3;
      const ext = (i.foodSecurity + i.economicSecurity + i.socialWellbeing + i.politicalStability) / 4;
      const expected = level === 1 ? 10 * (0.40 * i.biodiversity + 0.45 * 25 + 0.15 * i.economicSecurity)
        : level === 2 ? 10 * (0.15 * i.biodiversity + 0.20 * 25 + 0.30 * (100 - pbar) + 0.35 * ext)
          : 10 * (0.10 * i.biodiversity + 0.15 * 25 + 0.20 * (100 - pbar) + 0.25 * ext + 0.30 * 50);
      expect(computeScore(i, level, s.model!.anchors)).toBeCloseTo(expected, 9);
      expect(i.generalScore).toBeCloseTo(expected, 9);
    }
  });
});
