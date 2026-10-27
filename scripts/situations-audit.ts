/**
 * Expected-value audit of the Territorio situation catalogue (mejora-general/files/47 §4).
 *
 * For every situation and option: from the initial state of Territorio, apply the option (paying its cost) and simulate
 * 24 months; compare with the same 24 months without it (same seed, no random events or yield shocks, no other
 * situations, no wear). Reference index I = 0.25·ΔB + 0.25·ΔF + 0.25·ΔE + 0.25·ΔW, averaged over the 24 months (the
 * impulses decay with a half-life of 18 months, so the end value alone would hide most of an option's effect), and
 * the net cost (cost − immediate money effects, in treasury units at the start).
 *
 * Flags: dominant options (best index and lowest net cost of their situation), situations whose default (the last
 * option, what happens when nobody decides) is not the worst in index, and options with a null total effect.
 * Exceptions are justified in EXCEPTIONS below and listed in the report.
 *
 * Usage: npx tsx scripts/situations-audit.ts [out.md]   (default reports/situations-audit.md)
 */
import { writeFileSync } from 'fs';
import { CONTROL_PARAMS } from '../src/constants';
import { makeRng, stepMonth } from '../src/sim';
import type { GameState } from '../src/types';
import { newGameState } from '../src/territorio/session';
import { resolveSituation, SITUATIONS } from '../src/territorio/situations';

const MONTHS = 24;
const SEED = 47;
/** Index difference below which two options are "the same" (points). */
const EPS = 0.05;

/**
 * Flagged cases kept on purpose, with the reason (situation id → reason). A default that is not the worst can be
 * deliberate: the other options are bets with a downside, or the default is a sensible "wait and see".
 */
const TWO = 'dos opciones: la alternativa es no decidir (el default), que debe ser la peor; ganar es atender el escritorio';
const EXCEPTIONS: Record<string, string> = {
  'satellite-monitoring': `${TWO} (oferta gratuita)`,
  'corruption-scandal': `${TWO} (investigar o negar)`,
  'public-hearing': `${TWO} (vinculante o consultiva)`,
  'climate-fund': `${TWO} (oportunidad: el costo de ignorarla es perderla)`,
};

const index = (g: GameState): number => {
  const i = g.indicators;
  return 0.25 * (i.biodiversity + i.foodSecurity + i.economicSecurity + i.socialWellbeing);
};

/** What the index leaves out: political stability and the three sectoral pressures (points). */
interface Side { St: number; pa: number; pe: number; ps: number }
const side = (g: GameState): Side => ({
  St: g.indicators.politicalStability,
  pa: g.stellaSpecificState.PP_AGRICOLA, pe: g.stellaSpecificState.PP_AMBIENTALISTA, ps: g.stellaSpecificState.PP_SOCIAL,
});

function run(start: GameState, sides?: Side[]): number[] {
  let g = start;
  let month = 0;
  const out: number[] = [];
  for (let m = 0; m < MONTHS; m++) {
    const r = stepMonth(g, month, makeRng(SEED, m), CONTROL_PARAMS, 'es', {
      publicUseUpkeep: true, seasonality: true, events: [], noShocks: true,
    });
    g = r.next;
    month = r.month;
    out.push(index(g));
    sides?.push(side(g));
  }
  return out;
}

const meanSide = (xs: Side[], base: Side[]): Side => ({
  St: mean(xs.map((x, m) => x.St - base[m].St)),
  pa: mean(xs.map((x, m) => x.pa - base[m].pa)),
  pe: mean(xs.map((x, m) => x.pe - base[m].pe)),
  ps: mean(xs.map((x, m) => x.ps - base[m].ps)),
});

/** Where `a` is worse than `b` outside the index (lower St, a higher pressure, a higher net cost), as text; '' if nowhere. */
function downside(a: Row, b: Row): string {
  const out: string[] = [];
  if (a.side.St < b.side.St - EPS) out.push(`St ${(a.side.St - b.side.St).toFixed(2)}`);
  (['pa', 'pe', 'ps'] as const).forEach((k) => { if (a.side[k] > b.side[k] + EPS) out.push(`π${k[1]} +${(a.side[k] - b.side[k]).toFixed(2)}`); });
  if (a.netCost > b.netCost + 1e-6) out.push(`costo +${(a.netCost - b.netCost).toFixed(0)}`);
  return out.join(', ');
}

const mean = (xs: number[]): number => xs.reduce((s, x) => s + x, 0) / xs.length;
const money = (g: GameState): number => g.stellaSpecificState.Reservas_del_Tesoro - g.stellaSpecificState.Deuda;

interface Row { option: string; index: number; netCost: number; isDefault: boolean; effects: number; side: Side }

const start = newGameState(CONTROL_PARAMS);
const baseSides: Side[] = [];
const base = run(start, baseSides);
const ZERO: Side = { St: 0, pa: 0, pe: 0, ps: 0 };
const lines: string[] = [];
let dominantCount = 0;
let defaultCount = 0;
let nullCount = 0;
const flagged: string[] = [];
const tradeoffs: string[] = [];

SITUATIONS.forEach((def) => {
  const rows: Row[] = def.options.map((o, k) => {
    const r = resolveSituation(start, def.id, o.id, CONTROL_PARAMS);
    if (!r.ok) return { option: o.id, index: NaN, netCost: NaN, isDefault: k === def.options.length - 1, effects: o.effects.length, side: ZERO };
    const sides: Side[] = [];
    const traj = run(r.state, sides);
    return {
      option: o.id,
      index: mean(traj.map((v, m) => v - base[m])),
      netCost: money(start) - money(r.state),
      isDefault: k === def.options.length - 1,
      effects: o.effects.length,
      side: meanSide(sides, baseSides),
    };
  });
  const flags: string[] = [];
  const notes: string[] = [];
  // An option that cannot be paid from the starting state is not compared (NaN); say so instead of skipping it.
  rows.filter((r) => Number.isNaN(r.index)).forEach((r) => flags.push(`inasequible al inicio: ${r.option}`));
  rows.forEach((row, k) => {
    const others = rows.filter((_, j) => j !== k);
    if (others.every((o) => row.index > o.index + EPS && row.netCost <= o.netCost + 1e-6)) {
      // Best index at no higher cost. It is only a free lunch if it is not worse outside the index either.
      const trade = others.map((o) => downside(row, o)).filter(Boolean);
      if (trade.length) notes.push(`${row.option} gana en índice y costo, a cambio de: ${trade.join(' / ')}`);
      else { flags.push(`dominante: ${row.option}`); dominantCount++; }
    }
    const total = Math.abs(row.index) + Math.abs(row.side.St) + Math.abs(row.side.pa) + Math.abs(row.side.pe) + Math.abs(row.side.ps);
    if (total < EPS && Math.abs(row.netCost) < 1e-6 && !row.isDefault && row.effects > 0) {
      flags.push(`efecto nulo: ${row.option}`);
      nullCount++;
    }
  });
  const dflt = rows[rows.length - 1];
  rows.slice(0, -1).forEach((o) => {
    if (!(dflt.index > o.index + EPS)) return;
    // The default beats `o` in the index: convenient only if `o` buys nothing outside it (St, pressures, money).
    const upside = downside(dflt, o);
    if (upside) notes.push(`default ${dflt.option} supera a ${o.option} en índice, pero es peor en: ${upside}`);
    else { flags.push(`default conviene frente a ${o.option} (${dflt.index.toFixed(2)} > ${o.index.toFixed(2)})`); defaultCount++; }
  });
  const exception = EXCEPTIONS[def.id];
  if (flags.length) flagged.push(`| \`${def.id}\` | ${flags.join('; ')} | ${exception ?? '—'} |`);
  if (notes.length) tradeoffs.push(`| \`${def.id}\` | ${notes.join('; ')} |`);
  lines.push(`| \`${def.id}\` | ${rows.map((r) => `${r.option}${r.isDefault ? '*' : ''}: ${r.index.toFixed(2)} / ${r.netCost.toFixed(0)} / ${r.side.St.toFixed(1)}`).join(' · ')} |`);
});

const md = `# Auditoría del catálogo de situaciones (fase 47)

Generado por \`npx tsx scripts/situations-audit.ts\` (mejora-general/files/47 §4). Para cada opción: 24 meses desde el
estado inicial de Territorio con la opción aplicada contra los mismos 24 meses sin ella (semilla ${SEED}, sin eventos
aleatorios ni choques de rendimiento, sin otras situaciones ni desgaste). Índice I = 0,25·(ΔB + ΔF + ΔE + ΔW) promediado
sobre los 24 meses (los impulsos decaen con vida media de 18 meses); costo neto = costo − efectos inmediatos sobre
reservas y deuda (unidades del tesoro). \`*\` = opción por defecto (la última; la que se aplica si nadie decide).
Umbral de igualdad: ${EPS} puntos.

## Resumen

- Situaciones: ${SITUATIONS.length}; opciones: ${SITUATIONS.reduce((s, d) => s + d.options.length, 0)}.
- Opciones dominantes (mejor índice y menor costo neto que todas las demás de su situación, sin peor estabilidad ni
  presiones que ninguna): **${dominantCount}** (justificadas: ${Object.keys(EXCEPTIONS).length}).
- Defaults que convienen (mejor índice que otra opción que no compensa con estabilidad, presiones ni dinero): **${defaultCount}**.
- Opciones (no default) con efecto total nulo (índice, estabilidad y presiones): **${nullCount}**.

El índice de la spec no mira la estabilidad política ni las presiones sectoriales; una opción que gana en índice y costo
a cambio de presión o estabilidad es una decisión, no un atajo: se lista en "Compromisos" y no cuenta como marca.

## Marcas

| Situación | Marca | Justificación |
|---|---|---|
${flagged.length ? flagged.join('\n') : '| — | ninguna | — |'}

## Compromisos (ganan en índice y costo, o el default gana en índice, pero pagan fuera de él)

| Situación | Compromiso |
|---|---|
${tradeoffs.length ? tradeoffs.join('\n') : '| — | ninguno |'}

## Detalle (índice / costo neto / ΔSt medio)

| Situación | Opciones |
|---|---|
${lines.join('\n')}
`;

const out = process.argv[2] ?? 'reports/situations-audit.md';
writeFileSync(out, md);
console.log(`situations-audit: ${dominantCount} dominant, ${defaultCount} defaults not worst, ${nullCount} null → ${out}`);
