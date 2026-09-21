/**
 * Map decorators (22_arte_territorio_expansion.md §5.5): what is *happening* on a parcel, drawn on
 * top of its land use. Every mark reads something the game already holds — nothing is decoration:
 *   - the situations sitting in the inbox (a wildfire burns while "wildfire" is open, the road is
 *     blocked while the blockade lasts, droughts, floods, pests, marches);
 *   - the model's random event of the month (severe drought, bumper harvest);
 *   - the model's state: smog over heavy industry while emissions stay high, fauna returning to
 *     reserves when biodiversity rises, degraded soil on land the model stopped accounting for,
 *     the harvest season on conventional crops;
 *   - the player's own declarations, under construction for a few months.
 * Deterministic: which parcels carry a mark comes from a per-cell hash, so marks don't jump around
 * month to month.
 */
import { hash01, type ParcelKind, type Territory } from '../sim';
import { LandUseType, type GameState, type RandomEvent } from '../types';
import type { OpenSituation } from './situations';

export type FxId = 'fire' | 'drought' | 'flood' | 'pest' | 'construction' | 'harvest' | 'protest' | 'wildlife' | 'smog' | 'degradation';

const LU = LandUseType;
const CROPS = new Set<ParcelKind>([LU.ConventionalCrops, LU.AgroecologicalCrops, LU.GrasslandsPastures]);
const WOODS = new Set<ParcelKind>([LU.UnprotectedNativeForest, LU.ForestPlantations]);
const HOUSING = new Set<ParcelKind>(['housing_2', 'housing_3', 'housing_4', 'market_1', 'market_2', 'civic']);
const HEAVY = new Set<ParcelKind>(['industry_3', 'power_plant']);

/** Situation → the mark it leaves while open, and where. */
const SITUATION_FX: Record<string, { fx: FxId; on: (k: ParcelKind) => boolean; share: number; cluster?: boolean }> = {
  'drought-season': { fx: 'drought', on: (k) => CROPS.has(k), share: 0.22 },
  heatwave: { fx: 'drought', on: (k) => CROPS.has(k), share: 0.12 },
  'dust-storms': { fx: 'degradation', on: (k) => k === LU.ConventionalCrops || k === 'fallow', share: 0.2 },
  'aquifer-drop': { fx: 'drought', on: (k) => k === LU.ConventionalCrops, share: 0.12 },
  wildfire: { fx: 'fire', on: (k) => WOODS.has(k), share: 1, cluster: true },
  'flood-lowlands': { fx: 'flood', on: (k) => CROPS.has(k), share: 0.6, cluster: true },
  'pest-outbreak': { fx: 'pest', on: (k) => k === LU.ConventionalCrops || k === LU.AgroecologicalCrops, share: 0.14 },
  locusts: { fx: 'pest', on: (k) => CROPS.has(k), share: 0.5, cluster: true },
  'pollinator-crash': { fx: 'pest', on: (k) => k === LU.AgroecologicalCrops, share: 0.12 },
  'invasive-species': { fx: 'pest', on: (k) => WOODS.has(k), share: 0.08 },
  'illegal-logging': { fx: 'degradation', on: (k) => k === LU.UnprotectedNativeForest, share: 0.7, cluster: true },
  'soil-degradation': { fx: 'degradation', on: (k) => k === LU.ConventionalCrops, share: 0.12 },
  'road-blockade': { fx: 'protest', on: (k) => k === 'road', share: 0.2 },
  'transport-strike': { fx: 'protest', on: (k) => k === 'road', share: 0.12 },
  'climate-march': { fx: 'protest', on: (k) => HOUSING.has(k), share: 0.25 },
  'food-prices-protest': { fx: 'protest', on: (k) => HOUSING.has(k), share: 0.3 },
  'informal-settlement': { fx: 'construction', on: (k) => k === 'housing_informal' || k === 'grass', share: 0.5, cluster: true },
};

const CLUSTER_RADIUS = 6;
/** Months a declared lot shows as a construction site. */
const CONSTRUCTION_MONTHS = 3;

export interface FxInput {
  territory: Territory;
  game: GameState;
  open: OpenSituation[];
  event: RandomEvent | null;
  /** Month of the year (0 = January) that was just simulated. */
  month: number;
  monthIndex: number;
}

/** Decorator per parcel index, for the month just simulated. */
export function mapFx({ territory: t, game, open, event, month, monthIndex }: FxInput): Record<number, FxId> {
  const out: Record<number, FxId> = {};
  const seed = t.seed;
  const i0 = game.levelBaseline ?? game.indicators;
  const put = (i: number, fx: FxId) => { out[i] = fx; };

  // Model state first, so situations and events (more specific) draw over it.
  const dirty = game.indicators.co2EqEmissionsPerCapita > (i0.co2EqEmissionsPerCapita || 0) * 0.75;
  const wildlife = Math.max(0, (game.indicators.biodiversity - 50) / 50);
  const harvest = month >= 2 && month <= 4;
  t.parcels.forEach((p, i) => {
    const h = hash01(p.x, p.y, seed + 501);
    if (p.declared && p.declaredAt !== undefined && monthIndex - p.declaredAt < CONSTRUCTION_MONTHS && p.kind !== LU.ProtectedNativeForest) {
      if (h < 0.3) put(i, 'construction');
      return;
    }
    if (p.kind === 'fallow' && h < 0.45) put(i, 'degradation');
    else if (HEAVY.has(p.kind) && dirty && h < 0.7) put(i, 'smog');
    else if ((p.kind === LU.ProtectedNativeForest || p.kind === LU.PublicWetland) && h < 0.04 + 0.2 * wildlife && wildlife > 0) put(i, 'wildlife');
    else if (harvest && p.kind === LU.ConventionalCrops && h < 0.05) put(i, 'harvest');
  });

  if (event?.id === 'drought_severe') {
    t.parcels.forEach((p, i) => { if (CROPS.has(p.kind) && hash01(p.x, p.y, seed + 502) < 0.35) put(i, 'drought'); });
  } else if (event?.id === 'bumper_harvest') {
    t.parcels.forEach((p, i) => { if (p.kind === LU.ConventionalCrops && hash01(p.x, p.y, seed + 503) < 0.3) put(i, 'harvest'); });
  }

  open.forEach((item) => {
    const rule = SITUATION_FX[item.defId];
    if (!rule) return;
    const salt = item.openedAt * 131 + item.defId.length;
    let centre: { x: number; y: number } | null = null;
    if (rule.cluster) {
      // The situation happens *somewhere*: centre it on a parcel it can affect, chosen by the item.
      const spots = t.parcels.filter((p) => rule.on(p.kind));
      if (!spots.length) return;
      centre = spots[Math.floor(hash01(salt, 7, seed) * spots.length)];
    }
    t.parcels.forEach((p, i) => {
      if (!rule.on(p.kind)) return;
      if (centre && Math.hypot(p.x - centre.x, p.y - centre.y) > CLUSTER_RADIUS) return;
      if (hash01(p.x, p.y, seed + salt) < rule.share) put(i, rule.fx);
    });
  });
  return out;
}
