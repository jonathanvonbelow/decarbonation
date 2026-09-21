/**
 * Sprite choice for the isometric map (22_arte_territorio_expansion.md §3.1, §5).
 *
 * Every element has four design variants in the same art direction. Which one a parcel gets comes
 * from a hash of its coordinates, biased toward the variant drawn with its region's character
 * (v1 Norte agrícola, v2 Centro metropolitano, v3 Sur boscoso, v4 Costa), so the map reads as one
 * landscape with four accents instead of a repeating pattern. Variants are chosen in 2×2 blocks so
 * neighbouring parcels of the same use tend to share a design and form patches.
 *
 * Sprites are pure art: nothing here decides anything, and the same parcel always looks the same.
 */
import { hash01, REGIONS, type ParcelKind, type RoadMaterial, type Territory } from '../sim';
import { LandUseType } from '../types';

const LU = LandUseType;

/** Base art for each parcel kind. `null` = nothing is drawn (outside the territory). */
export const STEM_FOR_KIND: Record<ParcelKind, string | null> = {
  [LU.UnprotectedNativeForest]: 'forest',
  [LU.ProtectedNativeForest]: 'forest_protected',
  [LU.AgroecologicalCrops]: 'regen',
  [LU.ConventionalCrops]: 'intensive',
  [LU.ForestPlantations]: 'reforest',
  [LU.GrasslandsPastures]: 'pasture',
  [LU.PublicWetland]: 'wetland_public',
  [LU.RestorationForest]: 'restoration',
  [LU.EnergyPark]: 'energy_solar',
  fallow: 'fallow',
  void: null,
  sea: 'water',
  water: 'water_river',
  lake: 'water_lake',
  wetland: 'wetland_natural',
  coast: 'coast',
  rocky: 'rocky',
  grass: 'grass',
  road: 'grass',
  bridge: 'bridge',
  housing_1: 'housing_1',
  housing_2: 'housing_2',
  housing_3: 'housing_3',
  housing_4: 'housing_4',
  housing_informal: 'housing_informal',
  market_1: 'market_1',
  market_2: 'market_2',
  logistics: 'logistics',
  industry_1: 'industry_1',
  industry_2: 'industry_2',
  industry_3: 'industry_3',
  fishing_port: 'fishing_port',
  processing_plant: 'processing_plant',
  power_plant: 'power_plant',
  school: 'school',
  health: 'health',
  civic: 'civic',
  tourism: 'tourism',
  water_treatment: 'water_treatment',
  waste_site: 'waste_site',
};

/** Flat colour used until a sprite has loaded (and in the low-detail fallback). */
export const FALLBACK: Record<string, string> = {
  forest: '#2a4a32', forest_protected: '#20401f', regen: '#4a7a48', orchard: '#4f7f46', intensive: '#8a7a3a',
  reforest: '#3a5a38', restoration: '#5a6a3a', pasture: '#6a7f42', fallow: '#8a7550', grass: '#6a7a4a',
  water: '#2f5f80', water_river: '#356a8c', water_lake: '#356a8c', wetland_natural: '#3a6a62', wetland_public: '#3f6f66',
  coast: '#7a8a72', rocky: '#6a6258', bridge: '#6a5a44', energy_solar: '#3f5f75', energy_wind: '#6a7f62',
  housing_1: '#7a6a52', housing_2: '#84705a', housing_3: '#8a7a68', housing_4: '#7f7f7f', housing_informal: '#7a6658',
  market_1: '#8a6a4a', market_2: '#8a7a6a', logistics: '#7a6a58', industry_1: '#5f5248', industry_2: '#57504c',
  industry_3: '#5a4a48', fishing_port: '#5f6f7a', processing_plant: '#6a7278', power_plant: '#5a5250',
  school: '#7f7a5a', health: '#8a8070', civic: '#8a7a5a', tourism: '#6f7a5a', water_treatment: '#5f6a6a',
  waste_site: '#5a5348',
};

/**
 * Which axis each straight road piece actually runs along, measured on the art (alpha at the
 * middle of each edge of the parcel face): the piece named `ns` runs along the x axis in dirt and
 * paved, and along the y axis in the coastal set — the names are not consistent between materials,
 * so the map reads them from here instead of trusting them. The `t` pieces are not consistent
 * either (dirt and paved are corners, only the coastal one is a T), so junctions are composed from
 * the straight pieces; `x` is a true four-way cross in all three.
 */
export const ROAD_AXIS: Record<RoadMaterial, { alongX: string; alongY: string }> = {
  dirt: { alongX: 'ns', alongY: 'ew' },
  paved: { alongX: 'ns', alongY: 'ew' },
  coastal: { alongX: 'ew', alongY: 'ns' },
};

/**
 * Variants whose rows run along the opposite diagonal to the rest of their element, measured with
 * the dominant direction of the texture: plantation rows and restoration lines would cross their
 * neighbours' at ninety degrees. Mirroring the tile turns them the right way; they are flat
 * textures, so the mirrored light reads the same.
 */
const MIRRORED_VARIANTS = new Set(['reforest_v1', 'reforest_v4', 'restoration_v1']);

const KIND_SALT: Record<string, number> = {};
let saltSeed = 17;
const saltFor = (stem: string) => (KIND_SALT[stem] ??= (saltSeed = (saltSeed * 31 + stem.length) % 9973));

export interface Sprite {
  stem: string;
  /** Mirrored horizontally: swaps the two ground axes, giving coasts and bridges their other side. */
  flip: boolean;
}

const ENERGY_WIND_REGIONS = new Set(['norte', 'costa']);

/**
 * Art for the parcel at index `i`: base element, variant, and the mirroring that makes a coast or
 * a bridge face the right way.
 */
export function spriteFor(t: Territory, i: number): Sprite | null {
  const p = t.parcels[i];
  const x = p.x;
  const y = p.y;
  const region = t.geo.region[i];
  let stem = STEM_FOR_KIND[p.kind];
  if (!stem) return null;
  // Agro-ecology alternates between row crops and orchards; energy parks are wind where it blows.
  if (p.kind === LU.AgroecologicalCrops && hash01(x, y, t.seed + 11) < 0.3) stem = 'orchard';
  if (p.kind === LU.EnergyPark && region >= 0 && ENERGY_WIND_REGIONS.has(REGIONS[region])) stem = 'energy_wind';

  // Variants are picked per 3×3 block, so a use reads as fields of its own rather than as noise.
  const block = hash01(Math.floor(x / 3), Math.floor(y / 3), t.seed + saltFor(stem));
  const regional = region >= 0 ? region + 1 : 1 + Math.floor(hash01(x, y, t.seed + 5) * 4);
  const variant = block < 0.22
    ? regional
    : 1 + Math.floor(hash01(Math.floor(x / 3), Math.floor(y / 3), t.seed + saltFor(stem) + 3) * 4);
  const name = `${stem}_v${Math.min(4, variant)}`;

  let flip = MIRRORED_VARIANTS.has(name);
  const kindOf = (dx: number, dy: number) => {
    const nx = x + dx;
    const ny = y + dy;
    return nx >= 0 && ny >= 0 && nx < t.size && ny < t.size ? t.parcels[ny * t.size + nx].kind : undefined;
  };
  if (p.kind === 'coast') {
    // Measured on the art: the water covers the −x and +y sides of the tile. Mirroring swaps the
    // two ground axes, putting it on +x and −y, so the beach faces whichever way the sea is.
    const sea = (dx: number, dy: number) => (kindOf(dx, dy) === 'sea' ? 1 : 0);
    flip = sea(1, 0) + sea(0, -1) > sea(-1, 0) + sea(0, 1);
  } else if (p.kind === 'bridge') {
    // The deck spans the x axis and the river runs under it along y; mirror it the other way round.
    const river = (dx: number, dy: number) => kindOf(dx, dy) === 'water' || kindOf(dx, dy) === 'lake';
    flip = river(1, 0) || river(-1, 0);
  }
  return { stem: name, flip };
}

/** Animated elements: sprite sheets of 192×192 frames in a row (§6). */
export interface AnimDef { sheet: string; frames: number; fps: number }

export const KIND_ANIM: Partial<Record<ParcelKind, AnimDef>> = {
  water: { sheet: 'water_river_sheet_12f', frames: 12, fps: 8 },
  sea: { sheet: 'water_river_sheet_12f', frames: 12, fps: 6 },
  lake: { sheet: 'water_lake_sheet_4f', frames: 4, fps: 5 },
  coast: { sheet: 'coast_sheet_12f', frames: 12, fps: 8 },
  fishing_port: { sheet: 'fishing_port_sheet_4f', frames: 4, fps: 5 },
  industry_3: { sheet: 'industry_3_sheet_4f', frames: 4, fps: 6 },
};

export const FX_ANIM: Record<string, AnimDef> = {
  fire: { sheet: 'fx_fire_sheet_12f', frames: 12, fps: 10 },
  smog: { sheet: 'fx_smog_sheet_4f', frames: 4, fps: 4 },
};

/** Land-use changes that have an animation of their own (§6.1). */
export const TRANSITIONS: Record<string, AnimDef> = {
  [`${LU.UnprotectedNativeForest}>${LU.ConventionalCrops}`]: { sheet: 'forest_to_intensive_sheet_12f', frames: 12, fps: 11 },
  [`${LU.ConventionalCrops}>${LU.AgroecologicalCrops}`]: { sheet: 'intensive_to_regen_sheet_12f', frames: 12, fps: 11 },
  [`fallow>${LU.RestorationForest}`]: { sheet: 'fallow_to_restoration_sheet_12f', frames: 12, fps: 11 },
  [`${LU.ConventionalCrops}>${LU.RestorationForest}`]: { sheet: 'fallow_to_restoration_sheet_12f', frames: 12, fps: 11 },
  [`${LU.GrasslandsPastures}>${LU.RestorationForest}`]: { sheet: 'fallow_to_restoration_sheet_12f', frames: 12, fps: 11 },
};

/**
 * Portraits (§5.7): twelve actors with four faces each, differing in age, gender and phenotype.
 * Which face an actor shows is deterministic per `key` (a situation or event id), so the same
 * matter always arrives with the same person.
 */
export const PORTRAIT_ACTORS = [
  'farmer', 'citizen', 'industry', 'ngo', 'scientist', 'mayor',
  'union', 'fisher', 'indigenous', 'youth', 'journalist', 'investor',
] as const;
export type PortraitActor = (typeof PORTRAIT_ACTORS)[number];

export function portraitUrl(actor: PortraitActor, key = ''): string {
  let h = 7;
  for (let i = 0; i < key.length; i++) h = (Math.imul(h, 31) + key.charCodeAt(i)) | 0;
  const variant = 1 + (Math.abs(h) % 4);
  return `/assets/ecosim/portraits/${actor}_v${variant}.webp`;
}

export const tileUrl = (stem: string) => `/assets/ecosim/tiles/${stem}.webp`;
export const roadUrl = (material: string, piece: string) => `/assets/ecosim/roads/road_${material}_${piece}.webp`;
export const fxUrl = (fx: string, v: number) => `/assets/ecosim/fx/fx_${fx}_v${v}.webp`;
export const sheetUrl = (sheet: string) => `/assets/ecosim/anim/${sheet}.webp`;

/** Every stem the map can need, for preloading. */
export function allStems(): string[] {
  const out = new Set<string>();
  Object.values(STEM_FOR_KIND).forEach((stem) => {
    if (!stem) return;
    for (let v = 1; v <= 4; v++) out.add(`${stem}_v${v}`);
  });
  for (let v = 1; v <= 4; v++) {
    out.add(`orchard_v${v}`);
    out.add(`energy_wind_v${v}`);
  }
  return [...out];
}
