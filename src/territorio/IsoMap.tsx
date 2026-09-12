/**
 * Isometric canvas map, ported from EcoSIM (combinacion/EcoSIM/src/components/game/IsoMap.tsx):
 * same 2:1 tile geometry, sprite atlas, drag-to-pan / wheel & pinch zoom / double-click to refit.
 * What changed for the fusion (21_fusion_ecosim.md §4):
 *   - it draws a `Territory` (src/sim/territory.ts), i.e. the model's land use, not a free-form map;
 *   - protected areas get a reserve outline, and the ones the player declared a marker;
 *   - parcels the model changed this month cross-fade to their new use with a ring (green when the
 *     change helps, ember when it hurts), so deforestation is something you see happen;
 *   - overlays come from the model's coefficients (heat.ts);
 *   - the "protect" tool highlights where it can be used.
 * Render loop reads everything through refs so React re-renders never restart the canvas.
 */
import { useEffect, useRef } from 'react';
import { canDeclare, type ParcelChange, type ParcelKind, type PublicUse, type Territory } from '../sim';
import { LandUseType, type LandUse } from '../types';
import { heatValue, type HeatMode } from './heat';

const TW = 96;
const TH = 48;
const SPR = 124;
const ANIM_MS = 1100;
/**
 * The sprites are drawn raised over their ground diamond: measured on the tile art, the parcel's
 * top face is centred 28 world px above the ground diamond's centre. Overlays, outlines and
 * picking all use the face, so what you point at is what gets selected (EcoSIM's own `sy + 6`
 * picking offset is the same correction).
 */
const FACE_DY = -28;

const TILE_FOR_KIND: Record<ParcelKind, string> = {
  [LandUseType.UnprotectedNativeForest]: 'forest',
  [LandUseType.ProtectedNativeForest]: 'forest',
  [LandUseType.AgroecologicalCrops]: 'regen',
  [LandUseType.ConventionalCrops]: 'intensive',
  [LandUseType.ForestPlantations]: 'reforest',
  [LandUseType.GrasslandsPastures]: 'pasture',
  [LandUseType.PublicWetland]: 'wetland',
  [LandUseType.RestorationForest]: 'reforest',
  [LandUseType.EnergyPark]: 'solar',
  fallow: 'grass',
  water: 'water',
  wetland: 'wetland',
  urban: 'urban',
  market: 'market',
  industry: 'industry',
};

const FALLBACK: Record<string, string> = {
  forest: '#2a4a32', regen: '#3d6a42', orchard: '#4a7a48', intensive: '#8a6a3a', reforest: '#3a5a38',
  pasture: '#5a7a3a', grass: '#6a6a4a', water: '#3a6a88', wetland: '#3a6a62', urban: '#8a6a58',
  market: '#7a5a48', industry: '#5a4a48',
};

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

const atlas = new Map<string, HTMLImageElement>();
function loadAtlas() {
  if (atlas.size) return;
  [...new Set([...Object.values(TILE_FOR_KIND), 'orchard'])].forEach((name) => {
    const img = new Image();
    img.src = `/assets/ecosim/tiles/${name}.webp`;
    atlas.set(name, img);
  });
}

/** Agro-ecological parcels alternate between two sprites (row crops / orchard) for variety. */
function spriteName(kind: ParcelKind, x: number, y: number): string {
  if (kind === LandUseType.AgroecologicalCrops && ((x * 7 + y * 13) % 10) < 3) return 'orchard';
  return TILE_FOR_KIND[kind];
}

function changeTone(c: { from: ParcelKind; to: ParcelKind }): string {
  const LU = LandUseType;
  if (PUBLIC_USE_KINDS.has(c.to) && c.to !== LU.EnergyPark) return CHLOROPHYLL;
  if (c.to === LU.EnergyPark) return HYDRO;
  if (c.from === LU.ConventionalCrops && c.to === LU.AgroecologicalCrops) return CHLOROPHYLL;
  if (c.from === LU.AgroecologicalCrops && c.to === LU.UnprotectedNativeForest) return CHLOROPHYLL;
  if (c.to === LU.ConventionalCrops || c.to === 'fallow') return EMBER;
  return OCHRE;
}

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

function drawSprite(ctx: CanvasRenderingContext2D, name: string, sx: number, sy: number) {
  const img = atlas.get(name);
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, sx - SPR / 2, sy + TH * 0.55 - SPR * 0.78, SPR, SPR);
  } else {
    diamond(ctx, sx, sy);
    ctx.fillStyle = FALLBACK[name] ?? '#444';
    ctx.fill();
  }
}

export interface IsoMapProps {
  territory: Territory;
  landUses: Record<LandUseType, LandUse>;
  heat: HeatMode;
  tool: PublicUse | null;
  selected: { x: number; y: number } | null;
  changes: { tick: number; list: ParcelChange[] };
  onParcel: (x: number, y: number) => void;
  label: string;
}

export function IsoMap({ territory, landUses, heat, tool, selected, changes, onParcel, label }: IsoMapProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cam = useRef({ x: 0, y: 0, z: 1, hover: null as null | { x: number; y: number }, fitted: false });
  const drag = useRef({ on: false, moved: false, x: 0, y: 0, ox: 0, oy: 0, pointers: new Map<number, { x: number; y: number }>(), pinch: 0 });
  const anims = useRef(new Map<number, { from: ParcelKind; to: ParcelKind; at: number }>());
  const lastTick = useRef(changes.tick);
  const props = useRef({ territory, landUses, heat, tool, selected, onParcel });
  props.current = { territory, landUses, heat, tool, selected, onParcel };

  // Register this month's changes for animation (once per batch).
  useEffect(() => {
    if (changes.tick === lastTick.current) return;
    lastTick.current = changes.tick;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const now = performance.now();
    changes.list.forEach((c) => anims.current.set(c.y * territory.size + c.x, { from: c.from, to: c.to, at: now }));
  }, [changes, territory.size]);

  useEffect(() => {
    loadAtlas();
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let running = true;

    // The map is framed in the area the HUD leaves free, not the whole viewport.
    const origin = (w: number, h: number, size: number) => {
      const c = iso((size - 1) / 2, (size - 1) / 2);
      const s = safeArea(w);
      return {
        ox: s.left + (w - s.left - s.right) / 2 + cam.current.x,
        oy: s.top + (h - s.top - s.bottom) / 2 + cam.current.y,
        cx: c.sx,
        cy: c.sy,
      };
    };
    const fit = (w: number, h: number, size: number) => {
      if (w < 8 || h < 8) return;
      const s = safeArea(w);
      const z = Math.min((w - s.left - s.right) / (size * TW), (h - s.top - s.bottom) / (size * TH * 1.25));
      cam.current.z = Math.min(1.7, Math.max(0.3, z));
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
      if (!cam.current.fitted) fit(w, h, props.current.territory.size);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const draw = () => {
      if (!running) return;
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (w >= 8 && h >= 8) {
        const now = performance.now();
        const { territory: t, landUses: lu, heat: mode, tool: toolNow, selected: sel } = props.current;
        ctx.setTransform(canvas.width / w, 0, 0, canvas.width / w, 0, 0);
        const grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, '#0e1a16');
        grd.addColorStop(1, '#08100e');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);

        const size = t.size;
        const o = origin(w, h, size);
        ctx.save();
        ctx.translate(o.ox, o.oy);
        ctx.scale(cam.current.z, cam.current.z);
        ctx.translate(-o.cx, -o.cy);
        const pulse = 0.5 + 0.5 * Math.sin(now / 420);

        for (let sum = 0; sum <= size * 2; sum++) {
          for (let x = 0; x < size; x++) {
            const y = sum - x;
            if (y < 0 || y >= size) continue;
            const i = y * size + x;
            const p = t.parcels[i];
            const { sx, sy } = iso(x, y);
            const anim = anims.current.get(i);
            const k = anim ? Math.min(1, (now - anim.at) / ANIM_MS) : 1;
            if (anim && k >= 1) anims.current.delete(i);

            if (anim && k < 1) {
              // Old use opaque underneath, new use fading in on top: no see-through dip mid-fade.
              drawSprite(ctx, spriteName(anim.from, x, y), sx, sy);
              ctx.globalAlpha = k;
              drawSprite(ctx, spriteName(p.kind, x, y), sx, sy);
              ctx.globalAlpha = 1;
            } else {
              drawSprite(ctx, spriteName(p.kind, x, y), sx, sy);
            }

            const hv = heatValue(mode, p.kind, lu);
            if (mode !== 'none') {
              diamond(ctx, sx, sy);
              if (hv === null) ctx.fillStyle = 'rgba(8,16,14,0.55)';
              else ctx.fillStyle = `rgba(${hv >= 0 ? CHLOROPHYLL : EMBER},${0.12 + 0.5 * Math.abs(hv)})`;
              ctx.fill();
            }

            if (PUBLIC_USE_KINDS.has(p.kind)) {
              ctx.save();
              ctx.setLineDash([6, 4]);
              ctx.lineWidth = 1.6;
              ctx.strokeStyle = `rgba(${CHLOROPHYLL},0.9)`;
              diamond(ctx, sx, sy, 3);
              ctx.stroke();
              ctx.restore();
              if (p.declared) {
                ctx.beginPath();
                ctx.arc(sx, sy + FACE_DY + TH / 2 - 14, 5, 0, Math.PI * 2);
                ctx.fillStyle = `rgb(${CHLOROPHYLL})`;
                ctx.fill();
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = `rgb(${BONE})`;
                ctx.stroke();
              }
            }

            if (toolNow && canDeclare(t, x, y, toolNow)) {
              ctx.lineWidth = 1.4;
              ctx.strokeStyle = `rgba(${CHLOROPHYLL},${0.35 + 0.45 * pulse})`;
              diamond(ctx, sx, sy, 2);
              ctx.stroke();
            }

            if (anim && k < 1) {
              ctx.lineWidth = 2.2;
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
            }
          }
        }

        const hover = cam.current.hover;
        if (hover) {
          const { sx, sy } = iso(hover.x, hover.y);
          if (toolNow) {
            const ok = canDeclare(t, hover.x, hover.y, toolNow);
            diamond(ctx, sx, sy);
            ctx.fillStyle = ok ? `rgba(${CHLOROPHYLL},0.3)` : `rgba(${EMBER},0.18)`;
            ctx.fill();
          }
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = `rgba(${BONE},0.55)`;
          diamond(ctx, sx, sy, 1);
          ctx.stroke();
        }
        if (sel) {
          const { sx, sy } = iso(sel.x, sel.y);
          ctx.lineWidth = 2;
          ctx.strokeStyle = `rgb(${BONE})`;
          diamond(ctx, sx, sy, 1);
          ctx.stroke();
        }
        ctx.restore();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const toGrid = (cx: number, cy: number) => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      const o = origin(w, h, props.current.territory.size);
      const sx = (cx - o.ox) / cam.current.z + o.cx;
      const sy = (cy - o.oy) / cam.current.z + o.cy;
      const g = uniso(sx, sy - TH / 2 - FACE_DY);
      return { x: Math.floor(g.x + 0.5), y: Math.floor(g.y + 0.5) };
    };
    const inside = (g: { x: number; y: number }) => {
      const size = props.current.territory.size;
      return g.x >= 0 && g.y >= 0 && g.x < size && g.y < size;
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
        if (drag.current.pinch > 0) cam.current.z = Math.min(2, Math.max(0.3, cam.current.z * (dist / drag.current.pinch)));
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
      cam.current.z = Math.min(2, Math.max(0.3, cam.current.z * (e.deltaY > 0 ? 0.92 : 1.08)));
    };
    const onDbl = () => fit(wrap.clientWidth, wrap.clientHeight, props.current.territory.size);
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
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`absolute inset-0 touch-none overflow-hidden ${tool ? 'cursor-crosshair' : 'cursor-grab'} active:cursor-grabbing`}
    >
      <canvas ref={canvasRef} className="block h-full w-full" role="img" aria-label={label} />
    </div>
  );
}
