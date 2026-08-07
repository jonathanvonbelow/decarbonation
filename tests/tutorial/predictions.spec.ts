import { describe, expect, it } from 'vitest';
import { actualDirection, evaluatePredictions, type PredictionSelections } from '../../src/components/tutorial/predictions';
import { freshState } from '../sim/testHelpers';

describe('actualDirection', () => {
  it('reports "up" when the value rose beyond the flat threshold', () => {
    expect(actualDirection('biodiversity', 40, 45)).toBe('up');
  });
  it('reports "down" when the value fell beyond the flat threshold', () => {
    expect(actualDirection('biodiversity', 40, 35)).toBe('down');
  });
  it('reports "flat" for a change under 1% of the indicator\'s range', () => {
    // biodiversity range is 100, so 1% = 1.0 — a 0.5 move must read as flat
    expect(actualDirection('biodiversity', 40, 40.5)).toBe('flat');
  });
  it('is not flat right at the threshold boundary going up', () => {
    expect(actualDirection('biodiversity', 40, 41.5)).toBe('up');
  });
  it('uses a narrower absolute threshold for co2EqEmissionsPerCapita (range 15)', () => {
    // 1% of 15 = 0.15 -- a 0.1 t/capita move should read as flat, a 0.2 move should not
    expect(actualDirection('co2EqEmissionsPerCapita', 6.5, 6.6)).toBe('flat');
    expect(actualDirection('co2EqEmissionsPerCapita', 6.5, 6.7)).toBe('up');
  });
});

describe('evaluatePredictions', () => {
  const before = freshState(1).indicators;

  it('only evaluates indicators the player actually predicted', () => {
    const selections: PredictionSelections = { biodiversity: 'up' };
    const after = { ...before, biodiversity: before.biodiversity + 5, co2EqEmissionsPerCapita: before.co2EqEmissionsPerCapita - 2 };
    const results = evaluatePredictions(selections, before, after);
    expect(results).toHaveLength(1);
    expect(results[0].indicator).toBe('biodiversity');
  });

  it('marks a prediction correct when the direction matches', () => {
    const after = { ...before, biodiversity: before.biodiversity + 5 };
    const [result] = evaluatePredictions({ biodiversity: 'up' }, before, after);
    expect(result.correct).toBe(true);
    expect(result.actual).toBe('up');
  });

  it('marks a prediction wrong when the direction does not match, and reports the real delta', () => {
    const after = { ...before, biodiversity: before.biodiversity - 3 };
    const [result] = evaluatePredictions({ biodiversity: 'up' }, before, after);
    expect(result.correct).toBe(false);
    expect(result.actual).toBe('down');
    expect(result.delta).toBeCloseTo(-3, 5);
  });

  it('returns an empty array when nothing was predicted', () => {
    expect(evaluatePredictions({}, before, before)).toEqual([]);
  });
});
