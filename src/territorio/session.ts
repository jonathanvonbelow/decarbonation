/**
 * Game session of the Territorio preview (mejora-general/files/21_fusion_ecosim.md): the single
 * 30-year level, advanced month by month, with the map kept in sync with the model.
 *
 * Pure functions over a plain `Session` value — no React — so the rules are testable
 * (tests/territorio/session.spec.ts) and the UI only renders and dispatches. The player actions
 * port the 3-level game's rules from src/App.tsx unchanged (max active policies, 5-year lock-in,
 * instrument effort capped at 100%, pact join cost, loan capped at 10% of GDP); what differs is
 * *when* each mechanic is available (§6 of the spec):
 *   - from the start: policies on/off and declaring protected areas. Effort is pre-split evenly
 *     across a policy's instruments on activation — the model runs with level-2 formulas, where a
 *     policy with no effort assigned does nothing;
 *   - after 5 years: the player re-splits instrument effort;
 *   - each pact from its own `unlockYear`, as in the model;
 *   - from `Ano_Activacion_Prestamo` (2035): loan and additional tax pressure, with the fiscal
 *     terms of the equations switched on.
 */
import { CONTROL_PARAMS, LEVEL_CONFIGS, MAX_ACTIVE_POLICIES, POLICY_LOCK_IN_DURATION } from '../constants';
import {
  createInitialState, createTerritory, declareProtectedArea, evaluateLevel, makeRng, stepMonth, syncTerritory,
  type LevelOutcome, type ParcelChange, type PublicUseError, type Territory,
} from '../sim';
import type { ControlParams, GameState, Indicators, PolicyInstrument, PolicyState, RandomEvent } from '../types';
import { LandUseType, Policy } from '../types';
import type { Language } from '../hooks/useLanguage';
import { INSTRUMENTS_UNLOCK_YEAR, TERRITORIO_LEVEL, TOTAL_MONTHS } from './calendar';
import { buildMonthNews, unlockNews, type NewsItem } from './news';

export * from './calendar';
/** Keeps the note/news feed bounded; the map and history carry the long view. */
const MAX_NEWS = 80;

export interface MonthSample {
  t: number;
  biodiversity: number;
  foodSecurity: number;
  economicSecurity: number;
  socialWellbeing: number;
  politicalStability: number;
  co2: number;
  score: number;
}

export type Outcome =
  | { kind: 'won'; routes: LevelOutcome }
  | { kind: 'lost'; routes: LevelOutcome }
  | { kind: 'collapse'; reason: string; routes: LevelOutcome };

export interface Session {
  seed: number;
  game: GameState;
  /** Month (0 = January) of `game.year` that the next step simulates. */
  month: number;
  /** Months simulated so far (0..TOTAL_MONTHS). */
  monthIndex: number;
  territory: Territory;
  /** Parcels changed by the last step, with a counter so the map can animate each batch once. */
  lastChanges: { tick: number; list: ParcelChange[] };
  history: MonthSample[];
  news: NewsItem[];
  /** Indicators at the start of the current calendar year (for the yearly summary). */
  yearStart: Indicators;
  /** Random event waiting for the player to read it; the clock does not advance meanwhile. */
  pendingEvent: RandomEvent | null;
  outcome: Outcome | null;
  /** Parcels the player declared protected, total. */
  declaredCount: number;
}

export interface Unlocks {
  instruments: boolean;
  finance: boolean;
  pact: (pactId: string) => boolean;
}

export function unlocks(s: Session, CP: ControlParams = CONTROL_PARAMS): Unlocks {
  const year = s.game.year;
  return {
    instruments: year >= INSTRUMENTS_UNLOCK_YEAR,
    finance: year >= CP.Ano_Activacion_Prestamo,
    pact: (pactId) => year >= (s.game.pacts[pactId]?.unlockYear ?? 0),
  };
}

function sample(game: GameState, t: number): MonthSample {
  const i = game.indicators;
  return {
    t,
    biodiversity: i.biodiversity,
    foodSecurity: i.foodSecurity,
    economicSecurity: i.economicSecurity,
    socialWellbeing: i.socialWellbeing,
    politicalStability: i.politicalStability,
    co2: i.co2EqEmissionsPerCapita,
    score: i.generalScore,
  };
}

/**
 * Fresh level-2 GameState with the UI-only fields the model's GameState also carries. CO2 and the
 * score at year zero come from `createInitialState`, which computes them from the level's own land
 * uses (fixed in v4 for both games — see docs/DESIGN_DECISIONS_LOG.md).
 */
export function newGameState(CP: ControlParams = CONTROL_PARAMS): GameState {
  const { gameStatePatch } = createInitialState(TERRITORIO_LEVEL, CP);
  return {
    ...gameStatePatch,
    activeLevelConfig: LEVEL_CONFIGS.find((lc) => lc.levelNumber === TERRITORIO_LEVEL),
    finances: {
      pbi: gameStatePatch.indicators.pbi,
      treasuryReserves: gameStatePatch.indicators.treasuryReserves,
      debt: gameStatePatch.indicators.debt,
    },
    gameLog: [],
    isSimulating: false,
    gameOverReason: null,
    loanRequestedThisRound: 0,
    currentEvent: null,
    newsHeadlines: [],
    wonLevels: [],
    _pendingLevelIntroTrigger: null,
  };
}

export function createSession(seed: number): Session {
  const game = newGameState();
  return {
    seed,
    game,
    month: 0,
    monthIndex: 0,
    territory: createTerritory(game.landUses, seed),
    lastChanges: { tick: 0, list: [] },
    history: [sample(game, 0)],
    news: [],
    yearStart: { ...game.indicators },
    pendingEvent: null,
    outcome: null,
    declaredCount: 0,
  };
}

const evaluateRoutes = (game: GameState): LevelOutcome => evaluateLevel(game, { ...game, indicators: game.levelBaseline });

function pushNews(news: NewsItem[], items: NewsItem[]): NewsItem[] {
  if (items.length === 0) return news;
  return [...items.reverse(), ...news].slice(0, MAX_NEWS);
}

/** Advances one month. No-op while an event card is pending or once the game is over. */
export function advanceMonth(s: Session, CP: ControlParams = CONTROL_PARAMS, language: Language = 'es'): Session {
  if (s.outcome || s.pendingEvent) return s;
  const before = unlocks(s, CP);
  const r = stepMonth(s.game, s.month, makeRng(s.seed, s.monthIndex), CP, language, { fiscalTermsActive: before.finance });
  const { territory, changes } = syncTerritory(s.territory, r.next.landUses, r.flows);
  const monthIndex = s.monthIndex + 1;

  const next: Session = {
    ...s,
    game: r.next,
    month: r.month,
    monthIndex,
    territory,
    lastChanges: { tick: s.lastChanges.tick + 1, list: changes },
    history: [...s.history, sample(r.next, monthIndex)],
    pendingEvent: r.event,
  };

  const items = buildMonthNews({
    prev: s.game,
    next: r.next,
    simulatedYear: s.game.year,
    simulatedMonth: s.month,
    monthIndex,
    event: r.event,
    changes,
    engineMessages: r.chatMessages.filter((m) => m.emphasisType === 'policy_efficiency_warning').map((m) => m.text),
    yearRolled: r.yearRolled,
    yearStart: s.yearStart,
  });
  if (r.yearRolled) next.yearStart = { ...r.next.indicators };
  items.push(...unlockNews(s, next, CP));
  next.news = pushNews(s.news, items);

  if (r.next.gameOverReason) {
    next.outcome = { kind: 'collapse', reason: r.next.gameOverReason, routes: evaluateRoutes(r.next) };
    next.pendingEvent = null;
  } else if (monthIndex >= TOTAL_MONTHS) {
    const routes = evaluateRoutes(r.next);
    next.outcome = { kind: routes.won ? 'won' : 'lost', routes };
    next.pendingEvent = null;
  }
  return next;
}

export function dismissEvent(s: Session): Session {
  return s.pendingEvent ? { ...s, pendingEvent: null } : s;
}

/* ── Player actions ────────────────────────────────────────────────────────────────────────── */

export type ActionError =
  | 'max-active' | 'locked' | 'not-unlocked' | 'insufficient-funds' | 'invalid-amount' | 'game-over'
  | PublicUseError;

export interface ActionResult {
  session: Session;
  error?: ActionError;
  /** Extra detail for the message shown to the player (e.g. the year a policy unlocks). */
  detail?: Record<string, string | number>;
}

const clonePolicies = (s: Session) => JSON.parse(JSON.stringify(s.game.policies)) as Record<Policy, PolicyState>;

export function togglePolicy(s: Session, policyId: Policy): ActionResult {
  if (s.outcome) return { session: s, error: 'game-over' };
  const policies = clonePolicies(s);
  const p = policies[policyId];
  if (!p.isActive) {
    const active = (Object.values(policies) as PolicyState[]).filter((x) => x.isActive).length;
    if (active >= MAX_ACTIVE_POLICIES) return { session: s, error: 'max-active', detail: { max: MAX_ACTIVE_POLICIES } };
    p.isActive = true;
    p.currentEfficiency = p.initialEfficiency || 1;
    p.previousEfficiencyForNotification = p.currentEfficiency;
    if (p.instruments) {
      const ids = Object.keys(p.instruments);
      const share = ids.length > 0 ? Math.floor(100 / ids.length) : 0;
      ids.forEach((id, i) => { p.instruments![id].effortPercentage = i === 0 ? 100 - share * (ids.length - 1) : share; });
      p.totalInstrumentEffortApplied = ids.length > 0 ? 100 : 0;
    }
  } else {
    if (p.activationYear !== undefined && s.game.year < p.activationYear + POLICY_LOCK_IN_DURATION) {
      return { session: s, error: 'locked', detail: { year: p.activationYear + POLICY_LOCK_IN_DURATION } };
    }
    p.isActive = false;
    p.activationYear = undefined;
    if (p.instruments) {
      (Object.values(p.instruments) as PolicyInstrument[]).forEach((inst) => { inst.effortPercentage = 0; });
      p.totalInstrumentEffortApplied = 0;
    }
  }
  return { session: { ...s, game: { ...s.game, policies } } };
}

/** Same capping rule as the 3-level game: an instrument can take at most what is left of 100%. */
export function setInstrumentEffort(s: Session, policyId: Policy, instrumentId: string, effort: number, CP: ControlParams = CONTROL_PARAMS): ActionResult {
  if (s.outcome) return { session: s, error: 'game-over' };
  if (!unlocks(s, CP).instruments) return { session: s, error: 'not-unlocked', detail: { year: INSTRUMENTS_UNLOCK_YEAR } };
  const policies = clonePolicies(s);
  const p = policies[policyId];
  const inst = p.instruments?.[instrumentId];
  if (!p.isActive || !inst) return { session: s };
  inst.effortPercentage = Math.max(0, Math.min(100, Number(effort) || 0));
  let total = (Object.values(p.instruments!) as PolicyInstrument[]).reduce((sum, x) => sum + x.effortPercentage, 0);
  if (total > 100) {
    inst.effortPercentage = Math.max(0, inst.effortPercentage - (total - 100));
    total = (Object.values(p.instruments!) as PolicyInstrument[]).reduce((sum, x) => sum + x.effortPercentage, 0);
  }
  p.totalInstrumentEffortApplied = Math.min(100, total);
  return { session: { ...s, game: { ...s.game, policies } } };
}

export function togglePact(s: Session, pactId: string, CP: ControlParams = CONTROL_PARAMS): ActionResult {
  if (s.outcome) return { session: s, error: 'game-over' };
  const pact = s.game.pacts[pactId];
  if (!pact) return { session: s };
  if (!unlocks(s, CP).pact(pactId)) return { session: s, error: 'not-unlocked', detail: { year: pact.unlockYear ?? 0 } };
  const reserves = s.game.stellaSpecificState.Reservas_del_Tesoro;
  let nextReserves = reserves;
  if (!pact.isActive && pact.costToJoin) {
    if (reserves < pact.costToJoin) return { session: s, error: 'insufficient-funds', detail: { cost: pact.costToJoin } };
    nextReserves -= pact.costToJoin;
  }
  const game: GameState = {
    ...s.game,
    pacts: { ...s.game.pacts, [pactId]: { ...pact, isActive: !pact.isActive } },
    stellaSpecificState: { ...s.game.stellaSpecificState, Reservas_del_Tesoro: nextReserves },
    indicators: { ...s.game.indicators, treasuryReserves: nextReserves },
  };
  return { session: { ...s, game } };
}

export function setTaxPressure(s: Session, pct: number, CP: ControlParams = CONTROL_PARAMS): ActionResult {
  if (s.outcome) return { session: s, error: 'game-over' };
  if (!unlocks(s, CP).finance) return { session: s, error: 'not-unlocked', detail: { year: CP.Ano_Activacion_Prestamo } };
  const value = Math.max(0, Math.min(CP.Max_Additional_Tax_Rate_Percentage, pct));
  return { session: { ...s, game: { ...s.game, additionalTaxPressurePercentage: value } } };
}

/** Maximum loan: 10% of real GDP, as in the 3-level game. */
export const maxLoan = (s: Session): number => s.game.stellaSpecificState.PBI_Real * 0.1;

export function requestLoan(s: Session, amount: number, CP: ControlParams = CONTROL_PARAMS): ActionResult {
  if (s.outcome) return { session: s, error: 'game-over' };
  if (!unlocks(s, CP).finance) return { session: s, error: 'not-unlocked', detail: { year: CP.Ano_Activacion_Prestamo } };
  if (!(amount > 0)) return { session: s, error: 'invalid-amount' };
  const granted = Math.min(amount, maxLoan(s));
  return { session: { ...s, game: { ...s.game, loanRequestedThisRound: s.game.loanRequestedThisRound + granted } }, detail: { amount: Math.round(granted) } };
}

/** The player's only direct land-use action: declare a native-forest parcel protected. */
export function protectParcel(s: Session, x: number, y: number, CP: ControlParams = CONTROL_PARAMS): ActionResult {
  if (s.outcome) return { session: s, error: 'game-over' };
  const r = declareProtectedArea(s.game, s.territory, x, y, CP);
  if (!r.ok) return { session: s, error: (r as { reason: PublicUseError }).reason };
  const ok = r as Extract<typeof r, { ok: true }>;
  const item: NewsItem = {
    id: `p-${s.monthIndex}-${x}-${y}`, monthIndex: s.monthIndex, year: s.game.year, month: s.month,
    kind: 'player', tone: 'good', key: 'declared', values: { cost: Math.round(ok.cost) },
  };
  return {
    session: {
      ...s,
      game: ok.state,
      territory: ok.territory,
      declaredCount: s.declaredCount + 1,
      news: pushNews(s.news, [item]),
      lastChanges: {
        tick: s.lastChanges.tick + 1,
        list: [{ x, y, from: LandUseType.UnprotectedNativeForest, to: LandUseType.ProtectedNativeForest }],
      },
    },
    detail: { cost: Math.round(ok.cost) },
  };
}
