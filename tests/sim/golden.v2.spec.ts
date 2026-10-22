/**
 * Golden test of model 2.0 (mejora-general/files/35_motor_v2_estructura.md §9): the TypeScript engine
 * against scripts/reference/golden_v2.csv, the output of `python scripts/reference/modelo_v2.py --golden`
 * (3 levels × do_nothing / green / extractive × years 1, 10, 30, no events).
 *
 * The CSV has more columns than the test checks (pa, pe, ps, DY, S after c): only the nine the spec
 * names are compared; the rest are there for debugging a divergence.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { playLevel } from './testHelpers';

/** Activated in phase 46, once every submodel of 2.0 is in place. */
const GOLDEN_ACTIVE = false;

describe.skipIf(!GOLDEN_ACTIVE)('2.0 engine matches the reference prototype (no events)', () => {
  const rows = readFileSync('scripts/reference/golden_v2.csv', 'utf8').trim().split(/\r?\n/).slice(1).map((l) => l.split(','));
  it.each(rows)('L%s %s year %s', (level, strategy, year, B, F, E, W, St, c) => {
    const h = playLevel(Number(level), strategy, Number(year));           // helper in tests/sim/testHelpers.ts
    expect(h.biodiversity).toBeCloseTo(Number(B), 0);                     // ±0.5 points
    expect(h.foodSecurity).toBeCloseTo(Number(F), 0);
    expect(h.economicSecurity).toBeCloseTo(Number(E), 0);
    expect(h.socialWellbeing).toBeCloseTo(Number(W), 0);
    expect(h.politicalStability).toBeCloseTo(Number(St), 0);
    expect(Math.abs(h.co2EqEmissionsPerCapita - Number(c))).toBeLessThan(0.1);
  });
});

describe('golden table', () => {
  it('has the 27 rows and the header the golden test reads', () => {
    const lines = readFileSync('scripts/reference/golden_v2.csv', 'utf8').trim().split(/\r?\n/);
    expect(lines[0].split(',').slice(0, 9)).toEqual(['level', 'strategy', 'year', 'B', 'F', 'E', 'W', 'St', 'c']);
    expect(lines.length - 1).toBe(27);
  });

  it('plays a harness strategy with playLevel (no events)', () => {
    const h = playLevel(2, 'green', 2);
    expect(Number.isFinite(h.biodiversity)).toBe(true);
    expect(() => playLevel(2, 'nope', 1)).toThrow();
  });
});
