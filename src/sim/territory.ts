/**
 * Territory map <-> land-use areas, for the Territorio preview (mejora-general/files/21_fusion_ecosim.md §4-5).
 *
 * The model keeps land use as six areas in kHa (`GameState.landUses`); the preview shows it as a
 * 12×12 isometric map. This module is the only bridge between the two, and it is one-directional
 * except for a single, explicit player action:
 *
 *   model → map   `syncTerritory` moves parcels along the transfers the model actually made that
 *                 month (`stepMonth`'s `flows`): one parcel per `KHA_PER_PARCEL` of accumulated flow,
 *                 taken from the frontier of the use that grows (deforestation visibly advances from
 *                 the crops; reserves grow from their edges). Every change drawn is a transition the
 *                 model makes. The map lags each flow by less than a parcel (measured ≤ 2.45 parcels
 *                 for any use); a net-area safety net with a hysteresis band covers the rest without
 *                 flickering. Indicators always read the exact areas, never parcel counts. Parcels the
 *                 player declared protected never move.
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
  /**
   * kHa each model flow has moved that the map has not drawn yet, keyed `from>to`. A parcel moves
   * along a flow once its accumulator reaches one parcel.
   */
  pending: Record<string, number>;
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

const LAND_USES = Object.values(LandUseType) as LandUseType[];
const PRODUCTIVE_KINDS: ProductiveKind[] = [...LAND_USES, 'fallow'];
const CONTEXT_KINDS = new Set<ParcelKind>(['water', 'wetland', 'urban', 'market', 'industry']);

export const isProductive = (kind: ParcelKind): kind is ProductiveKind => !CONTEXT_KINDS.has(kind);

/** Near-town → wilderness order used for the initial layout. */
const LAYOUT_ORDER: LandUseType[] = [
  LandUseType.EnergyPark,
  LandUseType.ConventionalCrops,
  LandUseType.AgroecologicalCrops,
  LandUseType.GrasslandsPastures,
  LandUseType.PublicWetland,
  LandUseType.RestorationForest,
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
  const t: Territory = { size, kHaPerParcel: KHA_PER_PARCEL, seed, parcels, pending: {} };

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

/**
 * Where each use can grow from, following the model's own flows (landUse.ts: BNNP→BNP, BNNP→CC,
 * BNNP→CA, CA→BNNP, CC→CA; drought events remove CC and CA area → fallow). Pairing deficits with
 * these sources keeps the map from showing transitions the model never makes — without it, a
 * month where conservation protects forest (BNNP→BNP) while farmers convert (CC→CA) could be drawn
 * as "a crop became a reserve".
 */
const SOURCES: Partial<Record<ProductiveKind, ProductiveKind[]>> = {
  [LandUseType.ProtectedNativeForest]: [LandUseType.UnprotectedNativeForest],
  [LandUseType.ConventionalCrops]: [LandUseType.UnprotectedNativeForest],
  [LandUseType.AgroecologicalCrops]: [LandUseType.ConventionalCrops, LandUseType.UnprotectedNativeForest],
  [LandUseType.UnprotectedNativeForest]: [LandUseType.AgroecologicalCrops, LandUseType.RestorationForest],
  fallow: [LandUseType.ConventionalCrops, LandUseType.AgroecologicalCrops],
  // Public uses only ever grow because the player declared them (declarePublicUse below), but the
  // safety net still needs to know where their area came from.
  [LandUseType.PublicWetland]: [LandUseType.ConventionalCrops, LandUseType.GrasslandsPastures, 'fallow'],
  [LandUseType.RestorationForest]: [LandUseType.ConventionalCrops, LandUseType.GrasslandsPastures, 'fallow'],
  [LandUseType.EnergyPark]: [LandUseType.GrasslandsPastures, LandUseType.ConventionalCrops, 'fallow'],
};

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
  const move = (from: ProductiveKind, to: ProductiveKind): boolean => {
    const parcel = pickParcel(t, from, to);
    if (!parcel) return false;
    changes.push({ x: parcel.x, y: parcel.y, from: parcel.kind, to });
    parcel.kind = to;
    parcel.declared = false;
    counts[from]--;
    counts[to]++;
    return true;
  };

  flows.forEach((f) => {
    if (f.kHa <= 0) return;
    const key = `${f.from}>${f.to}`;
    t.pending[key] = (t.pending[key] ?? 0) + f.kHa;
  });
  Object.keys(t.pending).forEach((key) => {
    const [from, to] = key.split('>') as [ProductiveKind, ProductiveKind];
    while (t.pending[key] >= t.kHaPerParcel && counts[from] > 0) {
      if (!move(from, to)) break;
      t.pending[key] -= t.kHaPerParcel;
    }
    // A flow out of a use that has no parcels left cannot be drawn; don't let it pile up.
    if (counts[from] === 0) t.pending[key] = Math.min(t.pending[key], t.kHaPerParcel);
  });

  // Error not explained by flows still accumulating: a use whose inflow is 3 kHa short of a parcel
  // is *expected* to be 0.6 parcel below its area, and must not be "corrected" by some other route.
  const inFlight = (k: ProductiveKind) => Object.entries(t.pending).reduce((sum, [key, kHa]) => {
    const [from, to] = key.split('>');
    return sum + (to === k ? kHa : 0) - (from === k ? kHa : 0);
  }, 0) / t.kHaPerParcel;
  const error = (k: ProductiveKind) => target[k] - counts[k] - inFlight(k);
  for (let guard = 0; guard < t.parcels.length * 2; guard++) {
    // Every (deficit, surplus) pair far enough apart to justify moving a parcel. Model flows win
    // over any other pairing; among flows, the most constrained deficit (fewest sources) goes
    // first so it is not starved by a use that had alternatives; then the widest gap.
    let best: { deficit: ProductiveKind; surplus: ProductiveKind; score: number } | null = null;
    for (const deficit of PRODUCTIVE_KINDS) {
      for (const surplus of PRODUCTIVE_KINDS) {
        if (deficit === surplus || counts[surplus] === 0) continue;
        const gap = error(deficit) - error(surplus);
        if (gap <= HYSTERESIS) continue;
        const sources = SOURCES[deficit] ?? [];
        const score = (sources.includes(surplus) ? 0 : 100) + sources.length - gap * 0.01;
        if (!best || score < best.score) best = { deficit, surplus, score };
      }
    }
    if (!best) break;
    const { deficit, surplus } = best;
    if (!move(surplus, deficit)) break;
  }
  return { territory: t, changes };
}

/* ── Map → model: public uses ──────────────────────────────────────────────────────────────── */

/**
 * The public uses a player can declare (21_fusion_ecosim.md §5, decisión 4 del equipo). They are the
 * only direct change to land use in the game: everything else comes out of the model's dynamics.
 * Each one moves a parcel's worth of area into a land use the model already prices — rates and
 * weights live in constants.ts — and pays a one-time cost from the treasury.
 */
export type PublicUse = 'protected' | 'restoration' | 'wetland' | 'energy';

export const PUBLIC_USES: PublicUse[] = ['protected', 'restoration', 'wetland', 'energy'];

interface PublicUseRule {
  /** Land use the parcel becomes. */
  target: LandUseType;
  /** Parcel kinds that can be declared into it. */
  from: ProductiveKind[];
  cost: (CP: ControlParams) => number;
  /** Wetlands can only be declared next to the river or an existing wetland. */
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

export type PublicUseError =
  | 'out-of-bounds' | 'not-convertible' | 'no-area' | 'insufficient-funds' | 'needs-water';

export type PublicUseResult =
  | { ok: true; state: GameState; territory: Territory; cost: number; use: PublicUse }
  | { ok: false; reason: PublicUseError };

/** One-time cost of declaring one parcel of `use`, under the given control parameters. */
export function publicUseCost(use: PublicUse, CP: ControlParams, kHaPerParcel = KHA_PER_PARCEL): number {
  return RULES[use].cost(CP) * kHaPerParcel;
}

/** Land use a parcel becomes under `use`. */
export const publicUseTarget = (use: PublicUse): LandUseType => RULES[use].target;

/** Whether the parcel at (x, y) could be declared as `use` right now, ignoring the treasury. */
export function canDeclare(territory: Territory, x: number, y: number, use: PublicUse): boolean {
  const parcel = parcelAt(territory, x, y);
  if (!parcel) return false;
  const rule = RULES[use];
  if (!rule.from.includes(parcel.kind as ProductiveKind)) return false;
  if (rule.requiresWater && !neighbors8(territory, parcel).some((n) => n.kind === 'water' || n.kind === 'wetland')) return false;
  return true;
}

/**
 * Declares the parcel at (x, y) as a public use: moves one parcel of area in the model, pays the
 * cost from Reservas_del_Tesoro, and — when the land was productive — adds the agricultural-pressure
 * impulse that taking farmland out of production causes. Pure: returns new state and territory, or
 * the reason it is not possible.
 */
export function declarePublicUse(
  state: GameState,
  territory: Territory,
  x: number,
  y: number,
  use: PublicUse,
  CP: ControlParams,
): PublicUseResult {
  const parcel = parcelAt(territory, x, y);
  if (!parcel) return { ok: false, reason: 'out-of-bounds' };
  const rule = RULES[use];
  if (!rule.from.includes(parcel.kind as ProductiveKind)) return { ok: false, reason: 'not-convertible' };
  if (rule.requiresWater && !neighbors8(territory, parcel).some((n) => n.kind === 'water' || n.kind === 'wetland')) {
    return { ok: false, reason: 'needs-water' };
  }

  const kHa = territory.kHaPerParcel;
  const source = parcel.kind as ProductiveKind;
  const takesArea = source !== 'fallow';
  if (takesArea && state.landUses[source as LandUseType].area < kHa) return { ok: false, reason: 'no-area' };

  const cost = publicUseCost(use, CP, kHa);
  if (state.stellaSpecificState.Reservas_del_Tesoro < cost) return { ok: false, reason: 'insufficient-funds' };

  const landUses = { ...state.landUses };
  if (takesArea) {
    landUses[source as LandUseType] = {
      ...landUses[source as LandUseType],
      area: landUses[source as LandUseType].area - kHa,
    };
  }
  landUses[rule.target] = { ...landUses[rule.target], area: landUses[rule.target].area + kHa };

  const reserves = state.stellaSpecificState.Reservas_del_Tesoro - cost;
  const pressure = PRODUCTIVE_SOURCES.has(parcel.kind)
    ? Math.min(100, state.stellaSpecificState.PP_AGRICOLA + CP.Impulso_PP_Agricola_por_kHa_Convertida * kHa)
    : state.stellaSpecificState.PP_AGRICOLA;

  const next: GameState = {
    ...state,
    landUses,
    stellaSpecificState: { ...state.stellaSpecificState, Reservas_del_Tesoro: reserves, PP_AGRICOLA: pressure },
    indicators: { ...state.indicators, treasuryReserves: reserves, ppAgricola: pressure },
  };
  const nextTerritory: Territory = {
    ...territory,
    parcels: territory.parcels.map((p) => (p.x === x && p.y === y ? { ...p, kind: rule.target, declared: true } : p)),
  };
  return { ok: true, state: next, territory: nextTerritory, cost, use };
}

/** Back-compat alias: declaring a protected area is just one of the public uses. */
export const declareProtectedArea = (
  state: GameState, territory: Territory, x: number, y: number, CP: ControlParams,
): PublicUseResult => declarePublicUse(state, territory, x, y, 'protected', CP);

export const protectedAreaCost = (CP: ControlParams, kHaPerParcel = KHA_PER_PARCEL): number =>
  publicUseCost('protected', CP, kHaPerParcel);
