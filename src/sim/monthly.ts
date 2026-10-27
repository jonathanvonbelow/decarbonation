/**
 * Monthly step for the single-level Territorio preview (mejora-general/files/21_fusion_ecosim.md §3).
 *
 * `stepMonth` is `advance(state, 1/12, …)` of src/sim/v2/core.ts plus the calendar it returns (phase 35). Since
 * phase 46 the discretisation is exact for every state variable: every bounded indicator and pressure relaxes with
 * `relax(…, dt)` (12 monthly steps toward a fixed target are one annual step), every flow (land, money, emissions) is
 * × dt and population compounds; random events fire with 1 − (1 − p)^(w_m/12) per month (independent draws, the
 * drought weighted by the season, `seasonality`), so each keeps its calibrated yearly frequency. The 3-level game runs
 * the same monthly step 12 times per year (`advanceYear`), so both games share one discretisation. The 1.1 Euler
 * `toward` and `monthlyTriggerChance` are gone (phase 46).
 */
import { CONTROL_PARAMS } from '../constants';
import type { ControlParams, GameState, RandomEvent } from '../types';
import type { LandUseType } from '../types';
import type { Language } from '../hooks/useLanguage';
import type { Rng } from './rng';
import type { SimTrace } from './trace';
import type { LandFlow } from './territory';
import { advance, MONTHLY_DT, type AdvanceOptions, type StepYearChatMessage } from './v2/core';

export { MONTHS_PER_YEAR, declaredProtectedOf } from './v2/core';

/** Options of the monthly step (the monthly subset of `AdvanceOptions`). */
export type MonthlyOptions = Pick<AdvanceOptions, 'events' | 'publicUseUpkeep' | 'connectivity' | 'wear' | 'seasonality' | 'noShocks'>;

export interface StepMonthResult {
  next: GameState;
  /** Month (0 = January) of `next.year` that the *next* call will simulate. */
  month: number;
  /** True when this step closed December and advanced `next.year`. */
  yearRolled: boolean;
  /** First random event that fired this month, if any (its effects are already applied). */
  event: RandomEvent | null;
  /** Every random event that fired this month (phase 46: independent draws). */
  events: RandomEvent[];
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
    events: r.events,
    landUseDelta: r.landUseDelta,
    flows: r.flows,
    upkeep: r.upkeep,
    trace: r.trace,
    logs: r.logs,
    chatMessages: r.chatMessages,
  };
}
