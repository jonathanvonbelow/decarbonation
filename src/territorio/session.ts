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
  changesTouchForest, createInitialState, createTerritory, declarePublicUse, developmentOf, developTerritory, baseEfficiency, fatigueFactor, evaluateGameOver,
  evenEffort, forestConnectivity, makeRng, MONTHS_PER_YEAR, pactEntryCost, payPublicInvestment, stepMonth, syncTerritory, type DeferredAdjustment,
  type LandFlow, type LevelOutcome, type ParcelChange, type PublicUse, type PublicUseError, type Territory,
} from '../sim';
import type { ControlParams, GameState, Indicators, PolicyInstrument, PolicyState, RandomEvent } from '../types';
import { Policy } from '../types';
import type { Language } from '../hooks/useLanguage';
import { INSTRUMENTS_UNLOCK_YEAR, TERRITORIO_LEVEL, TOTAL_MONTHS } from './calendar';
import { evaluateTerritorio } from './routes';
import { mapFx, type FxId } from './fx';
import { buildMonthNews, tallyLand, unlockNews, type NewsItem } from './news';
import {
  wearShift, wearTally, defaultOption, resolveSituation, rollSituation, situationCost, SITUATION_BY_ID, type OpenSituation,
} from './situations';

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
  /**
   * Situations sitting on the desk. They never stop the clock: while they are open they wear the
   * government down every month, and they resolve themselves badly when their deadline passes
   * (21_fusion_ecosim.md §7, decisión 1 del equipo).
   */
  open: OpenSituation[];
  /** Pressure points the inbox has cost so far, for the closing screen. */
  wearTotal: number;
  /** Situations the player actually decided, and ones that expired unattended. */
  resolvedCount: number;
  expiredCount: number;
  /** The model's own random event that fired this month, if any. Shown as a note, never as a modal. */
  lastEvent: RandomEvent | null;
  outcome: Outcome | null;
  /** Public-use lots the player declared, total. */
  declaredCount: number;
  /** What is happening on each parcel this month (fx.ts), by parcel index. */
  fx: Record<number, FxId>;
  /** Month index each active policy was switched on, for the 5-year lock-in. */
  policyActivatedAt: Partial<Record<Policy, number>>;
  /** Loans taken this calendar year: the 10%-of-GDP cap is per year, as in the 3-level game. */
  borrowed: { year: number; amount: number };
  /** km² per land transition not yet reported in the news (news.ts `tallyLand`). */
  landTally: Record<string, number>;
  /** Consecutive months each sustained-breach condition has been failing (see `BREACHES`). */
  breach: Record<string, number>;
  /**
   * Effects of decided or expired situations on indicators the month recomputes (CO2, stability,
   * money, pressures). Handed to the next `stepMonth` as `extraDeferred`, then emptied (phase 34, T-12).
   */
  pendingDeferred: DeferredAdjustment[];
  /**
   * Landscape connectivity of the map (model 2.0, phase 40 §3): K0 when the game started, K of the map as of
   * `tick` (the `lastChanges.tick` it was computed at). `advanceMonth` hands {K, K0} to the model and recomputes
   * K only when the map changed since (a declaration, a situation) or this month's changes touched forest.
   * Optional so a session built before phase 40 still runs (K0 is then taken from its current map).
   */
  connectivity?: { K0: number; K: number; tick: number };
}

/** Connectivity of the session's current map: the cached K when the map has not changed since, else recomputed. */
export function currentConnectivity(s: Session): { K0: number; K: number; tick: number } {
  const c = s.connectivity;
  if (c && c.tick === s.lastChanges.tick) return c;
  const K = forestConnectivity(s.territory);
  return { K0: c?.K0 ?? K, K, tick: s.lastChanges.tick };
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
  const territory = developTerritory(createTerritory(game.landUses, seed), developmentOf(game)).territory;
  const K0 = forestConnectivity(territory);
  return {
    seed,
    game,
    month: 0,
    monthIndex: 0,
    territory,
    lastChanges: { tick: 0, list: [] },
    history: [sample(game, 0)],
    news: [],
    yearStart: { ...game.indicators },
    open: [],
    wearTotal: 0,
    resolvedCount: 0,
    expiredCount: 0,
    lastEvent: null,
    outcome: null,
    declaredCount: 0,
    fx: mapFx({ territory, game, open: [], event: null, month: 0, monthIndex: 0 }),
    policyActivatedAt: {},
    borrowed: { year: game.year, amount: 0 },
    landTally: {},
    breach: {},
    pendingDeferred: [],
    connectivity: { K0, K: K0, tick: 0 },
  };
}

/**
 * A government that stops governing does not get to the end of the term. The 3-level game only
 * checks its collapse conditions on the value of the moment (`evaluateGameOver`); here, where the
 * clock runs monthly and situations are meant to be answered, a floor broken *for a whole year in
 * a row* ends the game (decisión del usuario, 2026-09-19). One bad month still does not.
 */
export const BREACH_MONTHS = 12;
/**
 * Reasons are compared by identity, like the model's own `GAME_OVER_REASONS`, so the screens can
 * show them in either language (they are never displayed as-is).
 */
export const SUSTAINED_REASONS = {
  socialWellbeing: 'Bienestar social por debajo de 10 durante doce meses seguidos.',
  foodSecurity: 'Seguridad alimentaria por debajo de 20 durante doce meses seguidos.',
} as const;
const BREACHES: { id: keyof typeof SUSTAINED_REASONS; failing: (g: GameState) => boolean }[] = [
  { id: 'socialWellbeing', failing: (g) => g.indicators.socialWellbeing < 10 },
  { id: 'foodSecurity', failing: (g) => g.indicators.foodSecurity < 20 },
];

/** Updates the streak counters and returns the reason to end the game, if one is now sustained. */
function sustainedBreach(prev: Record<string, number>, game: GameState): { breach: Record<string, number>; reason: string | null } {
  const breach: Record<string, number> = {};
  let reason: string | null = null;
  BREACHES.forEach((b) => {
    breach[b.id] = b.failing(game) ? (prev[b.id] ?? 0) + 1 : 0;
    if (breach[b.id] >= BREACH_MONTHS && !reason) reason = SUSTAINED_REASONS[b.id];
  });
  return { breach, reason };
}

const evaluateRoutes = (game: GameState): LevelOutcome => evaluateTerritorio(game, { ...game, indicators: game.levelBaseline });

function pushNews(news: NewsItem[], items: NewsItem[]): NewsItem[] {
  if (items.length === 0) return news;
  return [...items.reverse(), ...news].slice(0, MAX_NEWS);
}

/** Advances one month. Only the end of the game stops it: situations never pause the clock. */
export function advanceMonth(s: Session, CP: ControlParams = CONTROL_PARAMS, language: Language = 'es'): Session {
  if (s.outcome) return s;
  // Connectivity of the map as the previous month left it (the engine does not know the map, phase 40 §3).
  const conn = currentConnectivity(s);
  const monthIndex = s.monthIndex + 1;
  const r = stepMonth(s.game, s.month, makeRng(s.seed, s.monthIndex), CP, language, {
    publicUseUpkeep: true,
    extraDeferred: s.pendingDeferred ?? [],
    connectivity: { K: conn.K, K0: conn.K0 },
    // Everything still on the desk wears the government down this month: a shift of the targets of conflict and of
    // the pressures while it stays open (phase 42, the prototype's `wear`).
    wear: wearShift(s.open, monthIndex),
  });
  const pendingDeferred: DeferredAdjustment[] = [];
  const synced = syncTerritory(s.territory, r.next.landUses, r.flows);
  const situationFlows: LandFlow[] = [];

  let game = r.next;
  const situationNews: NewsItem[] = [];
  const stamp = { monthIndex, year: s.game.year, month: s.month };

  // 1. Tally of the wear the desk caused this month (the wear itself entered the step above as a target shift).
  const wear = wearTally(s.open, monthIndex);
  const wornTotal = Object.values(wear).reduce((sum, n) => sum + n, 0);
  let open = s.open.map((item) => ({ ...item, worn: item.worn + (wear[item.id] ?? 0) }));

  // 2. Anything past its deadline resolves itself the way nobody chose.
  let expiredCount = s.expiredCount;
  const stillOpen: OpenSituation[] = [];
  open.forEach((item) => {
    if (monthIndex < item.expiresAt) {
      stillOpen.push(item);
      return;
    }
    const def = SITUATION_BY_ID[item.defId];
    if (def) {
      const fallback = defaultOption(def);
      const applied = resolveSituation(game, item.defId, fallback.id, CP, language);
      if (applied.ok) {
        game = applied.state;
        pendingDeferred.push(...applied.deferred);
        situationFlows.push(...applied.flows);
      }
      situationNews.push({
        ...stamp, id: `${item.id}-expired`, kind: 'situation', tone: 'bad',
        key: 'situation.expired', values: { situation: item.defId, option: fallback.id },
      });
      expiredCount += 1;
    }
  });
  open = stillOpen;

  // 3. A new one may arrive.
  const arrival = rollSituation(game, open.map((o) => o.defId), monthIndex, makeRng(s.seed + 7919, monthIndex), undefined);
  if (arrival) {
    open = [...open, arrival.open];
    situationNews.push({
      ...stamp, id: `${arrival.open.id}-new`, kind: 'situation', tone: arrival.def.tone,
      key: 'situation.arrived', values: { situation: arrival.def.id },
    });
  }

  // Decided or expired situations can move land too: the map follows the model's final areas.
  const settled = game.landUses === r.next.landUses ? synced : syncTerritory(synced.territory, game.landUses, situationFlows);
  const developed = developTerritory(settled.territory, developmentOf(game));
  const territory = developed.territory;
  const changes = [...synced.changes, ...(settled === synced ? [] : settled.changes), ...developed.changes];

  const next: Session = {
    ...s,
    game,
    month: r.month,
    monthIndex,
    territory,
    lastChanges: { tick: s.lastChanges.tick + 1, list: changes },
    // Recompute K only when this month's parcel changes touched forest (a 10 000-cell flood fill otherwise saved).
    connectivity: {
      K0: conn.K0,
      K: changesTouchForest(changes) ? forestConnectivity(territory) : conn.K,
      tick: s.lastChanges.tick + 1,
    },
    fx: mapFx({ territory, game, open, event: r.event, month: s.month, monthIndex }),
    history: [...s.history, sample(game, monthIndex)],
    open,
    wearTotal: s.wearTotal + wornTotal,
    expiredCount,
    lastEvent: r.event,
    pendingDeferred,
  };

  const land = tallyLand(s.landTally, changes, territory.kHaPerParcel);
  next.landTally = land.tally;
  const items = buildMonthNews({
    prev: s.game,
    next: r.next,
    simulatedYear: s.game.year,
    simulatedMonth: s.month,
    monthIndex,
    event: r.event,
    land: land.report,
    engineMessages: r.chatMessages.filter((m) => m.emphasisType === 'policy_efficiency_warning').map((m) => m.text),
    yearRolled: r.yearRolled,
    yearStart: s.yearStart,
  });
  if (r.yearRolled) next.yearStart = { ...game.indicators };
  items.push(...unlockNews(s, next, CP));
  items.push(...situationNews);
  next.news = pushNews(s.news, items);

  const sustained = sustainedBreach(s.breach, game);
  next.breach = sustained.breach;
  const gameOver = evaluateGameOver(game) ?? sustained.reason;
  // stepMonth may have flagged a collapse that the situations applied after it undid.
  if (!gameOver && game.gameOverReason) next.game = { ...game, gameOverReason: null };
  if (gameOver) {
    next.game = { ...game, gameOverReason: gameOver };
    next.outcome = { kind: 'collapse', reason: gameOver, routes: evaluateRoutes(next.game) };
  } else if (monthIndex >= TOTAL_MONTHS) {
    const routes = evaluateRoutes(game);
    next.outcome = { kind: routes.won ? 'won' : 'lost', routes };
  }
  return next;
}

/** Player decides one of the open situations. */
export function decideSituation(s: Session, openId: string, optionId: string, CP: ControlParams = CONTROL_PARAMS, language: Language = 'es'): ActionResult {
  if (s.outcome) return { session: s, error: 'game-over' };
  const item = s.open.find((o) => o.id === openId);
  const def = item ? SITUATION_BY_ID[item.defId] : undefined;
  if (!item || !def) return { session: s };
  const option = def.options.find((o) => o.id === optionId);
  if (!option) return { session: s };
  const applied = resolveSituation(s.game, item.defId, optionId, CP, language);
  if (!applied.ok) return { session: s, error: 'no-fiscal-space', detail: { cost: Math.round(situationCost(option.cost ?? 0, s.game)) } };

  const news: NewsItem = {
    id: `${item.id}-done`, monthIndex: s.monthIndex, year: s.game.year, month: s.month,
    kind: 'situation', tone: 'good', key: 'situation.resolved',
    values: { situation: def.id, option: optionId },
  };
  // An option that moves land shows on the map right away, along the transfers it made (phase 37).
  const synced = applied.flows.length ? syncTerritory(s.territory, applied.state.landUses, applied.flows) : null;
  return {
    session: {
      ...s,
      game: applied.state,
      ...(synced ? { territory: synced.territory, lastChanges: { tick: s.lastChanges.tick + 1, list: synced.changes } } : {}),
      pendingDeferred: [...(s.pendingDeferred ?? []), ...applied.deferred],
      open: s.open.filter((o) => o.id !== openId),
      resolvedCount: s.resolvedCount + 1,
      news: pushNews(s.news, [news]),
    },
    detail: { cost: applied.cost },
  };
}

/* ── Player actions ────────────────────────────────────────────────────────────────────────── */

export type ActionError =
  | 'max-active' | 'locked' | 'not-unlocked' | 'invalid-amount' | 'game-over' | 'loan-cap'
  | PublicUseError;

export interface ActionResult {
  session: Session;
  error?: ActionError;
  /** Extra detail for the message shown to the player (e.g. the year a policy unlocks). */
  detail?: Record<string, string | number>;
}

const clonePolicies = (s: Session) => JSON.parse(JSON.stringify(s.game.policies)) as Record<Policy, PolicyState>;

export function togglePolicy(s: Session, policyId: Policy, CP: ControlParams = CONTROL_PARAMS): ActionResult {
  if (s.outcome) return { session: s, error: 'game-over' };
  const policies = clonePolicies(s);
  const p = policies[policyId];
  let activatedAt = s.policyActivatedAt;
  if (!p.isActive) {
    const active = (Object.values(policies) as PolicyState[]).filter((x) => x.isActive).length;
    if (active >= MAX_ACTIVE_POLICIES) return { session: s, error: 'max-active', detail: { max: MAX_ACTIVE_POLICIES } };
    p.isActive = true;
    // Model 2.0 (phase 36, T-06): the shown efficiency is the one the clocks give (0 on activation:
    // it is starting up); re-activating never restores a worn policy, and the fatigue warning keeps its wear.
    p.currentEfficiency = baseEfficiency(p, CP);
    activatedAt = { ...s.policyActivatedAt, [policyId]: s.monthIndex };
    p.previousFatigueFactor = fatigueFactor(p);
    evenEffort(p);
  } else {
    // Lock-in counts months, not calendar years: a policy switched on in December used to be
    // free to drop after barely four years.
    const since = s.policyActivatedAt[policyId];
    const lockedUntil = since !== undefined ? since + POLICY_LOCK_IN_DURATION * MONTHS_PER_YEAR : undefined;
    if (lockedUntil !== undefined && s.monthIndex < lockedUntil) {
      return { session: s, error: 'locked', detail: { year: s.game.year + Math.ceil((lockedUntil - s.monthIndex) / MONTHS_PER_YEAR) } };
    }
    p.isActive = false;
    p.activationYear = undefined;
    activatedAt = { ...s.policyActivatedAt };
    delete activatedAt[policyId];
    if (p.instruments) {
      (Object.values(p.instruments) as PolicyInstrument[]).forEach((inst) => { inst.effortPercentage = 0; });
      p.totalInstrumentEffortApplied = 0;
    }
  }
  return { session: { ...s, game: { ...s.game, policies }, policyActivatedAt: activatedAt } };
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
  // Phase 43: the entry cost is a fraction of the current GDP (PARAMS_V2.pacts.*.entry). Phase 44: it is a public
  // investment — reserves above the floor, then debt while D/Y ≤ 0.6 (`payPublicInvestment`, src/sim/v2/finance.ts).
  const costToJoin = pactEntryCost(pactId, s.game.stellaSpecificState.PBI_Real);
  let paidGame = s.game;
  if (!pact.isActive && costToJoin > 0) {
    const paid = payPublicInvestment(s.game, costToJoin);
    if (!paid.ok) return { session: s, error: 'no-fiscal-space', detail: { cost: Math.round(costToJoin) } };
    paidGame = paid.state;
  }
  const game: GameState = {
    ...paidGame,
    pacts: { ...s.game.pacts, [pactId]: { ...pact, isActive: !pact.isActive } },
  };
  return { session: { ...s, game } };
}

export function setTaxPressure(s: Session, pct: number, CP: ControlParams = CONTROL_PARAMS): ActionResult {
  if (s.outcome) return { session: s, error: 'game-over' };
  if (!unlocks(s, CP).finance) return { session: s, error: 'not-unlocked', detail: { year: CP.Ano_Activacion_Prestamo } };
  const value = Math.max(0, Math.min(CP.Max_Additional_Tax_Rate_Percentage, pct));
  return { session: { ...s, game: { ...s.game, additionalTaxPressurePercentage: value } } };
}

/**
 * Maximum loan: 10% of real GDP *per calendar year*, as in the 3-level game, where a round is a
 * year. Without the yearly ceiling, monthly rounds would let a player borrow 120% of GDP a year,
 * or any amount at all by asking twelve times in the same month.
 */
export const maxLoan = (s: Session): number =>
  Math.max(0, s.game.stellaSpecificState.PBI_Real * 0.1 - (s.borrowed.year === s.game.year ? s.borrowed.amount : 0));

export function requestLoan(s: Session, amount: number, CP: ControlParams = CONTROL_PARAMS): ActionResult {
  if (s.outcome) return { session: s, error: 'game-over' };
  if (!unlocks(s, CP).finance) return { session: s, error: 'not-unlocked', detail: { year: CP.Ano_Activacion_Prestamo } };
  if (!(amount > 0)) return { session: s, error: 'invalid-amount' };
  const granted = Math.min(amount, maxLoan(s));
  if (granted <= 0) return { session: s, error: 'loan-cap', detail: { year: s.game.year } };
  const borrowed = s.borrowed.year === s.game.year
    ? { year: s.game.year, amount: s.borrowed.amount + granted }
    : { year: s.game.year, amount: granted };
  return {
    session: { ...s, borrowed, game: { ...s.game, loanRequestedThisRound: s.game.loanRequestedThisRound + granted } },
    detail: { amount: Math.round(granted) },
  };
}

/**
 * The player's only direct land-use action: declare a parcel as a public use (protected area,
 * restoration, wetland or energy park). Everything else on the map comes from the model.
 */
export function declareUse(s: Session, x: number, y: number, use: PublicUse, CP: ControlParams = CONTROL_PARAMS): ActionResult {
  if (s.outcome) return { session: s, error: 'game-over' };
  const r = declarePublicUse(s.game, s.territory, x, y, use, CP, s.monthIndex);
  if (!r.ok) {
    const { reason, cost } = r as { reason: PublicUseError; cost?: number };
    // Phase 44: say what the lot would have cost when there is no fiscal space for it.
    return { session: s, error: reason, ...(cost !== undefined ? { detail: { cost: Math.round(cost) } } : {}) };
  }
  const ok = r as Extract<typeof r, { ok: true }>;
  const item: NewsItem = {
    id: `p-${s.monthIndex}-${x}-${y}`, monthIndex: s.monthIndex, year: s.game.year, month: s.month,
    kind: 'player', tone: 'good', key: 'declared',
    values: { cost: Math.round(ok.cost), use, km2: Math.round(ok.cells.length * s.territory.kHaPerParcel * 10) },
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
        list: ok.cells.map((i) => ({
          x: i % s.territory.size, y: (i / s.territory.size) | 0,
          from: s.territory.parcels[i].kind, to: ok.territory.parcels[i].kind,
        })),
      },
    },
    detail: { cost: Math.round(ok.cost), km2: Math.round(ok.cells.length * s.territory.kHaPerParcel * 10) },
  };
}

/** Back-compat wrapper used by the tests written before the other public uses existed. */
export const protectParcel = (s: Session, x: number, y: number, CP: ControlParams = CONTROL_PARAMS): ActionResult =>
  declareUse(s, x, y, 'protected', CP);
