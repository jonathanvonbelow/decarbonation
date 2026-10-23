/**
 * Pure simulation engine — public API.
 *
 * `stepYear` advances the simulation exactly one year. It is the phase-2 extraction target of
 * mejora-general/files/16_auditoria_ecuaciones.md: everything it touches was ported verbatim
 * from `runSimulationRound` in the pre-extraction src/App.tsx (see git history), preserving the
 * exact order of operations, formulas and constants. Nothing in this module imports React or
 * touches the DOM, `Date.now()` or `Math.random()` directly — randomness is threaded through an
 * explicit `Rng` (rng.ts) so a given (seed, year) always produces the same result (INV-11).
 *
 * Scope boundary (see docs/DESIGN_DECISIONS_LOG.md): whether the *level* concluded this year —
 * `progressionConditionsMet` / win-reason generation — is deliberately NOT handled here. That
 * logic still lives in src/App.tsx today and will be replaced wholesale by `evaluateLevel` in
 * phase 5 (mejora-general/files/17_multiples_vias_victoria.md). `stepYear` only advances state;
 * the caller decides whether to keep looping.
 *
 * Since phase 35 (mejora-general/files/35_motor_v2_estructura.md) the body of `stepYear` and of
 * `stepMonth` is the single integrator `advance(state, dt, …)` of src/sim/v2/core.ts, and
 * `createInitialState` stores the 2.0 anchors of the level in `GameState.model` (src/sim/v2/anchors.ts).
 */
import {
  CONTROL_PARAMS, INITIAL_INDICATORS, INITIAL_LAND_USES, INITIAL_PACTS,
  INITIAL_POLICIES, INITIAL_STELLA_STOCKS, INITIAL_YEAR, LEVEL_2_INITIAL_INDICATOR_OVERRIDES,
  LEVEL_2_INITIAL_LAND_USES, LEVEL_2_INITIAL_STELLA_OVERRIDES, LEVEL_3_INITIAL_INDICATOR_OVERRIDES,
  LEVEL_3_INITIAL_LAND_USES, LEVEL_3_INITIAL_STELLA_OVERRIDES, LEVEL_CONFIGS,
} from '../constants';
import type {
  ControlParams, GameState, HistoricalDataPoint, Indicators, InitialIndicatorOverrides, LandUse,
  LandUseType, Pact, PolicyState, StellaStocks,
} from '../types';
import { Policy } from '../types';
import type { Rng } from './rng';
import { computeScore } from './score';
import type { SimTrace } from './trace';
import { restorePactFunctions } from './deferred';
import type { Language } from '../hooks/useLanguage';
import { advance, type StepYearChatMessage } from './v2/core';
import { createModelState } from './v2/anchors';

export { makeRng, type Rng } from './rng';
export { MODEL_VERSION, MODEL_VERSION_BY_GAME } from './version';
export type { SimTrace } from './trace';
export * from './policies';
export * from './indicators';
export * from './v2/land';
export * from './v2/carbon';
export * from './pressures';
export * from './economy';
export * from './score';
export * from './events';
export * from './winRoutes';
export * from './gameOver';
export * from './deferred';
export * from './monthly';
export * from './territory';
export { advance, MONTHLY_DT, type AdvanceOptions, type AdvanceResult, type StepYearChatMessage } from './v2/core';
export { computeAnchors, createModelState } from './v2/anchors';
export {
  baseEfficiency, channelStrength, computeEfficiencies, costShareOf, effortShare, fatigueFactor, INSTRUMENT_CHANNELS, PID_OF,
  policyCost, policyCostOf, policyStatus, rampFactor, tickPolicyClocks, type PolicyEfficiency, type PolicyStatus,
} from './v2/policies';

export interface StepYearResult {
  next: GameState;
  trace: SimTrace;
  /** Narrative log lines produced this year, oldest first (caller prepends per its own convention). */
  logs: string[];
  /** Chat-worthy messages (level-3 event banners, efficiency warnings), oldest first. */
  chatMessages: StepYearChatMessage[];
}

/**
 * Advances `state` by exactly one simulated year: a thin wrapper of `advance(state, 1, …)`
 * (src/sim/v2/core.ts, phase 35), which holds the body, the order of operations and its history.
 * Pure: never mutates its input, and — for a given `(state, rng, CP)` — always produces the same
 * `next`/`trace`. Pact `effects` functions are restored after the internal JSON clone.
 *
 * `CP` defaults to the static `CONTROL_PARAMS` but is a parameter, not a hardcoded import: the
 * app reads `controlParamsRef.current` here (see App.tsx and CLAUDE.md's "CP alias" pattern),
 * which the Facilitator panel can override live. Hardcoding the import would silently break that
 * override the moment `runSimulationRound` switched to calling this function.
 */
export function stepYear(state: GameState, rng: Rng, CP: ControlParams = CONTROL_PARAMS, language: Language = 'es'): StepYearResult {
  const { next, trace, logs, chatMessages } = advance(state, 1, rng, CP, { language });
  return { next, trace, logs, chatMessages };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────

export interface LevelInitializationResult {
  gameStatePatch: Pick<
    GameState,
    | 'year' | 'currentLevel' | 'policies' | 'landUses' | 'indicators' | 'stellaSpecificState'
    | 'pacts' | 'activeLevelConfig' | 'yearsSimulatedInCurrentLevel' | 'level3EventsTriggeredCount'
    | 'additionalTaxPressurePercentage' | 'decarbonitoProactiveMessageSentInLevel'
    | 'lastConcludedLevelInfo' | 'sentLevelReflectionMessage' | 'levelBaseline' | 'model'
  >;
  initialHistoricalDataPoint: HistoricalDataPoint;
}

/**
 * Builds the initial per-level game state (year, land uses, Stella stocks/indicators, policies,
 * pacts, level counters). Ported verbatim from `buildLevelInitializationState` in the
 * pre-extraction src/App.tsx — used whenever the game resets to a level's starting conditions
 * (starting the next level after a win, jumping to a level manually, retrying after a loss).
 *
 * `JSON.parse(JSON.stringify(INITIAL_PACTS))` strips the pacts' `effects` functions; since model 1.1
 * (phase 34, N-14) they are restored right here with `restorePactFunctions`, so a level never starts
 * with pacts that cannot be evaluated.
 */
export function createInitialState(levelNumber: number, CP: ControlParams = CONTROL_PARAMS): LevelInitializationResult {
  const newLevelConfig = LEVEL_CONFIGS.find((lc) => lc.levelNumber === levelNumber);

  let newStellaState = JSON.parse(JSON.stringify(INITIAL_STELLA_STOCKS)) as StellaStocks;
  let newLandUses: Record<LandUseType, LandUse> = JSON.parse(JSON.stringify(INITIAL_LAND_USES));
  let indicatorOverrides: InitialIndicatorOverrides | null = null;

  if (levelNumber === 2) {
    newLandUses = JSON.parse(JSON.stringify(LEVEL_2_INITIAL_LAND_USES));
    newStellaState = { ...newStellaState, ...LEVEL_2_INITIAL_STELLA_OVERRIDES };
    indicatorOverrides = LEVEL_2_INITIAL_INDICATOR_OVERRIDES;
  } else if (levelNumber === 3) {
    newLandUses = JSON.parse(JSON.stringify(LEVEL_3_INITIAL_LAND_USES));
    newStellaState = { ...newStellaState, ...LEVEL_3_INITIAL_STELLA_OVERRIDES };
    indicatorOverrides = LEVEL_3_INITIAL_INDICATOR_OVERRIDES;
  }

  const newPolicies = JSON.parse(JSON.stringify(INITIAL_POLICIES)) as Record<Policy, PolicyState>;
  const newIndicators: Indicators = { ...INITIAL_INDICATORS };
  if (indicatorOverrides) {
    if (indicatorOverrides.foodSecurity !== undefined) newIndicators.foodSecurity = indicatorOverrides.foodSecurity;
    if (indicatorOverrides.economicSecurity !== undefined) newIndicators.economicSecurity = indicatorOverrides.economicSecurity;
  }
  newIndicators.socialWellbeing = 100 - (newStellaState.Conflicto_social || INITIAL_STELLA_STOCKS.Conflicto_social);
  newIndicators.politicalStability = 100 - (newStellaState.Colapso_politico || INITIAL_STELLA_STOCKS.Colapso_politico);
  newIndicators.ppAgricola = newStellaState.PP_AGRICOLA || INITIAL_STELLA_STOCKS.PP_AGRICOLA;
  newIndicators.ppAmbientalista = newStellaState.PP_AMBIENTALISTA || INITIAL_STELLA_STOCKS.PP_AMBIENTALISTA;
  newIndicators.ppSocial = newStellaState.PP_SOCIAL || INITIAL_STELLA_STOCKS.PP_SOCIAL;
  newIndicators.pbi = newStellaState.PBI_Real || INITIAL_STELLA_STOCKS.PBI_Real;
  newIndicators.debt = newStellaState.Deuda || INITIAL_STELLA_STOCKS.Deuda;
  newIndicators.treasuryReserves = newStellaState.Reservas_del_Tesoro || INITIAL_STELLA_STOCKS.Reservas_del_Tesoro;

  // Population: the facilitator's CP.Poblacion_Inicial (400 000, phase 38), every level.
  newStellaState.Poblacion_Total = CP.Poblacion_Inicial;

  // Model 2.0 anchors of this level's starting state (phase 35, src/sim/v2/anchors.ts).
  const model = createModelState(
    { currentLevel: levelNumber, landUses: newLandUses, indicators: newIndicators, stellaSpecificState: newStellaState },
    CP,
  );
  // CO2 per capita and the score at year zero come from the level's own land uses, not the fixed
  // INITIAL_INDICATORS value (fixed in v4: the first simulated year showed a jump the player had not
  // caused). Since phase 38 it is the physical carbon c0 of the anchors' dry run: 5.95 / 7.13 / 5.73 t
  // per person in levels 1 / 2 / 3 (1.1, with the 40 000 scale factor: ~7.8 / 17.4 / 10.6). The
  // win-route baseline is taken from these values too.
  newIndicators.co2EqEmissionsPerCapita = model.anchors.c0;
  newIndicators.generalScore = computeScore(newIndicators, levelNumber, CP);

  const initialHistoricalDataPoint: HistoricalDataPoint = {
    year: INITIAL_YEAR,
    biodiversity: newIndicators.biodiversity,
    foodSecurity: newIndicators.foodSecurity,
    economicSecurity: newIndicators.economicSecurity,
    socialWellbeing: newIndicators.socialWellbeing,
    generalScore: newIndicators.generalScore,
    co2EqEmissionsPerCapita: newIndicators.co2EqEmissionsPerCapita,
    politicalStability: newIndicators.politicalStability,
    pbi: newIndicators.pbi,
    debt: newIndicators.debt,
    ppAgricola: newIndicators.ppAgricola,
    ppAmbientalista: newIndicators.ppAmbientalista,
    ppSocial: newIndicators.ppSocial,
    treasuryReserves: newStellaState.Reservas_del_Tesoro,
  };

  return {
    gameStatePatch: {
      year: INITIAL_YEAR,
      currentLevel: levelNumber,
      policies: newPolicies,
      landUses: newLandUses,
      indicators: newIndicators,
      stellaSpecificState: newStellaState,
      pacts: restorePactFunctions(JSON.parse(JSON.stringify(INITIAL_PACTS)) as Record<string, Pact>),
      activeLevelConfig: newLevelConfig,
      yearsSimulatedInCurrentLevel: 0,
      level3EventsTriggeredCount: 0,
      additionalTaxPressurePercentage: 0,
      decarbonitoProactiveMessageSentInLevel: false,
      lastConcludedLevelInfo: null,
      sentLevelReflectionMessage: false,
      // Snapshot for win-route progress bars (src/sim/winRoutes.ts) — "how far the player moved"
      // is measured from here, not from zero.
      levelBaseline: { ...newIndicators },
      model,
    },
    initialHistoricalDataPoint,
  };
}
