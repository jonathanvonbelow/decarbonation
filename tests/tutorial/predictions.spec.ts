import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  actualDirection, climatologyOf, directionsOf, evaluatePredictions, PREDICTED_INDICATORS, PREDICTION_BANDS, predictionBand,
  sessionPredictionSkill, type PredictionResult, type PredictionSelections,
} from '../../src/components/tutorial/predictions';
import { MODEL_VERSION } from '../../src/sim';
import { freshState } from '../sim/testHelpers';

// v6 / phase 48: the band is the level's tercile band from predictionBands.json (no RANGE / 1 % any more).
const bandB1 = predictionBand('biodiversity', 1);

describe('predictionBands.json', () => {
  it('is generated for the engine\'s MODEL_VERSION (regenerate with npx tsx scripts/prediction-bands.ts)', () => {
    expect(PREDICTION_BANDS.modelVersion).toBe(MODEL_VERSION);
  });
  it('has a positive band and climatology summing to 1 for every indicator of levels 1–3', () => {
    [1, 2, 3].forEach((level) => PREDICTED_INDICATORS.forEach((key) => {
      expect(predictionBand(key, level)).toBeGreaterThan(0);
      const p = climatologyOf(key, level);
      expect(p.down + p.flat + p.up).toBeCloseTo(1, 3);
      expect(p.flat).toBeGreaterThan(0.30);
      expect(p.flat).toBeLessThan(0.36);
    }));
  });
  it('the climatology copied into supabase/analytics_queries.sql matches the JSON', () => {
    const sql = readFileSync('supabase/analytics_queries.sql', 'utf8');
    [1, 2, 3].forEach((level) => PREDICTED_INDICATORS.forEach((key) => {
      const p = climatologyOf(key, level);
      expect(sql).toContain(`('${PREDICTION_BANDS.modelVersion}', ${level}, '${key}', ${p.down}, ${p.flat}, ${p.up})`);
    }));
  });
  it('a level without bands (Territorio) falls back to level 2 (spec §7)', () => {
    expect(predictionBand('biodiversity', 0)).toBe(predictionBand('biodiversity', 2));
  });
});

describe('actualDirection', () => {
  it('reports "up" / "down" beyond the band of the level', () => {
    expect(actualDirection('biodiversity', 40, 40 + 2 * bandB1, 1)).toBe('up');
    expect(actualDirection('biodiversity', 40, 40 - 2 * bandB1, 1)).toBe('down');
  });
  it('reports "flat" for a change under the band, and not flat right at it', () => {
    expect(actualDirection('biodiversity', 40, 40 + bandB1 / 2, 1)).toBe('flat');
    expect(actualDirection('biodiversity', 40, 40 + bandB1 * 1.001, 1)).toBe('up');
  });
  it('uses each level\'s own band', () => {
    const e1 = predictionBand('economicSecurity', 1);
    const e3 = predictionBand('economicSecurity', 3);
    expect(e3).not.toBe(e1);
    const mid = (e1 + e3) / 2;
    expect(actualDirection('economicSecurity', 50, 50 + mid, 1)).toBe(e1 < e3 ? 'up' : 'flat');
    expect(actualDirection('economicSecurity', 50, 50 + mid, 3)).toBe(e1 < e3 ? 'flat' : 'up');
  });
});

describe('evaluatePredictions', () => {
  const before = freshState(1).indicators;

  it('only evaluates indicators the player actually predicted', () => {
    const selections: PredictionSelections = { biodiversity: 'up' };
    const after = { ...before, biodiversity: before.biodiversity + 5, co2EqEmissionsPerCapita: before.co2EqEmissionsPerCapita - 2 };
    const results = evaluatePredictions(selections, before, after, 1);
    expect(results).toHaveLength(1);
    expect(results[0].indicator).toBe('biodiversity');
  });

  it('marks a prediction correct when the direction matches, and records band and level', () => {
    const after = { ...before, biodiversity: before.biodiversity + 5 };
    const [result] = evaluatePredictions({ biodiversity: 'up' }, before, after, 1);
    expect(result.correct).toBe(true);
    expect(result.actual).toBe('up');
    expect(result.band).toBe(bandB1);
    expect(result.level).toBe(1);
  });

  it('marks a prediction wrong when the direction does not match, and reports the real delta', () => {
    const after = { ...before, biodiversity: before.biodiversity - 3 };
    const [result] = evaluatePredictions({ biodiversity: 'up' }, before, after, 1);
    expect(result.correct).toBe(false);
    expect(result.actual).toBe('down');
    expect(result.delta).toBeCloseTo(-3, 5);
  });

  it('the persistence baseline is last year\'s direction, or "flat" in a level\'s first year', () => {
    const after = { ...before, biodiversity: before.biodiversity - 3 };
    expect(evaluatePredictions({ biodiversity: 'up' }, before, after, 1)[0].persistencePred).toBe('flat');
    const last = directionsOf(before, after, 1);
    expect(last.biodiversity).toBe('down');
    expect(evaluatePredictions({ biodiversity: 'up' }, before, after, 1, last)[0].persistencePred).toBe('down');
  });

  it('returns an empty array when nothing was predicted', () => {
    expect(evaluatePredictions({}, before, before, 1)).toEqual([]);
  });
});

describe('sessionPredictionSkill', () => {
  const r = (predicted: PredictionResult['predicted'], actual: PredictionResult['actual'], persistencePred: PredictionResult['actual']): PredictionResult => ({
    indicator: 'biodiversity', predicted, actual, delta: 0, correct: predicted === actual, level: 1, band: bandB1, persistencePred,
  });
  it('a player who always hits while persistence misses some has SS_pers = 1 and SS_clim = 1', () => {
    const s = sessionPredictionSkill([r('up', 'up', 'down'), r('flat', 'flat', 'flat')]);
    expect(s.accuracy).toBe(1);
    expect(s.accuracyPersistence).toBe(0.5);
    expect(s.skillPersistence).toBe(1);
    expect(s.skillClimatology).toBe(1);
  });
  it('no predictions: no skill', () => {
    expect(sessionPredictionSkill([]).skillPersistence).toBeNull();
  });
});
