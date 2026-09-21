/**
 * Renders the Territorio map (src/sim/territory.ts) as a flat top-down PPM, one pixel block per
 * parcel, to check the geography and the land-use layout without the browser:
 *   npx tsx scripts/territory-preview.ts [seed] [out.ppm]
 */
import { writeFileSync } from 'node:fs';
import { createInitialState, createTerritory, REGIONS } from '../src/sim';
import { LandUseType } from '../src/types';

const COLOR: Record<string, [number, number, number]> = {
  void: [8, 16, 14], sea: [30, 70, 110], water: [60, 140, 200], lake: [70, 150, 190], wetland: [80, 150, 140],
  coast: [230, 215, 160], rocky: [140, 120, 100], grass: [150, 160, 90], road: [60, 50, 40], bridge: [120, 90, 60],
  [LandUseType.UnprotectedNativeForest]: [40, 110, 50], [LandUseType.ProtectedNativeForest]: [20, 70, 35],
  [LandUseType.AgroecologicalCrops]: [140, 200, 90], [LandUseType.ConventionalCrops]: [215, 185, 80],
  [LandUseType.ForestPlantations]: [90, 150, 70], [LandUseType.GrasslandsPastures]: [185, 205, 120],
  [LandUseType.PublicWetland]: [70, 170, 160], [LandUseType.RestorationForest]: [120, 170, 60],
  [LandUseType.EnergyPark]: [95, 179, 201], fallow: [200, 150, 100],
};
const URBAN: [number, number, number] = [200, 90, 80];

const seed = Number(process.argv[2] ?? 1);
const out = process.argv[3] ?? 'territory.ppm';
const { gameStatePatch } = createInitialState(2);
const t0 = Date.now();
const t = createTerritory(gameStatePatch.landUses, seed);
const ms = Date.now() - t0;
const S = 6;
const W = t.size * S;
const buf = Buffer.alloc(W * W * 3);
t.parcels.forEach((p, i) => {
  const c = COLOR[p.kind] ?? URBAN;
  const border = t.geo.region[i] >= 0 && (t.geo.region[i + 1] !== t.geo.region[i] || t.geo.region[i + t.size] !== t.geo.region[i]);
  for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) {
    const o = ((p.y * S + dy) * W + p.x * S + dx) * 3;
    const edge = border && (dx === S - 1 || dy === S - 1);
    buf[o] = edge ? 255 : c[0]; buf[o + 1] = edge ? 255 : c[1]; buf[o + 2] = edge ? 255 : c[2];
  }
});
writeFileSync(out, Buffer.concat([Buffer.from(`P6 ${W} ${W} 255\n`), buf]));
const counts: Record<string, number> = {};
t.parcels.forEach((p) => { counts[p.kind] = (counts[p.kind] ?? 0) + 1; });
const byRegion = REGIONS.map((r, k) => `${r}:${t.geo.region.filter((v) => v === k).length}`).join(' ');
console.log(`${ms} ms, kHa/parcel ${t.kHaPerParcel}`, byRegion, JSON.stringify(counts));
