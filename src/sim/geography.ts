/**
 * Geography of the Territorio preview: the fixed landscape the model's land use is laid on
 * (mejora-general/files/22_arte_territorio_expansion.md §4, expanded to 100×100).
 *
 * The region is an irregular 100×100 grid: land shaped by smooth noise, a sea that bites into the
 * south-east edge, and "void" outside the territory's borders. Four regions share it (the level-2
 * regions of `INITIAL_REGIONAL_ZONES_DATA`): Norte Agrícola (NW quadrant), Centro Metropolitana
 * (NE), Sur Boscoso (SW) and Costera Pesquera (SE), split along noisy borders.
 *
 * Everything here is *context*: river, lakes, natural wetlands, rocky hills, beaches, roads and
 * settlements. None of it is land the model accounts for. The rest — exactly `PRODUCTIVE_PARCELS`
 * cells — is productive land whose use comes from the model (territory.ts). The generator trims
 * the territory's rim to natural grassland / rock until that count is exact, so one parcel is
 * always exactly (model area / PRODUCTIVE_PARCELS) and nothing is invented or lost in rounding.
 *
 * Settlements are made of *slots* that `urbanKind` turns into a building each month from the
 * model's economy and social wellbeing (development is drawn, never paid for in land: towns grow
 * into lots reserved for them, never into productive parcels).
 *
 * Pure and deterministic: no React, no Math.random.
 */

export const GRID_SIZE = 100;
/** Productive parcels on the map: the model's whole area is divided among them. */
export const PRODUCTIVE_PARCELS = 6000;

export type RegionId = 'norte' | 'centro' | 'sur' | 'costa';
export const REGIONS: RegionId[] = ['norte', 'centro', 'sur', 'costa'];

export type UrbanKind =
  | 'housing_1' | 'housing_2' | 'housing_3' | 'housing_4' | 'housing_informal'
  | 'market_1' | 'market_2' | 'logistics'
  | 'industry_1' | 'industry_2' | 'industry_3'
  | 'fishing_port' | 'processing_plant' | 'power_plant'
  | 'school' | 'health' | 'civic' | 'tourism' | 'water_treatment' | 'waste_site';

export type NaturalKind = 'void' | 'sea' | 'water' | 'lake' | 'wetland' | 'coast' | 'rocky' | 'grass' | 'road' | 'bridge';

export type ContextKind = NaturalKind | UrbanKind;

export const URBAN_KINDS: UrbanKind[] = [
  'housing_1', 'housing_2', 'housing_3', 'housing_4', 'housing_informal', 'market_1', 'market_2', 'logistics',
  'industry_1', 'industry_2', 'industry_3', 'fishing_port', 'processing_plant', 'power_plant',
  'school', 'health', 'civic', 'tourism', 'water_treatment', 'waste_site',
];
export const CONTEXT_KINDS: ContextKind[] = [
  'void', 'sea', 'water', 'lake', 'wetland', 'coast', 'rocky', 'grass', 'road', 'bridge', ...URBAN_KINDS,
];

export type RoadMaterial = 'dirt' | 'paved' | 'coastal';

/**
 * A cell of a settlement whose building follows the model:
 *   housing   density level `base` (1-4) rises with the economy, up to `cap`
 *   lot       reserved land (natural grass) that becomes housing when the town grows
 *   informal  fringe land that becomes an informal settlement when social wellbeing collapses
 *   industry  a plant that reads as heavy (industry_3) while emissions stay high, and cleaner
 *             (industry_2) as they fall
 */
export interface UrbanSlot {
  i: number;
  role: 'housing' | 'lot' | 'informal' | 'industry';
  base: number;
  cap: number;
  /** Deterministic 0-1: which slots change first. */
  rank: number;
}

export interface Settlement {
  id: 'metro' | 'norte' | 'sur' | 'puerto';
  x: number;
  y: number;
  region: RegionId;
}

export interface Geography {
  size: number;
  seed: number;
  /** Region per cell (index into REGIONS), -1 outside the territory (void and sea). */
  region: number[];
  /** Road material per cell (road and bridge cells only). */
  road: (RoadMaterial | null)[];
  /** Initial kind of every cell: a context kind, or 'productive' for land the model assigns. */
  base: (ContextKind | 'productive')[];
  slots: UrbanSlot[];
  settlements: Settlement[];
  /** Rim cells (0-1, 1 = deep inside the territory), used to place and order land uses. */
  interior: number[];
  /** Distance, in cells, to the nearest settlement. */
  townDistance: number[];
  /** Distance, in cells, to the river, lakes or wetlands. */
  waterDistance: number[];
}

/* ── Deterministic noise ───────────────────────────────────────────────────────────────────── */

export function hash01(x: number, y: number, seed: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

function lattice(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smooth(x - x0);
  const ty = smooth(y - y0);
  const a = hash01(x0, y0, seed) * (1 - tx) + hash01(x0 + 1, y0, seed) * tx;
  const b = hash01(x0, y0 + 1, seed) * (1 - tx) + hash01(x0 + 1, y0 + 1, seed) * tx;
  return a * (1 - ty) + b * ty;
}

/** Fractal value noise in [0,1), `scale` = feature size in cells. */
export function fbm(x: number, y: number, scale: number, seed: number): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1 / scale;
  let norm = 0;
  for (let o = 0; o < 4; o++) {
    sum += amp * lattice(x * freq + o * 17.3, y * freq - o * 9.1, seed + o * 1013);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

/* ── Grid helpers ──────────────────────────────────────────────────────────────────────────── */

const N4: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const N8: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

/** Multi-source BFS distance (8-neighbour, in cells) from every cell where `source` holds. */
export function distanceField(size: number, source: (i: number) => boolean, passable: (i: number) => boolean = () => true): number[] {
  const dist = new Array<number>(size * size).fill(Infinity);
  const queue = new Int32Array(size * size);
  let head = 0;
  let tail = 0;
  for (let i = 0; i < size * size; i++) {
    if (source(i)) {
      dist[i] = 0;
      queue[tail++] = i;
    }
  }
  while (head < tail) {
    const i = queue[head++];
    const x = i % size;
    const y = (i / size) | 0;
    for (const [dx, dy] of N8) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      const j = ny * size + nx;
      if (dist[j] !== Infinity || !passable(j)) continue;
      dist[j] = dist[i] + 1;
      queue[tail++] = j;
    }
  }
  return dist;
}

/* ── Generator ─────────────────────────────────────────────────────────────────────────────── */

type Cell = ContextKind | 'productive';

interface Draft {
  size: number;
  seed: number;
  kind: Cell[];
  score: number[];
  region: number[];
  road: (RoadMaterial | null)[];
  slots: UrbanSlot[];
  settlements: Settlement[];
}

const isLand = (k: Cell) => k !== 'void' && k !== 'sea';

/** Land silhouette score: lower = more inside. The sea line is noisy so the coast has bays. */
function carve(size: number, seed: number, landCells: number): { kind: Cell[]; score: number[] } {
  const c = (size - 1) / 2;
  const score = new Array<number>(size * size);
  const kind = new Array<Cell>(size * size).fill('void');
  const sea = new Array<boolean>(size * size).fill(false);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const dx = Math.abs(x - c) / (c - 2);
      const dy = Math.abs(y - c) / (c - 2);
      const d = (dx ** 2.4 + dy ** 2.4) ** (1 / 2.4);
      score[i] = d + 0.34 * (fbm(x, y, 26, seed) - 0.5) + 0.12 * (fbm(x, y, 8, seed + 3) - 0.5);
      // South-east coast: the sea covers everything past a wavy diagonal.
      const coastLine = x + y + 64 * (fbm(x, y, 20, seed + 11) - 0.5) + 18 * (fbm(x, y, 6, seed + 12) - 0.5);
      sea[i] = coastLine > size * 1.6;
    }
  }
  // Take the `landCells` best cells that are not sea…
  const order = score.map((s, i) => i).filter((i) => !sea[i]).sort((a, b) => score[a] - score[b]);
  order.slice(0, landCells).forEach((i) => { kind[i] = 'productive'; });
  // …keep the largest 4-connected piece…
  const comp = new Int32Array(size * size).fill(-1);
  let best = -1;
  let bestSize = 0;
  let id = 0;
  for (let i = 0; i < size * size; i++) {
    if (kind[i] !== 'productive' || comp[i] >= 0) continue;
    const stack = [i];
    comp[i] = id;
    let n = 0;
    while (stack.length) {
      const p = stack.pop()!;
      n++;
      const x = p % size;
      const y = (p / size) | 0;
      for (const [ox, oy] of N4) {
        const nx = x + ox;
        const ny = y + oy;
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
        const j = ny * size + nx;
        if (kind[j] === 'productive' && comp[j] < 0) {
          comp[j] = id;
          stack.push(j);
        }
      }
    }
    if (n > bestSize) {
      bestSize = n;
      best = id;
    }
    id++;
  }
  for (let i = 0; i < size * size; i++) if (kind[i] === 'productive' && comp[i] !== best) kind[i] = 'void';
  // …fill enclosed holes, and give the sea its cells.
  const outside = new Array<boolean>(size * size).fill(false);
  const stack: number[] = [];
  for (let i = 0; i < size * size; i++) {
    const x = i % size;
    const y = (i / size) | 0;
    if ((x === 0 || y === 0 || x === size - 1 || y === size - 1) && kind[i] !== 'productive') {
      outside[i] = true;
      stack.push(i);
    }
  }
  while (stack.length) {
    const p = stack.pop()!;
    const x = p % size;
    const y = (p / size) | 0;
    for (const [ox, oy] of N4) {
      const nx = x + ox;
      const ny = y + oy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      const j = ny * size + nx;
      if (!outside[j] && kind[j] !== 'productive') {
        outside[j] = true;
        stack.push(j);
      }
    }
  }
  for (let i = 0; i < size * size; i++) {
    if (kind[i] === 'productive') continue;
    if (!outside[i]) kind[i] = 'productive';
    else if (sea[i]) kind[i] = 'sea';
  }
  // A cell left as 'void' in the middle of the sea draws as a hole: any void cell that is mostly
  // surrounded by water becomes water too. (Only that — filling every void reachable from the sea
  // would swallow the land borders, which are not coast.)
  for (let pass = 0; pass < 3; pass++) {
    const fill: number[] = [];
    for (let i = 0; i < size * size; i++) {
      if (kind[i] !== 'void') continue;
      const x = i % size;
      const y = (i / size) | 0;
      let seaN = 0;
      for (const [dx, dy] of N8) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
        if (kind[ny * size + nx] === 'sea') seaN++;
      }
      if (seaN >= 5) fill.push(i);
    }
    if (!fill.length) break;
    fill.forEach((i) => { kind[i] = 'sea'; });
  }
  return { kind, score };
}

/** Region weights for a cell: soft quadrant split along a noisy border. */
export function regionWeights(x: number, y: number, size: number, seed: number): [number, number, number, number] {
  // The split sits a little south-east of the centre so the coast, cut by the sea, keeps its share.
  const wx = x + 44 * (fbm(x, y, 24, seed + 21) - 0.5);
  const wy = y + 44 * (fbm(x, y, 24, seed + 22) - 0.5);
  const band = 6;
  const east = Math.min(1, Math.max(0, (wx - size * 0.47 + band) / (2 * band)));
  const south = Math.min(1, Math.max(0, (wy - size * 0.46 + band) / (2 * band)));
  return [(1 - east) * (1 - south), east * (1 - south), (1 - east) * south, east * south];
}

function rasterLine(ax: number, ay: number, bx: number, by: number, visit: (x: number, y: number) => void) {
  // 4-connected walk, so the river and roads never touch only by a corner.
  let x = Math.round(ax);
  let y = Math.round(ay);
  const tx = Math.round(bx);
  const ty = Math.round(by);
  visit(x, y);
  while (x !== tx || y !== ty) {
    const ex = Math.abs(tx - x);
    const ey = Math.abs(ty - y);
    if (ex >= ey) x += Math.sign(tx - x);
    else y += Math.sign(ty - y);
    visit(x, y);
  }
}

/**
 * Meandering 4-connected course through `points`, ending wherever `stop` says.
 *
 * The meander is a long wave (a bend every ~16 cells) plus slow noise: a short-period wobble makes
 * the rasterised course zig-zag from cell to cell, and on the map that reads as a lattice of canals
 * instead of a river.
 */
function drawCourse(d: Draft, points: [number, number][], amp: number, stop: (i: number) => boolean, mark: (i: number) => void) {
  const { size, seed } = d;
  const pts: [number, number][] = [];
  let travelled = 0;
  for (let s = 0; s < points.length - 1; s++) {
    const [ax, ay] = points[s];
    const [bx, by] = points[s + 1];
    const len = Math.hypot(bx - ax, by - ay);
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    for (let t = 0; t < len; t += 0.5) {
      const u = t / len;
      const along = travelled + t;
      const wobble = amp * (Math.sin(along / 16 + (seed % 7)) * 0.7 + (fbm(along, s * 13, 22, seed + 40) - 0.5) * 1.4);
      pts.push([ax + (bx - ax) * u + nx * wobble, ay + (by - ay) * u + ny * wobble]);
    }
    travelled += len;
  }
  pts.push(points[points.length - 1]);
  let done = false;
  for (let k = 0; k < pts.length - 1 && !done; k++) {
    rasterLine(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], (x, y) => {
      if (done || x < 0 || y < 0 || x >= size || y >= size) return;
      const i = y * size + x;
      if (stop(i)) {
        done = true;
        return;
      }
      mark(i);
    });
  }
  return done;
}

function nearestLand(d: Draft, x: number, y: number, ok: (i: number) => boolean = (i) => d.kind[i] === 'productive'): [number, number] {
  let best: [number, number] = [x, y];
  let bestD = Infinity;
  for (let j = 0; j < d.size * d.size; j++) {
    if (!ok(j)) continue;
    const jx = j % d.size;
    const jy = (j / d.size) | 0;
    const dd = (jx - x) ** 2 + (jy - y) ** 2;
    if (dd < bestD) {
      bestD = dd;
      best = [jx, jy];
    }
  }
  return best;
}

function paintWater(d: Draft) {
  const { size, seed } = d;
  const S = size / 100;
  const water = (i: number) => d.kind[i] === 'water' || d.kind[i] === 'lake';
  const setWater = (i: number) => { if (isLand(d.kind[i])) d.kind[i] = 'water'; };
  const lake = (cx: number, cy: number, r: number) => {
    for (let y = Math.floor(cy - r - 2); y <= cy + r + 2; y++) {
      for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x++) {
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const i = y * size + x;
        const rr = r * (0.8 + 0.45 * fbm(x, y, 3, seed + 50));
        if (isLand(d.kind[i]) && Math.hypot(x - cx, y - cy) <= rr) d.kind[i] = 'lake';
      }
    }
  };

  // Main river: springs in the southern forest, runs through the metropolitan centre and reaches
  // the sea on the fishing coast. Lake on its upper course (Sur), a lagoon in the pampa (Norte).
  const src = nearestLand(d, 16 * S, 80 * S);
  const lakeAt = nearestLand(d, 30 * S, 67 * S);
  lake(lakeAt[0], lakeAt[1], 3.4 * S);
  lake(20 * S, 28 * S, 2.3 * S);
  lake(74 * S, 20 * S, 1.6 * S);
  const main: [number, number][] = [src, lakeAt, [46 * S, 54 * S], [58 * S, 45 * S], [70 * S, 50 * S], [80 * S, 62 * S], [96 * S, 82 * S]];
  const upper = new Set<number>();
  drawCourse(d, main, 1.0, (i) => d.kind[i] === 'sea', (i) => { setWater(i); upper.add(i); });
  // The course stays one cell wide: widening it turned the lower river into a braid of parallel
  // channels once the staircase of the raster was taken into account.
  // Tributary from the northern plain, joining the main river.
  drawCourse(d, [nearestLand(d, 22 * S, 12 * S), [30 * S, 24 * S], [42 * S, 34 * S], [54 * S, 44 * S], [60 * S, 48 * S]], 0.8,
    (i) => upper.has(i), setWater);

  // Natural wetlands: river banks where the ground is low, lake shores and the delta.
  const wd = distanceField(size, water);
  const seaD = distanceField(size, (i) => d.kind[i] === 'sea');
  for (let i = 0; i < size * size; i++) {
    if (d.kind[i] !== 'productive') continue;
    const x = i % size;
    const y = (i / size) | 0;
    // Wetlands sit where the ground is low, in patches along the banks — not as a fringe on every
    // water cell, which turned the river into a wide braid of its own.
    const low = fbm(x, y, 9, seed + 60);
    if ((wd[i] === 1 && low > 0.63) || (wd[i] <= 2 && seaD[i] <= 5 && low > 0.52)) d.kind[i] = 'wetland';
  }
}

function paintRelief(d: Draft) {
  const { size, seed } = d;
  for (let i = 0; i < size * size; i++) {
    if (d.kind[i] !== 'productive' || d.region[i] !== 2) continue;
    const x = i % size;
    const y = (i / size) | 0;
    const ridge = 1 - Math.abs(fbm(x, y, 14, seed + 70) - 0.5) * 2;
    if (ridge > 0.9 && fbm(x, y, 4, seed + 71) > 0.45) d.kind[i] = 'rocky';
  }
}

function paintCoast(d: Draft) {
  const { size } = d;
  for (let i = 0; i < size * size; i++) {
    if (d.kind[i] !== 'productive' && d.kind[i] !== 'wetland') continue;
    const x = i % size;
    const y = (i / size) | 0;
    const shore = N4.some(([ox, oy]) => {
      const nx = x + ox;
      const ny = y + oy;
      return nx >= 0 && ny >= 0 && nx < size && ny < size && d.kind[ny * size + nx] === 'sea';
    });
    if (shore && d.kind[i] === 'productive') d.kind[i] = 'coast';
  }
}

interface Ring { upTo: number; pick: (h: number, i: number) => { kind: UrbanKind | 'grass'; slot?: Omit<UrbanSlot, 'i' | 'rank'> } }

function settle(d: Draft, s: Settlement, radius: number, rings: Ring[]) {
  const { size, seed } = d;
  for (let y = Math.floor(s.y - radius - 3); y <= s.y + radius + 3; y++) {
    for (let x = Math.floor(s.x - radius - 3); x <= s.x + radius + 3; x++) {
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      const i = y * size + x;
      if (d.kind[i] !== 'productive' && d.kind[i] !== 'coast') continue;
      const u = Math.hypot(x - s.x, y - s.y) * (0.82 + 0.36 * fbm(x, y, 4, seed + 80)) / radius;
      const ring = rings.find((r) => u <= r.upTo);
      if (!ring || (d.kind[i] === 'coast' && u > 0.35)) continue;
      const h = hash01(x, y, seed + 81);
      const { kind, slot } = ring.pick(h, i);
      d.kind[i] = kind;
      if (slot) d.slots.push({ ...slot, i, rank: hash01(x, y, seed + 82) });
    }
  }
}

const housing = (base: number, cap: number) => ({ kind: `housing_${base}` as UrbanKind, slot: { role: 'housing' as const, base, cap } });
const lot = (cap: number) => ({ kind: 'grass' as const, slot: { role: 'lot' as const, base: 0, cap } });
const informal = () => ({ kind: 'grass' as const, slot: { role: 'informal' as const, base: 0, cap: 1 } });
const industry = () => ({ kind: 'industry_3' as UrbanKind, slot: { role: 'industry' as const, base: 3, cap: 3 } });
const fixed = (kind: UrbanKind) => ({ kind });

function paintSettlements(d: Draft) {
  const { size } = d;
  const S = size / 100;
  const land = (i: number) => d.kind[i] === 'productive';
  const at = (x: number, y: number) => nearestLand(d, x * S, y * S, land);

  // Centro Metropolitana: dense core, industrial district downstream, periurban fringe.
  const [mx, my] = at(66, 34);
  const metro: Settlement = { id: 'metro', x: mx, y: my, region: 'centro' };
  const [ix, iy] = at(73, 41);
  settle(d, { ...metro, x: ix, y: iy }, 3.4 * S, [
    { upTo: 0.25, pick: () => fixed('power_plant') },
    { upTo: 0.7, pick: (h) => (h < 0.62 ? industry() : h < 0.8 ? fixed('logistics') : fixed('industry_2')) },
    { upTo: 1, pick: (h) => (h < 0.3 ? industry() : h < 0.45 ? fixed('water_treatment') : h < 0.55 ? fixed('waste_site') : lot(1)) },
  ]);
  settle(d, metro, 9 * S, [
    { upTo: 0.12, pick: () => fixed('civic') },
    { upTo: 0.3, pick: (h) => (h < 0.1 ? fixed('health') : h < 0.2 ? fixed('market_2') : housing(4, 4)) },
    { upTo: 0.55, pick: (h) => (h < 0.08 ? fixed('school') : h < 0.16 ? fixed('market_2') : h < 0.2 ? fixed('health') : housing(3, 4)) },
    { upTo: 0.78, pick: (h) => (h < 0.08 ? fixed('school') : h < 0.16 ? fixed('market_1') : housing(2, 4)) },
    { upTo: 1, pick: (h) => (h < 0.45 ? housing(1, 3) : h < 0.78 ? lot(3) : informal()) },
  ]);

  // Norte: farm town with silos and a small agro-industry.
  const [nx, ny] = at(27, 24);
  const norte: Settlement = { id: 'norte', x: nx, y: ny, region: 'norte' };
  settle(d, norte, 3.6 * S, [
    { upTo: 0.25, pick: () => fixed('civic') },
    { upTo: 0.55, pick: (h) => (h < 0.18 ? fixed('market_1') : h < 0.3 ? fixed('school') : housing(2, 3)) },
    { upTo: 1, pick: (h) => (h < 0.2 ? fixed('logistics') : h < 0.3 ? fixed('industry_1') : h < 0.65 ? housing(1, 2) : lot(2)) },
  ]);

  // Sur: tourist village by the lake.
  const [sx, sy] = at(35, 71);
  const sur: Settlement = { id: 'sur', x: sx, y: sy, region: 'sur' };
  settle(d, sur, 3 * S, [
    { upTo: 0.3, pick: () => fixed('civic') },
    { upTo: 0.6, pick: (h) => (h < 0.3 ? fixed('tourism') : h < 0.4 ? fixed('health') : housing(1, 2)) },
    { upTo: 1, pick: (h) => (h < 0.35 ? fixed('tourism') : h < 0.7 ? housing(1, 2) : lot(2)) },
  ]);

  // Costa: fishing port by the river mouth.
  const mouth = nearestLand(d, 86 * S, 74 * S, (i) => d.kind[i] === 'coast');
  const [px, py] = nearestLand(d, mouth[0] - 3, mouth[1] - 2, land);
  const puerto: Settlement = { id: 'puerto', x: px, y: py, region: 'costa' };
  settle(d, puerto, 4 * S, [
    { upTo: 0.2, pick: () => fixed('civic') },
    { upTo: 0.5, pick: (h) => (h < 0.15 ? fixed('market_1') : h < 0.25 ? fixed('health') : housing(2, 3)) },
    { upTo: 1, pick: (h) => (h < 0.25 ? fixed('processing_plant') : h < 0.4 ? fixed('tourism') : h < 0.7 ? housing(1, 3) : lot(3)) },
  ]);
  // Harbour: coast cells near the town become fishing ports; a few beaches get tourism.
  const coastCells = d.kind.map((k, i) => (k === 'coast' ? i : -1)).filter((i) => i >= 0);
  coastCells
    .sort((a, b) => Math.hypot(a % size - px, ((a / size) | 0) - py) - Math.hypot(b % size - px, ((b / size) | 0) - py))
    .slice(0, 3)
    .forEach((i) => { d.kind[i] = 'fishing_port'; });
  coastCells
    .filter((i) => d.kind[i] === 'coast' && hash01(i % size, (i / size) | 0, d.seed + 90) < 0.06)
    .forEach((i) => { d.kind[i] = 'tourism'; });

  d.settlements = [metro, norte, sur, puerto];

  // Hamlets: single farmsteads spread over the countryside (they densify with the economy too).
  const spots: [number, number][] = [];
  for (let k = 0; k < 400 && spots.length < 16 * S * S; k++) {
    const x = Math.floor(hash01(k, 1, d.seed + 91) * size);
    const y = Math.floor(hash01(k, 2, d.seed + 91) * size);
    const i = y * size + x;
    if (d.kind[i] !== 'productive' || d.region[i] === 2) continue;
    const far = [...spots, ...d.settlements.map((t) => [t.x, t.y] as [number, number])].every(([ax, ay]) => Math.hypot(ax - x, ay - y) > 11 * S);
    if (!far) continue;
    spots.push([x, y]);
    d.kind[i] = 'housing_1';
    d.slots.push({ i, role: 'housing', base: 1, cap: 2, rank: hash01(x, y, d.seed + 92) });
  }
}

/** Cheapest 4-connected path (Dijkstra) between two cells for a road. */
function roadPath(d: Draft, from: [number, number], to: [number, number]): number[] {
  const { size } = d;
  const cost = (i: number) => {
    const k = d.kind[i];
    if (k === 'void' || k === 'sea' || k === 'lake') return Infinity;
    if (k === 'road' || k === 'bridge') return 0.35;
    if (k === 'water') return 7;
    if (k === 'rocky' || k === 'wetland') return 4;
    if (URBAN_KINDS.includes(k as UrbanKind)) return 2.2;
    return 1 + 1.6 * fbm(i % size, (i / size) | 0, 6, d.seed + 100);
  };
  const dist = new Float64Array(size * size).fill(Infinity);
  const prev = new Int32Array(size * size).fill(-1);
  const start = from[1] * size + from[0];
  const goal = to[1] * size + to[0];
  dist[start] = 0;
  // Binary heap on [dist, index].
  const heap: [number, number][] = [[0, start]];
  const push = (e: [number, number]) => {
    heap.push(e);
    let c = heap.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (heap[p][0] <= heap[c][0]) break;
      [heap[p], heap[c]] = [heap[c], heap[p]];
      c = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let c = 0;
      for (;;) {
        const l = 2 * c + 1;
        const r = l + 1;
        let m = c;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === c) break;
        [heap[m], heap[c]] = [heap[c], heap[m]];
        c = m;
      }
    }
    return top;
  };
  while (heap.length) {
    const [dd, i] = pop();
    if (i === goal) break;
    if (dd > dist[i]) continue;
    const x = i % size;
    const y = (i / size) | 0;
    for (const [ox, oy] of N4) {
      const nx = x + ox;
      const ny = y + oy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      const j = ny * size + nx;
      // No bridge may start or end on water: crossing must be straight.
      const c = cost(j);
      if (c === Infinity) continue;
      const nd = dd + c;
      if (nd < dist[j]) {
        dist[j] = nd;
        prev[j] = i;
        push([nd, j]);
      }
    }
  }
  if (dist[goal] === Infinity) return [];
  const path: number[] = [];
  for (let i = goal; i !== -1; i = prev[i]) path.push(i);
  return path.reverse();
}

function paintRoads(d: Draft) {
  const { size } = d;
  const [metro, norte, sur, puerto] = d.settlements;
  const hub = (s: Settlement): [number, number] => [s.x, s.y];
  const lay = (a: [number, number], b: [number, number]) => {
    roadPath(d, a, b).forEach((i) => {
      const k = d.kind[i];
      if (k === 'civic' || k === 'fishing_port') return;
      const region = d.region[i];
      const inMetro = Math.hypot(i % size - metro.x, ((i / size) | 0) - metro.y) < 10 * (size / 100);
      d.road[i] = inMetro || region === 1 ? 'paved' : region === 3 ? 'coastal' : 'dirt';
      d.kind[i] = k === 'water' ? 'bridge' : 'road';
    });
  };
  lay(hub(metro), hub(norte));
  lay(hub(metro), hub(puerto));
  lay(hub(metro), hub(sur));
  lay(hub(norte), hub(sur));
  lay(hub(sur), hub(puerto));
  // Hamlets hang off the network by their nearest road.
  d.slots.filter((s) => s.base === 1 && s.cap === 2 && d.kind[s.i] === 'housing_1').forEach((s) => {
    const x = s.i % size;
    const y = (s.i / size) | 0;
    const road = nearestLand(d, x, y, (i) => d.kind[i] === 'road');
    if (Math.hypot(road[0] - x, road[1] - y) > 14 * (size / 100)) return;
    const path = roadPath(d, [x, y], road).slice(1, -1);
    // Farm tracks are the one exception to "roads cross water on bridges": they stop at the river.
    if (path.some((i) => d.kind[i] === 'water')) return;
    path.forEach((i) => {
      d.kind[i] = 'road';
      d.road[i] = d.region[i] === 1 ? 'paved' : d.region[i] === 3 ? 'coastal' : 'dirt';
    });
  });
}

/** Trims the rim to natural land (grass, or rock in the Sur) until exactly `target` stay productive. */
function trimToTarget(d: Draft, target: number): boolean {
  const productive = d.kind.map((k, i) => (k === 'productive' ? i : -1)).filter((i) => i >= 0);
  if (productive.length < target) return false;
  const surplus = productive.length - target;
  productive
    .sort((a, b) => d.score[b] - d.score[a] || a - b)
    .slice(0, surplus)
    .forEach((i) => { d.kind[i] = d.region[i] === 2 && hash01(i, 7, d.seed) < 0.5 ? 'rocky' : 'grass'; });
  return true;
}

function build(size: number, seed: number, landCells: number): Draft {
  const { kind, score } = carve(size, seed, landCells);
  const d: Draft = { size, seed, kind, score, region: new Array(size * size).fill(-1), road: new Array(size * size).fill(null), slots: [], settlements: [] };
  for (let i = 0; i < size * size; i++) {
    if (!isLand(kind[i])) continue;
    const w = regionWeights(i % size, (i / size) | 0, size, seed);
    d.region[i] = w.indexOf(Math.max(...w));
  }
  paintWater(d);
  paintRelief(d);
  paintCoast(d);
  paintSettlements(d);
  paintRoads(d);
  return d;
}

/**
 * Builds the fixed geography. The land budget is found by construction: a first pass measures how
 * much context the features take, and the second leaves a thin natural rim to trim.
 */
export function createGeography(seed = 1, size = GRID_SIZE): Geography {
  const target = Math.round(PRODUCTIVE_PARCELS * (size / GRID_SIZE) ** 2);
  // Aim for a natural rim of about 3% of the productive land, trimmed away below.
  const wanted = Math.round(target * 1.03);
  let land = Math.round(target * 1.2);
  let d = build(size, seed, land);
  for (let attempt = 0; attempt < 8; attempt++) {
    const productive = d.kind.filter((k) => k === 'productive').length;
    if (productive >= target && productive <= target * 1.06) break;
    land = Math.min(size * size - 1, land + (wanted - productive));
    d = build(size, seed, land);
  }
  if (!trimToTarget(d, target)) throw new Error('createGeography: territory too small for the productive target');

  const water = (i: number) => d!.kind[i] === 'water' || d!.kind[i] === 'lake' || d!.kind[i] === 'wetland' || d!.kind[i] === 'bridge';
  const outside = (i: number) => !isLand(d!.kind[i]);
  const rim = distanceField(size, outside);
  const maxRim = Math.max(...rim.filter((v) => v !== Infinity));
  const towns = distanceField(size, (i) => URBAN_KINDS.includes(d!.kind[i] as UrbanKind));
  return {
    size,
    seed,
    region: d.region,
    road: d.road,
    base: d.kind,
    // A road laid over a slot takes the cell: it no longer develops.
    slots: d.slots.filter((s) => d!.kind[s.i] !== 'road' && d!.kind[s.i] !== 'bridge'),
    settlements: d.settlements,
    interior: rim.map((v) => (v === Infinity ? 0 : v / maxRim)),
    townDistance: towns.map((v) => (v === Infinity ? size : v)),
    waterDistance: distanceField(size, water).map((v) => (v === Infinity ? size : v)),
  };
}

/* ── Urban development (drawn from the model) ─────────────────────────────────────────────── */

export interface Development {
  /** Economic growth since the start, 0 = as at the start (real GDP ratio − 1, ≥ 0). */
  growth: number;
  /** 0-1: how far social wellbeing has collapsed (0 = fine). */
  hardship: number;
  /** 0-1: share of heavy industry still running dirty (emissions relative to the start). */
  dirty: number;
}

/** Building a settlement slot shows for the model's current development. */
export function urbanKind(slot: UrbanSlot, dev: Development): ContextKind {
  switch (slot.role) {
    case 'industry':
      return slot.rank < dev.dirty ? 'industry_3' : 'industry_2';
    case 'informal':
      return slot.rank < dev.hardship ? 'housing_informal' : 'grass';
    case 'lot':
    case 'housing': {
      // Every +20% of real GDP lets another fifth of the slots climb one density level.
      const steps = Math.floor(Math.max(0, dev.growth * 5 - slot.rank * 1.0));
      const level = Math.min(slot.cap, slot.base + Math.min(steps, 3));
      return level <= 0 ? 'grass' : (`housing_${level}` as UrbanKind);
    }
  }
}
