/**
 * Win routes of the Territorio preview.
 *
 * Separate from `LEVEL_ROUTES` (src/sim/winRoutes.ts) on purpose: those belong to the 3-level game
 * and were calibrated for its annual pacing, and this preview must not move that balance. These use
 * the same `evaluateRoute` machinery and the same shape — governance floors that must all hold, plus
 * three routes of which any one wins — but their thresholds are calibrated against this game:
 * monthly steps, situations, public uses, and a level-2 start that really emits ~17 t/cap.
 *
 * Thresholds come from `npm run sim:territorio` (scripts/simulate-territorio.ts), which plays five
 * strategies to 2054 and prints where each lands. The rule used to set them: each route is won by
 * the strategy that pursues it, doing nothing loses, and no single strategy wins all three.
 */
import type { GameState } from '../types';
import { LandUseType, Policy } from '../types';
import { evaluateRoute, type LevelOutcome, type RouteCondition, type WinRoute } from '../sim';

const totalArea = (s: GameState) => (Object.values(s.landUses) as { area: number }[]).reduce((sum, lu) => sum + lu.area, 0) || 1;

/** Native forest, protected or not, as a share of the territory. */
const nativeForestPct = (s: GameState) =>
  ((s.landUses[LandUseType.UnprotectedNativeForest].area + s.landUses[LandUseType.ProtectedNativeForest].area) / totalArea(s)) * 100;

/** Everything the state put under public protection or restoration, as a share of the territory. */
export const publicNaturePct = (s: GameState) =>
  ((s.landUses[LandUseType.ProtectedNativeForest].area + s.landUses[LandUseType.PublicWetland].area
    + s.landUses[LandUseType.RestorationForest].area) / totalArea(s)) * 100;

const energyParkPct = (s: GameState) => (s.landUses[LandUseType.EnergyPark].area / totalArea(s)) * 100;

/** Treasury as a share of real GDP: money kept relative to the size of the economy. */
const treasuryPctOfGdp = (s: GameState) =>
  (s.stellaSpecificState.Reservas_del_Tesoro / Math.max(1, s.stellaSpecificState.PBI_Real)) * 100;

/** Any of the productive policy families actually switched on. */
const productivePolicyActive = (s: GameState) => {
  const families = [Policy.IntensiveAgriculture, Policy.AgriculturalExports, Policy.SustainableLivestock, Policy.Agroecological];
  return families.some((id) => s.policies[id]?.isActive) ? 1 : 0;
};

/** Effort on the two carbon-neutrality instruments that actually move the CO2 formula. */
const carbonTechEffort = (s: GameState) => {
  const instruments = s.policies[Policy.CarbonNeutrality]?.instruments;
  if (!instruments) return 0;
  const ren = instruments['C_Fomento_Energias_Renovables_No_Convencionales']?.effortPercentage ?? 0;
  const ccs = instruments['C_Investigacion_Desarrollo_Captura_Carbono']?.effortPercentage ?? 0;
  return (ren + ccs) / 2;
};

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

export const TERRITORIO_ROUTES: WinRoute[] = [
  {
    // Wins by what the state put under protection and what that does to the carbon balance. The
    // public-nature share is the condition no other strategy reaches without meaning to.
    id: 'conservation', nameKey: 'routes.conservation.name', taglineKey: 'routes.conservation.tagline',
    descriptionKey: 'routes.conservation.desc', accent: 'chlorophyll', scoreMultiplier: 1.0,
    conditions: [
      { labelKey: 'cond.biodiversity', read: (s) => s.indicators.biodiversity, target: 45.5, dir: 'min' },
      { labelKey: 'cond.nativeForest', read: nativeForestPct, target: 15, dir: 'min' },
      { labelKey: 'cond.publicNature', read: publicNaturePct, target: 12, dir: 'min' },
      { labelKey: 'cond.emissions', read: (s) => s.indicators.co2EqEmissionsPerCapita, target: 6, dir: 'max' },
    ],
  },
  {
    // Wins by feeding the region and arriving at 2054 with money in the bank. Conservation and
    // innovation spend their treasury on the territory, which is exactly the trade-off.
    id: 'production', nameKey: 'routes.production.name', taglineKey: 'routes.production.tagline',
    descriptionKey: 'routes.production.desc', accent: 'ochre', scoreMultiplier: 1.0,
    conditions: [
      { labelKey: 'cond.foodSecurity', read: (s) => s.indicators.foodSecurity, target: 45, dir: 'min' },
      { labelKey: 'cond.economicSecurity', read: (s) => s.indicators.economicSecurity, target: 36, dir: 'min' },
      // Producing is a decision, not a leftover: some productive family has to be governing.
      { labelKey: 'cond.productivePolicy', read: productivePolicyActive, target: 1, dir: 'min' },
      // Relative to the economy, not a fixed 1.000: with a treasury that grows with GDP, a fixed
      // target was met by doing nothing at all (decisión del usuario, 2026-09-19).
      { labelKey: 'cond.treasuryPct', read: treasuryPctOfGdp, target: 8, dir: 'min' },
      { labelKey: 'cond.emissions', read: (s) => s.indicators.co2EqEmissionsPerCapita, target: 15, dir: 'max' },
    ],
  },
  {
    // Wins by decarbonising hard with technology and public energy, without breaking society.
    id: 'innovation', nameKey: 'routes.innovation.name', taglineKey: 'routes.innovation.tagline',
    descriptionKey: 'routes.innovation.desc', accent: 'hydro', scoreMultiplier: 1.1,
    conditions: [
      { labelKey: 'cond.emissions', read: (s) => s.indicators.co2EqEmissionsPerCapita, target: 6.2, dir: 'max' },
      { labelKey: 'cond.energyPark', read: energyParkPct, target: 1.6, dir: 'min' },
      { labelKey: 'cond.techEffort', read: carbonTechEffort, target: 25, dir: 'min' },
      { labelKey: 'cond.socialWellbeing', read: (s) => s.indicators.socialWellbeing, target: 30, dir: 'min' },
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
