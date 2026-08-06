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
import { LandUseType as LU, Policy } from '../types';

export type RouteId = 'conservation' | 'production' | 'innovation' | 'equilibrium';

export interface RouteCondition {
  /** i18n key for the label shown in the routes panel. */
  labelKey: string;
  read: (s: GameState) => number;
  target: number;
  dir: 'min' | 'max';
  /** Weight inside the route's progress bar. Defaults to 1. */
  weight?: number;
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
   * The level-3 `equilibrium` route sets this to 6 of its 10 conditions, preserving the exact
   * "6 de 10 objetivos" logic the game already had before this phase.
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
  const start = c.read(baseline);
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

const debtToPbiRatio = (s: GameState): number =>
  s.stellaSpecificState.PBI_Real > 0 ? s.stellaSpecificState.Deuda / s.stellaSpecificState.PBI_Real : Infinity;

const activePactsCount = (s: GameState): number => Object.values(s.pacts).filter((p) => p.isActive).length;

/** Average effort assigned to the two Carbon Neutrality instruments that actually move the CO2
 *  formula (see src/sim/carbon.ts) — the real-data stand-in for "tech instrument effort". */
const carbonTechEffort = (s: GameState): number => {
  const instruments = s.policies[Policy.CarbonNeutrality]?.instruments;
  if (!instruments) return 0;
  const ren = instruments['C_Fomento_Energias_Renovables_No_Convencionales']?.effortPercentage ?? 0;
  const ccs = instruments['C_Investigacion_Desarrollo_Captura_Carbono']?.effortPercentage ?? 0;
  return (ren + ccs) / 2;
};

/* ── Level configuration ─────────────────────────────────────────────────────────────────────── */

export const LEVEL_ROUTES: Record<number, { floors: RouteCondition[]; routes: WinRoute[] }> = {
  // ─────────────────────────── LEVEL 1 ───────────────────────────
  // Thresholds calibrated against scripts/simulate.ts (7 strategies, seed 1) rather than picked
  // blind — see reports/routes-calibration.md and docs/DESIGN_DECISIONS_LOG.md. Real finding from
  // that run: economicSecurity barely responds to any tested policy mix within a single level
  // (stays ~25 regardless of strategy) -- see docs/audit-equations.md item P-1. Thresholds below
  // reflect that reality rather than an aspirational number nothing can reach.
  1: {
    floors: [
      { labelKey: 'routes.floor.biodiversity', read: (s) => s.indicators.biodiversity, target: 20, dir: 'min' },
      { labelKey: 'routes.floor.economicSecurity', read: (s) => s.indicators.economicSecurity, target: 15, dir: 'min' },
      { labelKey: 'routes.floor.treasury', read: (s) => s.stellaSpecificState.Reservas_del_Tesoro, target: -200, dir: 'min' },
    ],
    routes: [
      {
        id: 'conservation', nameKey: 'routes.conservation.name', taglineKey: 'routes.conservation.tagline',
        descriptionKey: 'routes.conservation.desc', accent: 'chlorophyll', scoreMultiplier: 1.0,
        conditions: [
          { labelKey: 'cond.biodiversity', read: (s) => s.indicators.biodiversity, target: 42, dir: 'min' },
          { labelKey: 'cond.nativeForest', read: nativeForestPct, target: 15, dir: 'min' },
          { labelKey: 'cond.emissions', read: (s) => s.indicators.co2EqEmissionsPerCapita, target: 4.5, dir: 'max' },
          { labelKey: 'cond.score', read: (s) => s.indicators.generalScore, target: 480, dir: 'min' },
        ],
      },
      {
        id: 'production', nameKey: 'routes.production.name', taglineKey: 'routes.production.tagline',
        descriptionKey: 'routes.production.desc', accent: 'ochre', scoreMultiplier: 1.0,
        conditions: [
          { labelKey: 'cond.economicSecurity', read: (s) => s.indicators.economicSecurity, target: 25, dir: 'min' },
          { labelKey: 'cond.foodSecurity', read: (s) => s.indicators.foodSecurity, target: 40, dir: 'min' },
          { labelKey: 'cond.emissions', read: (s) => s.indicators.co2EqEmissionsPerCapita, target: 7, dir: 'max' },
          { labelKey: 'cond.score', read: (s) => s.indicators.generalScore, target: 400, dir: 'min' },
        ],
      },
      {
        id: 'innovation', nameKey: 'routes.innovation.name', taglineKey: 'routes.innovation.tagline',
        descriptionKey: 'routes.innovation.desc', accent: 'hydro', scoreMultiplier: 1.1,
        conditions: [
          { labelKey: 'cond.emissions', read: (s) => s.indicators.co2EqEmissionsPerCapita, target: 6, dir: 'max' },
          { labelKey: 'cond.biodiversity', read: (s) => s.indicators.biodiversity, target: 38, dir: 'min' },
          { labelKey: 'cond.score', read: (s) => s.indicators.generalScore, target: 390, dir: 'min' },
        ],
      },
    ],
  },
  // ─────────────────────────── LEVEL 2 ───────────────────────────
  2: {
    floors: [
      { labelKey: 'routes.floor.biodiversity', read: (s) => s.indicators.biodiversity, target: 25, dir: 'min' },
      { labelKey: 'routes.floor.foodSecurity', read: (s) => s.indicators.foodSecurity, target: 15, dir: 'min' },
      { labelKey: 'routes.floor.politicalStability', read: (s) => s.indicators.politicalStability, target: 20, dir: 'min' },
      { labelKey: 'routes.floor.pressureAgri', read: (s) => s.indicators.ppAgricola, target: 85, dir: 'max' },
      { labelKey: 'routes.floor.pressureEnv', read: (s) => s.indicators.ppAmbientalista, target: 85, dir: 'max' },
      { labelKey: 'routes.floor.pressureSocial', read: (s) => s.indicators.ppSocial, target: 85, dir: 'max' },
    ],
    routes: [
      {
        id: 'conservation', nameKey: 'routes.conservation.name', taglineKey: 'routes.conservation.tagline',
        descriptionKey: 'routes.conservation.desc', accent: 'chlorophyll', scoreMultiplier: 1.0,
        conditions: [
          { labelKey: 'cond.biodiversity', read: (s) => s.indicators.biodiversity, target: 41, dir: 'min' },
          { labelKey: 'cond.nativeForest', read: nativeForestPct, target: 15, dir: 'min' },
          { labelKey: 'cond.emissions', read: (s) => s.indicators.co2EqEmissionsPerCapita, target: 9, dir: 'max' },
          { labelKey: 'cond.score', read: (s) => s.indicators.generalScore, target: 350, dir: 'min' },
        ],
      },
      {
        id: 'production', nameKey: 'routes.production.name', taglineKey: 'routes.production.tagline',
        descriptionKey: 'routes.production.desc', accent: 'ochre', scoreMultiplier: 1.0,
        conditions: [
          { labelKey: 'cond.economicSecurity', read: (s) => s.indicators.economicSecurity, target: 32, dir: 'min' },
          { labelKey: 'cond.foodSecurity', read: (s) => s.indicators.foodSecurity, target: 30, dir: 'min' },
          { labelKey: 'cond.emissions', read: (s) => s.indicators.co2EqEmissionsPerCapita, target: 10, dir: 'max' },
          { labelKey: 'cond.score', read: (s) => s.indicators.generalScore, target: 300, dir: 'min' },
        ],
      },
      {
        id: 'innovation', nameKey: 'routes.innovation.name', taglineKey: 'routes.innovation.tagline',
        descriptionKey: 'routes.innovation.desc', accent: 'hydro', scoreMultiplier: 1.1,
        conditions: [
          { labelKey: 'cond.emissions', read: (s) => s.indicators.co2EqEmissionsPerCapita, target: 9.5, dir: 'max' },
          { labelKey: 'cond.techEffort', read: carbonTechEffort, target: 30, dir: 'min' },
          { labelKey: 'cond.economicSecurity', read: (s) => s.indicators.economicSecurity, target: 28, dir: 'min' },
          { labelKey: 'cond.score', read: (s) => s.indicators.generalScore, target: 300, dir: 'min' },
        ],
      },
    ],
  },
  // ─────────────────────────── LEVEL 3 ───────────────────────────
  3: {
    floors: [
      { labelKey: 'routes.floor.politicalCollapse', read: (s) => s.stellaSpecificState.Colapso_politico, target: 95, dir: 'max' },
      { labelKey: 'routes.floor.debtRatio', read: debtToPbiRatio, target: 1.3, dir: 'max' },
      { labelKey: 'routes.floor.politicalStability', read: (s) => s.indicators.politicalStability, target: 15, dir: 'min' },
    ],
    routes: [
      {
        id: 'conservation', nameKey: 'routes.conservation.name', taglineKey: 'routes.conservation.tagline',
        descriptionKey: 'routes.conservation.desc', accent: 'chlorophyll', scoreMultiplier: 1.0,
        conditions: [
          { labelKey: 'cond.emissions', read: (s) => s.indicators.co2EqEmissionsPerCapita, target: 5.5, dir: 'max' },
          { labelKey: 'cond.biodiversity', read: (s) => s.indicators.biodiversity, target: 42, dir: 'min' },
          { labelKey: 'cond.nativeForest', read: nativeForestPct, target: 15, dir: 'min' },
          { labelKey: 'cond.debtRatio', read: debtToPbiRatio, target: 1.1, dir: 'max' },
        ],
      },
      {
        id: 'production', nameKey: 'routes.production.name', taglineKey: 'routes.production.tagline',
        descriptionKey: 'routes.production.desc', accent: 'ochre', scoreMultiplier: 1.0,
        conditions: [
          { labelKey: 'cond.economicSecurity', read: (s) => s.indicators.economicSecurity, target: 30, dir: 'min' },
          { labelKey: 'cond.foodSecurity', read: (s) => s.indicators.foodSecurity, target: 30, dir: 'min' },
          { labelKey: 'cond.emissions', read: (s) => s.indicators.co2EqEmissionsPerCapita, target: 9, dir: 'max' },
          { labelKey: 'cond.debtRatio', read: debtToPbiRatio, target: 1.1, dir: 'max' },
        ],
      },
      {
        id: 'innovation', nameKey: 'routes.innovation.name', taglineKey: 'routes.innovation.tagline',
        descriptionKey: 'routes.innovation.desc', accent: 'hydro', scoreMultiplier: 1.1,
        conditions: [
          { labelKey: 'cond.emissions', read: (s) => s.indicators.co2EqEmissionsPerCapita, target: 6, dir: 'max' },
          // Untested by scripts/simulate.ts (none of its strategies join pacts) -- kept at a
          // realistic-but-unverified target of 1. See docs/DESIGN_DECISIONS_LOG.md.
          { labelKey: 'cond.pactsActive', read: activePactsCount, target: 1, dir: 'min' },
          { labelKey: 'cond.debtRatio', read: debtToPbiRatio, target: 1.2, dir: 'max' },
        ],
      },
      {
        // Preserves the exact pre-phase-5 win condition: 6 of these 10 thresholds
        // (LEVEL_CONFIGS[2].winConditions in constants.ts), unchanged. Whoever "played correctly"
        // under the old design still wins by this route — and now knows they picked the hardest
        // one (highest scoreMultiplier of the four).
        id: 'equilibrium', nameKey: 'routes.equilibrium.name', taglineKey: 'routes.equilibrium.tagline',
        descriptionKey: 'routes.equilibrium.desc', accent: 'bone', scoreMultiplier: 1.35,
        minConditionsMet: 6,
        conditions: [
          { labelKey: 'cond.score', read: (s) => s.indicators.generalScore, target: 700, dir: 'min' },
          { labelKey: 'cond.emissions', read: (s) => s.indicators.co2EqEmissionsPerCapita, target: 2, dir: 'max' },
          { labelKey: 'cond.biodiversity', read: (s) => s.indicators.biodiversity, target: 55, dir: 'min' },
          { labelKey: 'cond.foodSecurity', read: (s) => s.indicators.foodSecurity, target: 60, dir: 'min' },
          { labelKey: 'cond.economicSecurity', read: (s) => s.indicators.economicSecurity, target: 50, dir: 'min' },
          { labelKey: 'cond.socialWellbeing', read: (s) => s.indicators.socialWellbeing, target: 60, dir: 'min' },
          { labelKey: 'cond.politicalStability', read: (s) => s.indicators.politicalStability, target: 50, dir: 'min' },
          { labelKey: 'cond.pbi', read: (s) => s.indicators.pbi, target: 14000, dir: 'min' },
          { labelKey: 'cond.debtRatio', read: debtToPbiRatio, target: 0.7, dir: 'max' },
          { labelKey: 'cond.politicalCollapse', read: (s) => s.stellaSpecificState.Colapso_politico, target: 50, dir: 'max' },
        ],
      },
    ],
  },
};
