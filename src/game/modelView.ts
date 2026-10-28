/**
 * Phase 50 (mejora-general/files/50_interfaz_docentes_decarbonito.md): what the interfaces of both games, the
 * facilitator and DecarboNito show of the model 2.0 sub-state (`GameState.model`), read in one place so the
 * dashboard, the Territorio HUD, the Gemini context and the advisor never compute the same number two ways.
 *
 * Pure: no React, no randomness. Reads the state only; every number comes from the engine (targets, emissions,
 * fiscal block, distributive conflict) or from PARAMS_V2 (thresholds of the fiscal rules). Nothing here changes
 * the model.
 */
import type { GameState, Indicators, ModelIndicatorKey, PolicyState } from '../types';
import { carbonBudgetIndex } from '../sim/v2/carbon';
import { INSTRUMENT_CHANNELS, PARAMS_V2 } from '../sim/v2/params';
import { policyCostOf, policyStatus, PID_OF, costShareOf, effortShare } from '../sim/v2/policies';
import { evaluateLevel, LEVEL_ROUTES, type RouteCondition } from '../sim/winRoutes';
import { canPayPublicInvestment } from '../sim/v2/finance';
import { FOREST_KINDS, type Territory } from '../sim/territory';

/** Indicators that relax toward a logistic target, and how each reads its target from `model.targets`. */
export const TARGET_OF: Partial<Record<keyof Indicators, { key: ModelIndicatorKey; complement: boolean }>> = {
  biodiversity: { key: 'B', complement: false },
  foodSecurity: { key: 'F', complement: false },
  economicSecurity: { key: 'E', complement: false },
  // W = 100 − C and St = 100 − Pc: their targets are the complements of the conflict / collapse targets.
  socialWellbeing: { key: 'C', complement: true },
  politicalStability: { key: 'Pc', complement: true },
  ppAgricola: { key: 'pa', complement: false },
  ppAmbientalista: { key: 'pe', complement: false },
  ppSocial: { key: 'ps', complement: false },
};

/** The target X* an indicator is relaxing toward ("va hacia"), or null without a 2.0 sub-state / target yet. */
export function indicatorTarget(state: Pick<GameState, 'model'>, indicator: keyof Indicators): number | null {
  const map = TARGET_OF[indicator];
  const raw = map ? state.model?.targets?.[map.key] : undefined;
  if (raw === undefined || !Number.isFinite(raw)) return null;
  return map!.complement ? 100 - raw : raw;
}

/** Below this gap (points) the arrow toward the target reads as "steady". */
export const TARGET_STEADY_GAP = 0.5;

/** Direction of the move toward the target: 'up' / 'down' / 'flat' (|X* − X| < TARGET_STEADY_GAP). */
export function targetDirection(value: number, target: number | null): 'up' | 'down' | 'flat' {
  if (target === null || Math.abs(target - value) < TARGET_STEADY_GAP) return 'flat';
  return target > value ? 'up' : 'down';
}

/* ── Carbon ─────────────────────────────────────────────────────────────────────────────────── */

export interface CarbonView {
  /** tCO₂e per inhabitant per year: total and by source (energy, land flux AFOLU, land-use change LUC). */
  perCapita: number; energy: number; afolu: number; luc: number;
  /** Renewable share of electricity and efficiency gain of the rest of energy, 0-1. */
  renewableShare: number; efficiency: number;
  /** Carbon budget used (cumulative emissions over the reference path): > 1 = above budget; null at t = 0. */
  budget: number | null;
}

export function carbonView(state: Pick<GameState, 'model' | 'stellaSpecificState' | 'indicators'>): CarbonView | null {
  const m = state.model;
  if (!m) return null;
  const pop = state.stellaSpecificState.Poblacion_Total > 0 ? state.stellaSpecificState.Poblacion_Total : 1;
  const budget = m.t > 0 ? carbonBudgetIndex(m) : null;
  return {
    perCapita: state.indicators.co2EqEmissionsPerCapita,
    energy: m.emissions.energy / pop,
    afolu: m.emissions.afolu / pop,
    luc: m.emissions.luc / pop,
    renewableShare: m.energy.renewableShare,
    efficiency: m.energy.efficiency,
    budget: budget !== null && Number.isFinite(budget) ? budget : null,
  };
}

/* ── Public finance ─────────────────────────────────────────────────────────────────────────── */

export interface FiscalView {
  /** Debt / GDP. */
  debtRatio: number;
  /** Primary balance / GDP (+ surplus). */
  primaryShare: number;
  /** Interest / revenue. */
  interestBurden: number;
  /** Fiscal stress φ (0-1). */
  stress: number;
  /** Months inside the bankruptcy rule (D/Y > 1 with interest > 20 % of revenue); 24 ends the game. */
  breachMonths: number;
  /**
   * No fiscal space: a public investment of NO_FISCAL_SPACE_PROBE·GDP (about one public-use lot) would be refused by the
   * engine's own rule (`canPayPublicInvestment`: free reserves, then debt while D/Y ≤ 0.6).
   */
  noFiscalSpace: boolean;
}

/** Size of the probe investment of "no fiscal space", share of GDP (≈ a 5 kHa protected-area lot; UI threshold). */
export const NO_FISCAL_SPACE_PROBE = 0.01;

export function fiscalView(state: Pick<GameState, 'model' | 'stellaSpecificState'>): FiscalView | null {
  const f = state.model?.fiscal;
  if (!f) return null;
  const st = state.stellaSpecificState;
  const Y = st.PBI_Real;
  const F = PARAMS_V2.finance;
  return {
    debtRatio: Y > 0 ? st.Deuda / Y : 0,
    primaryShare: Y > 0 ? f.primaryBalance / Y : 0,
    interestBurden: f.interestBurden,
    stress: f.stress,
    breachMonths: Math.round(f.breachYears * 12),
    noFiscalSpace: Y > 0 && !canPayPublicInvestment(state, NO_FISCAL_SPACE_PROBE * Y),
  };
}

/** Fiscal-stress band of the UI (same cut points as Territorio's finance panel since phase 44). */
export function stressBand(stress: number): 'low' | 'mid' | 'high' {
  return stress >= 0.5 ? 'high' : stress >= 0.15 ? 'mid' : 'low';
}

/* ── Distributive conflict (phase 45) ───────────────────────────────────────────────────────── */

export interface SocialView {
  /** Land concentration G (0-1) and its value at level start. */
  concentration: number; concentration0: number;
  /** Just-transition index J (0-1; 1 = restrictions fully accompanied or none) and the restriction load. */
  justTransition: number; restrictionLoad: number;
}

export function socialView(state: Pick<GameState, 'model'>): SocialView | null {
  const m = state.model;
  if (!m?.social) return null;
  return {
    concentration: m.social.concentration,
    concentration0: m.anchors.concentration0,
    justTransition: m.social.justTransition,
    restrictionLoad: m.social.restrictionLoad,
  };
}

/** Below this J, with restrictions active, the transition reads as "restricting without support" (advisor cue, 50 §2). */
export const JUST_TRANSITION_LOW = 0.4;
/** Minimum restriction load for that reading (below it J is 1 by construction or meaningless). */
export const RESTRICTION_MIN = 0.05;

/** "Restricting without support": the single predicate of the dashboard, the Territorio panel and the advisor cue. */
export const justTransitionLow = (v: SocialView | null): boolean =>
  !!v && v.restrictionLoad > RESTRICTION_MIN && v.justTransition < JUST_TRANSITION_LOW;

/* ── Policies ───────────────────────────────────────────────────────────────────────────────── */

export type PolicyPhase = 'off' | 'starting' | 'full' | 'worn';

export interface PolicyView {
  phase: PolicyPhase;
  /** Start-up factor 0-1 (NN % of "starting up"). */
  ramp: number;
  /** Fatigue factor 0-1 (NN % of "worn": what is left of its push above the institutional floor). */
  fatigue: number;
  /** Current annual cost (u.m./yr): κ·Y·(f + (1 − f)·ē); at full effort while inactive. */
  annualCost: number;
  /** Extra annual cost of +10 effort points (0 when the total effort is already 100). */
  marginalCost10: number;
}

/** Effort step (points) of the marginal cost shown next to the instruments. */
export const MARGINAL_EFFORT_STEP = 10;

export function policyView(p: PolicyState, gdp: number): PolicyView {
  const st = policyStatus(p);
  const phase: PolicyPhase = !p.isActive ? 'off' : st.starting ? 'starting' : st.worn ? 'worn' : 'full';
  const kappaY = costShareOf(PID_OF[p.id]) * gdp;
  const room = Math.max(0, Math.min(MARGINAL_EFFORT_STEP, 100 - effortShare(p) * 100)) / 100;
  return {
    phase,
    ramp: st.ramp,
    fatigue: st.fatigue,
    annualCost: p.isActive ? policyCostOf(p, gdp) : kappaY,
    marginalCost10: kappaY * (1 - PARAMS_V2.costFixedShare) * room,
  };
}

/* ── Instrument hints (phase 50: replace the 1.1 INSTRUMENT_IMPACT_HINTS) ───────────────────── */

export type InstrumentChannel = 'land' | 'prod' | 'social' | 'elec' | 'other' | 'tax';

export interface InstrumentHint {
  /** Channels where the instrument weighs ≥ 0.6 (relevance 1 = high, 0.6 = medium), strongest first. */
  channels: { channel: InstrumentChannel; level: 'high' | 'medium' }[];
  /** Just-transition label of the instrument (phase 45): restriction, support or neutral. */
  tag: 'support' | 'restriction' | 'neutral';
}

/** Relevance from which a channel counts as "medium" (50 §1: ≥ 0.6) and as "high". */
export const CHANNEL_MEDIUM = 0.6;
export const CHANNEL_HIGH = 1;

/**
 * What the instrument panels say about one instrument, read from INSTRUMENT_CHANNELS (the same relevances μ the engine
 * uses). Carbon Neutrality's `land` / `prod` rows are uniform placeholders of the prototype's generic channel, so for
 * CN only its own channels (elec / other / tax / social) are shown. Null for an unknown instrument.
 */
export function instrumentHint(policyId: PolicyState['id'], instrumentId: string): InstrumentHint | null {
  const pid = PID_OF[policyId];
  const ch = pid ? INSTRUMENT_CHANNELS[pid] : undefined;
  const k = ch ? ch.ids.indexOf(instrumentId) : -1;
  if (!ch || k < 0) return null;
  const names: InstrumentChannel[] = pid === 'CN' ? ['elec', 'other', 'tax', 'social'] : ['land', 'prod', 'social'];
  const channels = names
    .map((channel) => ({ channel, mu: (ch[channel] ?? [])[k] ?? 0 }))
    .filter((c) => c.mu >= CHANNEL_MEDIUM)
    .sort((a, b) => b.mu - a.mu)
    .map(({ channel, mu }) => ({ channel, level: (mu >= CHANNEL_HIGH ? 'high' : 'medium') as 'high' | 'medium' }));
  return { channels, tag: ch.tag[k] };
}

/* ── Territorio: connectivity of a lot (phase 40 K, shown since phase 50) ──────────────────── */

/**
 * Whether a public-use lot (parcel indices on a size × size grid) touches existing forest (4-neighbours outside the
 * lot): a protected area or restoration contiguous to the forest raises the connectivity K, an isolated one lowers it.
 */
export function lotTouchesForest(t: Pick<Territory, 'size' | 'parcels'>, cells: number[]): boolean {
  const inLot = new Set(cells);
  return cells.some((i) => {
    const x = i % t.size;
    const y = (i / t.size) | 0;
    return ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).some(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= t.size || ny >= t.size) return false;
      const j = ny * t.size + nx;
      return !inLot.has(j) && FOREST_KINDS.has(t.parcels[j].kind);
    });
  });
}

/* ── Routes of the 3-level game ─────────────────────────────────────────────────────────────── */

/** Which indicator each route / floor label reads (for the dashboard stars and the chart threshold lines). */
const LABEL_INDICATOR: Record<string, keyof Indicators> = {
  'cond.biodiversity': 'biodiversity', 'routes.floor.biodiversity': 'biodiversity',
  'cond.emissions': 'co2EqEmissionsPerCapita',
  'cond.foodSecurity': 'foodSecurity', 'routes.floor.foodSecurity': 'foodSecurity',
  'cond.economicSecurity': 'economicSecurity', 'routes.floor.economicSecurity': 'economicSecurity',
  'cond.socialWellbeing': 'socialWellbeing', 'routes.floor.socialWellbeing': 'socialWellbeing',
  'cond.politicalStability': 'politicalStability', 'routes.floor.politicalStability': 'politicalStability',
  'cond.pressureAgri': 'ppAgricola', 'routes.floor.pressureAgri': 'ppAgricola',
  'cond.pressureEnv': 'ppAmbientalista', 'routes.floor.pressureEnv': 'ppAmbientalista',
  'routes.floor.pressureSocial': 'ppSocial',
  'cond.pbi': 'pbi',
  'cond.score': 'generalScore',
  'cond.debtRatio': 'debt', 'routes.floor.debtRatio': 'debt',
};

/** Indicator a route condition reads, if it reads one directly (renewables, forest, pacts… read other things). */
export const indicatorOfCondition = (c: Pick<RouteCondition, 'labelKey'>): keyof Indicators | undefined => LABEL_INDICATOR[c.labelKey];

/** Indicators that some floor or route of the level asks for: the stars of the dashboard (phase 49 routes). */
export function routeIndicators(level: number): Set<keyof Indicators> {
  const cfg = LEVEL_ROUTES[level];
  const out = new Set<keyof Indicators>();
  if (!cfg) return out;
  [...cfg.floors, ...cfg.routes.flatMap((r) => r.conditions)].forEach((c) => {
    const k = indicatorOfCondition(c);
    if (k) out.add(k);
  });
  return out;
}

/** Governance floors of the level that read a 0-100 indicator: the threshold lines of the history charts. */
export function floorLines(level: number): { indicator: keyof Indicators; target: number; dir: 'min' | 'max' }[] {
  const cfg = LEVEL_ROUTES[level];
  if (!cfg) return [];
  return cfg.floors.flatMap((f) => {
    const indicator = indicatorOfCondition(f);
    return indicator && indicator !== 'debt' ? [{ indicator, target: f.target, dir: f.dir }] : [];
  });
}

/** Distinct emissions caps (t/inhabitant) of the level's routes, for the CO₂ chart. */
export function emissionsTargets(level: number): number[] {
  const cfg = LEVEL_ROUTES[level];
  if (!cfg) return [];
  return [...new Set(cfg.routes.flatMap((r) => r.conditions).filter((c) => c.labelKey === 'cond.emissions').map((c) => c.target))].sort((a, b) => a - b);
}

/**
 * The level's win rule as plain lines for DecarboNito's prompts (Gemini context and level-end reflection): failed floors
 * with the value reached, each route with progress, multiplier and every condition (target and value), and the route
 * achieved. `label` translates the i18n keys (both callers pass Spanish: the prompts are in Spanish).
 */
export function routesContextLines(state: GameState, label: (key: string) => string): string[] {
  const outcome = evaluateLevel(state, { ...state, indicators: state.levelBaseline });
  const v = (n: number) => (Math.abs(n) >= 1000 ? n.toFixed(0) : n.toFixed(2));
  const op = (c: Pick<RouteCondition, 'dir'>) => (c.dir === 'min' ? '>=' : '<=');
  const lines: string[] = [];
  if (outcome.failedFloors.length === 0) lines.push('- Mínimos de gobernabilidad: todos cumplidos.');
  outcome.failedFloors.forEach((f) => lines.push(`- MÍNIMO INCUMPLIDO: ${label(f.labelKey)} ${op(f)} ${f.target} (actual: ${v(f.read(state))})`));
  outcome.routes.forEach((rp) => {
    lines.push(`- ${label(rp.route.nameKey)} (${Math.round(rp.progress * 100)}% de avance${rp.met ? ', CUMPLIDA' : ''}, multiplicador de puntaje x${rp.route.scoreMultiplier}${rp.route.minConditionsMet ? `, alcanza con ${rp.route.minConditionsMet} de ${rp.conditions.length}` : ''}):`);
    rp.conditions.forEach((c) => lines.push(`    ${c.met ? 'cumple' : 'falta'}: ${label(c.condition.labelKey)} ${op(c.condition)} ${c.condition.target} (actual: ${v(c.value)})`));
  });
  if (outcome.achieved) lines.push(`- Ruta lograda: ${label(outcome.achieved.nameKey)}.`);
  return lines;
}

/** Score threshold of the level's routes (the equilibrium route of level 3), or undefined when no route reads S. */
export function scoreTarget(level: number): number | undefined {
  const cfg = LEVEL_ROUTES[level];
  return cfg?.routes.flatMap((r) => r.conditions).find((c) => c.labelKey === 'cond.score')?.target;
}
