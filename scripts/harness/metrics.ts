/**
 * Balance-harness metrics and acceptance criteria (mejora-general/files/33_arnes_completo.md §4–5,
 * 00_INDICE_v6.md §6). Pure functions only: the runners produce `RunResult`s, this module turns
 * them into rates with Wilson intervals, quantiles, ranges between strategies and the C1–C9 verdicts.
 * Covered by tests/harness/metrics.spec.ts.
 */

/** Indicators recorded at the end of every run (end of year 30, or the year the game ended). */
export const SNAPSHOT_KEYS = ['B', 'F', 'E', 'W', 'St', 'c', 'DY', 'score'] as const;
export type SnapshotKey = typeof SNAPSHOT_KEYS[number];
export type Snapshot = Record<SnapshotKey, number>;

export type GameId = 'niveles' | 'territorio';

export interface RunResult {
  game: GameId;
  /** 1–3 for the 3-level game; Territorio runs on level 2's world and reports 0 here. */
  level: number;
  strategy: string;
  seed: number;
  won: boolean;
  floorsMet: boolean;
  /** Routes whose own conditions hold (only when the floors hold and the game did not end early). */
  met: string[];
  /** Route the game awards (highest multiplier among `met`), or null. */
  achieved: string | null;
  /** Conservation, production and innovation all met at once (C3). */
  allRoutes: boolean;
  endYear: number;
  /** `gameOverKind` of the reason (political/ecological/famine/bankruptcy), 'sustained' for
   *  Territorio's twelve-month breaches, or null when the run reached the end. */
  loss: string | null;
  final: Snapshot;
}

/** Wilson score interval for a binomial proportion (95 %). */
export function wilson(successes: number, n: number, z = 1.96): [number, number] {
  if (n === 0) return [0, 1];
  const p = successes / n;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const r = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [Math.max(0, (c - r) / d), Math.min(1, (c + r) / d)];
}

/** Nearest-rank quantile without interpolation, exactly as 33 §4 writes it (p50 of an even sample is the upper median). */
export function quantile(values: number[], q: number): number {
  if (values.length === 0) return NaN;
  const v = [...values].sort((a, b) => a - b);
  return v[Math.min(v.length - 1, Math.floor(q * v.length))];
}

export interface Quantiles { p10: number; p50: number; p90: number }

export const quantiles = (values: number[]): Quantiles => ({
  p10: quantile(values, 0.1), p50: quantile(values, 0.5), p90: quantile(values, 0.9),
});

export interface Rate { k: number; n: number; rate: number; ci: [number, number] }

export const rate = (k: number, n: number): Rate => ({ k, n, rate: n > 0 ? k / n : 0, ci: wilson(k, n) });

export interface StrategyStats {
  strategy: string;
  n: number;
  win: Rate;
  /** Share of seeds meeting each route (whether or not it was the one awarded). */
  routeMet: Record<string, Rate>;
  /** How often each route was the one awarded ('none' = lost). */
  achieved: Record<string, number>;
  allRoutes: Rate;
  endYear: Quantiles;
  losses: Record<string, number>;
  final: Record<SnapshotKey, Quantiles>;
}

export function strategyStats(runs: RunResult[], routeIds: string[]): StrategyStats {
  const n = runs.length;
  const routeMet: Record<string, Rate> = {};
  routeIds.forEach((r) => { routeMet[r] = rate(runs.filter((x) => x.met.includes(r)).length, n); });
  const achieved: Record<string, number> = {};
  const losses: Record<string, number> = {};
  runs.forEach((x) => {
    const a = x.achieved ?? 'none';
    achieved[a] = (achieved[a] ?? 0) + 1;
    if (x.loss) losses[x.loss] = (losses[x.loss] ?? 0) + 1;
  });
  const final = {} as Record<SnapshotKey, Quantiles>;
  SNAPSHOT_KEYS.forEach((k) => { final[k] = quantiles(runs.map((x) => x.final[k])); });
  return {
    strategy: runs[0]?.strategy ?? '',
    n,
    win: rate(runs.filter((x) => x.won).length, n),
    routeMet,
    achieved,
    allRoutes: rate(runs.filter((x) => x.allRoutes).length, n),
    endYear: quantiles(runs.map((x) => x.endYear)),
    losses,
    final,
  };
}

/** Indicators whose spread between strategies C6 measures. */
export const RANGE_KEYS = ['B', 'F', 'E', 'W'] as const;
export type RangeKey = typeof RANGE_KEYS[number];

/**
 * Pairs left out of C6 (phase 49). CHANGE OF ACCEPTANCE CRITERION — needs the team's sign-off (docs/v6-spec-vs-motor.md).
 * W on level 1: the level starts at W0 = 95 (conflict 5, saturated near the top of the logistic), so no strategy can
 * move it more than ~5 points; the reference prototype gives the same 4.9 (40 seeds with events). Level 1 neither
 * shows W nor uses it in its floors or routes, so its spread says nothing about whether the strategy decides.
 * Only this pair: every other scope/indicator still has to reach 15.
 */
export const C6_EXCLUDED: { scope: string; key: RangeKey }[] = [{ scope: 'N1', key: 'W' }];

/** `max(median) − min(median)` between the strategies of one level, per indicator. */
export function indicatorRange(stats: StrategyStats[]): Record<RangeKey, { range: number; min: string; max: string }> {
  const out = {} as Record<RangeKey, { range: number; min: string; max: string }>;
  RANGE_KEYS.forEach((k) => {
    const sorted = [...stats].sort((a, b) => a.final[k].p50 - b.final[k].p50);
    const lo = sorted[0];
    const hi = sorted[sorted.length - 1];
    out[k] = { range: hi && lo ? hi.final[k].p50 - lo.final[k].p50 : 0, min: lo?.strategy ?? '', max: hi?.strategy ?? '' };
  });
  return out;
}

/** Share of yearly changes that the prediction mechanic would score as "no change". */
export const flatShare = (directions: string[]): number =>
  directions.length > 0 ? directions.filter((d) => d === 'flat').length / directions.length : 0;

/* ── Criteria ─────────────────────────────────────────────────────────────────────────────── */

export type CriterionStatus = 'PASS' | 'FAIL' | 'SKIP';

export interface Criterion {
  key: string;
  status: CriterionStatus;
  /** One scalar per criterion, so two reports can be compared. */
  value: number;
  /** Which way `value` improves. */
  better: 'lower' | 'higher';
  threshold: string;
  detail: string[];
}

/** Everything the criteria read, already aggregated. `scope` is 'N1' / 'N2' / 'N3' / 'Territorio'. */
export interface CriteriaInput {
  scopes: { scope: string; game: GameId; stats: StrategyStats[]; range: ReturnType<typeof indicatorRange> }[];
  /** Per level: share of "no change" years for B, E and c. */
  predictionBand: { scope: string; B: number; E: number; c: number }[];
  /** Annual-vs-monthly consistency; `applies` is false before model 2.0 (C9 then reports SKIP). */
  consistency: { applies: boolean; maxIndicatorDelta: number; maxCo2Delta: number; detail: string[] };
  targeted: Record<string, string>;
  shortcuts: Record<GameId, readonly string[]>;
  bankruptcyAllowed: Record<GameId, readonly string[]>;
}

/** Thresholds of 00_INDICE_v6.md §6. */
export const THRESHOLDS = {
  targetedMin: 0.7,
  allRoutesMax: 0.5,
  shortcutMax: 0.05,
  undecidedBand: [0.3, 0.7] as [number, number],
  rangeMin: 15,
  flatBand: [0.30, 0.36] as [number, number],
  indicatorDeltaMax: 1,
  co2DeltaMax: 0.1,
};

const pct = (x: number) => `${(x * 100).toFixed(1)} %`;
const crit = (key: string, ok: boolean, value: number, better: Criterion['better'], threshold: string, detail: string[]): Criterion =>
  ({ key, status: ok ? 'PASS' : 'FAIL', value, better, threshold, detail });

export function evaluateCriteria(input: CriteriaInput): Criterion[] {
  const T = THRESHOLDS;
  const find = (stats: StrategyStats[], id: string) => stats.find((s) => s.strategy === id);
  const out: Criterion[] = [];

  // C1 — do_nothing never wins.
  {
    // A strategy missing from the harness fails the criterion instead of passing it silently.
    const rows = input.scopes.map((sc) => ({ sc: sc.scope, s: find(sc.stats, 'do_nothing') }));
    const worst = Math.max(0, ...rows.map((x) => x.s?.win.rate ?? 1));
    out.push(crit('C1_do_nothing_never_wins', worst === 0, worst, 'lower', '= 0 % en cada nivel y en Territorio',
      rows.map((x) => (x.s ? `${x.sc}: ${pct(x.s.win.rate)}` : `${x.sc}: falta do_nothing ✗`))));
  }

  // C2 — each targeted strategy meets its own route in ≥ 70 % of the seeds.
  {
    const rows: { label: string; r: number }[] = [];
    input.scopes.forEach((sc) => {
      Object.entries(input.targeted).forEach(([route, strat]) => {
        const s = find(sc.stats, strat);
        rows.push({ label: `${sc.scope} ${strat}→${route}${s ? '' : ' (falta)'}`, r: s?.routeMet[route]?.rate ?? 0 });
      });
    });
    const worst = rows.length ? Math.min(...rows.map((x) => x.r)) : 0;
    out.push(crit('C2_targeted_wins', worst >= T.targetedMin, worst, 'higher', `≥ ${pct(T.targetedMin)}`,
      rows.map((x) => `${x.label}: ${pct(x.r)}${x.r >= T.targetedMin ? '' : ' ✗'}`)));
  }

  // C3 — no strategy meets every route at once in more than half of the seeds.
  {
    const rows = input.scopes.flatMap((sc) => sc.stats.map((s) => ({ label: `${sc.scope} ${s.strategy}`, r: s.allRoutes.rate })));
    const worst = Math.max(0, ...rows.map((x) => x.r));
    out.push(crit('C3_no_strategy_wins_all', worst <= T.allRoutesMax, worst, 'lower', `≤ ${pct(T.allRoutesMax)} por estrategia`,
      rows.filter((x) => x.r > 0).map((x) => `${x.label}: ${pct(x.r)}${x.r > T.allRoutesMax ? ' ✗' : ''}`)));
  }

  // C4 — shortcuts closed.
  {
    const rows = input.scopes.flatMap((sc) => input.shortcuts[sc.game].map((id) => {
      const s = find(sc.stats, id);
      return { label: `${sc.scope} ${id}${s ? '' : ' (falta)'}`, r: s ? s.win.rate : 1 };
    }));
    const worst = Math.max(0, ...rows.map((x) => x.r));
    out.push(crit('C4_shortcuts_closed', worst <= T.shortcutMax, worst, 'lower', `≤ ${pct(T.shortcutMax)}`,
      rows.map((x) => `${x.label}: ${pct(x.r)}${x.r > T.shortcutMax ? ' ✗' : ''}`)));
  }

  // C5 — the strategy decides, not the seed: no win rate strictly inside (30 %, 70 %).
  {
    const [lo, hi] = T.undecidedBand;
    const inBand = input.scopes.flatMap((sc) => sc.stats
      .filter((s) => s.win.rate > lo && s.win.rate < hi)
      .map((s) => `${sc.scope} ${s.strategy}: ${pct(s.win.rate)} ✗`));
    out.push(crit('C5_strategy_decides', inBand.length === 0, inBand.length, 'lower',
      `ninguna tasa de victoria en (${pct(lo)}, ${pct(hi)}); valor = casos dentro`, inBand));
  }

  // C6 — spread between extreme strategies at year 30.
  {
    const rows = input.scopes.flatMap((sc) => RANGE_KEYS.map((k) => ({
      label: `${sc.scope} ${k}`, r: sc.range[k].range, lo: sc.range[k].min, hi: sc.range[k].max,
      excluded: C6_EXCLUDED.some((e) => e.scope === sc.scope && e.key === k),
    })));
    const counted = rows.filter((x) => !x.excluded);
    const worst = counted.length ? Math.min(...counted.map((x) => x.r)) : 0;
    out.push(crit('C6_indicator_range', worst >= T.rangeMin, worst, 'higher',
      `≥ ${T.rangeMin} puntos en B, F, E, W${C6_EXCLUDED.length ? ` (excepto ${C6_EXCLUDED.map((e) => `${e.key} en ${e.scope}`).join(', ')}, ver C6_EXCLUDED)` : ''}`,
      rows.map((x) => `${x.label}: ${x.r.toFixed(1)} (${x.lo} → ${x.hi})${x.excluded ? ' (excluido de C6)' : x.r >= T.rangeMin ? '' : ' ✗'}`)));
  }

  // C7 — prediction band: "no change" between 30 and 36 % for B, E and c.
  {
    const [lo, hi] = T.flatBand;
    const rows = input.predictionBand.flatMap((b) => (['B', 'E', 'c'] as const).map((k) => ({ label: `${b.scope} ${k}`, r: b[k] })));
    const worstDev = rows.length ? Math.max(...rows.map((x) => Math.abs(x.r - 0.33))) : 1;
    const ok = rows.length > 0 && rows.every((x) => x.r >= lo && x.r <= hi);
    out.push(crit('C7_prediction_band', ok, worstDev, 'lower', `"sin cambio" entre ${pct(lo)} y ${pct(hi)}; valor = máx |x − 33 %|`,
      rows.map((x) => `${x.label}: ${pct(x.r)}${x.r >= lo && x.r <= hi ? '' : ' ✗'}`)));
  }

  // C8 — no spurious collapse: no bankruptcy outside the allowed strategy.
  {
    const rows = input.scopes.flatMap((sc) => sc.stats
      .filter((s) => (s.losses.bankruptcy ?? 0) > 0)
      .map((s) => ({ label: `${sc.scope} ${s.strategy}`, k: s.losses.bankruptcy ?? 0, n: s.n, allowed: input.bankruptcyAllowed[sc.game].includes(s.strategy) })));
    const bad = rows.filter((x) => !x.allowed).reduce((sum, x) => sum + x.k, 0);
    out.push(crit('C8_no_spurious_collapse', bad === 0, bad, 'lower', 'ninguna quiebra salvo buy_everything (Territorio); valor = quiebras no permitidas',
      rows.map((x) => `${x.label}: ${x.k}/${x.n}${x.allowed ? ' (permitida)' : ' ✗'}`)));
  }

  // C9 — annual vs monthly consistency (model 2.x only).
  {
    const c = input.consistency;
    const ok = c.maxIndicatorDelta <= T.indicatorDeltaMax && c.maxCo2Delta <= T.co2DeltaMax;
    const value = Math.max(c.maxIndicatorDelta / T.indicatorDeltaMax, c.maxCo2Delta / T.co2DeltaMax);
    out.push({
      key: 'C9_annual_monthly',
      status: c.applies ? (ok ? 'PASS' : 'FAIL') : 'SKIP',
      value,
      better: 'lower',
      threshold: `|Δ| ≤ ${T.indicatorDeltaMax} en indicadores y ≤ ${T.co2DeltaMax} t en c (N2, sin eventos, años 10 y 30); valor = máx(|Δ|/umbral); solo modelo 2.x`,
      detail: c.detail,
    });
  }
  return out;
}

/* ── Comparison with a previous report ────────────────────────────────────────────────────── */

export interface CriterionChange {
  key: string;
  before: CriterionStatus | null;
  after: CriterionStatus;
  valueBefore: number | null;
  valueAfter: number;
  change: 'improved' | 'worsened' | 'same' | 'new';
  /** PASS → FAIL. */
  regressed: boolean;
}

export function compareCriteria(prev: Criterion[] | null, cur: Criterion[]): CriterionChange[] {
  return cur.map((c) => {
    const p = prev?.find((x) => x.key === c.key) ?? null;
    if (!p) return { key: c.key, before: null, after: c.status, valueBefore: null, valueAfter: c.value, change: 'new', regressed: false };
    const delta = c.value - p.value;
    const eps = 1e-9;
    const change = Math.abs(delta) < eps ? 'same' : (delta < 0) === (c.better === 'lower') ? 'improved' : 'worsened';
    return {
      key: c.key, before: p.status, after: c.status, valueBefore: p.value, valueAfter: c.value, change,
      regressed: p.status === 'PASS' && c.status === 'FAIL',
    };
  });
}

/**
 * Exit code of sim:check: `--report-only` never fails; `--quick` fails only on a regression
 * (a criterion that passed in the previous report and fails now); the full run fails on any FAIL
 * or regression.
 */
export function exitCode(criteria: Criterion[], changes: CriterionChange[], mode: { quick: boolean; reportOnly: boolean }): 0 | 1 {
  if (mode.reportOnly) return 0;
  if (changes.some((c) => c.regressed)) return 1;
  if (!mode.quick && criteria.some((c) => c.status === 'FAIL')) return 1;
  return 0;
}
