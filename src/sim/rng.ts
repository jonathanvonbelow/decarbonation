/**
 * Deterministic PRNG (mejora-general/files/16_auditoria_ecuaciones.md §2.3).
 *
 * Seeded per (session seed, year) so a replay of the same seed + the same sequence of
 * player actions produces byte-identical results — required for INV-11 (determinism) and
 * for the Monte Carlo balance harness (file 16 §5) to be reproducible.
 */
export type Rng = () => number;

export function makeRng(seed: number, year: number): Rng {
  let a = (seed ^ (year * 0x9e3779b9)) >>> 0;
  return function mulberry32() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
