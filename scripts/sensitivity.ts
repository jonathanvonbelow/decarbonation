/**
 * Sensitivity analysis of model 2.0: Morris elementary effects (mejora-general/files/51_validacion_cierre_deploy.md §1).
 *
 *   npx tsx scripts/sensitivity.ts              -> r = 20 trajectories, writes reports/sensitivity-2.0.{md,json}
 *   npx tsx scripts/sensitivity.ts --r 10       -> fewer trajectories (the spec's r = 10)
 *   npx tsx scripts/sensitivity.ts --out <dir>  -> another output folder
 *
 * Factors: 30 scalars — 15 of CONTROL_PARAMS (the facilitator's) and 15 of PARAMS_V2 (a scalar, or a whole table scaled
 * by one multiplier: costShare, rampYears, fatigueYears, bE). Each factor moves in [0.8, 1.2] × its nominal value, on a
 * p = 4 level grid (Δ = 2/3 of the range: a step of ±26.7 % of the nominal value). Responses: B, F, E, W, c and D/Y of
 * level 2 at 30 years (a game over is recorded and the run goes on to year 30), strategies `green` and `production` of the harness, without events
 * (`noShocks`, like the golden: the analysis measures the model, not the dice). Cost: r·(k + 1) runs per strategy
 * (r = 20: 1 240 runs, ≈ 2–3 min) plus a one-at-a-time +20 % pass (62 runs) to compare with the prototype's ranking.
 *
 * μ* (mean |EE|), μ and σ are in output units per unit of the normalised range, i.e. the effect of moving the factor
 * from −20 % to +20 % of its nominal value. The overall ranking averages μ* ÷ max(μ*) over the 12 (strategy, output)
 * pairs. PARAMS_V2 is a module object: the script mutates it in place for each run and restores it (never in the app).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTROL_PARAMS } from '../src/constants';
import { MODEL_VERSION, makeRng, stepYear } from '../src/sim';
import { PARAMS_V2 } from '../src/sim/v2/params';
import type { ControlParams } from '../src/types';
import { activatePolicies, freshLevelState, joinPacts, snapshotOf } from './harness/runNiveles';
import { NIVELES_STRATEGIES, nivelesTax } from './harness/strategies';

const argv = process.argv.slice(2);
const argOf = (name: string): string | undefined => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const R_TRAJ = Number(argOf('--r') ?? 20);
const SEED = Number(argOf('--seed') ?? 51);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.resolve(root, argOf('--out') ?? 'reports');

const LEVEL = 2;
const YEARS = 30;
const STRATEGIES = ['green', 'production'] as const;
const OUTPUTS = ['B', 'F', 'E', 'W', 'c', 'DY'] as const;
type Output = typeof OUTPUTS[number];
const LOW = 0.8;
const HIGH = 1.2;
const P_LEVELS = 4;
const DELTA = P_LEVELS / (2 * (P_LEVELS - 1));

/* ── Factors ─────────────────────────────────────────────────────────────────────────────── */

// The script writes PARAMS_V2 (typed `as const`, read-only for the app) through an untyped view.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PV = PARAMS_V2 as any;

interface Factor {
  id: string;
  source: 'CP' | 'PARAMS_V2';
  /** Applies multiplier m: returns the CP to use (CP factors) and mutates PARAMS_V2 (the rest). */
  apply: (m: number, CP: ControlParams) => ControlParams;
  restore: () => void;
}

function cpFactor(key: keyof ControlParams): Factor {
  return {
    id: key, source: 'CP',
    apply: (m, CP) => ({ ...CP, [key]: (CONTROL_PARAMS[key] as number) * m }),
    restore: () => undefined,
  };
}

/** A scalar at `path` of PARAMS_V2 (e.g. ['food', 'kappa1']). */
function pvScalar(pathKeys: string[]): Factor {
  const parent = pathKeys.slice(0, -1).reduce((o, k) => o[k], PV);
  const leaf = pathKeys[pathKeys.length - 1];
  const nominal = parent[leaf] as number;
  return {
    id: pathKeys.join('.'), source: 'PARAMS_V2',
    apply: (m, CP) => { parent[leaf] = nominal * m; return CP; },
    restore: () => { parent[leaf] = nominal; },
  };
}

/** A whole table of PARAMS_V2 scaled by one multiplier (every entry × m). */
function pvTable(key: string): Factor {
  const table = PV[key] as Record<string, number>;
  const nominal = { ...table };
  return {
    id: `${key} (×tabla)`, source: 'PARAMS_V2',
    apply: (m, CP) => { Object.keys(nominal).forEach((k) => { table[k] = nominal[k] * m; }); return CP; },
    restore: () => { Object.assign(table, nominal); },
  };
}

const FACTORS: Factor[] = [
  cpFactor('Gasto_Publico_Base_Nivel_2'),
  cpFactor('Eficiencia_Minima_Politicas'),
  cpFactor('Recuperacion_Politicas_Anios'),
  cpFactor('Velocidad_Ajuste_Biodiversidad'),
  cpFactor('Velocidad_Ajuste_Seg_Alimentaria'),
  cpFactor('Velocidad_Ajuste_Seg_Economica'),
  cpFactor('Velocidad_Ajuste_Conflicto'),
  cpFactor('Velocidad_Ajuste_Colapso'),
  cpFactor('Velocidad_Ajuste_Presiones'),
  cpFactor('Tasa_Impositiva_General_Sobre_PBI'),
  cpFactor('Tasa_Base_Crecimiento_PBI'),
  cpFactor('Tasa_Crecimiento_Poblacional_Base'),
  cpFactor('Tasa_de_interes_Nivel_2'),
  cpFactor('Tasa_de_BNNP_a_CC_Base'),
  cpFactor('Poblacion_Inicial'),
  pvScalar(['food', 'kappa1']),
  pvScalar(['food', 'kappa2']),
  pvScalar(['food', 'yieldTrend']),
  pvScalar(['zSAR']),
  pvScalar(['energy', 'adjust']),
  pvScalar(['energy', 'incomeElasticity']),
  pvScalar(['land', 'rentBeta']),
  pvScalar(['finance', 'riskPremium']),
  pvScalar(['relaxation', 'E', 'landValue']),
  pvScalar(['conflictWeights', 'gini']),
  pvScalar(['pressure', 'phiScale']),
  pvTable('costShare'),
  pvTable('rampYears'),
  pvTable('fatigueYears'),
  pvTable('bE'),
];
const K = FACTORS.length;

/* ── Model run ───────────────────────────────────────────────────────────────────────────── */

type Response = Record<Output, number> & { over: string | null };

/** Multipliers m (one per factor) → responses of one strategy at year 30 of level 2, no events. */
function run(strategyId: string, multipliers: number[]): Response {
  let CP: ControlParams = { ...CONTROL_PARAMS };
  try {
    FACTORS.forEach((f, i) => { CP = f.apply(multipliers[i], CP); });
    const strategy = NIVELES_STRATEGIES.find((s) => s.id === strategyId)!;
    let state = freshLevelState(LEVEL, CP);
    activatePolicies(state, strategy.ids, LEVEL, strategy.effort, CP);
    state.additionalTaxPressurePercentage = nivelesTax(strategy, LEVEL);
    // Every run is read at the same horizon (year 30): a game over is recorded, then cleared so the model keeps going
    // (advanceYear stops a year at the month of a game over). Otherwise an elementary effect across the bankruptcy
    // threshold would compare a year-30 state with one frozen years earlier.
    let over: string | null = null;
    for (let y = 0; y < YEARS; y++) {
      if (state.gameOverReason) { over ??= `${state.gameOverReason.split(':')[0]} ${state.year}`; state.gameOverReason = null; }
      joinPacts(state, strategy, LEVEL);
      state = stepYear(state, () => 0.999, CP, 'es', { noShocks: true }).next;
    }
    if (state.gameOverReason) over ??= `${state.gameOverReason.split(':')[0]} ${state.year}`;
    const s = snapshotOf(state);
    return { B: s.B, F: s.F, E: s.E, W: s.W, c: s.c, DY: s.DY, over };
  } finally {
    FACTORS.forEach((f) => f.restore());
  }
}

/* ── Morris design ───────────────────────────────────────────────────────────────────────── */

const toMult = (x: number) => LOW + (HIGH - LOW) * x;

interface Trajectory { points: number[][]; order: number[]; signs: number[] }

/** One Morris trajectory: a random base point on the p-level grid, then each factor moved once by ±Δ in random order. */
function trajectory(rand: () => number): Trajectory {
  const x = Array.from({ length: K }, () => Math.floor(rand() * P_LEVELS) / (P_LEVELS - 1));
  const order = Array.from({ length: K }, (_, i) => i);
  for (let i = K - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const points = [x.slice()];
  const signs: number[] = [];
  order.forEach((i) => {
    const sign = x[i] + DELTA <= 1 + 1e-12 ? 1 : -1;
    x[i] += sign * DELTA;
    signs.push(sign);
    points.push(x.slice());
  });
  return { points, order, signs };
}

/* ── Run ─────────────────────────────────────────────────────────────────────────────────── */

const t0 = Date.now();
const rand = makeRng(SEED, 0);
const trajectories = Array.from({ length: R_TRAJ }, () => trajectory(rand));

interface Stats { muStar: number; mu: number; sigma: number }
type StratResult = Record<Output, Stats[]>;
const results: Record<string, StratResult> = {};
const gameOvers: Record<string, Record<string, number>> = {};
let runs = 0;

for (const strategyId of STRATEGIES) {
  const ee: Record<Output, number[][]> = Object.fromEntries(OUTPUTS.map((o) => [o, FACTORS.map(() => [] as number[])])) as Record<Output, number[][]>;
  gameOvers[strategyId] = {};
  trajectories.forEach((tr) => {
    const ys = tr.points.map((pt) => { runs++; return run(strategyId, pt.map(toMult)); });
    ys.forEach((y) => {
      if (!y.over) return;
      const kind = y.over.replace(/ \d{4}$/, ''); // count by kind; the year is in the OAT table
      gameOvers[strategyId][kind] = (gameOvers[strategyId][kind] ?? 0) + 1;
    });
    tr.order.forEach((i, step) => {
      OUTPUTS.forEach((o) => {
        const a = ys[step][o];
        const b = ys[step + 1][o];
        // D/Y is Infinity only with Y = 0 (never in practice); skip a non-finite effect rather than poison the mean.
        const d = (b - a) / (tr.signs[step] * DELTA);
        if (Number.isFinite(d)) ee[o][i].push(d);
      });
    });
  });
  results[strategyId] = Object.fromEntries(OUTPUTS.map((o) => [o, ee[o].map((list) => {
    const n = list.length || 1;
    const mu = list.reduce((s, v) => s + v, 0) / n;
    const muStar = list.reduce((s, v) => s + Math.abs(v), 0) / n;
    const sigma = Math.sqrt(list.reduce((s, v) => s + (v - mu) ** 2, 0) / Math.max(1, n - 1));
    return { muStar, mu, sigma };
  })])) as StratResult;
  console.log(`[sensitivity] ${strategyId}: ${R_TRAJ} trajectories done (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}

/** One-at-a-time +20 % (the prototype's experiment in the spec): Δ of each output against the nominal run. */
const ONES = FACTORS.map(() => 1);
const oat: Record<string, { nominal: Response; delta: Record<string, Record<Output, number> & { over: string | null }> }> = {};
for (const strategyId of STRATEGIES) {
  const nominal = run(strategyId, ONES);
  runs++;
  const delta: Record<string, Record<Output, number> & { over: string | null }> = {};
  FACTORS.forEach((f, i) => {
    const m = ONES.slice();
    m[i] = 1.2;
    const y = run(strategyId, m);
    runs++;
    delta[f.id] = { ...Object.fromEntries(OUTPUTS.map((o) => [o, y[o] - nominal[o]])) as Record<Output, number>, over: y.over };
  });
  oat[strategyId] = { nominal, delta };
}

/* ── Ranking and report ──────────────────────────────────────────────────────────────────── */

const overall = FACTORS.map((f, i) => {
  let sum = 0;
  let n = 0;
  STRATEGIES.forEach((s) => OUTPUTS.forEach((o) => {
    const max = Math.max(...results[s][o].map((x) => x.muStar));
    if (max > 0) { sum += results[s][o][i].muStar / max; n++; }
  }));
  return { id: f.id, source: f.source, index: n > 0 ? sum / n : 0, i };
}).sort((a, b) => b.index - a.index);

const fmt = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d).replace('-0.00', '0.00') : String(x));
const lines: string[] = [];
lines.push(`# Análisis de sensibilidad — modelo ${MODEL_VERSION} (Morris)`);
lines.push('');
lines.push(`Generado por \`npx tsx scripts/sensitivity.ts --r ${R_TRAJ}\` (semilla del diseño ${SEED}; ${runs} corridas, ` +
  `${((Date.now() - t0) / 1000).toFixed(0)} s). Especificación: \`mejora-general/files/51_validacion_cierre_deploy.md\` §1.`);
lines.push('');
const nCP = FACTORS.filter((f) => f.source === 'CP').length;
const stepPct = (HIGH - LOW) * DELTA * 100;
lines.push(`**Diseño.** Efectos elementales de Morris sobre ${K} factores (${nCP} de \`CONTROL_PARAMS\`, ${K - nCP} de \`PARAMS_V2\`; las tablas ` +
  FACTORS.filter((f) => f.id.endsWith('(×tabla)')).map((f) => `\`${f.id.replace(' (×tabla)', '')}\``).join(', ') +
  ' se escalan enteras con un solo multiplicador). Cada factor varía en ' +
  `[${LOW}, ${HIGH}] × su valor nominal, grilla de p = ${P_LEVELS} niveles, Δ = ${fmt(DELTA, 3)} del rango (paso de ${fmt(stepPct, 1)} % del nominal), ` +
  `r = ${R_TRAJ} trayectorias (la spec pide r = 10; con 100 ms por corrida se duplicó para estabilizar el orden). Respuestas: ` +
  'B, F, E, W, c y D/Y del Nivel 2 a los 30 años (un fin de partida se registra y el modelo sigue hasta el año 30, para comparar siempre el mismo horizonte), estrategias `green` y `production` del arnés, ' +
  'sin eventos (`noShocks`, como el golden). μ\\*, μ y σ están en unidades de la respuesta por rango completo (−20 % → +20 %).');
lines.push('');
lines.push(`**Índice global** = promedio, sobre los ${STRATEGIES.length * OUTPUTS.length} pares (estrategia, respuesta), de μ\\*/máx μ\\* del par (1 = el más influyente en todo).`);
lines.push('');
lines.push('## Orden global');
lines.push('');
lines.push('| # | Factor | Fuente | Índice | ' + STRATEGIES.map((s) => `μ* E (${s})`).join(' | ') + ' | ' + STRATEGIES.map((s) => `μ* W (${s})`).join(' | ') + ' |');
lines.push('|---|---|---|---|' + STRATEGIES.map(() => '---').join('|') + '|' + STRATEGIES.map(() => '---').join('|') + '|');
overall.forEach((r, n) => {
  lines.push(`| ${n + 1} | \`${r.id}\` | ${r.source} | ${fmt(r.index, 3)} | ` +
    STRATEGIES.map((s) => fmt(results[s].E[r.i].muStar)).join(' | ') + ' | ' +
    STRATEGIES.map((s) => fmt(results[s].W[r.i].muStar)).join(' | ') + ' |');
});
lines.push('');
for (const s of STRATEGIES) {
  lines.push(`## Detalle — \`${s}\` (μ* / μ / σ)`);
  lines.push('');
  lines.push('| Factor | ' + OUTPUTS.map((o) => o === 'DY' ? 'D/Y' : o).join(' | ') + ' |');
  lines.push('|---|' + OUTPUTS.map(() => '---').join('|') + '|');
  overall.forEach((r) => {
    lines.push(`| \`${r.id}\` | ` + OUTPUTS.map((o) => {
      const x = results[s][o][r.i];
      const d = o === 'DY' || o === 'c' ? 3 : 2;
      return `${fmt(x.muStar, d)} / ${fmt(x.mu, d)} / ${fmt(x.sigma, d)}`;
    }).join(' | ') + ' |');
  });
  const go = Object.entries(gameOvers[s]);
  lines.push('');
  lines.push(`Fines de partida en el diseño de Morris (${R_TRAJ * (K + 1)} corridas; el modelo sigue hasta el año 30): ` +
    (go.length ? go.map(([k, v]) => `${k}: ${v}`).join(', ') : 'ninguno') + '.');
  lines.push('');
}
lines.push('## Una variable a la vez (+20 %), comparación con el prototipo');
lines.push('');
lines.push('Δ de cada respuesta a los 30 años contra la corrida nominal (Nivel 2, sin eventos). Solo los factores con algún |Δ| ≥ 1 punto ' +
  '(o ≥ 0,05 en c / D/Y), ordenados por |ΔE| de `green`.');
lines.push('');
lines.push('Nominal: ' + STRATEGIES.map((s) => `\`${s}\` ` + OUTPUTS.map((o) => `${o === 'DY' ? 'D/Y' : o} ${fmt(oat[s].nominal[o], o === 'DY' || o === 'c' ? 3 : 1)}`).join(', ')).join('; ') + '.');
lines.push('');
lines.push('| Factor | ' + STRATEGIES.map((s) => OUTPUTS.map((o) => `Δ${o === 'DY' ? 'D/Y' : o} ${s}`).join(' | ')).join(' | ') + ' | fin de partida |');
lines.push('|---|' + STRATEGIES.map(() => OUTPUTS.map(() => '---').join('|')).join('|') + '|---|');
const oatRows = FACTORS.filter((f) => STRATEGIES.some((s) => OUTPUTS.some((o) => Math.abs(oat[s].delta[f.id][o]) >= (o === 'DY' || o === 'c' ? 0.05 : 1))))
  .sort((a, b) => Math.abs(oat.green.delta[b.id].E) - Math.abs(oat.green.delta[a.id].E));
oatRows.forEach((f) => {
  const overs = STRATEGIES.map((s) => oat[s].delta[f.id].over ? `${s}: ${oat[s].delta[f.id].over}` : '').filter(Boolean).join('; ');
  lines.push(`| \`${f.id}\` | ` + STRATEGIES.map((s) => OUTPUTS.map((o) => fmt(oat[s].delta[f.id][o], o === 'DY' || o === 'c' ? 3 : 1)).join(' | ')).join(' | ') + ` | ${overs || '—'} |`);
});
lines.push('');
const g = oat.green.delta.Gasto_Publico_Base_Nivel_2;
// The panel / manual warning says "+20 % of γ takes about 14 points of economic security from a green portfolio on Level 2".
const warningHolds = g.E <= -10 && g.E >= -18;
lines.push('**Aviso de `Gasto_Publico_Base_*`.** El prototipo da, con +20 % sobre γ₂ y la cartera verde, ΔE = −13,6 y ΔW = −22,6; ' +
  `el motor TS da ΔE = ${fmt(g.E, 1)} y ΔW = ${fmt(g.W, 1)} a los 30 años${g.over ? ` (fin de partida: ${g.over})` : ''}. ` +
  'El aviso del panel de facilitación y del manual ("+20 % de γ le quita a una cartera verde unos 14 puntos de seguridad económica ' +
  (warningHolds ? 'en el Nivel 2") se confirma (|ΔE| entre 10 y 18).' : 'en el Nivel 2") **no se confirma**: revisar el texto del aviso.'));
lines.push('');

mkdirSync(outDir, { recursive: true });
const base = path.join(outDir, `sensitivity-${MODEL_VERSION}`);
// Hand-written sections (reading, reference behaviour) live after HAND_MARKER and survive a rerun.
const HAND_MARKER = '<!-- escrito a mano: se conserva al regenerar -->';
const previous = existsSync(`${base}.md`) ? readFileSync(`${base}.md`, 'utf8') : '';
const handTail = previous.includes(HAND_MARKER) ? previous.slice(previous.indexOf(HAND_MARKER)) : '';
writeFileSync(`${base}.md`, lines.join('\n') + (handTail ? `\n${handTail}` : ''));
writeFileSync(`${base}.json`, JSON.stringify({
  modelVersion: MODEL_VERSION, r: R_TRAJ, seed: SEED, levels: P_LEVELS, delta: DELTA, range: [LOW, HIGH], level: LEVEL, years: YEARS,
  strategies: STRATEGIES, outputs: OUTPUTS, runs,
  factors: FACTORS.map((f) => ({ id: f.id, source: f.source })),
  overall: overall.map(({ id, source, index }) => ({ id, source, index })),
  morris: results, gameOvers, oat,
}, null, 2));
console.log(`[sensitivity] wrote ${path.relative(root, base)}.{md,json} — ${runs} runs, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
console.log('[sensitivity] top 5:', overall.slice(0, 5).map((r) => `${r.id} ${r.index.toFixed(3)}`).join(' · '));
