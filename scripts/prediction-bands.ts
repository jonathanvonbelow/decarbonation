/**
 * Prediction bands of model 2.0 (mejora-general/files/48_prediccion_e_indices.md §1).
 *
 *   npx tsx scripts/prediction-bands.ts           -> writes src/components/tutorial/predictionBands.json
 *   npx tsx scripts/prediction-bands.ts --check   -> recomputes and exits 1 if the JSON is stale
 *                                                   (other modelVersion than MODEL_VERSION, or other values)
 *
 * The "no change" band of each indicator (B, E, c) and level is the 33rd percentile of |ΔX| per year among the
 * harness's synthetic players (scripts/harness/randomPlayers.ts), so "no change" happens a third of the time a priori.
 * The bands are measured on 150 held-out players (seeds 20000..20149, `BAND_PLAYER_SEED_BASE`) and criterion C7 checks
 * them on the 150 players of `npm run sim:check` (seeds 10000..10149): an out-of-sample test, not true by construction. The script also stores the
 * down/flat/up proportions those players give with the new band: the climatology baseline of the skill score (§2).
 *
 * The prototype (scripts/reference/modelo_v2.py) has no bands, Brier or regret: its numbers quoted in the spec are
 * only a reference; these are measured with the TS engine.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTROL_PARAMS } from '../src/constants';
import { MODEL_VERSION } from '../src/sim';
import type { PredictedIndicatorKey, PredictionBandsFile, PredictionDirection } from '../src/components/tutorial/predictions';
import { BAND_PLAYER_SEED_BASE, runRandomPlayers, type YearChange } from './harness/randomPlayers';

export const BAND_PLAYERS = 600;
export const BAND_QUANTILE = 1 / 3;
const LEVELS = [1, 2, 3];
const KEYS: { k: keyof YearChange; ind: PredictedIndicatorKey }[] = [
  { k: 'B', ind: 'biodiversity' },
  { k: 'E', ind: 'economicSecurity' },
  { k: 'c', ind: 'co2EqEmissionsPerCapita' },
];

const round = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d;

/** Band such that a share BAND_QUANTILE of the |Δ| lies strictly below it: the element at that rank of the sorted list. */
export function quantileBand(deltas: number[], q = BAND_QUANTILE): number {
  const a = deltas.map(Math.abs).sort((x, y) => x - y);
  if (a.length === 0) return 0;
  return a[Math.min(a.length - 1, Math.floor(a.length * q))];
}

export function computeBands(players = BAND_PLAYERS): PredictionBandsFile {
  const out: PredictionBandsFile = { modelVersion: MODEL_VERSION, bands: {}, climatology: {} };
  LEVELS.forEach((level) => {
    const runs = runRandomPlayers(level, players, CONTROL_PARAMS, BAND_PLAYER_SEED_BASE);
    const bands = {} as Record<PredictedIndicatorKey, number>;
    const clim = {} as Record<PredictedIndicatorKey, Record<PredictionDirection, number>>;
    KEYS.forEach(({ k, ind }) => {
      const deltas = runs.flatMap((r) => r.changes.map((c) => c[k]));
      const band = round(quantileBand(deltas), 6);
      bands[ind] = band;
      const n = deltas.length || 1;
      const flat = deltas.filter((d) => Math.abs(d) < band).length;
      const up = deltas.filter((d) => Math.abs(d) >= band && d > 0).length;
      clim[ind] = { down: round((n - flat - up) / n, 4), flat: round(flat / n, 4), up: round(up / n, 4) };
    });
    out.bands[String(level)] = bands;
    out.climatology[String(level)] = clim;
  });
  return out;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const file = path.join(root, 'src', 'components', 'tutorial', 'predictionBands.json');
  const fresh = computeBands();
  const text = `${JSON.stringify(fresh, null, 2)}\n`;
  if (process.argv.includes('--check')) {
    const current = readFileSync(file, 'utf8');
    const parsed = JSON.parse(current) as PredictionBandsFile;
    if (parsed.modelVersion !== MODEL_VERSION) {
      console.error(`[prediction-bands] predictionBands.json is for model ${parsed.modelVersion}, the engine is ${MODEL_VERSION}: run npx tsx scripts/prediction-bands.ts`);
      process.exit(1);
    }
    if (current.replace(/\r\n/g, '\n') !== text) {
      console.error('[prediction-bands] predictionBands.json is stale: run npx tsx scripts/prediction-bands.ts');
      process.exit(1);
    }
    console.log('[prediction-bands] predictionBands.json is up to date');
  } else {
    writeFileSync(file, text);
    console.log(`[prediction-bands] wrote ${path.relative(root, file)} (model ${MODEL_VERSION}, ${BAND_PLAYERS} players per level)`);
    console.log(JSON.stringify(fresh.bands));
    console.log(JSON.stringify(fresh.climatology));
  }
}
