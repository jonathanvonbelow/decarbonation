import { describe, expect, it } from 'vitest';
import {
  compareCriteria, evaluateCriteria, exitCode, flatShare, indicatorRange, quantile, strategyStats, wilson,
  type Criterion, type RunResult,
} from '../../scripts/harness/metrics';

const run = (strategy: string, over: Partial<RunResult> = {}): RunResult => ({
  game: 'niveles', level: 1, strategy, seed: 1, won: false, floorsMet: true, met: [], achieved: null, allRoutes: false,
  endYear: 2054, loss: null, final: { B: 40, F: 40, E: 30, W: 50, St: 60, c: 6, DY: 0, score: 400 }, ...over,
});

describe('wilson', () => {
  it('0 of 40 → [0, ~0.088]', () => {
    const [lo, hi] = wilson(0, 40);
    expect(lo).toBe(0);
    expect(hi).toBeCloseTo(0.088, 3);
  });
  it('40 of 40 → [~0.912, 1]', () => {
    const [lo, hi] = wilson(40, 40);
    expect(lo).toBeCloseTo(0.912, 3);
    expect(hi).toBe(1);
  });
  it('contains the point estimate and is empty-safe', () => {
    const [lo, hi] = wilson(12, 40);
    expect(lo).toBeLessThan(0.3);
    expect(hi).toBeGreaterThan(0.3);
    expect(wilson(0, 0)).toEqual([0, 1]);
  });
});

describe('quantile', () => {
  const v = [5, 1, 4, 2, 3, 10, 9, 8, 7, 6];
  it('uses floor(q·n) on the sorted values', () => {
    expect(quantile(v, 0)).toBe(1);
    expect(quantile(v, 0.1)).toBe(2);
    expect(quantile(v, 0.5)).toBe(6);
    expect(quantile(v, 0.9)).toBe(10);
    expect(quantile(v, 1)).toBe(10);
  });
  it('does not mutate its input', () => {
    const copy = [...v];
    quantile(v, 0.5);
    expect(v).toEqual(copy);
  });
});

describe('aggregation', () => {
  it('strategyStats counts wins, routes and losses', () => {
    const s = strategyStats([
      run('a', { won: true, met: ['conservation'], achieved: 'conservation' }),
      run('a', { loss: 'bankruptcy', floorsMet: false }),
    ], ['conservation', 'production']);
    expect(s.win.rate).toBe(0.5);
    expect(s.routeMet.conservation.k).toBe(1);
    expect(s.routeMet.production.k).toBe(0);
    expect(s.achieved).toEqual({ conservation: 1, none: 1 });
    expect(s.losses).toEqual({ bankruptcy: 1 });
  });
  it('indicatorRange is max − min of the medians', () => {
    const a = strategyStats([run('a', { final: { ...run('a').final, B: 20 } })], []);
    const b = strategyStats([run('b', { final: { ...run('b').final, B: 50 } })], []);
    expect(indicatorRange([a, b]).B).toEqual({ range: 30, min: 'a', max: 'b' });
  });
  it('flatShare', () => {
    expect(flatShare(['flat', 'up', 'down', 'flat'])).toBe(0.5);
    expect(flatShare([])).toBe(0);
  });
});

describe('criteria', () => {
  const stats = (id: string, over: Partial<RunResult>) => strategyStats(Array.from({ length: 10 }, () => run(id, over)), ['conservation']);
  const input = (winRate: number) => {
    const all = [
      stats('do_nothing', {}),
      strategyStats(Array.from({ length: 10 }, (_, i) => run('conservation', { won: i < winRate * 10, met: i < winRate * 10 ? ['conservation'] : [] })), ['conservation']),
    ];
    return {
      scopes: [{ scope: 'N1', game: 'niveles' as const, stats: all, range: indicatorRange(all) }],
      predictionBand: [{ scope: 'N1', B: 0.33, E: 0.33, c: 0.33 }],
      consistency: { applies: false, maxIndicatorDelta: 5, maxCo2Delta: 1, detail: [] },
      targeted: { conservation: 'conservation' },
      shortcuts: { niveles: [], territorio: [] },
      bankruptcyAllowed: { niveles: [], territorio: [] },
    };
  };
  const byKey = (cs: Criterion[], k: string) => cs.find((c) => c.key === k)!;

  it('C2 and C5 follow the thresholds of the index', () => {
    const good = evaluateCriteria(input(1));
    expect(byKey(good, 'C1_do_nothing_never_wins').status).toBe('PASS');
    expect(byKey(good, 'C2_targeted_wins').status).toBe('PASS');
    expect(byKey(good, 'C5_strategy_decides').status).toBe('PASS');
    expect(byKey(good, 'C7_prediction_band').status).toBe('PASS');
    const bad = evaluateCriteria(input(0.5));
    expect(byKey(bad, 'C2_targeted_wins').status).toBe('FAIL');
    expect(byKey(bad, 'C5_strategy_decides').value).toBe(1);
  });
  it('C9 is SKIP before model 2.0', () => {
    expect(byKey(evaluateCriteria(input(1)), 'C9_annual_monthly').status).toBe('SKIP');
  });
  it('comparison flags PASS → FAIL as a regression, and the exit code follows the mode', () => {
    const prev = evaluateCriteria(input(1));
    const cur = evaluateCriteria(input(0.5));
    const changes = compareCriteria(prev, cur);
    const c2 = changes.find((c) => c.key === 'C2_targeted_wins')!;
    expect(c2.regressed).toBe(true);
    expect(c2.change).toBe('worsened');
    expect(exitCode(cur, changes, { quick: true, reportOnly: false })).toBe(1);
    expect(exitCode(cur, changes, { quick: false, reportOnly: true })).toBe(0);
    const noPrev = compareCriteria(null, cur);
    expect(exitCode(cur, noPrev, { quick: true, reportOnly: false })).toBe(0);
    expect(exitCode(cur, noPrev, { quick: false, reportOnly: false })).toBe(1);
  });
});
