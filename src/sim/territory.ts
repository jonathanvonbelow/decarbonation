/**
 * Territory map <-> land-use areas, for the Territorio preview (mejora-general/files/21_fusion_ecosim.md §4-5).
 *
 * The model keeps land use as six areas in kHa (`GameState.landUses`); the preview shows it as a
 * 12×12 isometric map. This module is the only bridge between the two, and it is one-directional
 * except for a single, explicit player action:
 *
 *   model → map   `syncTerritory` quantises the areas into parcels of `KHA_PER_PARCEL` and changes the
 *                 fewest parcels needed. A changing parcel is taken from the frontier of the use that
 *                 grows (deforestation visibly advances from the crops; reserves grow from their
 *                 edges). A hysteresis band keeps parcels from flickering when an area sits near a
 *                 rounding boundary. Parcels the player declared protected never move.
 *   map → model   `declareProtectedArea` is the only way the player changes land use directly: one
 *                 native-forest parcel becomes protected, moving its kHa from BNNP to BNP in the model
 *                 and paying a one-time cost from the treasury. Everything downstream of land use —
 *                 carbon balance, biodiversity, food and economic security, deforestation flows, the
 *                 native-forest win condition — reads those areas, so the action reaches every
 *                 equation that uses the datum without any of them changing.
 *
 * Area the model stops accounting for (a drought event removes crop area with no paired transfer —
 * docs/audit-equations.md item L-1) is shown honestly as `fallow` parcels rather than hidden.
 *
 * Pure and deterministic: no React, no Math.random; layout noise and tie-breaks come from `seed`.
 */
import type { ControlParams, GameState, LandUse } from '../types';
import { LandUseType } from '../types';

export const TERRITORY_SIZE = 12;
export const KHA_PER_PARCEL = 5;
/** A parcel changes use only when its use is off by more than this (in parcels, summed both ways). */
const HYSTERESIS = 1.2;

export type ContextKind = 'water' | 'wetland' | 'urban' | 'market' | 'industry';
export type ProductiveKind = LandUseType | 'fallow';
export type ParcelKind = ProductiveKind | ContextKind;

export interface Parcel {
  x: number;
  y: number;
  kind: ParcelKind;
  /** Declared protected by the player (only on ProtectedNativeForest parcels). Never moved by sync. */
  declared?: boolean;
}

export interface Territory {
  size: number;
  kHaPerParcel: number;
  seed: number;
  parcels: Parcel[];
}

export interface ParcelChange {
  x: number;
  y: number;
  from: ParcelKind;
  to: ParcelKind;
}

const LAND_USES = Object.values(LandUseType) as LandUseType[];
const PRODUCTIVE_KINDS: ProductiveKind[] = [...LAND_USES, 'fallow'];
const CONTEXT_KINDS = new Set<ParcelKind>(['water', 'wetland', 'urban', 'market', 'industry']);

export const isProductive = (kind: ParcelKind): kind is ProductiveKind => !CONTEXT_KINDS.has(kind);

/** Near-town → wilderness order used for the initial layout. */
const LAYOUT_ORDER: LandUseType[] = [
  LandUseType.ConventionalCrops,
  LandUseType.AgroecologicalCrops,
  LandUseType.GrasslandsPastures,
  LandUseType.ForestPlantations,
  LandUseType.UnprotectedNativeForest,
  LandUseType.ProtectedNativeForest,
];

/* ── Deterministic helpers ─────────────────────────────────────────────────────────────────── */

function hash01(x: number, y: number, seed: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Smooth value noise in [0,1): a 5×5 lattice of seeded values, bilinearly interpolated. */
function valueNoise(x: number, y: number, size: number, seed: number): number {
  const fx = (x / Math.max(1, size - 1)) * 4;
  const fy = (y / Math.max(1, size - 1)) * 4;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const v = (i: number, j: number) => hash01(i, j, seed + 7919);
  const a = v(x0, y0) * (1 - tx) + v(x0 + 1, y0) * tx;
  const b = v(x0, y0 + 1) * (1 - tx) + v(x0 + 1, y0 + 1) * tx;
  return a * (1 - ty) + b * ty;
}

const idx = (t: { size: number }, x: number, y: number) => y * t.size + x;

export function parcelAt(t: Territory, x: number, y: number): Parcel | null {
  if (x < 0 || y < 0 || x >= t.size || y >= t.size) return null;
  return t.parcels[idx(t, x, y)];
}

function neighbors8(t: Territory, p: Parcel): Parcel[] {
  const out: Parcel[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const n = parcelAt(t, p.x + dx, p.y + dy);
      if (n) out.push(n);
    }
  }
  return out;
}

/* ── Quantisation ──────────────────────────────────────────────────────────────────────────── */

/**
 * Area of each productive kind, in parcels. The `fallow` share is whatever part of the
 * productive map the model no longer accounts for. If the model ever held *more* area than the
 * map (no current event does that), every use is scaled down to fit.
 */
export function parcelTargets(
  landUses: Record<LandUseType, LandUse>,
  productiveCount: number,
  kHaPerParcel = KHA_PER_PARCEL,
): Record<ProductiveKind, number> {
  const raw = {} as Record<ProductiveKind, number>;
  let total = 0;
  LAND_USES.forEach((k) => {
    raw[k] = Math.max(0, landUses[k].area) / kHaPerParcel;
    total += raw[k];
  });
  if (total > productiveCount) {
    LAND_USES.forEach((k) => { raw[k] = (raw[k] * productiveCount) / total; });
    raw.fallow = 0;
  } else {
    raw.fallow = productiveCount - total;
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
    counts[k] = Math.floor(target[k]);
    assigned += counts[k];
  });
  const byRemainder = [...PRODUCTIVE_KINDS].sort((a, b) => (target[b] - Math.floor(target[b])) - (target[a] - Math.floor(target[a])));
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
  return t.parcels.filter((p) => isProductive(p.kind)).length;
}

/* ── Layout ────────────────────────────────────────────────────────────────────────────────── */

/**
 * Builds the initial map for `landUses`: a river crossing the region, four wetlands on its banks,
 * a small town in the south-east corner, and the productive parcels laid out from the town outward
 * (conventional crops nearest, then agroecological, pastures, plantations, unprotected and finally
 * protected native forest), with smooth noise so the uses form patches rather than stripes.
 */
export function createTerritory(landUses: Record<LandUseType, LandUse>, seed = 1): Territory {
  const size = TERRITORY_SIZE;
  const parcels: Parcel[] = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) parcels.push({ x, y, kind: 'fallow' });
  const t: Territory = { size, kHaPerParcel: KHA_PER_PARCEL, seed, parcels };

  // Town: the 3×3 south-east corner minus its inner corner.
  const town: [number, number, ContextKind][] = [
    [10, 10, 'urban'], [11, 11, 'urban'], [10, 11, 'urban'], [11, 10, 'urban'],
    [9, 10, 'market'], [9, 11, 'market'], [10, 9, 'industry'], [11, 9, 'industry'],
  ];
  town.forEach(([x, y, kind]) => { parcelAt(t, x, y)!.kind = kind; });

  // River: one parcel per column, meandering north-west → south-east, clear of the town.
  const river: Parcel[] = [];
  for (let x = 0; x < size; x++) {
    const y = Math.max(0, Math.min(size - 1, Math.round(2 + 0.45 * x + Math.sin(x / 1.8))));
    const p = parcelAt(t, x, y)!;
    p.kind = 'water';
    river.push(p);
  }

  // Wetlands: four bank parcels (4-neighbours of the river), picked by seeded hash.
  const bank = new Map<number, Parcel>();
  river.forEach((r) => {
    [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dx, dy]) => {
      const n = parcelAt(t, r.x + dx, r.y + dy);
      if (n && n.kind === 'fallow') bank.set(idx(t, n.x, n.y), n);
    });
  });
  [...bank.values()]
    .sort((a, b) => hash01(a.x, a.y, seed) - hash01(b.x, b.y, seed))
    .slice(0, 4)
    .forEach((p) => { p.kind = 'wetland'; });

  // Productive parcels: rank by distance from the town plus smooth noise, fill in layout order.
  const productive = parcels.filter((p) => p.kind === 'fallow');
  const maxDist = Math.hypot(size - 1, size - 1);
  const rank = (p: Parcel) => Math.hypot(size - 1 - p.x, size - 1 - p.y) / maxDist + 0.35 * valueNoise(p.x, p.y, size, seed);
  productive.sort((a, b) => rank(a) - rank(b) || hash01(a.x, a.y, seed) - hash01(b.x, b.y, seed));

  const counts = parcelCounts(landUses, productive.length, KHA_PER_PARCEL);
  let i = 0;
  LAYOUT_ORDER.forEach((kind) => {
    for (let n = 0; n < counts[kind]; n++) productive[i++].kind = kind;
  });
  // Whatever is left (only when the model already lost area) stays fallow, at the far end.
  return t;
}

/* ── Model → map ───────────────────────────────────────────────────────────────────────────── */

/** Distance (Chebyshev) from `p` to the nearest parcel of `kind`, or `size` if there is none. */
function distanceTo(t: Territory, p: Parcel, kind: ParcelKind): number {
  let best = t.size;
  t.parcels.forEach((q) => {
    if (q.kind === kind) best = Math.min(best, Math.max(Math.abs(q.x - p.x), Math.abs(q.y - p.y)));
  });
  return best;
}

/** Picks which parcel of `from` becomes `to`: frontier first, never a declared reserve if avoidable. */
function pickParcel(t: Territory, from: ProductiveKind, to: ProductiveKind): Parcel | null {
  let best: Parcel | null = null;
  let bestScore = -Infinity;
  for (const p of t.parcels) {
    if (p.kind !== from) continue;
    const touching = neighbors8(t, p).filter((n) => n.kind === to).length;
    const score = (p.declared ? -1000 : 0) + touching * 10 - distanceTo(t, p, to) + hash01(p.x, p.y, t.seed);
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

/**
 * Brings the map in line with the model's areas, changing the fewest parcels needed. Returns a
 * new territory (the input is not mutated) and the list of parcels that changed, in order.
 */
export function syncTerritory(
  territory: Territory,
  landUses: Record<LandUseType, LandUse>,
): { territory: Territory; changes: ParcelChange[] } {
  const t: Territory = { ...territory, parcels: territory.parcels.map((p) => ({ ...p })) };
  const counts = countKinds(t);
  const target = parcelTargets(landUses, productiveCount(t), t.kHaPerParcel);
  const changes: ParcelChange[] = [];

  const error = (k: ProductiveKind) => target[k] - counts[k];
  for (let guard = 0; guard < t.parcels.length * 2; guard++) {
    let deficit: ProductiveKind = PRODUCTIVE_KINDS[0];
    let surplus: ProductiveKind | null = null;
    for (const k of PRODUCTIVE_KINDS) {
      if (error(k) > error(deficit)) deficit = k;
      if (counts[k] > 0 && (surplus === null || error(k) < error(surplus))) surplus = k;
    }
    if (surplus === null || deficit === surplus) break;
    if (error(deficit) - error(surplus) <= HYSTERESIS) break;
    const parcel = pickParcel(t, surplus, deficit);
    if (!parcel) break;
    changes.push({ x: parcel.x, y: parcel.y, from: parcel.kind, to: deficit });
    parcel.kind = deficit;
    parcel.declared = false;
    counts[surplus]--;
    counts[deficit]++;
  }
  return { territory: t, changes };
}

/* ── Map → model: public uses ──────────────────────────────────────────────────────────────── */

export type PublicUseError = 'out-of-bounds' | 'not-native-forest' | 'no-forest-area' | 'insufficient-funds';

export type PublicUseResult =
  | { ok: true; state: GameState; territory: Territory; cost: number }
  | { ok: false; reason: PublicUseError };

/** Cost of declaring one parcel protected, under the given control parameters. */
export function protectedAreaCost(CP: ControlParams, kHaPerParcel = KHA_PER_PARCEL): number {
  return CP.Costo_Declaracion_Area_Protegida_por_kHa * kHaPerParcel;
}

/**
 * Declares the unprotected native-forest parcel at (x, y) a protected area: moves one parcel of
 * area from BNNP to BNP in the model and pays the one-time cost from Reservas_del_Tesoro. Pure:
 * returns new state and territory, or the reason it is not possible.
 */
export function declareProtectedArea(
  state: GameState,
  territory: Territory,
  x: number,
  y: number,
  CP: ControlParams,
): PublicUseResult {
  const parcel = parcelAt(territory, x, y);
  if (!parcel) return { ok: false, reason: 'out-of-bounds' };
  if (parcel.kind !== LandUseType.UnprotectedNativeForest) return { ok: false, reason: 'not-native-forest' };
  const kHa = territory.kHaPerParcel;
  if (state.landUses[LandUseType.UnprotectedNativeForest].area < kHa) return { ok: false, reason: 'no-forest-area' };
  const cost = protectedAreaCost(CP, kHa);
  if (state.stellaSpecificState.Reservas_del_Tesoro < cost) return { ok: false, reason: 'insufficient-funds' };

  const next: GameState = {
    ...state,
    landUses: {
      ...state.landUses,
      [LandUseType.UnprotectedNativeForest]: {
        ...state.landUses[LandUseType.UnprotectedNativeForest],
        area: state.landUses[LandUseType.UnprotectedNativeForest].area - kHa,
      },
      [LandUseType.ProtectedNativeForest]: {
        ...state.landUses[LandUseType.ProtectedNativeForest],
        area: state.landUses[LandUseType.ProtectedNativeForest].area + kHa,
      },
    },
    stellaSpecificState: {
      ...state.stellaSpecificState,
      Reservas_del_Tesoro: state.stellaSpecificState.Reservas_del_Tesoro - cost,
    },
    indicators: {
      ...state.indicators,
      treasuryReserves: state.stellaSpecificState.Reservas_del_Tesoro - cost,
    },
  };
  const nextTerritory: Territory = {
    ...territory,
    parcels: territory.parcels.map((p) =>
      p.x === x && p.y === y ? { ...p, kind: LandUseType.ProtectedNativeForest, declared: true } : p),
  };
  return { ok: true, state: next, territory: nextTerritory, cost };
}
