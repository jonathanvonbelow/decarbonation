/**
 * Win routes of the Territorio preview.
 *
 * Separate from `LEVEL_ROUTES` (src/sim/winRoutes.ts) on purpose: those belong to the 3-level game
 * and were calibrated for its annual pacing, and this preview must not move that balance. These use
 * the same `evaluateRoute` machinery and the same shape — governance floors that must all hold, plus
 * three routes of which any one wins — but their thresholds are calibrated against this game:
 * monthly steps, situations, public uses, and a level-2 start that really emits ~17 t/cap.
 *
 * Thresholds come from the prototype's TERR_ROUTES and are calibrated with the balance harness
 * (`npm run sim:check`, phase 49), which plays the canonical strategies to 2054. The rule: each route
 * is won by the strategy that pursues it, doing nothing and the shortcuts lose, and no single strategy
 * wins all three.
 */
import type { GameState } from '../types';
import { LandUseType } from '../types';
import { debtToPbiRatio, declaredProtectedOf, evaluateRoute, primaryBalanceAverage, type LevelOutcome, type RouteCondition, type WinRoute } from '../sim';

const totalArea = (s: GameState) => (Object.values(s.landUses) as { area: number }[]).reduce((sum, lu) => sum + lu.area, 0) || 1;

/** Native forest, protected or not, as a share of the territory. */
const nativeForestPct = (s: GameState) =>
  ((s.landUses[LandUseType.UnprotectedNativeForest].area + s.landUses[LandUseType.ProtectedNativeForest].area) / totalArea(s)) * 100;

/**
 * Everything the state put under public protection or restoration, as a share of the territory.
 * Model 1.1 (phase 34, T-07): only the protected forest the player declared (plus what public
 * restoration matured into), not the initial 20 kHa nor what the base protection flow adds alone.
 */
export const publicNaturePct = (s: GameState) =>
  ((declaredProtectedOf(s) + s.landUses[LandUseType.PublicWetland].area
    + s.landUses[LandUseType.RestorationForest].area) / totalArea(s)) * 100;

const energyParkPct = (s: GameState) => (s.landUses[LandUseType.EnergyPark].area / totalArea(s)) * 100;

/** Mean primary balance of the last 5 years, % of GDP (phase 44, `model.fiscal.primaryHistory`). */
const primaryAvgPct = (s: GameState) => 100 * primaryBalanceAverage(s.model?.fiscal.primaryHistory ?? []);

/** Years with at least two production policies (PAI, PEA, GS, AS) active at once (phase 49, `model.productiveYears`). */
const productiveYears = (s: GameState) => Math.round((s.model?.productiveYears ?? 0) * 1e6) / 1e6;
// ↑ rounded: a sum of 1/12 steps drifts by ~1e-14 (180 months may give 14.999999999999…), and 15 compares with >=.

export const TERRITORIO_FLOORS: RouteCondition[] = [
  { labelKey: 'routes.floor.biodiversity', read: (s) => s.indicators.biodiversity, target: 25, dir: 'min' },
  { labelKey: 'routes.floor.foodSecurity', read: (s) => s.indicators.foodSecurity, target: 20, dir: 'min' },
  { labelKey: 'routes.floor.politicalStability', read: (s) => s.indicators.politicalStability, target: 25, dir: 'min' },
  { labelKey: 'routes.floor.socialWellbeing', read: (s) => s.indicators.socialWellbeing, target: 12, dir: 'min' },
];
// No floor on the sectoral pressures on purpose. In this model a collapsed economy drives
// agricultural pressure to 100 by itself (the impulse is 0,3 per point of economic security below
// 50, against 10% dissipation), so a pressure floor punishes the same failure twice — and it made
// conservation and innovation unwinnable in the harness even when they governed well otherwise.
// Political stability already carries the pressures inside it, through political collapse.

// Phase 49 (mejora-general/files/49_recalibracion_rutas_puntaje.md §3; TERR_ROUTES of scripts/reference/modelo_v2.py),
// replacing the provisional thresholds of phases 34/38/44. Calibrated with `npm run sim:check` (20 seeds per strategy);
// any move away from the prototype is logged in docs/DESIGN_DECISIONS_LOG.md (phase 49).
export const TERRITORIO_ROUTES: WinRoute[] = [
  {
    // Wins by what the state put under protection and what that does to the carbon balance. The
    // public-nature share (declared, T-07) is the condition no other strategy reaches without meaning to.
    id: 'conservation', nameKey: 'routes.conservation.name', taglineKey: 'routes.conservation.tagline',
    descriptionKey: 'routes.conservation.desc', accent: 'chlorophyll', scoreMultiplier: 1.0,
    conditions: [
      { labelKey: 'cond.biodiversity', read: (s) => s.indicators.biodiversity, target: 52, dir: 'min' },
      { labelKey: 'cond.nativeForest', read: nativeForestPct, target: 15, dir: 'min' },
      // 49: 8 % (TERR_ROUTES) → 6 %. With the harness (20 seeds) the conservation strategy declares 6.1–11.0 % (median
      // 7.7, 25 % of the seeds ≥ 8) and settle_only, which never declares on purpose, reaches 4.5 % at most through
      // situations; 6 keeps conservation at 100 % and every other strategy out (docs/DESIGN_DECISIONS_LOG.md).
      { labelKey: 'cond.publicNature', read: publicNaturePct, target: 6, dir: 'min' },
      { labelKey: 'cond.emissions', read: (s) => s.indicators.co2EqEmissionsPerCapita, target: 6.2, dir: 'max' },
    ],
  },
  {
    // Wins by feeding the region with production it governed for years, on sound public finances. Before 49 it asked
    // for "treasury ≥ 8 % of GDP" (met without governing) and a single productive policy (`cheap_production`).
    id: 'production', nameKey: 'routes.production.name', taglineKey: 'routes.production.tagline',
    descriptionKey: 'routes.production.desc', accent: 'ochre', scoreMultiplier: 1.0,
    conditions: [
      // 49: 44 (TERR_ROUTES) → 40.5. The production strategy ends at F 35.0–53.2 (median 44.4: 44 left it at 65 %, inside the
      // 30–70 % band of C5); do_nothing's 90th percentile is 40.3, so 40.5 is the lowest value the procedure of 49 §4
      // allows (production 90 %). Extractive still fails on the primary balance, cheap_production on the productive years.
      { labelKey: 'cond.foodSecurity', read: (s) => s.indicators.foodSecurity, target: 40.5, dir: 'min' },
      { labelKey: 'cond.economicSecurity', read: (s) => s.indicators.economicSecurity, target: 40, dir: 'min' },
      { labelKey: 'cond.socialWellbeing', read: (s) => s.indicators.socialWellbeing, target: 55, dir: 'min' },
      { labelKey: 'cond.primaryAvg', read: primaryAvgPct, target: 0, dir: 'min' },
      { labelKey: 'cond.debtRatio', read: debtToPbiRatio, target: 0.6, dir: 'max' },
      { labelKey: 'cond.productiveYears', read: productiveYears, target: 15, dir: 'min', start: 0 },
    ],
  },
  {
    // Wins by decarbonising with technology and public energy, without breaking society. It asks for a result (CO₂)
    // and parks, not for effort on instruments (1.1: met by the even split).
    id: 'innovation', nameKey: 'routes.innovation.name', taglineKey: 'routes.innovation.tagline',
    descriptionKey: 'routes.innovation.desc', accent: 'hydro', scoreMultiplier: 1.1,
    conditions: [
      { labelKey: 'cond.emissions', read: (s) => s.indicators.co2EqEmissionsPerCapita, target: 4.8, dir: 'max' },
      { labelKey: 'cond.energyPark', read: energyParkPct, target: 1.6, dir: 'min' },
      { labelKey: 'cond.socialWellbeing', read: (s) => s.indicators.socialWellbeing, target: 55, dir: 'min' },
    ],
  },
];

/**
 * The route the player is closest to completing. The feed's photography uses it to pick which
 * version of a scene to show (src/territorio/newsArt.ts): the same drought looks different in a
 * region that bet on conservation and in one that bet on production.
 */
export function leadingRouteId(s: GameState, baseline: GameState): string | null {
  const routes = TERRITORIO_ROUTES.map((r) => evaluateRoute(r, s, baseline));
  const best = routes.reduce((a, b) => (b.progress > a.progress ? b : a));
  // Below a third of the way in, nothing is really being pursued yet.
  return best.progress >= 0.34 ? best.route.id : null;
}

/** Same shape as `evaluateLevel`, against this preview's own floors and routes. */
export function evaluateTerritorio(s: GameState, baseline: GameState): LevelOutcome {
  const failedFloors = TERRITORIO_FLOORS.filter((f) => (f.dir === 'min' ? f.read(s) < f.target : f.read(s) > f.target));
  const routes = TERRITORIO_ROUTES.map((r) => evaluateRoute(r, s, baseline));
  const floorsMet = failedFloors.length === 0;
  const met = routes.filter((r) => r.met);
  const achieved = floorsMet && met.length > 0
    ? met.reduce((a, b) => (b.route.scoreMultiplier > a.route.scoreMultiplier ? b : a)).route
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
