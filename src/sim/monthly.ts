/**
 * Monthly step for the single-level Territorio preview (mejora-general/files/21_fusion_ecosim.md §3).
 *
 * Every state equation of the model is first order: x(t+1) = x(t) + f(x(t)) — biodiversity, the
 * food/economic securities, social conflict, political collapse, the three sectoral pressures,
 * land-use areas and the public finances. The monthly step is the Euler discretisation of those
 * same equations with Δt = 1/12: each stock moves 1/12 of the way the *annual* equation would move
 * it from the current state, `x + (F(x) − x) / 12`. No formula, weight or threshold changes, so:
 *   - the fixed points are identical (F(x*) = x* annually ⇔ monthly): a sustained strategy ends up
 *     in the same place in both games, only the trajectory is smoother;
 *   - total land area is conserved (the transition matrix conserves it; 1/12 of a zero-sum change
 *     is zero-sum), and a convex step between two values in [0,100] stays in [0,100].
 *
 * The body mirrors `stepYear` (src/sim/index.ts) step by step; the numbered comments match its own.
 * Deliberate differences, all covered by tests/sim/monthly.spec.ts:
 *   - Growth rates and money flows (population, GDP, taxes, policy/pact costs, interest, debt
 *     amortisation) are applied as annual/12 per month (simple, not compounded).
 *   - A requested loan is credited once, in full, the month it is requested — not spread.
 *   - Random events: an event's annual `triggerChance` p becomes 1 − (1 − p)^(1/12) per month, so
 *     each event keeps its calibrated yearly frequency; unlike `stepYear` (at most one event per
 *     year) several events can land in the same year. A triggered event applies its full effects:
 *     it is a shock, not a flow.
 *   - CO2eq per capita and the score are functions of the state, not stocks: recomputed monthly.
 *   - (Until phase 39 the fiscal-pressure terms were switched by `options.fiscalTermsActive`; since then the
 *     additional tax τ enters the targets of E and C in every level and game.)
 *
 * Since phase 35 (mejora-general/files/35_motor_v2_estructura.md) both bodies are one: `stepMonth` is
 * `advance(state, 1/12, …)` of src/sim/v2/core.ts plus the calendar it returns. The Euler `toward` of
 * the 1.1 stocks still lives there (E, C and Pc relax exactly since phase 39); phase 46 replaces the rest.
 */
import { CONTROL_PARAMS } from '../constants';
import type { ControlParams, GameState, RandomEvent } from '../types';
import type { LandUseType } from '../types';
import type { Language } from '../hooks/useLanguage';
import type { Rng } from './rng';
import type { SimTrace } from './trace';
import type { LandFlow } from './territory';
import { advance, MONTHLY_DT, type AdvanceOptions, type StepYearChatMessage } from './v2/core';

export { MONTHS_PER_YEAR, declaredProtectedOf, monthlyTriggerChance, rollMonthlyEvent } from './v2/core';

/** Options of the monthly step (the monthly subset of `AdvanceOptions`). */
export type MonthlyOptions = Pick<AdvanceOptions, 'events' | 'publicUseUpkeep' | 'extraDeferred' | 'connectivity' | 'wear'>;

export interface StepMonthResult {
  next: GameState;
  /** Month (0 = January) of `next.year` that the *next* call will simulate. */
  month: number;
  /** True when this step closed December and advanced `next.year`. */
  yearRolled: boolean;
  /** Random event that fired this month, if any (its effects are already applied). */
  event: RandomEvent | null;
  /** Area change per land use this month, after − before, in kHa. */
  landUseDelta: Record<LandUseType, number>;
  /**
   * This month's land transfers, one per edge of the transition matrix (1/12 of the annual flow),
   * plus area removed by an event (to 'fallow'). The Territorio map moves parcels along these.
   */
  flows: LandFlow[];
  /** Upkeep charged this month for the land under public use (0 unless `publicUseUpkeep`). */
  upkeep: number;
  trace: SimTrace;
  logs: string[];
  chatMessages: StepYearChatMessage[];
}

/**
 * Advances `state` by one month. Pure (never mutates its input) and deterministic for a given
 * `(state, month, rng, CP, options)`. `state.year` is the calendar year being simulated and
 * `month` (0-11) the month within it; after December the year advances.
 */
export function stepMonth(
  state: GameState,
  month: number,
  rng: Rng,
  CP: ControlParams = CONTROL_PARAMS,
  language: Language = 'es',
  options: MonthlyOptions = {},
): StepMonthResult {
  const r = advance(state, MONTHLY_DT, rng, CP, { ...options, language, month });
  return {
    next: r.next,
    month: r.month,
    yearRolled: r.yearRolled,
    event: r.event,
    landUseDelta: r.landUseDelta,
    flows: r.flows,
    upkeep: r.upkeep,
    trace: r.trace,
    logs: r.logs,
    chatMessages: r.chatMessages,
  };
}
