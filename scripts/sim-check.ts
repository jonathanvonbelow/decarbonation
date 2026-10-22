/**
 * Balance check for the simulation model (00_INDICE_v6.md §6, mejora-general/files/33_arnes_completo.md).
 *   npm run sim:check                  -> 40 seeds (3-level) / 20 seeds (Territorio), 150 random players per level
 *   npm run sim:check -- --quick       -> 10 / 5 seeds, 50 random players, for every phase commit
 *   npm run sim:check -- --report-only -> never fails (used for the 1.x baseline)
 *   npm run sim:check -- --update-latest -> also copies the JSON to reports/balance-latest.json
 * Writes reports/balance-<MODEL_VERSION>.{md,json} (the quick run: balance-<MODEL_VERSION>-quick.*, not
 * committed) and compares with reports/balance-latest.json.
 * Exit code 1 if any criterion fails (unless --report-only); with --quick, only if a criterion that
 * passed in balance-latest.json fails now.
 *
 * Quick seeds are a prefix of the full ones (strategies 1..10 / 1..5, players 10000..10049), so a full
 * run also records the criteria its quick subset gives (`quickCriteria`): --quick compares against
 * those, like for like, and never flags noise from fewer seeds as a regression. --update-latest is
 * refused with --quick (a low-seed report must not become the baseline).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODEL_VERSION, MODEL_VERSION_BY_GAME } from '../src/sim';
import {
  compareCriteria, evaluateCriteria, exitCode, flatShare, indicatorRange, strategyStats, THRESHOLDS,
  type Criterion, type CriterionChange, type RunResult, type SnapshotKey, type StrategyStats,
} from './harness/metrics';
import { runRandomPlayers } from './harness/randomPlayers';
import { annualMonthlyConsistency, runNiveles, type ConsistencyRow } from './harness/runNiveles';
import { runTerritorio } from './harness/runTerritorio';
import {
  BANKRUPTCY_ALLOWED, LEVEL_ROUTE_IDS, NIVELES_STRATEGIES, SHORTCUTS, TARGETED, TERRITORIO_ROUTE_IDS,
  TERRITORIO_STRATEGIES,
} from './harness/strategies';

const args = new Set(process.argv.slice(2));
const quick = args.has('--quick');
const reportOnly = args.has('--report-only');
if (quick && args.has('--update-latest')) console.warn('[sim:check] --update-latest ignored with --quick: the baseline is always a full run');
const updateLatest = args.has('--update-latest') && !quick;

type Seeds = { niveles: number; territorio: number; randomPlayers: number };
const QUICK_SEEDS: Seeds = { niveles: 10, territorio: 5, randomPlayers: 50 };
const FULL_SEEDS: Seeds = { niveles: 40, territorio: 20, randomPlayers: 150 };
const SEEDS = quick ? QUICK_SEEDS : FULL_SEEDS;
const LEVELS = [1, 2, 3];
/** Model 2.0 is where the annual/monthly consistency becomes a criterion (33 §4, phase 35). */
const consistencyApplies = Number(MODEL_VERSION.split('.')[0]) >= 2;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportsDir = path.join(root, 'reports');
const t0 = Date.now();
const elapsed = () => `${((Date.now() - t0) / 1000).toFixed(0)} s`;
const seedsOf = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

/* ── Run ───────────────────────────────────────────────────────────────────────────────────── */

const scopes: { scope: string; game: 'niveles' | 'territorio'; level: number; routeIds: string[]; runs: RunResult[] }[] = [];

for (const level of LEVELS) {
  const runs: RunResult[] = [];
  for (const strategy of NIVELES_STRATEGIES) for (const seed of seedsOf(SEEDS.niveles)) runs.push(runNiveles(level, strategy, seed));
  scopes.push({ scope: `N${level}`, game: 'niveles', level, routeIds: LEVEL_ROUTE_IDS[level], runs });
  console.log(`[sim:check] N${level}: ${runs.length} runs (${elapsed()})`);
}
{
  const runs: RunResult[] = [];
  for (const strategy of TERRITORIO_STRATEGIES) {
    for (const seed of seedsOf(SEEDS.territorio)) runs.push(runTerritorio(strategy, seed));
    console.log(`[sim:check] Territorio ${strategy.id}: ${SEEDS.territorio} runs (${elapsed()})`);
  }
  scopes.push({ scope: 'Territorio', game: 'territorio', level: 0, routeIds: TERRITORIO_ROUTE_IDS, runs });
}

const playersByLevel = LEVELS.map((level) => ({ level, players: runRandomPlayers(level, SEEDS.randomPlayers) }));
const bandOf = (count: number) => playersByLevel.map(({ level, players }) => {
  const all = (k: 'B' | 'E' | 'c') => players.slice(0, count).flatMap((p) => p.directions[k]);
  return { scope: `N${level}`, B: flatShare(all('B')), E: flatShare(all('E')), c: flatShare(all('c')), years: all('B').length };
});
const predictionBand = bandOf(SEEDS.randomPlayers);
console.log(`[sim:check] prediction band: ${SEEDS.randomPlayers} players × 3 levels (${elapsed()})`);

const consistencyRows: ConsistencyRow[] = annualMonthlyConsistency(
  NIVELES_STRATEGIES.filter((s) => ['do_nothing', 'green', 'extractive'].includes(s.id)),
);
const indRows = consistencyRows.filter((r) => r.key !== 'c');
const co2Rows = consistencyRows.filter((r) => r.key === 'c');
const maxAbs = (rows: ConsistencyRow[]) => rows.reduce((m, r) => Math.max(m, Math.abs(r.delta)), 0);
const worstRow = (rows: ConsistencyRow[]) => rows.reduce<ConsistencyRow | null>((w, r) => (!w || Math.abs(r.delta) > Math.abs(w.delta) ? r : w), null);
const consistency = {
  applies: consistencyApplies,
  maxIndicatorDelta: maxAbs(indRows),
  maxCo2Delta: maxAbs(co2Rows),
  detail: [worstRow(indRows), worstRow(co2Rows)].filter((r): r is ConsistencyRow => !!r).map((r) =>
    `peor ${r.key}: ${r.strategy} año ${r.year}, anual ${r.annual.toFixed(2)} vs mensual ${r.monthly.toFixed(2)} (Δ ${r.delta.toFixed(2)})`)
    .concat(consistencyApplies ? [] : ['modelo 1.x: informativo, el criterio aplica desde el modelo 2.0 (fase 35)']),
};

/* ── Aggregate and evaluate ────────────────────────────────────────────────────────────────── */

/** Aggregates the runs whose seed is within `seeds` (a prefix of the seeds actually run). */
function aggregate(seeds: Seeds) {
  return scopes.map((sc) => {
    const limit = sc.game === 'niveles' ? seeds.niveles : seeds.territorio;
    const runs = sc.runs.filter((r) => r.seed <= limit);
    const ids = [...new Set(runs.map((r) => r.strategy))];
    const stats = ids.map((id) => strategyStats(runs.filter((r) => r.strategy === id), sc.routeIds));
    return { scope: sc.scope, game: sc.game, level: sc.level, routeIds: sc.routeIds, stats, range: indicatorRange(stats) };
  });
}
const criteriaFor = (agg: ReturnType<typeof aggregate>, band: typeof predictionBand): Criterion[] => evaluateCriteria({
  scopes: agg,
  predictionBand: band,
  consistency,
  targeted: TARGETED,
  shortcuts: SHORTCUTS,
  bankruptcyAllowed: BANKRUPTCY_ALLOWED,
});

const aggregated = aggregate(SEEDS);
const criteria: Criterion[] = criteriaFor(aggregated, predictionBand);
/** What --quick measures: identical to a quick run, because the quick seeds are a prefix of these. */
const quickCriteria: Criterion[] = quick ? criteria : criteriaFor(aggregate(QUICK_SEEDS), bandOf(QUICK_SEEDS.randomPlayers));

const latestPath = path.join(reportsDir, 'balance-latest.json');
let previous: { criteria: Criterion[]; quickCriteria?: Criterion[]; modelVersion: string; mode: string; generatedAt: string } | null = null;
if (existsSync(latestPath)) {
  try { previous = JSON.parse(readFileSync(latestPath, 'utf8')); } catch { previous = null; }
}
// Like for like: a quick run against the quick subset of the baseline, a full run against the full one.
const baselineCriteria = previous ? (quick ? previous.quickCriteria ?? previous.criteria : previous.criteria) : null;
const changes: CriterionChange[] = compareCriteria(baselineCriteria, criteria);
const code = exitCode(criteria, changes, { quick, reportOnly });

/* ── Report ────────────────────────────────────────────────────────────────────────────────── */

const mode = quick ? 'quick' : 'full';
const report = {
  modelVersion: MODEL_VERSION,
  modelVersionByGame: MODEL_VERSION_BY_GAME,
  generatedAt: new Date().toISOString(),
  mode,
  seeds: SEEDS,
  thresholds: THRESHOLDS,
  criteria,
  quickCriteria,
  comparedWith: previous ? { modelVersion: previous.modelVersion, mode: previous.mode, generatedAt: previous.generatedAt } : null,
  changes,
  scopes: aggregated,
  predictionBand,
  consistency: { ...consistency, rows: consistencyRows },
  durationSeconds: Math.round((Date.now() - t0) / 1000),
};

const f1 = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : '∞');
const f2 = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : '∞');
const pc = (x: number) => `${(x * 100).toFixed(0)} %`;
const q = (s: StrategyStats, k: SnapshotKey, fmt = f1) => `${fmt(s.final[k].p50)} (${fmt(s.final[k].p10)}–${fmt(s.final[k].p90)})`;
const ROUTE_ABBR: Record<string, string> = { conservation: 'cons', production: 'prod', innovation: 'inno', equilibrium: 'eq' };

const md: string[] = [];
md.push(`# Balance del modelo ${MODEL_VERSION} (${mode})`, '');
md.push(`Generado por \`npm run sim:check${quick ? ' -- --quick' : ''}\` (scripts/sim-check.ts) el ${report.generatedAt.slice(0, 10)}, en ${report.durationSeconds} s. ` +
  `Modelo por juego: niveles ${MODEL_VERSION_BY_GAME.niveles}, Territorio ${MODEL_VERSION_BY_GAME.territorio}. ` +
  `Semillas: ${SEEDS.niveles} por estrategia y nivel (3 niveles), ${SEEDS.territorio} por estrategia (Territorio); ` +
  `${SEEDS.randomPlayers} jugadores sintéticos por nivel. Criterios: 00_INDICE_v6.md §6; estrategias: scripts/harness/strategies.ts.`, '');
md.push('## Criterios', '', '| Criterio | Estado | Valor | Umbral |', '|---|---|---|---|');
criteria.forEach((c) => md.push(`| \`${c.key}\` | ${c.status} | ${c.value.toFixed(3)} | ${c.threshold} |`));
md.push('');
criteria.forEach((c) => {
  if (c.detail.length === 0) return;
  md.push(`<details><summary>${c.key}</summary>`, '', ...c.detail.map((d) => `- ${d}`), '', '</details>', '');
});
md.push('## Comparación con `reports/balance-latest.json`', '');
if (!previous) md.push('No había reporte anterior.', '');
else {
  md.push(`Anterior: modelo ${previous.modelVersion} (${previous.mode}), ${previous.generatedAt.slice(0, 10)}; ${quick ? 'contra su subconjunto rápido (`quickCriteria`, mismas semillas)' : 'contra sus criterios completos'}.`, '',
    '| Criterio | Antes | Ahora | Valor antes → ahora | Cambio |', '|---|---|---|---|---|');
  changes.forEach((c) => md.push(`| \`${c.key}\` | ${c.before ?? '—'} | ${c.after} | ${c.valueBefore === null ? '—' : c.valueBefore.toFixed(3)} → ${c.valueAfter.toFixed(3)} | ${c.change}${c.regressed ? ' **(regresión)**' : ''} |`));
  md.push('');
}

aggregated.forEach((sc) => {
  md.push(`## ${sc.scope === 'Territorio' ? 'Territorio (360 meses)' : `Nivel ${sc.level} (30 años)`}`, '');
  md.push(`Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).`, '');
  md.push(`| Estrategia | Victoria | ${sc.routeIds.map((r) => ROUTE_ABBR[r]).join(' / ')} | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |`);
  md.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  sc.stats.forEach((s) => {
    const losses = Object.entries(s.losses).map(([k, v]) => `${k} ${v}`).join(', ') || '—';
    md.push(`| ${s.strategy} | ${pc(s.win.rate)} [${pc(s.win.ci[0])}–${pc(s.win.ci[1])}] | ${sc.routeIds.map((r) => pc(s.routeMet[r].rate)).join(' / ')} | ${pc(s.allRoutes.rate)} | `
      + `${q(s, 'B')} | ${q(s, 'F')} | ${q(s, 'E')} | ${q(s, 'W')} | ${q(s, 'St')} | ${q(s, 'c', f2)} | ${q(s, 'DY', f2)} | ${s.final.score.p50.toFixed(0)} | ${f1(s.endYear.p50)} | ${losses} |`);
  });
  md.push('', `Recorrido entre estrategias (máx − mín de las medianas): ${(['B', 'F', 'E', 'W'] as const).map((k) => `${k} ${sc.range[k].range.toFixed(1)}`).join(', ')}.`, '');
});

md.push('## Banda de predicción (jugadores sintéticos)', '',
  'Proporción de años en que `actualDirection` (src/components/tutorial/predictions.ts) da "sin cambio". Objetivo: 30–36 %.', '',
  '| Nivel | años | B | E | c |', '|---|---|---|---|---|');
predictionBand.forEach((b) => md.push(`| ${b.scope} | ${b.years} | ${pc(b.B)} | ${pc(b.E)} | ${pc(b.c)} |`));
md.push('', '## Consistencia anual–mensual (N2, sin eventos)', '',
  consistencyApplies ? 'Criterio activo (modelo 2.x).' : 'Informativo en el modelo 1.x: `stepMonth` todavía no es la discretización del modelo 2.0.', '',
  '| Estrategia | Año | Indicador | Anual | Mensual | Δ |', '|---|---|---|---|---|---|');
consistencyRows.forEach((r) => md.push(`| ${r.strategy} | ${r.year} | ${r.key} | ${f2(r.annual)} | ${f2(r.monthly)} | ${f2(r.delta)} |`));
md.push('');

mkdirSync(reportsDir, { recursive: true });
const base = path.join(reportsDir, `balance-${MODEL_VERSION}${quick ? '-quick' : ''}`);
// Non-finite numbers (D/Y with no GDP) would turn into null in JSON: write them as strings instead.
const json = `${JSON.stringify(report, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v), 2)}\n`;
writeFileSync(`${base}.json`, json);
writeFileSync(`${base}.md`, md.join('\n'));
if (updateLatest) writeFileSync(latestPath, json);

console.log('');
criteria.forEach((c) => console.log(`  ${c.status.padEnd(4)} ${c.key.padEnd(26)} ${c.value.toFixed(3)}`));
changes.filter((c) => c.change === 'improved' || c.change === 'worsened').forEach((c) =>
  console.log(`  ${c.change === 'improved' ? '↑' : '↓'} ${c.key}: ${c.valueBefore?.toFixed(3)} → ${c.valueAfter.toFixed(3)}${c.regressed ? '  REGRESSION (PASS → FAIL)' : ''}`));
console.log(`\n[sim:check] wrote ${path.relative(root, base)}.{md,json}${updateLatest ? ' and reports/balance-latest.json' : ''} in ${elapsed()}; exit ${code}${reportOnly ? ' (--report-only)' : ''}`);
process.exitCode = code;
