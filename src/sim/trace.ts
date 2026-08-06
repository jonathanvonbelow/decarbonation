/**
 * Explainability trace for a single simulated year.
 *
 * This is a deliberately narrower cut than the itemized "biodiversity −4.2 land use, +1.1
 * conservation" per-source breakdown described in mejora-general/files/16_auditoria_ecuaciones.md
 * §2.2 and §6 (tooltip decomposition, DecarboNito's causal context, the "ficha del año" in file
 * 19). Producing that breakdown requires each `calculate*Change` function in indicators.ts to
 * return its contributing terms instead of a single combined number — a follow-up refactor to
 * schedule when phase 9 (tutorials/debriefing) or phase 10 (aesthetics/game feel) actually
 * consumes it, per docs/DESIGN_DECISIONS_LOG.md.
 *
 * For now, `SimTrace` captures the coarser but still useful top-level delta per indicator
 * (before -> after for the year), which is enough to answer "what moved and by how much" even
 * if not yet "why".
 */
import type { Indicators } from '../types';

export interface SimTrace {
  year: number;
  /** delta = after - before, one entry per indicator key that changed. */
  deltas: Partial<Record<keyof Indicators, number>>;
}

const EPSILON = 1e-9;

export function buildTrace(year: number, before: Indicators, after: Indicators): SimTrace {
  const deltas: Partial<Record<keyof Indicators, number>> = {};
  (Object.keys(after) as (keyof Indicators)[]).forEach((key) => {
    const delta = after[key] - before[key];
    if (Math.abs(delta) > EPSILON) deltas[key] = delta;
  });
  return { year, deltas };
}
