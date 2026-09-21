/**
 * Isometric canvas map of the territory: 100 × 100 parcels of the model's own land use, drawn with
 * the art set of 22_arte_territorio_expansion.md (four design variants per element, regional bias,
 * roads, animated water and wind, state decorators).
 *
 * What it draws is what the model holds (src/sim/territory.ts): every parcel is a datum, never
 * decoration. On top of that:
 *   - parcels the model changed this month cross-fade to their new use, with the deforestation /
 *     agro-ecological conversion / restoration transitions playing their own animation;
 *   - public uses carry a reserve outline, and the ones the player declared a marker;
 *   - overlays come from the model's coefficients (heat.ts), decorators from fx.ts;
 *   - the tool highlights the lot a declaration would take, exactly as `lotFor` computes it.
 *
 * Ten thousand parcels do not fit in a per-frame loop at 60 fps, so the map has two levels of
 * detail: zoomed out it blits a pre-rendered picture of the whole territory (patched in place for
 * the few parcels that change each month), and from `DETAIL_Z` in it draws the visible parcels one
 * by one with their animations. The render loop reads everything through refs, so React re-renders
 * never restart the canvas.
 */
import { useEffect, useRef } from 'react';
import {
  canDeclare, isProductive, lotFor, REGIONS,
  type ParcelChange, type ParcelKind, type PublicUse, type RegionId, type Territory,
} from '../sim';
import { LandUseType, type LandUse } from '../types';
import type { FxId } from './fx';
import { heatValue, type HeatMode } from './heat';
import {
  allStems, FALLBACK, FX_ANIM, fxUrl, KIND_ANIM, ROAD_AXIS, roadUrl, sheetUrl, spriteFor, STEM_FOR_KIND, tileUrl,
  TRANSITIONS, type AnimDef,
} from './sprites';

const TW = 96;
const TH = 48;
const SPR = 124;
const ANIM_MS = 1100;
/**
 * The sprites are drawn raised over their ground diamond: measured on the tile art, the parcel's
 * top face is centred 28 world px above the ground diamond's centre. Overlays, outlines and
 * picking all use the face, so what you point at is what gets selected.
 */
const FACE_DY = -28;
/** From this zoom in, parcels are drawn one by one (below it, the pre-rendered territory is blitted). */
const DETAIL_Z = 0.5;
/** Resolution of the pre-rendered territory and of the overlay layers, in world pixels. */
const CACHE_SCALE = 0.42;
const OVERLAY_SCALE = 0.2;
/** Above this many changed parcels it is cheaper to redraw the whole picture than to patch it. */
const PATCH_LIMIT = 500;

/** Land uses that exist only because the player declared them: drawn with a public-use outline. */
const PUBLIC_USE_KINDS = new Set<ParcelKind>([
  LandUseType.ProtectedNativeForest, LandUseType.PublicWetland, LandUseType.RestorationForest, LandUseType.EnergyPark,
]);

const CHLOROPHYLL = '111,208,140';
const EMBER = '232,97,60';
const OCHRE = '224,164,88';
const HYDRO = '95,179,201';
const BONE = '233,231,223';

/** Screen space the HUD covers, per viewport width (matches TerritorioApp's layout). */
function safeArea(w: number) {
  return w >= 768
    ? { left: 260, right: 200, top: 76, bottom: 110 }
    : { left: 8, right: 8, top: 120, bottom: 250 };
}

/* ── Image atlas ───────────────────────────────────────────────────────────────────────────── */

const atlas = new Map<string, HTMLImageElement>();
let atlasVersion = 0;

function img(url: string): HTMLImageElement {
  let image = atlas.get(url);
  if (!image) {
    image = new Image();
    image.decoding = 'async';
    image.onload = () => { atlasVersion++; };
    image.src = url;
    atlas.set(url, image);
  }
  return image;
}
const ready = (image: HTMLImageElement) => image.complete && image.naturalWidth > 0;

function preload() {
  allStems().forEach((stem) => img(tileUrl(stem)));
  ['dirt', 'paved', 'coastal'].forEach((m) => ['ns', 'ew', 't', 'x'].forEach((p) => img(roadUrl(m, p))));
  Object.values(KIND_ANIM).forEach((a) => img(sheetUrl(a.sheet)));
}

/* ── Geometry ──────────────────────────────────────────────────────────────────────────────── */

const iso = (x: number, y: number) => ({ sx: (x - y) * (TW / 2), sy: (x + y) * (TH / 2) });
function uniso(sx: number, sy: number) {
  const a = sx / (TW / 2);
  const b = sy / (TH / 2);
  return { x: (b + a) / 2, y: (b - a) / 2 };
}

function diamond(ctx: CanvasRenderingContext2D, x: number, groundY: number, inset = 0) {
  const y = groundY + FACE_DY;
  ctx.beginPath();
  ctx.moveTo(x, y + inset);
  ctx.lineTo(x + TW / 2 - inset * 2, y + TH / 2);
  ctx.lineTo(x, y + TH - inset);
  ctx.lineTo(x - TW / 2 + inset * 2, y + TH / 2);
  ctx.closePath();
}

/** World-space bounds of the whole map, sprite margins included. */
function worldBounds(size: number) {
  return {
    left: -((size - 1) * TW) / 2 - SPR / 2,
    top: TH * 0.55 - SPR * 0.78,
    right: ((size - 1) * TW) / 2 + SPR / 2,
    bottom: (size - 1) * TH + TH * 0.55 + SPR * 0.22,
  };
}

const animFrame = (def: AnimDef, now: number) => Math.floor((now / 1000) * def.fps) % def.frames;

function drawSheet(ctx: CanvasRenderingContext2D, image: HTMLImageElement, def: AnimDef, frame: number, sx: number, sy: number, alpha = 1) {
  const size = image.naturalHeight;
  ctx.globalAlpha = alpha;
  ctx.drawImage(image, frame * size, 0, size, size, sx - SPR / 2, sy + TH * 0.55 - SPR * 0.78, SPR, SPR);
  ctx.globalAlpha = 1;
}

function drawStem(ctx: CanvasRenderingContext2D, stem: string, sx: number, sy: number, flip = false, alpha = 1) {
  const image = img(tileUrl(stem));
  if (!ready(image)) {
    diamond(ctx, sx, sy);
    ctx.fillStyle = FALLBACK[stem.replace(/_v\d$/, '')] ?? '#3a4a42';
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }
  ctx.globalAlpha = alpha;
  if (flip) {
    ctx.save();
    ctx.translate(sx, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(image, -SPR / 2, sy + TH * 0.55 - SPR * 0.78, SPR, SPR);
    ctx.restore();
  } else {
    ctx.drawImage(image, sx - SPR / 2, sy + TH * 0.55 - SPR * 0.78, SPR, SPR);
  }
  ctx.globalAlpha = 1;
}

/* ── Roads ─────────────────────────────────────────────────────────────────────────────────── */

const isRoad = (k: ParcelKind | undefined) => k === 'road' || k === 'bridge';

/**
 * Roads are composed from the pieces that are consistent across the three materials: the two
 * straight ones (whose axis is read from `ROAD_AXIS`, because the file names disagree between
 * materials) and the four-way cross. Corners, T junctions and dead ends are drawn as straight
 * pieces clipped to the half of the parcel that has the neighbour, so every junction meets its
 * neighbours at the middle of the shared edge whatever the material.
 */
function drawRoad(ctx: CanvasRenderingContext2D, t: Territory, i: number, sx: number, sy: number) {
  const material = t.geo.road[i] ?? 'dirt';
  const size = t.size;
  const x = i % size;
  const arms = [
    { dx: 1, dy: 0, on: x + 1 < size && isRoad(t.parcels[i + 1]?.kind) },
    { dx: -1, dy: 0, on: x > 0 && isRoad(t.parcels[i - 1]?.kind) },
    { dx: 0, dy: 1, on: isRoad(t.parcels[i + size]?.kind) },
    { dx: 0, dy: -1, on: isRoad(t.parcels[i - size]?.kind) },
  ];
  const count = arms.filter((a) => a.on).length;
  const fy = sy + FACE_DY + TH / 2;
  const axis = ROAD_AXIS[material];
  const put = (image: HTMLImageElement) => {
    if (!ready(image)) return;
    ctx.drawImage(image, sx - SPR / 2, fy - TH / 2 + TH * 0.55 - SPR * 0.78 + 28, SPR, SPR);
  };
  if (count >= 4) {
    put(img(roadUrl(material, 'x')));
    return;
  }
  if (count === 0) {
    put(img(roadUrl(material, axis.alongX)));
    return;
  }
  // One straight piece per arm, each clipped to the triangle between the centre and its edge.
  arms.forEach(({ dx, dy, on }) => {
    if (!on) return;
    ctx.save();
    const ax = (dx - dy) * (TW / 2);
    const ay = (dx + dy) * (TH / 2);
    const px = -ay;
    const py = ax;
    ctx.beginPath();
    ctx.moveTo(sx + px, fy + py);
    ctx.lineTo(sx + px + ax * 2, fy + py + ay * 2);
    ctx.lineTo(sx - px + ax * 2, fy - py + ay * 2);
    ctx.lineTo(sx - px, fy - py);
    ctx.closePath();
    ctx.clip();
    put(img(roadUrl(material, dx !== 0 ? axis.alongX : axis.alongY)));
    ctx.restore();
  });
}

/* ── One parcel ────────────────────────────────────────────────────────────────────────────── */

interface CellOptions {
  now?: number;
  fx?: Record<number, FxId>;
}

/**
 * Sprite choice per parcel, kept between frames: with ten thousand parcels, hashing a variant and
 * building its file name every frame costs more than drawing it. Entries are recomputed only for
 * parcels whose use (or declaration) actually changed.
 */
interface CellArt { stem: string; flip: boolean; water: boolean; open: boolean }
const art = { size: 0, kinds: [] as ParcelKind[], flags: [] as boolean[], cells: [] as (CellArt | null)[] };

/**
 * Water reads as one body: every water parcel sits on a flat fill (sampled from the art), which
 * closes the seams of the river's staircase. Open water — a sea or lake parcel with no land in
 * sight — is drawn as that fill alone: the `water` tile is a river channel *with banks*, and tiling
 * it across the sea paved the ocean with a repeating quilt of stone shores.
 */
const WATER_KINDS = new Set<ParcelKind>(['water', 'lake', 'sea']);
const WATER_FILL = '#2a6a76';
const WATER_DEEP = '#1c4d59';
/** Bank tone, sampled from the non-water pixels of the river art. */
const BANK_FILL = '#505d50';

/** Sea colour: shallow by the shore, deeper toward the open horizon. */
function seaFill(t: Territory, x: number, y: number): string {
  const depth = Math.min(1, Math.max(0, (x + y) / (2 * t.size) - 0.45) / 0.55);
  return depth < 0.5 ? WATER_FILL : WATER_DEEP;
}

function artFor(t: Territory, i: number): CellArt | null {
  if (art.size !== t.size) {
    art.size = t.size;
    art.kinds = new Array(t.size * t.size);
    art.flags = new Array(t.size * t.size);
    art.cells = new Array(t.size * t.size).fill(null);
    art.kinds.fill('void');
  }
  const p = t.parcels[i];
  if (art.kinds[i] !== p.kind || art.flags[i] !== !!p.declared || art.cells[i] === null) {
    const sprite = spriteFor(t, i);
    art.kinds[i] = p.kind;
    art.flags[i] = !!p.declared;
    // The sea is always flat: its shore is drawn by the beach on the land side. A lake keeps its
    // drawn edge where it meets land, and goes flat in the middle.
    const open = p.kind === 'sea' || (p.kind === 'lake' && !nearShore(t, i));
    art.cells[i] = sprite ? { stem: sprite.stem, flip: sprite.flip, water: WATER_KINDS.has(p.kind), open } : null;
  }
  return art.cells[i];
}

/** Thickness of the ground block in the art (26 of 192 px), in world pixels. */
const BLOCK_H = (26 / 192) * SPR;

/** Water as a block: the face plus the two visible side faces, so it tucks under the shore. */
function waterSlab(ctx: CanvasRenderingContext2D, sx: number, sy: number, fill: string) {
  const y = sy + FACE_DY;
  ctx.beginPath();
  ctx.moveTo(sx - TW / 2, y + TH / 2);
  ctx.lineTo(sx, y + TH);
  ctx.lineTo(sx + TW / 2, y + TH / 2);
  ctx.lineTo(sx + TW / 2, y + TH / 2 + BLOCK_H);
  ctx.lineTo(sx, y + TH + BLOCK_H);
  ctx.lineTo(sx - TW / 2, y + TH / 2 + BLOCK_H);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.globalAlpha = 0.85;
  ctx.fill();
  ctx.globalAlpha = 1;
  diamond(ctx, sx, sy, -3);
  ctx.fillStyle = fill;
  ctx.fill();
}

const WATERY = new Set<ParcelKind>(['water', 'lake', 'sea', 'bridge']);

/**
 * A river parcel, drawn instead of its tile: water across the face, and a bank only on the sides
 * with no water next door. The art of a channel points one way, so a course that turns — every
 * course, on a grid — came out as a chain of ponds; built this way the river follows its path and
 * meets its neighbours at the middle of each shared edge, exactly like the roads.
 */
function drawChannel(ctx: CanvasRenderingContext2D, t: Territory, i: number, sx: number, sy: number) {
  const size = t.size;
  const x = i % size;
  const y = (i / size) | 0;
  const fy = sy + FACE_DY;
  const C = { x: sx, y: fy + TH / 2 };
  const V = {
    top: { x: sx, y: fy },
    right: { x: sx + TW / 2, y: fy + TH / 2 },
    bottom: { x: sx, y: fy + TH },
    left: { x: sx - TW / 2, y: fy + TH / 2 },
  };
  const watery = (dx: number, dy: number) => {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= size || ny >= size) return false;
    return WATERY.has(t.parcels[ny * size + nx].kind);
  };
  const edges: [boolean, { x: number; y: number }, { x: number; y: number }][] = [
    [watery(1, 0), V.right, V.bottom],
    [watery(-1, 0), V.left, V.top],
    [watery(0, 1), V.bottom, V.left],
    [watery(0, -1), V.top, V.right],
  ];
  waterSlab(ctx, sx, sy, WATER_FILL);
  // Banks first, then the painted channel over them: the art softens the drawn edge instead of
  // leaving a flat kerb around every parcel.
  ctx.fillStyle = BANK_FILL;
  edges.forEach(([connected, p, q]) => {
    if (connected) return;
    const f = 0.3;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.lineTo(q.x + (C.x - q.x) * f, q.y + (C.y - q.y) * f);
    ctx.lineTo(p.x + (C.x - p.x) * f, p.y + (C.y - p.y) * f);
    ctx.closePath();
    ctx.fill();
  });
  const image = img(tileUrl(artFor(t, i)?.stem ?? 'water_river_v1'));
  if (ready(image)) {
    ctx.save();
    diamond(ctx, sx, sy, -1);
    ctx.clip();
    ctx.globalAlpha = 0.7;
    ctx.drawImage(image, sx - SPR / 2, sy + TH * 0.55 - SPR * 0.78, SPR, SPR);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

/** True when the parcel has any land within one cell: shores keep their drawn banks and beaches. */
function nearShore(t: Territory, i: number): boolean {
  const size = t.size;
  const x = i % size;
  const y = (i / size) | 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      const k = t.parcels[ny * size + nx].kind;
      if (k !== 'sea' && k !== 'lake' && k !== 'void') return true;
    }
  }
  return false;
}

function drawCell(ctx: CanvasRenderingContext2D, t: Territory, i: number, opts: CellOptions = {}) {
  const p = t.parcels[i];
  if (p.kind === 'void') return;
  const sx = (p.x - p.y) * (TW / 2);
  const sy = (p.x + p.y) * (TH / 2);
  const sprite = artFor(t, i);
  if (!sprite) return;
  if (sprite.water) {
    // The river runs as a staircase of parcels; a flat fill under them closes the seams.
    if (sprite.open) {
      // Open water is a slab, not a flat diamond: the land tiles are drawn as blocks with a
      // thickness, and a flat sea would leave a dark gap under every shore.
      waterSlab(ctx, sx, sy, p.kind === 'sea' ? seaFill(t, p.x, p.y) : WATER_FILL);
      return;
    }
    if (p.kind === 'water') {
      drawChannel(ctx, t, i, sx, sy);
      return;
    }
    diamond(ctx, sx, sy, -3);
    ctx.fillStyle = WATER_FILL;
    ctx.fill();
  }
  const anim = opts.now !== undefined ? KIND_ANIM[p.kind] : undefined;
  const sheet = anim ? img(sheetUrl(anim.sheet)) : null;
  if (anim && sheet && ready(sheet) && !sprite.flip) drawSheet(ctx, sheet, anim, animFrame(anim, opts.now!), sx, sy);
  else drawStem(ctx, sprite.stem, sx, sy, sprite.flip);
  if (p.kind === 'road' || p.kind === 'bridge') drawRoad(ctx, t, i, sx, sy);

  const fx = opts.fx?.[i];
  if (fx) {
    const fxAnim = opts.now !== undefined ? FX_ANIM[fx] : undefined;
    const fxSheet = fxAnim ? img(sheetUrl(fxAnim.sheet)) : null;
    if (fxAnim && fxSheet && ready(fxSheet)) drawSheet(ctx, fxSheet, fxAnim, animFrame(fxAnim, opts.now!), sx, sy);
    else {
      const variant = 1 + ((p.x * 7 + p.y * 13) % 3);
      const image = img(fxUrl(fx, variant));
      if (ready(image)) ctx.drawImage(image, sx - SPR / 2, sy + TH * 0.55 - SPR * 0.78, SPR, SPR);
    }
  }

  if (PUBLIC_USE_KINDS.has(p.kind)) {
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = `rgba(${CHLOROPHYLL},0.75)`;
    diamond(ctx, sx, sy, 3);
    ctx.stroke();
    ctx.restore();
    if (p.declared) {
      ctx.beginPath();
      ctx.arc(sx, sy + FACE_DY + TH / 2 - 12, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${CHLOROPHYLL})`;
      ctx.fill();
    }
  }
}

function changeTone(c: { from: ParcelKind; to: ParcelKind }): string {
  const LU = LandUseType;
  if (PUBLIC_USE_KINDS.has(c.to) && c.to !== LU.EnergyPark) return CHLOROPHYLL;
  if (c.to === LU.EnergyPark) return HYDRO;
  if (c.from === LU.ConventionalCrops && c.to === LU.AgroecologicalCrops) return CHLOROPHYLL;
  if (c.from === LU.AgroecologicalCrops && c.to === LU.UnprotectedNativeForest) return CHLOROPHYLL;
  if (c.to === LU.ConventionalCrops || c.to === 'fallow') return EMBER;
  if (!isProductive(c.to)) return OCHRE;
  return OCHRE;
}

/* ── Cached layers ─────────────────────────────────────────────────────────────────────────── */

interface Layer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  scale: number;
  left: number;
  top: number;
  /** What the layer was painted from: compared by reference, never stringified. */
  key: unknown[];
}

function makeLayer(size: number, scale: number): Layer {
  const b = worldBounds(size);
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil((b.right - b.left) * scale);
  canvas.height = Math.ceil((b.bottom - b.top) * scale);
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx, scale, left: b.left, top: b.top, key: [] };
}

function layerTransform(layer: Layer) {
  layer.ctx.setTransform(layer.scale, 0, 0, layer.scale, -layer.left * layer.scale, -layer.top * layer.scale);
}

function paintTerritory(layer: Layer, t: Territory, fx: Record<number, FxId>) {
  layer.ctx.setTransform(1, 0, 0, 1, 0, 0);
  layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
  layerTransform(layer);
  for (let sum = 0; sum <= 2 * (t.size - 1); sum++) {
    for (let x = Math.max(0, sum - t.size + 1); x <= Math.min(t.size - 1, sum); x++) {
      drawCell(layer.ctx, t, (sum - x) * t.size + x, { fx });
    }
  }
}

/** Redraws only the parcels that changed, plus the neighbours whose sprites overlap them. */
function patchTerritory(layer: Layer, t: Territory, fx: Record<number, FxId>, cells: number[]) {
  const size = t.size;
  cells.forEach((i) => {
    const x = i % size;
    const y = (i / size) | 0;
    const { sx, sy } = iso(x, y);
    const left = (sx - SPR / 2 - layer.left) * layer.scale - 1;
    const top = (sy + TH * 0.55 - SPR * 0.78 - layer.top) * layer.scale - 1;
    const side = SPR * layer.scale + 2;
    layer.ctx.setTransform(1, 0, 0, 1, 0, 0);
    layer.ctx.save();
    layer.ctx.beginPath();
    layer.ctx.rect(left, top, side, side);
    layer.ctx.clip();
    layer.ctx.clearRect(left, top, side, side);
    layerTransform(layer);
    const near: number[] = [];
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
        near.push(ny * size + nx);
      }
    }
    near.sort((a, b) => (a % size + ((a / size) | 0)) - (b % size + ((b / size) | 0)));
    near.forEach((j) => drawCell(layer.ctx, t, j, { fx }));
    layer.ctx.restore();
  });
}

function paintHeat(layer: Layer, t: Territory, landUses: Record<LandUseType, LandUse>, mode: HeatMode) {
  layer.ctx.setTransform(1, 0, 0, 1, 0, 0);
  layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
  if (mode === 'none') return;
  layerTransform(layer);
  t.parcels.forEach((p) => {
    if (p.kind === 'void') return;
    const { sx, sy } = iso(p.x, p.y);
    const v = heatValue(mode, p.kind, landUses);
    diamond(layer.ctx, sx, sy);
    layer.ctx.fillStyle = v === null
      ? 'rgba(8,16,14,0.55)'
      : `rgba(${v >= 0 ? CHLOROPHYLL : EMBER},${0.12 + 0.5 * Math.abs(v)})`;
    layer.ctx.fill();
  });
}

function paintTool(layer: Layer, t: Territory, tool: PublicUse | null) {
  layer.ctx.setTransform(1, 0, 0, 1, 0, 0);
  layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
  if (!tool) return;
  layerTransform(layer);
  layer.ctx.fillStyle = `rgba(${CHLOROPHYLL},0.3)`;
  t.parcels.forEach((p) => {
    if (!canDeclare(t, p.x, p.y, tool)) return;
    const { sx, sy } = iso(p.x, p.y);
    diamond(layer.ctx, sx, sy, 2);
    layer.ctx.fill();
  });
}

/* ── Component ─────────────────────────────────────────────────────────────────────────────── */

export interface IsoMapProps {
  territory: Territory;
  landUses: Record<LandUseType, LandUse>;
  heat: HeatMode;
  tool: PublicUse | null;
  selected: { x: number; y: number } | null;
  changes: { tick: number; list: ParcelChange[] };
  fx: Record<number, FxId>;
  regionNames: Record<RegionId, string>;
  onParcel: (x: number, y: number) => void;
  label: string;
}

export function IsoMap({ territory, landUses, heat, tool, selected, changes, fx, regionNames, onParcel, label }: IsoMapProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cam = useRef({ x: 0, y: 0, z: 0.2, hover: null as null | { x: number; y: number }, fitted: false });
  const drag = useRef({ on: false, moved: false, x: 0, y: 0, ox: 0, oy: 0, pointers: new Map<number, { x: number; y: number }>(), pinch: 0 });
  const anims = useRef(new Map<number, { from: ParcelKind; to: ParcelKind; at: number }>());
  const lastTick = useRef(changes.tick);
  const lot = useRef<{ key: unknown[]; cells: Set<number> }>({ key: [], cells: new Set() });
  const props = useRef({ territory, landUses, heat, tool, selected, fx, regionNames, onParcel });
  props.current = { territory, landUses, heat, tool, selected, fx, regionNames, onParcel };

  // Register this month's changes for animation (once per batch).
  useEffect(() => {
    if (changes.tick === lastTick.current) return;
    lastTick.current = changes.tick;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const now = performance.now();
    changes.list.forEach((c) => anims.current.set(c.y * territory.size + c.x, { from: c.from, to: c.to, at: now }));
  }, [changes, territory.size]);

  useEffect(() => {
    preload();
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let running = true;

    const size = props.current.territory.size;
    const base = makeLayer(size, CACHE_SCALE);
    const heatLayer = makeLayer(size, OVERLAY_SCALE);
    const toolLayer = makeLayer(size, OVERLAY_SCALE);
    let baseTerritory: Territory | null = null;
    let baseFx: Record<number, FxId> = {};
    let baseAtlas = -1;
    let lastAtlasPaint = 0;

    // Region labels sit on each region's centre of mass, for orientation when zoomed out.
    const geo = props.current.territory.geo;
    const centres = REGIONS.map((id, r) => {
      let n = 0;
      let sx = 0;
      let sy = 0;
      geo.region.forEach((value, i) => {
        if (value !== r) return;
        n++;
        sx += i % size;
        sy += (i / size) | 0;
      });
      return { id, x: n ? sx / n : 0, y: n ? sy / n : 0 };
    });

    const bounds = worldBounds(size);
    const origin = (w: number, h: number) => {
      const s = safeArea(w);
      return {
        ox: s.left + (w - s.left - s.right) / 2 + cam.current.x,
        oy: s.top + (h - s.top - s.bottom) / 2 + cam.current.y,
        cx: (bounds.left + bounds.right) / 2,
        cy: (bounds.top + bounds.bottom) / 2,
      };
    };
    const fit = (w: number, h: number) => {
      if (w < 8 || h < 8) return;
      const s = safeArea(w);
      const z = Math.min((w - s.left - s.right) / (bounds.right - bounds.left), (h - s.top - s.bottom) / (bounds.bottom - bounds.top));
      cam.current.z = Math.min(1.8, Math.max(0.06, z));
      cam.current.x = 0;
      cam.current.y = 0;
      cam.current.fitted = true;
    };
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (w < 8 || h < 8) return;
      const bw = Math.floor(w * dpr);
      const bh = Math.floor(h * dpr);
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      if (!cam.current.fitted) fit(w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    /** Keeps the pre-rendered picture in step with the territory, patching what changed. */
    const refreshBase = (t: Territory, fxNow: Record<number, FxId>, now: number) => {
      const atlasChanged = baseAtlas !== atlasVersion && now - lastAtlasPaint > 400;
      if (!baseTerritory || atlasChanged) {
        paintTerritory(base, t, fxNow);
        baseTerritory = t;
        baseFx = fxNow;
        baseAtlas = atlasVersion;
        lastAtlasPaint = now;
        return;
      }
      if (baseTerritory === t && baseFx === fxNow) return;
      const dirty = new Set<number>();
      if (baseTerritory !== t) {
        const before = baseTerritory.parcels;
        t.parcels.forEach((p, i) => { if (p !== before[i] && (p.kind !== before[i].kind || p.declared !== before[i].declared)) dirty.add(i); });
      }
      if (baseFx !== fxNow) {
        Object.keys(fxNow).forEach((k) => { if (baseFx[+k] !== fxNow[+k]) dirty.add(+k); });
        Object.keys(baseFx).forEach((k) => { if (baseFx[+k] !== fxNow[+k]) dirty.add(+k); });
      }
      if (dirty.size > PATCH_LIMIT) paintTerritory(base, t, fxNow);
      else if (dirty.size) patchTerritory(base, t, fxNow, [...dirty]);
      baseTerritory = t;
      baseFx = fxNow;
    };

    const probe = typeof location !== 'undefined' && location.search.includes('perf')
      ? { frames: 0, total: 0, cells: 0, t0: 0 } : null;
    const draw = () => {
      if (!running) return;
      if (probe) probe.t0 = performance.now();
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (w >= 8 && h >= 8) {
        const now = performance.now();
        const { territory: t, landUses: lu, heat: mode, tool: toolNow, selected: sel, fx: fxNow, regionNames: names } = props.current;
        ctx.setTransform(canvas.width / w, 0, 0, canvas.width / w, 0, 0);
        const grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, '#0e1a16');
        grd.addColorStop(1, '#08100e');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);

        refreshBase(t, fxNow, now);
        if (heatLayer.key[0] !== mode || heatLayer.key[1] !== t.parcels || heatLayer.key[2] !== lu) {
          paintHeat(heatLayer, t, lu, mode);
          heatLayer.key = [mode, t.parcels, lu];
        }
        if (toolLayer.key[0] !== toolNow || toolLayer.key[1] !== t.parcels) {
          paintTool(toolLayer, t, toolNow);
          toolLayer.key = [toolNow, t.parcels];
        }

        const z = cam.current.z;
        const o = origin(w, h);
        ctx.save();
        ctx.translate(o.ox, o.oy);
        ctx.scale(z, z);
        ctx.translate(-o.cx, -o.cy);
        const pulse = 0.5 + 0.5 * Math.sin(now / 420);

        // Visible world rectangle, with a margin of one sprite.
        const viewL = o.cx - (o.ox / z) - SPR;
        const viewT = o.cy - (o.oy / z) - SPR;
        const viewR = viewL + w / z + 2 * SPR;
        const viewB = viewT + h / z + 2 * SPR;

        const detail = z >= DETAIL_Z;
        const visible: number[] = [];
        if (detail) {
          for (let sum = 0; sum <= 2 * (size - 1); sum++) {
            const sy = (sum * TH) / 2;
            if (sy + TH * 0.55 + SPR * 0.22 < viewT || sy + TH * 0.55 - SPR * 0.78 > viewB) continue;
            const xMin = Math.max(0, sum - size + 1, Math.ceil((viewL / (TW / 2) + sum) / 2));
            const xMax = Math.min(size - 1, sum, Math.floor((viewR / (TW / 2) + sum) / 2));
            for (let x = xMin; x <= xMax; x++) visible.push((sum - x) * size + x);
          }
          if (probe) probe.cells = visible.length;
          visible.forEach((i) => {
            const anim = anims.current.get(i);
            const k = anim ? Math.min(1, (now - anim.at) / ANIM_MS) : 1;
            if (anim && k >= 1) anims.current.delete(i);
            if (!anim || k >= 1) {
              drawCell(ctx, t, i, { now, fx: fxNow });
              return;
            }
            const p = t.parcels[i];
            const { sx, sy } = iso(p.x, p.y);
            const transition = TRANSITIONS[`${anim.from}>${anim.to}`];
            const sheet = transition ? img(sheetUrl(transition.sheet)) : null;
            if (transition && sheet && ready(sheet)) {
              drawSheet(ctx, sheet, transition, Math.min(transition.frames - 1, Math.floor(k * transition.frames)), sx, sy);
            } else {
              // Old use opaque underneath, new use fading in on top: no see-through dip mid-fade.
              const old = STEM_FOR_KIND[anim.from];
              if (old) drawStem(ctx, `${old}_v1`, sx, sy);
              drawCell(ctx, t, i, { now, fx: fxNow });
            }
          });
        } else {
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(base.canvas, base.left, base.top, base.canvas.width / base.scale, base.canvas.height / base.scale);
        }

        if (mode !== 'none') {
          ctx.drawImage(heatLayer.canvas, heatLayer.left, heatLayer.top, heatLayer.canvas.width / heatLayer.scale, heatLayer.canvas.height / heatLayer.scale);
        }
        if (toolNow) {
          ctx.globalAlpha = 0.35 + 0.35 * pulse;
          ctx.drawImage(toolLayer.canvas, toolLayer.left, toolLayer.top, toolLayer.canvas.width / toolLayer.scale, toolLayer.canvas.height / toolLayer.scale);
          ctx.globalAlpha = 1;
        }

        // Rings on parcels that changed this month: what the model did, where it did it.
        anims.current.forEach((anim, i) => {
          const k = Math.min(1, (now - anim.at) / ANIM_MS);
          if (k >= 1) {
            anims.current.delete(i);
            return;
          }
          const p = t.parcels[i];
          const { sx, sy } = iso(p.x, p.y);
          if (sx < viewL || sx > viewR || sy < viewT || sy > viewB) return;
          ctx.lineWidth = detail ? 2.2 : 3 / z;
          ctx.strokeStyle = `rgba(${changeTone(anim)},${1 - k})`;
          const grow = k * 10;
          const fy = sy + FACE_DY;
          ctx.beginPath();
          ctx.moveTo(sx, fy - grow);
          ctx.lineTo(sx + TW / 2 + grow * 2, fy + TH / 2);
          ctx.lineTo(sx, fy + TH + grow);
          ctx.lineTo(sx - TW / 2 - grow * 2, fy + TH / 2);
          ctx.closePath();
          ctx.stroke();
        });

        // The lot the tool would take, under the pointer.
        const hover = cam.current.hover;
        if (toolNow && hover) {
          const key = lot.current.key;
          if (key[0] !== toolNow || key[1] !== hover.x || key[2] !== hover.y || key[3] !== t.parcels) {
            lot.current = { key: [toolNow, hover.x, hover.y, t.parcels], cells: new Set(lotFor(t, hover.x, hover.y, toolNow)) };
          }
          ctx.fillStyle = `rgba(${CHLOROPHYLL},0.42)`;
          ctx.strokeStyle = `rgba(${BONE},0.6)`;
          ctx.lineWidth = 1 / z;
          lot.current.cells.forEach((i) => {
            const p = t.parcels[i];
            const { sx, sy } = iso(p.x, p.y);
            diamond(ctx, sx, sy);
            ctx.fill();
          });
          if (lot.current.cells.size === 0) {
            const { sx, sy } = iso(hover.x, hover.y);
            diamond(ctx, sx, sy);
            ctx.fillStyle = `rgba(${EMBER},0.22)`;
            ctx.fill();
          }
        }
        if (hover && !toolNow) {
          const { sx, sy } = iso(hover.x, hover.y);
          ctx.lineWidth = 1.5 / z;
          ctx.strokeStyle = `rgba(${BONE},0.55)`;
          diamond(ctx, sx, sy, 1);
          ctx.stroke();
        }
        if (sel) {
          const { sx, sy } = iso(sel.x, sel.y);
          ctx.lineWidth = 2 / z;
          ctx.strokeStyle = `rgb(${BONE})`;
          diamond(ctx, sx, sy, 1);
          ctx.stroke();
        }

        if (!detail) {
          ctx.textAlign = 'center';
          ctx.font = `${Math.round(13 / z)}px ui-sans-serif, system-ui, sans-serif`;
          centres.forEach((c) => {
            const { sx, sy } = iso(c.x, c.y);
            ctx.fillStyle = 'rgba(8,16,14,0.55)';
            ctx.fillText(names[c.id], sx + 1 / z, sy + 1 / z);
            ctx.fillStyle = `rgba(${BONE},0.82)`;
            ctx.fillText(names[c.id], sx, sy);
          });
        }
        ctx.restore();
      }
      if (probe) {
        probe.frames++;
        probe.total += performance.now() - probe.t0;
        if (probe.frames >= 60) {
          // eslint-disable-next-line no-console
          console.log(`[map] ${(probe.total / probe.frames).toFixed(1)} ms/frame, ${probe.cells} cells, z=${cam.current.z.toFixed(2)}`);
          probe.frames = 0;
          probe.total = 0;
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const toGrid = (cx: number, cy: number) => {
      const o = origin(wrap.clientWidth, wrap.clientHeight);
      const sx = (cx - o.ox) / cam.current.z + o.cx;
      const sy = (cy - o.oy) / cam.current.z + o.cy;
      const g = uniso(sx, sy - TH / 2 - FACE_DY);
      return { x: Math.floor(g.x + 0.5), y: Math.floor(g.y + 0.5) };
    };
    const inside = (g: { x: number; y: number }) => {
      const t = props.current.territory;
      if (g.x < 0 || g.y < 0 || g.x >= t.size || g.y >= t.size) return false;
      return t.parcels[g.y * t.size + g.x].kind !== 'void';
    };

    const zoomAt = (factor: number, cx?: number, cy?: number) => {
      const before = cam.current.z;
      const z = Math.min(2, Math.max(0.06, before * factor));
      if (cx !== undefined && cy !== undefined) {
        // Keep the point under the cursor fixed while zooming.
        const o = origin(wrap.clientWidth, wrap.clientHeight);
        cam.current.x += (cx - o.ox) * (1 - z / before);
        cam.current.y += (cy - o.oy) * (1 - z / before);
      }
      cam.current.z = z;
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== undefined && e.button !== 0) return;
      drag.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      Object.assign(drag.current, { on: true, moved: false, x: e.clientX, y: e.clientY, ox: e.clientX, oy: e.clientY });
      if (drag.current.pointers.size === 2) {
        const pts = [...drag.current.pointers.values()];
        drag.current.pinch = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      }
    };
    const onMove = (e: PointerEvent) => {
      const rect = wrap.getBoundingClientRect();
      const g = toGrid(e.clientX - rect.left, e.clientY - rect.top);
      const over = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      cam.current.hover = over && inside(g) ? g : null;
      if (drag.current.pointers.has(e.pointerId)) drag.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (drag.current.pointers.size === 2) {
        const pts = [...drag.current.pointers.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (drag.current.pinch > 0) zoomAt(dist / drag.current.pinch);
        drag.current.pinch = dist;
        drag.current.moved = true;
        return;
      }
      if (!drag.current.on) return;
      if (!drag.current.moved) {
        if (Math.hypot(e.clientX - drag.current.ox, e.clientY - drag.current.oy) < 10) return;
        drag.current.moved = true;
        try { wrap.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
      }
      cam.current.x += e.clientX - drag.current.x;
      cam.current.y += e.clientY - drag.current.y;
      drag.current.x = e.clientX;
      drag.current.y = e.clientY;
    };
    const finish = (e: PointerEvent) => {
      drag.current.pointers.delete(e.pointerId);
      if (drag.current.pointers.size < 2) drag.current.pinch = 0;
      if (!drag.current.on) return;
      const wasMoved = drag.current.moved;
      drag.current.on = false;
      drag.current.moved = false;
      if (wasMoved || e.type === 'pointercancel') return;
      const rect = wrap.getBoundingClientRect();
      const g = toGrid(e.clientX - rect.left, e.clientY - rect.top);
      if (inside(g)) props.current.onParcel(g.x, g.y);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = wrap.getBoundingClientRect();
      zoomAt(e.deltaY > 0 ? 0.9 : 1.1, e.clientX - rect.left, e.clientY - rect.top);
    };
    const onDbl = () => fit(wrap.clientWidth, wrap.clientHeight);
    const onLeave = () => { cam.current.hover = null; };

    wrap.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    wrap.addEventListener('pointerleave', onLeave);
    wrap.addEventListener('wheel', onWheel, { passive: false });
    wrap.addEventListener('dblclick', onDbl);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      wrap.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      wrap.removeEventListener('pointerleave', onLeave);
      wrap.removeEventListener('wheel', onWheel);
      wrap.removeEventListener('dblclick', onDbl);
    };
    // The canvas owns its loop for the life of the component; props reach it through `props`.
  }, [territory.seed]);

  return (
    <div
      ref={wrapRef}
      className={`absolute inset-0 touch-none overflow-hidden ${tool ? 'cursor-crosshair' : 'cursor-grab'} active:cursor-grabbing`}
    >
      <canvas ref={canvasRef} className="block h-full w-full" role="img" aria-label={label} />
    </div>
  );
}
