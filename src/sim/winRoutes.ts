/**
 * Multiple win routes (mejora-general/files/17_multiples_vias_victoria.md).
 *
 * Replaces the old model (a single conjunctive AND of every winCondition) with:
 *   won = floorsMet AND (routeA met OR routeB met OR ... )
 * Each route is a distinct "model of country" (conservation / production / innovation), plus an
 * `equilibrium` route on level 3 that preserves the old fully-conjunctive condition set exactly
 * (see `EQUILIBRIUM_MIN_CONDITIONS`), so whoever played "correctly" under the old design still
 * wins, and now knows they picked the hardest route.
 *
 * Deviations from the source file, logged in docs/DESIGN_DECISIONS_LOG.md:
 *  - `s.stella` in the spec's pseudocode is `state.stellaSpecificState` in this codebase's real
 *    GameState (src/types.ts) -- adapted throughout.
 *  - The level-1 innovation route's `carbonBalance >= 0` condition referenced a
 *    `Stella.Balance_Carbono_Anual` field that does not exist anywhere in this codebase's actual
 *    StellaStocks (checked: it is not computed by src/sim/economy.ts or carbon.ts). Dropped
 *    rather than inventing a stock the simulation never populates; the route's low CO2 threshold
 *    already captures the "near carbon-neutral" spirit.
 *  - "esfuerzo en instrumentos tecnológicos >= 60%" (level 2 innovation) is implemented for real
 *    against the two carbon-neutrality instruments that actually move the CO2 formula
 *    (`C_Fomento_Energias_Renovables_No_Convencionales`, `C_Investigacion_Desarrollo_Captura_Carbono`
 *    -- see src/sim/carbon.ts), not left as a comment.
 *  - "≥2 pactos activos" (level 3 innovation) reads `Object.values(state.pacts)` directly.
 *  - Numeric thresholds for level 2 and level 3 routes were only sketched as comments in the
 *    source file, not given as code. Filled in following the same shape as the level-1 example
 *    (which *was* given as full code) and anchored on this codebase's real, already-tuned level
 *    winConditions (constants.ts) so the `equilibrium` route matches production exactly. These
 *    are a starting point, calibrated with `npm run sim:calibrate` (this phase's harness) rather
 *    than left unchecked -- see reports/routes-calibration.md.
 */
import type { GameState, LandUseType } from '../types';
import { LandUseType as LU } from '../types';

export type RouteId = 'conservation' | 'production' | 'innovation' | 'equilibrium';

export interface RouteCondition {
  /** i18n key for the label shown in the routes panel. */
  labelKey: string;
  read: (s: GameState) => number;
  target: number;
  dir: 'min' | 'max';
  /** Weight inside the route's progress bar. Defaults to 1. */
  weight?: number;
  /**
   * Fixed value at level start, for conditions that read the 2.0 sub-state (`model`) or the land rather than
   * `indicators`: the routes' baseline only swaps the indicators, so reading it would give the current value and the
   * progress would stay at 0 until met (phase 49, renewables / productive years).
   */
  start?: number;
}

export interface WinRoute {
  id: RouteId;
  nameKey: string;
  taglineKey: string;
  descriptionKey: string;
  /** Accent token used in the UI (once phase 10 wires it in): chlorophyll | ochre | hydro | bone */
  accent: 'chlorophyll' | 'ochre' | 'hydro' | 'bone';
  conditions: RouteCondition[];
  /** Multiplier applied to the final level score. Harder routes pay more. */
  scoreMultiplier: number;
  /**
   * How many of `conditions` must be met for the route itself to count as met. Defaults to
   * `conditions.length` (every condition, the normal case for conservation/production/innovation).
   * The level-3 `equilibrium` route sets this to 7 of its 9 conditions (phase 49).
   */
  minConditionsMet?: number;
}

export interface ConditionProgress {
  condition: RouteCondition;
  value: number;
  progress: number;
  met: boolean;
}

export interface RouteProgress {
  route: WinRoute;
  /** 0..1 — weighted mean of per-condition progress, each capped at 1. */
  progress: number;
  met: boolean;
  conditions: ConditionProgress[];
  /** The condition furthest from being met. Drives the "what's blocking you" hint. */
  bottleneck: RouteCondition | null;
}

export interface LevelOutcome {
  won: boolean;
  floorsMet: boolean;
  failedFloors: RouteCondition[];
  routes: RouteProgress[];
  /** Route actually achieved (highest multiplier among those met), or null. */
  achieved: WinRoute | null;
  /** Closest route when losing (or before winning) — used by the debriefing. */
  closest: RouteProgress;
}

function isConditionMet(c: RouteCondition, value: number): boolean {
  return c.dir === 'min' ? value >= c.target : value <= c.target;
}

/**
 * Per-condition progress in [0,1]. Uses the level's starting value (`baseline`) as the 0%
 * reference, so progress reflects how far the player moved, not how far from zero the value
 * sits (a level that starts at biodiversity 40 targeting 55 shouldn't show 40% progress on year
 * zero just because 40/100 = 40%).
 */
function conditionProgress(c: RouteCondition, s: GameState, baseline: GameState): number {
  const value = c.read(s);
  const start = c.start ?? c.read(baseline);
  if (c.dir === 'min') {
    if (value >= c.target) return 1;
    const span = c.target - start;
    return span <= 0 ? (value >= c.target ? 1 : 0) : clamp01((value - start) / span);
  }
  if (value <= c.target) return 1;
  const span = start - c.target;
  return span <= 0 ? (value <= c.target ? 1 : 0) : clamp01((start - value) / span);
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Exported for direct unit testing against synthetic routes, independent of LEVEL_ROUTES' own
 *  calibrated thresholds (tests/sim/winRoutes.spec.ts). */
export function evaluateRoute(route: WinRoute, s: GameState, baseline: GameState): RouteProgress {
  const conditions: ConditionProgress[] = route.conditions.map((condition) => {
    const value = condition.read(s);
    return { condition, value, progress: conditionProgress(condition, s, baseline), met: isConditionMet(condition, value) };
  });

  const metCount = conditions.filter((c) => c.met).length;
  const threshold = route.minConditionsMet ?? route.conditions.length;
  const met = metCount >= threshold;

  const totalWeight = conditions.reduce((sum, c) => sum + (c.condition.weight ?? 1), 0) || 1;
  const progress = conditions.reduce((sum, c) => sum + c.progress * (c.condition.weight ?? 1), 0) / totalWeight;

  const bottleneck = conditions.filter((c) => !c.met).sort((a, b) => a.progress - b.progress)[0]?.condition ?? null;

  return { route, progress, met, conditions, bottleneck };
}

export function evaluateLevel(s: GameState, baseline: GameState): LevelOutcome {
  const cfg = LEVEL_ROUTES[s.currentLevel];
  const failedFloors = cfg.floors.filter((f) => !isConditionMet(f, f.read(s)));
  const routes = cfg.routes.map((r) => evaluateRoute(r, s, baseline));
  const floorsMet = failedFloors.length === 0;
  const metRoutes = routes.filter((r) => r.met);
  const achieved = floorsMet && metRoutes.length > 0
    ? metRoutes.reduce((a, b) => (b.route.scoreMultiplier > a.route.scoreMultiplier ? b : a)).route
    : null;

  return {
    won: achieved !== null,
    floorsMet,
    failedFloors,
    routes,
    achieved,
    closest: routes.reduce((a, b) => (b.progress > a.progress ? b : a)),
  };
}

/* ── Shared read helpers ─────────────────────────────────────────────────────────────────────── */

const nativeForestPct = (s: GameState): number => {
  const total = (Object.values(s.landUses) as { area: number }[]).reduce((sum, lu) => sum + lu.area, 0);
  if (total <= 0) return 0;
  const forest = s.landUses[LU.ProtectedNativeForest].area + s.landUses[LU.UnprotectedNativeForest].area;
  return (forest / total) * 100;
};

/** D/Y; Infinity without GDP (a route bounded above fails). Shared with Territorio's routes (phase 44). */
export const debtToPbiRatio = (s: Pick<GameState, 'stellaSpecificState'>): number =>
  s.stellaSpecificState.PBI_Real > 0 ? s.stellaSpecificState.Deuda / s.stellaSpecificState.PBI_Real : Infinity;

const activePactsCount = (s: GameState): number => (Object.values(s.pacts) as { isActive: boolean }[]).filter((p) => p.isActive).length;

/** Renewable share of electricity, % (phase 49: a result of the model, `model.energy.renewableShare`; the 1.1
 *  "effort on technological instruments ≥ 30" was met by the even split). 0 without a 2.0 sub-state. */
export const renewablesPct = (s: Pick<GameState, 'model'>): number => 100 * (s.model?.energy.renewableShare ?? 0);

/** GDP over the level's starting GDP (Y/Y₀, phase 49). Reads `indicators.pbi`, so the routes' baseline (the level-start
 *  indicators) gives 1 and progress counts from there. */
export const gdpGrowth = (s: Pick<GameState, 'indicators' | 'model'>): number => {
  const y0 = s.model?.anchors.gdp0 ?? 0;
  return y0 > 0 ? s.indicators.pbi / y0 : 1;
};

const B = (s: GameState) => s.indicators.biodiversity;
const F = (s: GameState) => s.indicators.foodSecurity;
const E = (s: GameState) => s.indicators.economicSecurity;
const W = (s: GameState) => s.indicators.socialWellbeing;
const St = (s: GameState) => s.indicators.politicalStability;
const c = (s: GameState) => s.indicators.co2EqEmissionsPerCapita;

/* ── Level configuration ─────────────────────────────────────────────────────────────────────── */

/**
 * Phase 49 (mejora-general/files/49_recalibracion_rutas_puntaje.md §2; ROUTES3 of scripts/reference/modelo_v2.py),
 * replacing every provisional threshold of phases 38/39/41/44. Calibrated with `npm run sim:check` (40 seeds per
 * strategy and level): see reports/balance-2.0-dev.md and docs/DESIGN_DECISIONS_LOG.md (phase 49) for any move away
 * from the prototype. The teaching sheet's table is generated from here (`npx tsx scripts/routes-table-html.ts`):
 * never copy these numbers by hand.
 *
 * Conditions read results, not effort: the 1.1 `cond.techEffort` (met by the even split of a lone CN, the `tech_tax`
 * shortcut) gave way to `cond.renewables` (the modelled renewable share) and, on level 1, which has no instrument
 * panel, to a floor of economic security that a carbon tax alone does not reach (E ≥ 30).
 */
export const LEVEL_ROUTES: Record<number, { floors: RouteCondition[]; routes: WinRoute[] }> = {
  // ─────────────────────────── LEVEL 1 ───────────────────────────
  1: {
    floors: [
      { labelKey: 'routes.floor.biodiversity', read: B, target: 25, dir: 'min' },
      { labelKey: 'routes.floor.economicSecurity', read: E, target: 15, dir: 'min' },
      { labelKey: 'routes.floor.debtRatio', read: debtToPbiRatio, target: 0.8, dir: 'max' },
    ],
    routes: [
      {
        id: 'conservation', nameKey: 'routes.conservation.name', taglineKey: 'routes.conservation.tagline',
        descriptionKey: 'routes.conservation.desc', accent: 'chlorophyll', scoreMultiplier: 1.0,
        conditions: [
          { labelKey: 'cond.biodiversity', read: B, target: 50, dir: 'min' },
          { labelKey: 'cond.nativeForest', read: nativeForestPct, target: 20, dir: 'min' },
          { labelKey: 'cond.emissions', read: c, target: 5.2, dir: 'max' },
        ],
      },
      {
        id: 'production', nameKey: 'routes.production.name', taglineKey: 'routes.production.tagline',
        descriptionKey: 'routes.production.desc', accent: 'ochre', scoreMultiplier: 1.0,
        conditions: [
          { labelKey: 'cond.economicSecurity', read: E, target: 36, dir: 'min' },
          { labelKey: 'cond.foodSecurity', read: F, target: 32, dir: 'min' },
          { labelKey: 'cond.emissions', read: c, target: 6.5, dir: 'max' },
        ],
      },
      {
        id: 'innovation', nameKey: 'routes.innovation.name', taglineKey: 'routes.innovation.tagline',
        descriptionKey: 'routes.innovation.desc', accent: 'hydro', scoreMultiplier: 1.1,
        conditions: [
          { labelKey: 'cond.emissions', read: c, target: 4.6, dir: 'max' },
          { labelKey: 'cond.economicSecurity', read: E, target: 30, dir: 'min' },
        ],
      },
    ],
  },
  // ─────────────────────────── LEVEL 2 ───────────────────────────
  2: {
    floors: [
      { labelKey: 'routes.floor.biodiversity', read: B, target: 25, dir: 'min' },
      { labelKey: 'routes.floor.foodSecurity', read: F, target: 25, dir: 'min' },
      { labelKey: 'routes.floor.politicalStability', read: St, target: 35, dir: 'min' },
      { labelKey: 'routes.floor.pressureAgri', read: (s) => s.indicators.ppAgricola, target: 85, dir: 'max' },
      { labelKey: 'routes.floor.pressureEnv', read: (s) => s.indicators.ppAmbientalista, target: 85, dir: 'max' },
      { labelKey: 'routes.floor.pressureSocial', read: (s) => s.indicators.ppSocial, target: 85, dir: 'max' },
    ],
    routes: [
      {
        id: 'conservation', nameKey: 'routes.conservation.name', taglineKey: 'routes.conservation.tagline',
        descriptionKey: 'routes.conservation.desc', accent: 'chlorophyll', scoreMultiplier: 1.0,
        conditions: [
          { labelKey: 'cond.biodiversity', read: B, target: 52, dir: 'min' },
          { labelKey: 'cond.nativeForest', read: nativeForestPct, target: 16, dir: 'min' },
          { labelKey: 'cond.emissions', read: c, target: 6.5, dir: 'max' },
        ],
      },
      {
        id: 'production', nameKey: 'routes.production.name', taglineKey: 'routes.production.tagline',
        descriptionKey: 'routes.production.desc', accent: 'ochre', scoreMultiplier: 1.0,
        conditions: [
          { labelKey: 'cond.economicSecurity', read: E, target: 40, dir: 'min' },
          { labelKey: 'cond.foodSecurity', read: F, target: 32, dir: 'min' },
          { labelKey: 'cond.socialWellbeing', read: W, target: 60, dir: 'min' },
        ],
      },
      {
        id: 'innovation', nameKey: 'routes.innovation.name', taglineKey: 'routes.innovation.tagline',
        descriptionKey: 'routes.innovation.desc', accent: 'hydro', scoreMultiplier: 1.1,
        conditions: [
          { labelKey: 'cond.emissions', read: c, target: 5.5, dir: 'max' },
          { labelKey: 'cond.renewables', read: renewablesPct, target: 30, dir: 'min', start: 0 },
          { labelKey: 'cond.economicSecurity', read: E, target: 33, dir: 'min' },
        ],
      },
    ],
  },
  // ─────────────────────────── LEVEL 3 ───────────────────────────
  3: {
    floors: [
      { labelKey: 'routes.floor.politicalStability', read: St, target: 30, dir: 'min' },
      { labelKey: 'routes.floor.debtRatio', read: debtToPbiRatio, target: 1.0, dir: 'max' },
      { labelKey: 'routes.floor.socialWellbeing', read: W, target: 35, dir: 'min' },
    ],
    routes: [
      {
        id: 'conservation', nameKey: 'routes.conservation.name', taglineKey: 'routes.conservation.tagline',
        descriptionKey: 'routes.conservation.desc', accent: 'chlorophyll', scoreMultiplier: 1.0,
        conditions: [
          { labelKey: 'cond.biodiversity', read: B, target: 52, dir: 'min' },
          { labelKey: 'cond.nativeForest', read: nativeForestPct, target: 17, dir: 'min' },
          { labelKey: 'cond.emissions', read: c, target: 5.4, dir: 'max' },
          { labelKey: 'cond.debtRatio', read: debtToPbiRatio, target: 0.6, dir: 'max' },
        ],
      },
      {
        id: 'production', nameKey: 'routes.production.name', taglineKey: 'routes.production.tagline',
        descriptionKey: 'routes.production.desc', accent: 'ochre', scoreMultiplier: 1.0,
        conditions: [
          { labelKey: 'cond.economicSecurity', read: E, target: 36, dir: 'min' },
          // 33 → 31 in v6/49b: κ1 = 3.0 lowers the export-led portfolio's F (N3 `production` 82.5 % → 72.5 % at 33);
          // 31 restores 82.5 % without opening the route to `extractive` (fails W) or `balanced` (F ≈ 27).
          { labelKey: 'cond.foodSecurity', read: F, target: 31, dir: 'min' },
          { labelKey: 'cond.socialWellbeing', read: W, target: 52, dir: 'min' },
        ],
      },
      {
        id: 'innovation', nameKey: 'routes.innovation.name', taglineKey: 'routes.innovation.tagline',
        descriptionKey: 'routes.innovation.desc', accent: 'hydro', scoreMultiplier: 1.1,
        conditions: [
          { labelKey: 'cond.emissions', read: c, target: 4.5, dir: 'max' },
          { labelKey: 'cond.renewables', read: renewablesPct, target: 35, dir: 'min', start: 0 },
          { labelKey: 'cond.economicSecurity', read: E, target: 30, dir: 'min' },
          { labelKey: 'cond.pactsActive', read: activePactsCount, target: 1, dir: 'min' },
        ],
      },
      {
        // The hardest route (highest multiplier): a high, even performance in 7 of these 9 thresholds at once.
        id: 'equilibrium', nameKey: 'routes.equilibrium.name', taglineKey: 'routes.equilibrium.tagline',
        descriptionKey: 'routes.equilibrium.desc', accent: 'bone', scoreMultiplier: 1.35,
        minConditionsMet: 7,
        conditions: [
          { labelKey: 'cond.biodiversity', read: B, target: 50, dir: 'min' },
          { labelKey: 'cond.foodSecurity', read: F, target: 40, dir: 'min' },
          { labelKey: 'cond.economicSecurity', read: E, target: 38, dir: 'min' },
          { labelKey: 'cond.socialWellbeing', read: W, target: 65, dir: 'min' },
          { labelKey: 'cond.politicalStability', read: St, target: 75, dir: 'min' },
          { labelKey: 'cond.emissions', read: c, target: 4.5, dir: 'max' },
          { labelKey: 'cond.debtRatio', read: debtToPbiRatio, target: 0.5, dir: 'max' },
          { labelKey: 'cond.gdpGrowth', read: gdpGrowth, target: 1.7, dir: 'min' },
          { labelKey: 'cond.score', read: (s) => s.indicators.generalScore, target: 720, dir: 'min' },
        ],
      },
    ],
  },
};
