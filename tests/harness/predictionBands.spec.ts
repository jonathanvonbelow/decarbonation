/**
 * Phase 48 §6 (criterion C7): with the bands of predictionBands.json, "no change" is 33 % ± 3 of the synthetic players'
 * years for B, E and c on every level. Uses the first 50 players (the `--quick` prefix of sim:check; the full check
 * runs the 150 the bands were measured on). Also: the bands are reproducible from the same players.
 */
import { describe, expect, it } from 'vitest';
import { runRandomPlayers } from '../../scripts/harness/randomPlayers';
import { quantileBand } from '../../scripts/prediction-bands';
import { predictionBand } from '../../src/components/tutorial/predictions';

const PLAYERS = 150;
const share = (xs: string[]) => xs.filter((d) => d === 'flat').length / xs.length;

describe('prediction bands (C7)', () => {
  [1, 2, 3].forEach((level) => {
    it(`level ${level}: "no change" is 33 % ± 3 for B, E and c`, () => {
      const runs = runRandomPlayers(level, PLAYERS);
      (['B', 'E', 'c'] as const).forEach((k) => {
        const flat = share(runs.flatMap((r) => r.directions[k]));
        expect(Math.abs(flat - 1 / 3), `N${level} ${k}: ${flat}`).toBeLessThanOrEqual(0.03);
      });
    }, 90_000);
  });

  it('runs are deterministic and the band is the tercile of |Δ| (reproducible)', () => {
    const a = runRandomPlayers(1, 5);
    const b = runRandomPlayers(1, 5);
    expect(a.map((r) => r.changes)).toEqual(b.map((r) => r.changes));
    expect(quantileBand([3, -1, 2, 0.5, -4, 6])).toBe(2); // |Δ| sorted 0.5 1 2 3 4 6 → rank floor(6/3) = 2
    expect(predictionBand('biodiversity', 1)).toBeGreaterThan(0);
  });
});
