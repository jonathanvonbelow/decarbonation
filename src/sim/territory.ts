/**
 * Territory map <-> land-use areas, for the Territorio preview (mejora-general/files/21_fusion_ecosim.md §4-5,
 * 22_arte_territorio_expansion.md).
 *
 * The model keeps land use as areas in kHa (`GameState.landUses`); the preview shows it on an
 * irregular 100×100 isometric map whose fixed landscape comes from geography.ts. Exactly
 * `PRODUCTIVE_PARCELS` cells are productive land, so one parcel is (model area / 6000) — 0.1 kHa,
 * 1 km², for the level-2 region — and the equations keep reasoning in the same kHa as the 3-level
 * game: nothing was rescaled to fit the bigger map. This module is the only bridge between the
 * two, and it is one-directional except for a single, explicit player action:
 *
 *   model → map   `syncTerritory` moves parcels along the transfers the model actually made that
 *                 month (`stepMonth`'s `flows`): one parcel per `kHaPerParcel` of accumulated flow,
 *                 taken from the frontier of the use that grows (deforestation visibly advances from
 *                 the crops; reserves grow from their edges). A net-area safety net with a
 *                 hysteresis band covers rounding and area changes that arrive without a flow.
 *                 Indicators always read the exact areas, never parcel counts. Parcels the player
 *                 declared never move while any other parcel can.
 *   map → model   `declarePublicUse` is the only way the player changes land use directly: a lot of
 *                 `LOT_KHA` (50 parcels) around the parcel they pick becomes a public use, moving its
 *                 area in the model and paying a one-time cost from the treasury. The lot is the
 *                 same 5 kHa a declaration always moved, so its price and its weight in every
 *                 equation are unchanged by the finer map.
 *
 * Towns are drawn from the model too (`developTerritory`): they densify with real GDP, informal
 * settlements appear when social wellbeing collapses, and heavy industry reads cleaner as
 * emissions fall. They grow into lots reserved for them, never into productive land.
 *
 * Fallow parcels are the model's fallow land (`LandUseType.Fallow`, FAL, since model 2.0 phase 37): area a
 * drought or a situation took out of use, which regrows into native forest and re-enters the agricultural
 * pool. Total area is conserved, so the map always holds exactly the model's area.
 *
 * Pure and deterministic: no React, no Math.random; layout noise and tie-breaks come from `seed`.
 */
import type { ControlParams, GameState, LandUse } from '../types';
import { LandUseType } from '../types';
import {
  CONTEXT_KINDS, createGeography, distanceField, fbm, GRID_SIZE, hash01, largestComponent4, PRODUCTIVE_PARCELS, REGIONS, regionWeights,
  urbanKind, type ContextKind, type Development, type Geography, type RegionId, type RoadMaterial,
} from './geography';

export { GRID_SIZE, hash01, PRODUCTIVE_PARCELS, REGIONS, type ContextKind, type Development, type Geography, type RegionId, type RoadMaterial };

export const TERRITORY_SIZE = GRID_SIZE;
/** Nominal parcel size for the level-2 region (600 kHa / 6000 parcels). */
export const KHA_PER_PARCEL = 0.1;
/** Area a public-use declaration moves: the 5 kHa one declaration always moved. */
export const LOT_KHA = 5;
/** A use changes parcels only when it is off by more than this (in parcels, summed both ways). */
const HYSTERESIS = 1.2;

/** Land uses drawn with their own code on the map: every use except fallow, which is the `fallow` kind. */
export type MapLandUse = Exclude<LandUseType, LandUseType.Fallow>;
export type ProductiveKind = MapLandUse | 'fallow';
export type ParcelKind = ProductiveKind | ContextKind;

export interface Parcel {
  x: number;
  y: number;
  kind: ParcelKind;
  /** Declared a public use by the player. Never moved by sync while any other parcel can move. */
  declared?: boolean;
  /** Month index of the declaration (for the construction marker on the map). */
  declaredAt?: number;
}

export interface Territory {
  size: number;
  kHaPerParcel: number;
  seed: number;
  parcels: Parcel[];
  /**
   * kHa each model flow has moved that the map has not drawn yet, keyed `from>to`. A parcel moves
   * along a flow once its accumulator reaches one parcel.
   */
  pending: Record<string, number>;
  /** Fixed landscape, shared (never copied) between successive territories of a game. */
  geo: Geography;
}

/** A land transfer the model made (see `stepMonth`'s `flows`). */
export interface LandFlow {
  from: ProductiveKind;
  to: ProductiveKind;
  kHa: number;
}

export interface ParcelChange {
  x: number;
  y: number;
  from: ParcelKind;
  to: ParcelKind;
}

const LAND_USES = (Object.values(LandUseType) as LandUseType[]).filter((k): k is MapLandUse => k !== LandUseType.Fallow);
const PRODUCTIVE_KINDS: ProductiveKind[] = [...LAND_USES, 'fallow'];

/** Parcel kind of a model land use (FAL is drawn as `fallow`). */
export const parcelKindOf = (k: LandUseType): ProductiveKind => (k === LandUseType.Fallow ? 'fallow' : k);
/** A model transfer as the map draws it (FAL → `fallow`). */
export const toMapFlow = (f: { from: LandUseType; to: LandUseType; kHa: number }): LandFlow =>
  ({ from: parcelKindOf(f.from), to: parcelKindOf(f.to), kHa: f.kHa });
/** Model land use of a productive parcel kind. */
export const landUseOfKind = (k: ProductiveKind): LandUseType => (k === 'fallow' ? LandUseType.Fallow : k);
const CONTEXT_SET = new Set<ParcelKind>(CONTEXT_KINDS);

export const isProductive = (kind: ParcelKind): kind is ProductiveKind => !CONTEXT_SET.has(kind);

const idx = (t: { size: number }, x: number, y: number) => y * t.size + x;

export function parcelAt(t: Territory, x: number, y: number): Parcel | null {
  if (x < 0 || y < 0 || x >= t.size || y >= t.size) return null;
  return t.parcels[idx(t, x, y)];
}

/** Region of a cell, or null outside the territory. */
export function regionAt(t: Territory, x: number, y: number): RegionId | null {
  if (x < 0 || y < 0 || x >= t.size || y >= t.size) return null;
  const r = t.geo.region[idx(t, x, y)];
  return r >= 0 ? REGIONS[r] : null;
}

function neighbors8(t: Territory, i: number): number[] {
  const x = i % t.size;
  const y = (i / t.size) | 0;
  const out: number[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < t.size && ny < t.size) out.push(ny * t.size + nx);
    }
  }
  return out;
}

/* ── Quantisation ──────────────────────────────────────────────────────────────────────────── */

/**
 * Area of each productive kind, in parcels. `fallow` is the model's fallow area (FAL, phase 37); the map
 * holds the model's total area, so the targets add up to `productiveCount`. A map bigger than the model's
 * area (a state that lost area before phase 37) shows the difference as fallow too; a model holding *more*
 * area than the map scales every use down to fit.
 */
export function parcelTargets(
  landUses: Record<LandUseType, LandUse>,
  productiveCount: number,
  kHaPerParcel = KHA_PER_PARCEL,
): Record<ProductiveKind, number> {
  const raw = {} as Record<ProductiveKind, number>;
  let total = 0;
  PRODUCTIVE_KINDS.forEach((k) => {
    raw[k] = Math.max(0, landUses[landUseOfKind(k)]?.area ?? 0) / kHaPerParcel;
    total += raw[k];
  });
  if (total > productiveCount) {
    PRODUCTIVE_KINDS.forEach((k) => { raw[k] = (raw[k] * productiveCount) / total; });
  } else {
    raw.fallow += productiveCount - total;
  }
  return raw;
}

/** Largest-remainder rounding of `parcelTargets`: whole parcel counts summing to `productiveCount`. */
export function parcelCounts(
  landUses: Record<LandUseType, LandUse>,
  productiveCount: number,
  kHaPerParcel = KHA_PER_PARCEL,
): Record<ProductiveKind, number> {
  const target = parcelTargets(landUses, productiveCount, kHaPerParcel);
  const counts = {} as Record<ProductiveKind, number>;
  let assigned = 0;
  PRODUCTIVE_KINDS.forEach((k) => {
    counts[k] = Math.floor(target[k] + 1e-9);
    assigned += counts[k];
  });
  const byRemainder = [...PRODUCTIVE_KINDS].sort((a, b) => (target[b] - Math.floor(target[b] + 1e-9)) - (target[a] - Math.floor(target[a] + 1e-9)));
  for (let i = 0; assigned < productiveCount; i = (i + 1) % byRemainder.length) {
    counts[byRemainder[i]]++;
    assigned++;
  }
  return counts;
}

function countKinds(t: Territory): Record<ProductiveKind, number> {
  const counts = {} as Record<ProductiveKind, number>;
  PRODUCTIVE_KINDS.forEach((k) => { counts[k] = 0; });
  t.parcels.forEach((p) => { if (isProductive(p.kind)) counts[p.kind]++; });
  return counts;
}

export function productiveCount(t: Territory): number {
  let n = 0;
  t.parcels.forEach((p) => { if (isProductive(p.kind)) n++; });
  return n;
}

const totalArea = (landUses: Record<LandUseType, LandUse>) =>
  PRODUCTIVE_KINDS.reduce((sum, k) => sum + Math.max(0, landUses[landUseOfKind(k)]?.area ?? 0), 0);

/* ── Layout ────────────────────────────────────────────────────────────────────────────────── */

/**
 * Where each use sits at the start, by region (rows follow REGIONS: norte, centro, sur, costa).
 * It reads the level-2 regional profiles: extensive farming and livestock in the north, periurban
 * horticulture around the metropolis, native forest and plantations in the south, pastures and
 * mixed farming on the coast.
 */
const REGION_AFFINITY: Record<ProductiveKind, [number, number, number, number]> = {
  [LandUseType.ProtectedNativeForest]: [0.05, 0, 1, 0.45],
  [LandUseType.UnprotectedNativeForest]: [0.2, 0.05, 1, 0.5],
  [LandUseType.ForestPlantations]: [0.25, 0.2, 0.85, 0.75],
  [LandUseType.ConventionalCrops]: [1, 0.75, 0.05, 0.4],
  [LandUseType.AgroecologicalCrops]: [0.55, 0.9, 0.35, 0.65],
  [LandUseType.GrasslandsPastures]: [0.85, 0.3, 0.3, 0.9],
  [LandUseType.PublicWetland]: [0, 0, 0, 0],
  [LandUseType.RestorationForest]: [0, 0, 0, 0],
  [LandUseType.EnergyPark]: [0, 0, 0, 0],
  // A game that starts with fallow (FAL > 0, phase 37): degraded land sits where farming is, mostly north.
  fallow: [0.9, 0.45, 0.15, 0.55],
};

function suitability(geo: Geography, i: number, k: ProductiveKind, seed: number): number {
  const x = i % geo.size;
  const y = (i / geo.size) | 0;
  const w = regionWeights(x, y, geo.size, geo.seed);
  const a = REGION_AFFINITY[k];
  const town = Math.min(1, geo.townDistance[i] / 22);
  const wet = geo.waterDistance[i] <= 3 ? 1 : 0;
  let s = a[0] * w[0] + a[1] * w[1] + a[2] * w[2] + a[3] * w[3];
  s += 0.55 * fbm(x, y, 7, seed + 300 + PRODUCTIVE_KINDS.indexOf(k) * 31);
  switch (k) {
    case LandUseType.ProtectedNativeForest: s += 1.1 * fbm(x, y, 16, seed + 400) + 0.35 * town + 0.3 * geo.interior[i]; break;
    case LandUseType.UnprotectedNativeForest: s += 0.45 * town; break;
    case LandUseType.ForestPlantations: s += 0.15 * town; break;
    case LandUseType.ConventionalCrops: s += 0.25 * (1 - town); break;
    case LandUseType.AgroecologicalCrops: s += 0.6 * (1 - town); break;
    case LandUseType.GrasslandsPastures: s += 0.3 * wet; break;
    case 'fallow': s += 0.25 * (1 - town); break;
    default: s -= 10;
  }
  return s;
}

/**
 * Assigns exactly `counts[k]` cells to each use, each cell to the use it suits best *relative to
 * how contested that use is*: a price per use is raised while it is over-subscribed (a small
 * auction), so uses form coherent regional patches instead of the leftovers of a greedy fill.
 * An exact repair and a count-preserving smoothing pass finish it.
 */
function allocate(geo: Geography, cells: number[], counts: Record<ProductiveKind, number>, seed: number): Map<number, ProductiveKind> {
  const uses = PRODUCTIVE_KINDS.filter((k) => counts[k] > 0);
  const score = uses.map((k) => cells.map((i) => suitability(geo, i, k, seed)));
  const price = uses.map(() => 0);
  const pick = new Int32Array(cells.length);
  const assign = () => {
    for (let c = 0; c < cells.length; c++) {
      let best = 0;
      let bestV = -Infinity;
      for (let u = 0; u < uses.length; u++) {
        const v = score[u][c] - price[u];
        if (v > bestV) {
          bestV = v;
          best = u;
        }
      }
      pick[c] = best;
    }
  };
  for (let iter = 0; iter < 160; iter++) {
    assign();
    const n = uses.map(() => 0);
    for (let c = 0; c < cells.length; c++) n[pick[c]]++;
    uses.forEach((k, u) => { price[u] += (0.25 / (1 + iter * 0.05)) * (n[u] - counts[k]) / Math.max(1, counts[k]); });
  }
  assign();
  // Exact repair: move the least-committed cells of over-subscribed uses to where they fit next best.
  const n = uses.map(() => 0);
  for (let c = 0; c < cells.length; c++) n[pick[c]]++;
  for (let guard = 0; guard < cells.length; guard++) {
    const over = uses.findIndex((k, u) => n[u] > counts[k]);
    if (over < 0) break;
    let bestC = -1;
    let bestU = -1;
    let bestLoss = Infinity;
    for (let c = 0; c < cells.length; c++) {
      if (pick[c] !== over) continue;
      for (let u = 0; u < uses.length; u++) {
        if (n[u] >= counts[uses[u]]) continue;
        const loss = (score[over][c] - price[over]) - (score[u][c] - price[u]);
        if (loss < bestLoss) {
          bestLoss = loss;
          bestC = c;
          bestU = u;
        }
      }
    }
    if (bestC < 0) break;
    pick[bestC] = bestU;
    n[over]--;
    n[bestU]++;
  }
  const out = new Map<number, ProductiveKind>();
  cells.forEach((i, c) => out.set(i, uses[pick[c]]));
  // Any rounding shortfall (fallow at the start) goes to the cells nobody fit.
  smooth(geo, out);
  return out;
}

/** Count-preserving smoothing: swaps pairs of isolated parcels that each fit the other's patch. */
function smooth(geo: Geography, kinds: Map<number, ProductiveKind>) {
  const size = geo.size;
  for (let pass = 0; pass < 3; pass++) {
    const want = new Map<string, number[]>();
    kinds.forEach((k, i) => {
      const x = i % size;
      const y = (i / size) | 0;
      const around = new Map<ProductiveKind, number>();
      let same = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const n = kinds.get((y + dy) * size + x + dx);
          if (!n || x + dx < 0 || x + dx >= size) continue;
          if (n === k) same++;
          else around.set(n, (around.get(n) ?? 0) + 1);
        }
      }
      if (same > 1) return;
      let major: ProductiveKind | null = null;
      let most = 0;
      around.forEach((c, n) => { if (c > most) { most = c; major = n; } });
      if (major && most >= 5) {
        const key = `${k}>${major}`;
        if (!want.has(key)) want.set(key, []);
        want.get(key)!.push(i);
      }
    });
    let swaps = 0;
    want.forEach((list, key) => {
      const [a, b] = key.split('>');
      const back = want.get(`${b}>${a}`);
      if (!back || a > b) return;
      const m = Math.min(list.length, back.length);
      for (let j = 0; j < m; j++) {
        kinds.set(list[j], b as ProductiveKind);
        kinds.set(back[j], a as ProductiveKind);
        swaps++;
      }
    });
    if (!swaps) break;
  }
}

/** Geographies are pure functions of the seed and a little costly to build: keep the last few. */
const GEO_CACHE = new Map<string, Geography>();
function geographyFor(seed: number, size: number): Geography {
  const key = `${seed}:${size}`;
  let geo = GEO_CACHE.get(key);
  if (!geo) {
    geo = createGeography(seed, size);
    GEO_CACHE.set(key, geo);
    if (GEO_CACHE.size > 6) GEO_CACHE.delete(GEO_CACHE.keys().next().value as string);
  }
  return geo;
}

/**
 * Builds the initial map for `landUses` on the seed's geography: productive land divided among the
 * uses by regional affinity (see REGION_AFFINITY), with smooth noise so they form patches. The
 * parcel size is the model's total area over the productive parcels, so the map holds the model's
 * area exactly.
 */
export function createTerritory(landUses: Record<LandUseType, LandUse>, seed = 1, size = GRID_SIZE): Territory {
  const geo = geographyFor(seed, size);
  const cells: number[] = [];
  const parcels: Parcel[] = geo.base.map((k, i) => {
    if (k === 'productive') cells.push(i);
    return { x: i % size, y: (i / size) | 0, kind: k === 'productive' ? 'fallow' : k };
  });
  const area = totalArea(landUses);
  const kHaPerParcel = area > 0 ? area / cells.length : KHA_PER_PARCEL;
  const t: Territory = { size, kHaPerParcel, seed, parcels, pending: {}, geo };
  const counts = parcelCounts(landUses, cells.length, kHaPerParcel);
  allocate(geo, cells, counts, seed).forEach((k, i) => { parcels[i].kind = k; });
  return t;
}

/* ── Landscape connectivity (model 2.0, phase 40 §3) ──────────────────────────────────────── */

/** Parcel kinds that count as forest habitat for the connectivity K: native forest (both) and restoration. */
export const FOREST_KINDS: ReadonlySet<ParcelKind> = new Set<ParcelKind>([
  LandUseType.UnprotectedNativeForest, LandUseType.ProtectedNativeForest, LandUseType.RestorationForest,
]);

/**
 * K = share of the forest parcels (BNNP + BNP + RES) that belong to the largest 4-connected forest patch (0-1; 0
 * with no forest). It enters biodiversity as γ_K·ln(K/K0) (src/sim/v2/biodiversity.ts): a protected area or a
 * restoration next to the existing forest raises K, an isolated lot lowers it. One flood fill over the grid.
 */
export function forestConnectivity(t: Territory): number {
  let total = 0;
  const member = (i: number): boolean => FOREST_KINDS.has(t.parcels[i].kind);
  t.parcels.forEach((p) => { if (FOREST_KINDS.has(p.kind)) total++; });
  if (total === 0) return 0;
  return largestComponent4(t.size, member).bestSize / total;
}

/** True when a batch of parcel changes touched forest (only then can K change). */
export const changesTouchForest = (changes: ParcelChange[]): boolean =>
  changes.some((c) => FOREST_KINDS.has(c.from) || FOREST_KINDS.has(c.to));

/* ── Model → map ───────────────────────────────────────────────────────────────────────────── */

/**
 * Where each use can grow from, following the model's own flows (src/sim/v2/land.ts, phase 37: BNNP→BNP,
 * BNNP→CC, BNNP→CA, CA→BNNP, RES→BNP, fallow→BNNP, the agricultural pool among CC/CA/PRG/PF and from
 * fallow; droughts send CC and CA area to fallow). Pairing deficits with these sources keeps the map from
 * showing transitions the model never makes.
 */
const SOURCES: Partial<Record<ProductiveKind, ProductiveKind[]>> = {
  [LandUseType.ProtectedNativeForest]: [LandUseType.UnprotectedNativeForest, LandUseType.RestorationForest],
  [LandUseType.ConventionalCrops]: [LandUseType.UnprotectedNativeForest, LandUseType.AgroecologicalCrops, LandUseType.GrasslandsPastures, LandUseType.ForestPlantations, 'fallow'],
  [LandUseType.AgroecologicalCrops]: [LandUseType.ConventionalCrops, LandUseType.UnprotectedNativeForest, LandUseType.GrasslandsPastures, LandUseType.ForestPlantations, 'fallow'],
  [LandUseType.GrasslandsPastures]: [LandUseType.ConventionalCrops, LandUseType.AgroecologicalCrops, LandUseType.ForestPlantations, 'fallow'],
  [LandUseType.ForestPlantations]: [LandUseType.ConventionalCrops, LandUseType.AgroecologicalCrops, LandUseType.GrasslandsPastures, 'fallow'],
  // Natural regrowth: fallow land returns to native forest.
  [LandUseType.UnprotectedNativeForest]: [LandUseType.AgroecologicalCrops, 'fallow'],
  // Losses of events (droughts: CC, CA) and situations (any use, e.g. a forest fire) go to fallow.
  fallow: [LandUseType.ConventionalCrops, LandUseType.AgroecologicalCrops, LandUseType.UnprotectedNativeForest,
    LandUseType.GrasslandsPastures, LandUseType.ForestPlantations],
  // Public uses only ever grow because the player declared them (declarePublicUse below), but the
  // safety net still needs to know where their area came from.
  [LandUseType.PublicWetland]: [LandUseType.ConventionalCrops, LandUseType.GrasslandsPastures, 'fallow'],
  [LandUseType.RestorationForest]: [LandUseType.ConventionalCrops, LandUseType.GrasslandsPastures, 'fallow'],
  [LandUseType.EnergyPark]: [LandUseType.GrasslandsPastures, LandUseType.ConventionalCrops, 'fallow'],
};

/** Parcels moved per frontier recomputation: small enough that a front advances ring by ring. */
const FRONT_BATCH = 24;

/**
 * Turns `n` parcels of `from` into `to`, from the frontier: the `from` parcels closest to existing
 * `to` land (8-neighbour BFS), most-touching first, never a declared parcel while another exists.
 * Returns how many moved.
 */
function moveParcels(t: Territory, from: ProductiveKind, to: ProductiveKind, n: number, onMove: (i: number) => void): number {
  let moved = 0;
  while (moved < n) {
    const hasTo = t.parcels.some((p) => p.kind === to);
    // Without any `to` land yet, grow from the edges of `from` (where it meets other uses).
    const dist = distanceField(t.size, hasTo
      ? (i) => t.parcels[i].kind === to
      : (i) => { const k = t.parcels[i].kind; return k !== from && k !== 'void' && k !== 'sea'; });
    const candidates: { i: number; s: number }[] = [];
    t.parcels.forEach((p, i) => {
      if (p.kind !== from) return;
      let s = dist[i] + 0.9 * hash01(p.x, p.y, t.seed + moved);
      if (dist[i] <= 1.5) s -= 0.12 * neighbors8(t, i).filter((j) => t.parcels[j].kind === to).length;
      if (p.declared) s += 1e6;
      candidates.push({ i, s });
    });
    if (!candidates.length) break;
    candidates.sort((a, b) => a.s - b.s);
    const batch = Math.min(n - moved, FRONT_BATCH, candidates.length);
    for (let b = 0; b < batch; b++) onMove(candidates[b].i);
    moved += batch;
  }
  return moved;
}

/**
 * Brings the map in line with the model. Returns a new territory (the input is not mutated) and
 * the parcels that changed, in order.
 *
 *  1. Flows first: each of this month's `flows` adds to its accumulator; every full parcel of
 *     accumulated flow moves one parcel along that same transition. This is what makes the map show
 *     the transitions the model actually made (conservation protecting forest, farmers converting
 *     to agroecology, deforestation), not just a net balance that many different stories fit.
 *  2. Safety net: if any use is still more than the hysteresis band away from its area once the
 *     flows still accumulating are discounted (rounding, the ≥ 0 clamp, or a caller that passes no
 *     flows), the fewest parcels are moved to close it, preferring the model's own transitions.
 */
export function syncTerritory(
  territory: Territory,
  landUses: Record<LandUseType, LandUse>,
  flows: LandFlow[] = [],
): { territory: Territory; changes: ParcelChange[] } {
  const t: Territory = { ...territory, parcels: territory.parcels.map((p) => ({ ...p })), pending: { ...territory.pending } };
  const counts = countKinds(t);
  const target = parcelTargets(landUses, productiveCount(t), t.kHaPerParcel);
  const changes: ParcelChange[] = [];
  const move = (from: ProductiveKind, to: ProductiveKind, n: number): number => moveParcels(t, from, to, n, (i) => {
    const parcel = t.parcels[i];
    changes.push({ x: parcel.x, y: parcel.y, from: parcel.kind, to });
    parcel.kind = to;
    parcel.declared = false;
    parcel.declaredAt = undefined;
    counts[from]--;
    counts[to]++;
  });

  flows.forEach((f) => {
    if (f.kHa <= 0) return;
    const key = `${f.from}>${f.to}`;
    t.pending[key] = (t.pending[key] ?? 0) + f.kHa;
  });
  Object.keys(t.pending).forEach((key) => {
    const [from, to] = key.split('>') as [ProductiveKind, ProductiveKind];
    const whole = Math.min(Math.floor(t.pending[key] / t.kHaPerParcel + 1e-9), counts[from]);
    if (whole > 0) t.pending[key] -= move(from, to, whole) * t.kHaPerParcel;
    // A flow out of a use that has no parcels left cannot be drawn; don't let it pile up.
    if (counts[from] === 0) t.pending[key] = Math.min(t.pending[key], t.kHaPerParcel);
  });

  // Error not explained by flows still accumulating: a use whose inflow is 0.3 parcel short is
  // *expected* to be 0.3 parcel below its area, and must not be "corrected" by some other route.
  const inFlight = (k: ProductiveKind) => Object.entries(t.pending).reduce((sum, [key, kHa]) => {
    const [from, to] = key.split('>');
    return sum + (to === k ? kHa : 0) - (from === k ? kHa : 0);
  }, 0) / t.kHaPerParcel;
  // In-flight area only changes with the flows above, so it is computed once; the error per use once
  // per iteration (not per pair).
  const flight = {} as Record<ProductiveKind, number>;
  PRODUCTIVE_KINDS.forEach((k) => { flight[k] = inFlight(k); });
  const err = {} as Record<ProductiveKind, number>;
  for (let guard = 0; guard < 200; guard++) {
    PRODUCTIVE_KINDS.forEach((k) => { err[k] = target[k] - counts[k] - flight[k]; });
    // Every (deficit, surplus) pair far enough apart to justify moving parcels. Model flows win
    // over any other pairing; among flows, the pair where both sides are furthest off goes first
    // (a use within rounding of its area is not a real deficit), then the most constrained deficit
    // (fewest sources) so it is not starved by a use that had alternatives.
    let best: { deficit: ProductiveKind; surplus: ProductiveKind; score: number; gap: number } | null = null;
    for (const deficit of PRODUCTIVE_KINDS) {
      for (const surplus of PRODUCTIVE_KINDS) {
        if (deficit === surplus || counts[surplus] === 0) continue;
        const gap = err[deficit] - err[surplus];
        if (gap <= HYSTERESIS) continue;
        const sources = SOURCES[deficit] ?? [];
        const offBoth = Math.min(err[deficit], -err[surplus]);
        // A model flow always beats a pairing the model never makes, however far off the latter is.
        const score = (sources.includes(surplus) ? 0 : 1e6) - 10 * offBoth + sources.length - gap * 0.0001;
        if (!best || score < best.score) best = { deficit, surplus, score, gap };
      }
    }
    if (!best) break;
    // Each parcel moved closes the gap by 2; stop inside the band rather than overshoot it.
    const n = Math.max(1, Math.min(counts[best.surplus], Math.floor((best.gap - HYSTERESIS) / 2) + 1));
    if (!move(best.surplus, best.deficit, n)) break;
  }
  return { territory: t, changes };
}

/** Settlements follow the model's development (see geography.ts `urbanKind`), with hysteresis. */
export function developTerritory(territory: Territory, dev: Development): { territory: Territory; changes: ParcelChange[] } {
  const changes: ParcelChange[] = [];
  let parcels: Parcel[] | null = null;
  // A slot keeps its building while it is still what a slightly different development would show,
  // so a value hovering on a threshold does not make buildings blink month after month.
  const nudge = (d: number, s: number) => ({
    growth: Math.max(0, dev.growth + d),
    hardship: Math.min(1, Math.max(0, dev.hardship + s)),
    dirty: Math.min(1, Math.max(0, dev.dirty + s)),
  });
  territory.geo.slots.forEach((slot) => {
    const current = territory.parcels[slot.i].kind;
    const next = urbanKind(slot, dev);
    if (next === current) return;
    if ([urbanKind(slot, nudge(0.03, 0.06)), urbanKind(slot, nudge(-0.03, -0.06))].includes(current as ContextKind)) return;
    parcels = parcels ?? territory.parcels.slice();
    const p = parcels[slot.i];
    parcels[slot.i] = { ...p, kind: next };
    changes.push({ x: p.x, y: p.y, from: current, to: next });
  });
  return { territory: parcels ? { ...territory, parcels } : territory, changes };
}

/** Development of the region, read from the model (see `Development`). */
export function developmentOf(game: GameState): Development {
  const base = game.levelBaseline;
  const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
  const pbi0 = base?.pbi || game.indicators.pbi || 1;
  const co20 = base?.co2EqEmissionsPerCapita || game.indicators.co2EqEmissionsPerCapita || 1;
  return {
    growth: Math.max(0, game.indicators.pbi / pbi0 - 1),
    hardship: clamp01((45 - game.indicators.socialWellbeing) / 35),
    dirty: clamp01((game.indicators.co2EqEmissionsPerCapita / co20 - 0.3) / 0.7),
  };
}

/* ── Map → model: public uses ──────────────────────────────────────────────────────────────── */

/**
 * The public uses a player can declare (21_fusion_ecosim.md §5, decisión 4 del equipo). They are the
 * only direct change to land use in the game: everything else comes out of the model's dynamics.
 * Each one moves a lot's worth of area into a land use the model already prices — rates and
 * weights live in constants.ts — and pays a one-time cost from the treasury.
 */
export type PublicUse = 'protected' | 'restoration' | 'wetland' | 'energy';

export const PUBLIC_USES: PublicUse[] = ['protected', 'restoration', 'wetland', 'energy'];

interface PublicUseRule {
  /** Land use the parcel becomes. */
  target: MapLandUse;
  /** Parcel kinds that can be declared into it. */
  from: ProductiveKind[];
  cost: (CP: ControlParams) => number;
  /** Wetlands can only be declared next to water (river, lake, a wetland — natural or declared). */
  requiresWater?: boolean;
}

const RULES: Record<PublicUse, PublicUseRule> = {
  protected: {
    target: LandUseType.ProtectedNativeForest,
    from: [LandUseType.UnprotectedNativeForest],
    cost: (CP) => CP.Costo_Declaracion_Area_Protegida_por_kHa,
  },
  restoration: {
    target: LandUseType.RestorationForest,
    from: [LandUseType.ConventionalCrops, LandUseType.GrasslandsPastures, 'fallow'],
    cost: (CP) => CP.Costo_Restauracion_Publica_por_kHa,
  },
  wetland: {
    target: LandUseType.PublicWetland,
    from: [LandUseType.ConventionalCrops, LandUseType.GrasslandsPastures, 'fallow'],
    cost: (CP) => CP.Costo_Humedal_Publico_por_kHa,
    requiresWater: true,
  },
  energy: {
    target: LandUseType.EnergyPark,
    from: [LandUseType.GrasslandsPastures, LandUseType.ConventionalCrops, 'fallow'],
    cost: (CP) => CP.Costo_Parque_Energetico_por_kHa,
  },
};

/** Uses that take land out of production, and therefore push agricultural pressure up. */
const PRODUCTIVE_SOURCES = new Set<ParcelKind>([
  LandUseType.ConventionalCrops, LandUseType.AgroecologicalCrops, LandUseType.GrasslandsPastures,
]);

const WATER_KINDS = new Set<ParcelKind>(['water', 'lake', 'wetland', 'bridge', LandUseType.PublicWetland]);

export type PublicUseError =
  | 'out-of-bounds' | 'not-convertible' | 'no-area' | 'insufficient-funds' | 'needs-water';

export type PublicUseResult =
  | { ok: true; state: GameState; territory: Territory; cost: number; use: PublicUse; cells: number[] }
  | { ok: false; reason: PublicUseError };

/** Parcels in one lot on this map (50 at 0.1 kHa per parcel). */
export const lotParcels = (t: Pick<Territory, 'kHaPerParcel'>): number => Math.max(1, Math.round(LOT_KHA / t.kHaPerParcel));

/** One-time cost of declaring a full lot of `use` (LOT_KHA), under the given control parameters. */
export function publicUseCost(use: PublicUse, CP: ControlParams, kHa = LOT_KHA): number {
  return RULES[use].cost(CP) * kHa;
}

/** Land use a parcel becomes under `use`. */
export const publicUseTarget = (use: PublicUse): MapLandUse => RULES[use].target;

const eligible = (p: Parcel, rule: PublicUseRule) => rule.from.includes(p.kind as ProductiveKind) && !p.declared;

function nearWater(t: Territory, i: number): boolean {
  const x = i % t.size;
  const y = (i / t.size) | 0;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const p = parcelAt(t, x + dx, y + dy);
      if (p && WATER_KINDS.has(p.kind)) return true;
    }
  }
  return false;
}

/** Whether a lot of `use` can start at (x, y) right now, ignoring the treasury. */
export function canDeclare(territory: Territory, x: number, y: number, use: PublicUse): boolean {
  const parcel = parcelAt(territory, x, y);
  if (!parcel) return false;
  const rule = RULES[use];
  if (!eligible(parcel, rule)) return false;
  return !rule.requiresWater || nearWater(territory, idx(territory, x, y));
}

/**
 * The lot a declaration at (x, y) would take: up to `lotParcels` eligible parcels connected to the
 * one picked, nearest first, so lots are compact. Empty if the picked parcel is not eligible.
 */
export function lotFor(territory: Territory, x: number, y: number, use: PublicUse): number[] {
  if (!canDeclare(territory, x, y, use)) return [];
  const rule = RULES[use];
  const want = lotParcels(territory);
  const start = idx(territory, x, y);
  const seen = new Set<number>([start]);
  const found: number[] = [];
  const queue = [start];
  while (queue.length && found.length < want * 4) {
    const i = queue.shift()!;
    found.push(i);
    neighbors8(territory, i).forEach((j) => {
      if (seen.has(j)) return;
      seen.add(j);
      if (eligible(territory.parcels[j], rule)) queue.push(j);
    });
  }
  const d2 = (i: number) => (i % territory.size - x) ** 2 + (((i / territory.size) | 0) - y) ** 2;
  return found
    .sort((a, b) => d2(a) - d2(b) || hash01(a, b, territory.seed) - 0.5)
    .slice(0, want);
}

/**
 * Declares the lot around (x, y) as a public use: moves its area in the model, pays the cost
 * (per kHa actually moved) from Reservas_del_Tesoro, and — for the part that was farmland — adds
 * the agricultural-pressure impulse that taking land out of production causes. Parcels whose area
 * the model no longer holds are left out (fallow parcels draw on the model's fallow area, FAL), so a
 * declaration never creates land. Pure: returns new state and territory, or the reason it is not possible.
 */
export function declarePublicUse(
  state: GameState,
  territory: Territory,
  x: number,
  y: number,
  use: PublicUse,
  CP: ControlParams,
  now?: number,
): PublicUseResult {
  const parcel = parcelAt(territory, x, y);
  if (!parcel) return { ok: false, reason: 'out-of-bounds' };
  const rule = RULES[use];
  if (!eligible(parcel, rule)) return { ok: false, reason: 'not-convertible' };
  if (rule.requiresWater && !nearWater(territory, idx(territory, x, y))) return { ok: false, reason: 'needs-water' };

  const kHa = territory.kHaPerParcel;
  const available = {} as Record<ProductiveKind, number>;
  PRODUCTIVE_KINDS.forEach((k) => { available[k] = state.landUses[landUseOfKind(k)]?.area ?? 0; });
  // A map larger than the model's area (a game that lost area before phase 37) shows the excess as
  // fallow too; it stays declarable, as before.
  available.fallow += Math.max(0, productiveCount(territory) * kHa - totalArea(state.landUses));
  const cells = lotFor(territory, x, y, use).filter((i) => {
    const k = territory.parcels[i].kind as ProductiveKind;
    if (!(available[k] >= kHa - 1e-9)) return false;
    available[k] -= kHa;
    return true;
  });
  if (!cells.length) return { ok: false, reason: 'no-area' };

  const cost = RULES[use].cost(CP) * kHa * cells.length;
  if (state.stellaSpecificState.Reservas_del_Tesoro < cost) return { ok: false, reason: 'insufficient-funds' };

  const landUses = { ...state.landUses };
  let farmland = 0;
  cells.forEach((i) => {
    const source = territory.parcels[i].kind as ProductiveKind;
    if (PRODUCTIVE_SOURCES.has(source)) farmland++;
    // Fallow parcels come out of the model's fallow area (phase 37; before, they subtracted nothing).
    // The pre-37 excess shown as fallow holds no model area: only FAL's part is subtracted.
    const lu = landUseOfKind(source);
    const take = source === 'fallow' ? Math.min(kHa, Math.max(0, landUses[lu]?.area ?? 0)) : kHa;
    if (take > 0) landUses[lu] = { ...landUses[lu], area: landUses[lu].area - take };
  });
  landUses[rule.target] = { ...landUses[rule.target], area: landUses[rule.target].area + kHa * cells.length };

  const reserves = state.stellaSpecificState.Reservas_del_Tesoro - cost;
  const pressure = farmland > 0
    ? Math.min(100, state.stellaSpecificState.PP_AGRICOLA + CP.Impulso_PP_Agricola_por_kHa_Convertida * kHa * farmland)
    : state.stellaSpecificState.PP_AGRICOLA;

  const next: GameState = {
    ...state,
    landUses,
    // Model 1.1 (phase 34, T-07): the forest the player protects is counted apart from the
    // protection the model's own flows add, for the public-nature route and the upkeep.
    ...(use === 'protected' ? { declaredProtectedArea: (state.declaredProtectedArea ?? 0) + kHa * cells.length } : {}),
    stellaSpecificState: { ...state.stellaSpecificState, Reservas_del_Tesoro: reserves, PP_AGRICOLA: pressure },
    indicators: { ...state.indicators, treasuryReserves: reserves, ppAgricola: pressure },
  };
  const parcels = territory.parcels.slice();
  cells.forEach((i) => { parcels[i] = { ...parcels[i], kind: rule.target, declared: true, declaredAt: now }; });
  return { ok: true, state: next, territory: { ...territory, parcels }, cost, use, cells };
}

/** Back-compat alias: declaring a protected area is just one of the public uses. */
export const declareProtectedArea = (
  state: GameState, territory: Territory, x: number, y: number, CP: ControlParams,
): PublicUseResult => declarePublicUse(state, territory, x, y, 'protected', CP);

export const protectedAreaCost = (CP: ControlParams, kHa = LOT_KHA): number => publicUseCost('protected', CP, kHa);
