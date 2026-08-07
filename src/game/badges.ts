/**
 * Achievement badges (19_estetica_visual.md §7). "Sistema de insignias mínimo pero real. Nada de
 * puntos vacíos: cada insignia nombra un concepto del dominio, de modo que la lista de logros
 * funcione como resumen de lo que el juego enseña." Nine badges, exactly the source table.
 *
 * Every condition is a pure function of already-available game state, kept individually exported
 * and individually testable (tests/sim/badges.spec.ts, named explicitly in the source file's own
 * verification checklist, item 8). `evaluateBadges` is the single orchestrator App.tsx calls.
 *
 * Deviations from the source spec, logged in docs/DESIGN_DECISIONS_LOG.md:
 *  - "Balance de carbono positivo" (Primer Balance / Sumidero Neto): `computeCarbonBalance`
 *    (src/sim/carbon.ts) clamps its result at 0 -- `co2EqEmissionsPerCapita` can never actually go
 *    negative in this codebase. A genuinely positive balance (sequestration >= emissions) always
 *    surfaces as exactly 0, so that's the condition used here instead of `< 0`.
 *  - "Sin Atajos" (política de bajo costo ambiental): no cost-tier field exists on PolicyState.
 *    Interpreted as the three policies whose own mechanics directly worsen emissions or weaken
 *    oversight (EnergySubsidies/IntensiveAgriculture push totalEmissions up in carbon.ts;
 *    FlexibleEnvironmentalRegulations is the deregulation lever) -- see SHORTCUT_POLICIES. Checked
 *    against the policy snapshot active *at the moment of winning*, not "never activated during
 *    the level" (no per-policy activation history log exists to check the stronger claim).
 *  - "Pronosticadora" (80% en un nivel): `PredictionResult` (src/components/tutorial/
 *    predictions.ts) carries no level tag and App.tsx's accumulator is never reset on level
 *    change. Approximated as session-wide accuracy across all predictions resolved so far
 *    (minimum 5 samples, to keep 1-for-1 luck from qualifying).
 */
import type { GameState, HistoricalDataPoint, Indicators } from '../types';
import { Policy } from '../types';
import type { LevelOutcome, RouteId } from '../sim/winRoutes';
import type { PredictionResult } from '../components/tutorial/predictions';

export type BadgeId =
  | 'firstBalance'
  | 'netSink'
  | 'noShortcuts'
  | 'negotiator'
  | 'pluralist'
  | 'forecaster'
  | 'noDebt'
  | 'justTransition'
  | 'apprentice';

export interface BadgeDefinition {
  id: BadgeId;
  nameKey: string;
  descKey: string;
}

/** Source table order (19_estetica_visual.md §7), kept for the profile grid. */
export const BADGES: BadgeDefinition[] = [
  { id: 'firstBalance', nameKey: 'badges.firstBalance.name', descKey: 'badges.firstBalance.desc' },
  { id: 'netSink', nameKey: 'badges.netSink.name', descKey: 'badges.netSink.desc' },
  { id: 'noShortcuts', nameKey: 'badges.noShortcuts.name', descKey: 'badges.noShortcuts.desc' },
  { id: 'negotiator', nameKey: 'badges.negotiator.name', descKey: 'badges.negotiator.desc' },
  { id: 'pluralist', nameKey: 'badges.pluralist.name', descKey: 'badges.pluralist.desc' },
  { id: 'forecaster', nameKey: 'badges.forecaster.name', descKey: 'badges.forecaster.desc' },
  { id: 'noDebt', nameKey: 'badges.noDebt.name', descKey: 'badges.noDebt.desc' },
  { id: 'justTransition', nameKey: 'badges.justTransition.name', descKey: 'badges.justTransition.desc' },
  { id: 'apprentice', nameKey: 'badges.apprentice.name', descKey: 'badges.apprentice.desc' },
];

/* ── Primer Balance / Sumidero Neto ──────────────────────────────────────────────────────────── */

export function hasPositiveCarbonBalanceYear(history: HistoricalDataPoint[]): boolean {
  return history.some((h) => h.co2EqEmissionsPerCapita <= 0);
}

export function hasThreeConsecutivePositiveBalanceYears(history: HistoricalDataPoint[]): boolean {
  let streak = 0;
  for (const h of history) {
    streak = h.co2EqEmissionsPerCapita <= 0 ? streak + 1 : 0;
    if (streak >= 3) return true;
  }
  return false;
}

/* ── Sin Atajos ───────────────────────────────────────────────────────────────────────────────── */

export const SHORTCUT_POLICIES: Policy[] = [
  Policy.EnergySubsidies,
  Policy.IntensiveAgriculture,
  Policy.FlexibleEnvironmentalRegulations,
];

export function wonWithoutShortcuts(outcome: LevelOutcome | null, policies: GameState['policies']): boolean {
  if (!outcome?.won) return false;
  return SHORTCUT_POLICIES.every((id) => !policies[id]?.isActive);
}

/* ── Negociadora ──────────────────────────────────────────────────────────────────────────────── */

/** Reads `history` rather than the live indicators snapshot: `history[0]` is always the level's
 *  year-zero baseline, where every pressure typically starts at or near 0 -- trivially "below 50"
 *  without the player having negotiated anything. Requiring at least one simulated year keeps the
 *  badge tied to something the player actually did. */
export function negotiatedAllPressuresDown(history: HistoricalDataPoint[], threshold = 50): boolean {
  if (history.length < 2) return false;
  return history.some((h) => h.ppAgricola < threshold && h.ppAmbientalista < threshold && h.ppSocial < threshold);
}

/* ── Pluralista ───────────────────────────────────────────────────────────────────────────────── */

/** The three routes every level has; level 3's bonus `equilibrium` route neither counts toward
 *  nor blocks this badge -- the source table says "las tres rutas", matching files 17's base set. */
const PLURALIST_ROUTES: RouteId[] = ['conservation', 'production', 'innovation'];

export type RoutesWonPerLevel = Partial<Record<number, RouteId[]>>;

export function recordRouteWin(prev: RoutesWonPerLevel, level: number, routeId: RouteId): RoutesWonPerLevel {
  const existing = prev[level] ?? [];
  if (existing.includes(routeId)) return prev;
  return { ...prev, [level]: [...existing, routeId] };
}

export function hasWonAllRoutesOnSomeLevel(routesWonPerLevel: RoutesWonPerLevel): boolean {
  return Object.values(routesWonPerLevel).some((routes) => routes && PLURALIST_ROUTES.every((r) => routes.includes(r)));
}

/* ── Pronosticadora ───────────────────────────────────────────────────────────────────────────── */

export function forecastAccuracy(results: PredictionResult[]): number {
  if (results.length === 0) return 0;
  return results.filter((r) => r.correct).length / results.length;
}

export function isSkilledForecaster(results: PredictionResult[], minSamples = 5, threshold = 0.8): boolean {
  return results.length >= minSamples && forecastAccuracy(results) >= threshold;
}

/* ── Sin Deuda ────────────────────────────────────────────────────────────────────────────────── */

export function finishedLevel3WithLowDebt(gameState: GameState, maxRatio = 0.30): boolean {
  if (gameState.currentLevel !== 3) return false;
  const pbi = gameState.stellaSpecificState.PBI_Real;
  if (!(pbi > 0)) return false;
  return gameState.stellaSpecificState.Deuda / pbi < maxRatio;
}

/* ── Transición Justa ─────────────────────────────────────────────────────────────────────────── */

export function wonWithJustTransition(outcome: LevelOutcome | null, indicators: Indicators, threshold = 60): boolean {
  if (!outcome?.won) return false;
  return indicators.socialWellbeing >= threshold && indicators.biodiversity >= threshold;
}

/* ── Aprendiz: the caller passes `debriefingCompleted` directly, nothing to compute here. ──────── */

/* ── Orchestrator ─────────────────────────────────────────────────────────────────────────────── */

export interface BadgeContext {
  gameState: GameState;
  /** Current level's year-by-year history (App.tsx `historicalData`; resets on level change). */
  history: HistoricalDataPoint[];
  /** Set only right after a level concludes; null otherwise. */
  outcome: LevelOutcome | null;
  /** Accumulated prediction results for the session so far. */
  predictionResults: PredictionResult[];
  routesWonPerLevel: RoutesWonPerLevel;
  debriefingCompleted: boolean;
}

/** Returns every badge id currently satisfied by `ctx` (stateless -- the caller diffs this
 *  against previously-earned ids to find what's new, and persists the union). */
export function evaluateBadges(ctx: BadgeContext): BadgeId[] {
  const earned: BadgeId[] = [];
  if (hasPositiveCarbonBalanceYear(ctx.history)) earned.push('firstBalance');
  if (hasThreeConsecutivePositiveBalanceYears(ctx.history)) earned.push('netSink');
  if (wonWithoutShortcuts(ctx.outcome, ctx.gameState.policies)) earned.push('noShortcuts');
  if (negotiatedAllPressuresDown(ctx.history)) earned.push('negotiator');
  if (hasWonAllRoutesOnSomeLevel(ctx.routesWonPerLevel)) earned.push('pluralist');
  if (isSkilledForecaster(ctx.predictionResults)) earned.push('forecaster');
  if (finishedLevel3WithLowDebt(ctx.gameState)) earned.push('noDebt');
  if (wonWithJustTransition(ctx.outcome, ctx.gameState.indicators)) earned.push('justTransition');
  if (ctx.debriefingCompleted) earned.push('apprentice');
  return earned;
}

/* ── Persistence (localStorage, degrade-gracefully -- same pattern as predictions.ts) ───────────── */

const EARNED_KEY = 'decarbonation.badges.earned';
const ROUTES_KEY = 'decarbonation.badges.routesWonPerLevel';

export function loadEarnedBadges(): BadgeId[] {
  try {
    const raw = localStorage.getItem(EARNED_KEY);
    return raw ? (JSON.parse(raw) as BadgeId[]) : [];
  } catch { return []; }
}

export function saveEarnedBadges(ids: BadgeId[]): void {
  try { localStorage.setItem(EARNED_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
}

export function loadRoutesWonPerLevel(): RoutesWonPerLevel {
  try {
    const raw = localStorage.getItem(ROUTES_KEY);
    return raw ? (JSON.parse(raw) as RoutesWonPerLevel) : {};
  } catch { return {}; }
}

export function saveRoutesWonPerLevel(data: RoutesWonPerLevel): void {
  try { localStorage.setItem(ROUTES_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}
