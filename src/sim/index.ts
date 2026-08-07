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
 */
import {
  ALL_RANDOM_EVENTS, CONTROL_PARAMS, INITIAL_INDICATORS, INITIAL_LAND_USES, INITIAL_PACTS,
  INITIAL_POLICIES, INITIAL_STELLA_STOCKS, INITIAL_YEAR, LEVEL_2_INITIAL_INDICATOR_OVERRIDES,
  LEVEL_2_INITIAL_LAND_USES, LEVEL_2_INITIAL_STELLA_OVERRIDES, LEVEL_3_INITIAL_INDICATOR_OVERRIDES,
  LEVEL_3_INITIAL_LAND_USES, LEVEL_3_INITIAL_STELLA_OVERRIDES, LEVEL_CONFIGS,
} from '../constants';
import type {
  ControlParams, GameState, HistoricalDataPoint, Indicators, InitialIndicatorOverrides, LandUse,
  LandUseType, LevelConfig, Pact, PolicyState, StellaStocks,
} from '../types';
import { Policy } from '../types';
import { computeCarbonBalance } from './carbon';
import { computeTotalPactCost, updateEconomy } from './economy';
import {
  calculateBiodiversityChange, calculateEconomicSecurityChange, calculateFoodSecurityChange,
  calculatePoliticalCollapseChange, calculateSocialConflictChange,
} from './indicators';
import { DEFAULT_LAND_USE_CHANGE_FACTORS, updateLandUse, type LandUseChangeFactors } from './landUse';
import { checkEfficiencyWarning, computeTotalPolicyCost, updatePolicyEfficiency } from './policies';
import { updatePressures } from './pressures';
import type { Rng } from './rng';
import { rollEvent } from './events';
import { computeScore } from './score';
import { buildTrace, type SimTrace } from './trace';
import type { Language } from '../hooks/useLanguage';
import { getPolicyName } from '../legacyContent/gameData';

export { makeRng, type Rng } from './rng';
export type { SimTrace } from './trace';
export * from './policies';
export * from './indicators';
export * from './landUse';
export * from './carbon';
export * from './pressures';
export * from './economy';
export * from './score';
export * from './events';
export * from './winRoutes';

export interface StepYearChatMessage {
  text: string;
  /** Matches the two emphasisType values the original `runSimulationRound` used for these. */
  emphasisType: 'game_event' | 'policy_efficiency_warning';
}

export interface StepYearResult {
  next: GameState;
  trace: SimTrace;
  /** Narrative log lines produced this year, oldest first (caller prepends per its own convention). */
  logs: string[];
  /** Chat-worthy messages (level-3 event banners, efficiency warnings), oldest first. */
  chatMessages: StepYearChatMessage[];
}

/**
 * Advances `state` by exactly one simulated year. Pure: never mutates its input, and — for a
 * given `(state, rng, CP)` — always produces the same `next`/`trace`. Deep-clones internally
 * (mirroring the `JSON.parse(JSON.stringify(...))` the original used per simulation round) and
 * restores pact `effects` functions afterward, since — like the original — a JSON round-trip
 * strips them.
 *
 * `CP` defaults to the static `CONTROL_PARAMS` but is a parameter, not a hardcoded import: the
 * app reads `controlParamsRef.current` here (see App.tsx and CLAUDE.md's "CP alias" pattern),
 * which the Facilitator panel can override live. Hardcoding the import would silently break that
 * override the moment `runSimulationRound` switched to calling this function.
 */
export function stepYear(state: GameState, rng: Rng, CP: ControlParams = CONTROL_PARAMS, language: Language = 'es'): StepYearResult {
  const next: GameState = JSON.parse(JSON.stringify(state));
  Object.keys(next.pacts).forEach((pactId) => {
    if (INITIAL_PACTS[pactId] && typeof INITIAL_PACTS[pactId].effects === 'function') {
      next.pacts[pactId].effects = INITIAL_PACTS[pactId].effects;
    }
  });

  const logs: string[] = [];
  const chatMessages: StepYearChatMessage[] = [];
  const before: Indicators = JSON.parse(JSON.stringify(next.indicators));

  next.year++;
  next.yearsSimulatedInCurrentLevel++;
  const currentYear = next.year;
  const currentLevel = next.currentLevel;
  const additionalTaxPressurePercentage = next.additionalTaxPressurePercentage;

  // 0. Population growth.
  next.stellaSpecificState.Poblacion_Total *= 1 + CP.Tasa_Crecimiento_Poblacional_Base;

  // 1. Confirm policy activation year (bookkeeping only — decay runs later, after the event roll,
  //    matching the original order).
  (Object.values(next.policies) as PolicyState[]).forEach((p) => {
    if (p.isActive && p.activationYear === undefined) {
      p.activationYear = currentYear;
      const policyName = getPolicyName(p.id, language);
      logs.push(
        language === 'en'
          ? `Policy '${policyName}' activated and confirmed for year ${currentYear}.`
          : `Política '${policyName}' activada y confirmada para el año ${currentYear}.`
      );
    }
  });

  // 2. Random event roll (level<3: sequential; level 3: dynamic weighted). Applied BEFORE policy
  //    decay/costs/land use/financial/indicator math, exactly like the original.
  const yearsElapsedInCurrentLevel = next.yearsSimulatedInCurrentLevel - 1;
  next.currentEvent = null;
  const rolled = rollEvent(next, ALL_RANDOM_EVENTS, yearsElapsedInCurrentLevel, rng, language);
  logs.push(...rolled.logs);
  if (rolled.chatMessage) chatMessages.push({ text: rolled.chatMessage, emphasisType: 'game_event' });
  if (rolled.event) next.currentEvent = rolled.event;

  // 3. Policy activation-time counters + efficiency decay.
  updatePolicyEfficiency(next.policies, next.stellaSpecificState);

  // 4. Annual costs (policy + pacts), tallied on PBI_Real *before* this year's growth — matches
  //    the original, where these sums are computed before "3. Financial Calculations" runs.
  const totalPolicyCost = computeTotalPolicyCost(next.policies, next.stellaSpecificState.PBI_Real);
  const totalPactCost = computeTotalPactCost(next.pacts);

  // 5. Pact effects on indicators/stella stocks, and the land-use change-factor multipliers they
  //    contribute (both read from the same `pact.effects(...)` call per active pact, as before).
  let landUseChangeFactors: LandUseChangeFactors = { ...DEFAULT_LAND_USE_CHANGE_FACTORS };
  (Object.values(next.pacts) as Pact[]).forEach((pact) => {
    if (!pact.isActive) return;
    const effects = pact.effects(next.indicators, next.stellaSpecificState);
    if (effects.indicators) next.indicators = { ...next.indicators, ...effects.indicators };
    if (effects.stellaStocks) next.stellaSpecificState = { ...next.stellaSpecificState, ...effects.stellaStocks };
    if (effects.landUseChangeFactors) {
      landUseChangeFactors = {
        tasa_BNNP_a_BNP: landUseChangeFactors.tasa_BNNP_a_BNP * (effects.landUseChangeFactors.tasa_BNNP_a_BNP ?? 1),
        tasa_BNNP_a_CC: landUseChangeFactors.tasa_BNNP_a_CC * (effects.landUseChangeFactors.tasa_BNNP_a_CC ?? 1),
        tasa_BNNP_a_CA: landUseChangeFactors.tasa_BNNP_a_CA * (effects.landUseChangeFactors.tasa_BNNP_a_CA ?? 1),
        tasa_CA_a_BNNP: landUseChangeFactors.tasa_CA_a_BNNP * (effects.landUseChangeFactors.tasa_CA_a_BNNP ?? 1),
        tasa_CC_a_CA: landUseChangeFactors.tasa_CC_a_CA * (effects.landUseChangeFactors.tasa_CC_a_CA ?? 1),
      };
    }
  });

  // 6. Land use transitions.
  next.landUses = updateLandUse(next.landUses, next.policies, currentLevel, landUseChangeFactors, CP);

  // 7. Financial calculations (GDP growth, tax, interest, debt, reserves, pending loan).
  const econ = updateEconomy(
    next.stellaSpecificState, next.policies, currentLevel, additionalTaxPressurePercentage,
    totalPolicyCost, totalPactCost, next.loanRequestedThisRound, CP, language,
  );
  next.stellaSpecificState = { ...next.stellaSpecificState, ...econ.stella };
  if (econ.loanProcessedLog) {
    logs.push(econ.loanProcessedLog);
    next.loanRequestedThisRound = 0;
  }

  // 8. Indicator calculations.
  next.indicators.biodiversity = calculateBiodiversityChange(next.policies, next.landUses, next.indicators.biodiversity, currentLevel, CP);
  next.indicators.foodSecurity = calculateFoodSecurityChange(next.policies, next.landUses, next.indicators, currentLevel, CP);
  next.indicators.economicSecurity = calculateEconomicSecurityChange(next.policies, next.landUses, next.indicators, currentLevel, additionalTaxPressurePercentage, CP);
  next.stellaSpecificState.Conflicto_social = calculateSocialConflictChange(next.policies, next.landUses, next.stellaSpecificState, next.indicators, currentLevel, additionalTaxPressurePercentage, CP);
  next.indicators.socialWellbeing = 100 - next.stellaSpecificState.Conflicto_social;
  next.stellaSpecificState.Colapso_politico = calculatePoliticalCollapseChange(next.stellaSpecificState, next.indicators, CP);
  next.indicators.politicalStability = 100 - next.stellaSpecificState.Colapso_politico;

  // 9. CO2eq emissions per capita.
  next.indicators.co2EqEmissionsPerCapita = computeCarbonBalance(next.landUses, next.policies, currentLevel, next.stellaSpecificState.Poblacion_Total, CP);

  // 10. Sectoral political pressures (reads the CO2/biodiversity values just updated above).
  const pressures = updatePressures(
    { ppAgricola: next.stellaSpecificState.PP_AGRICOLA, ppAmbientalista: next.stellaSpecificState.PP_AMBIENTALISTA, ppSocial: next.stellaSpecificState.PP_SOCIAL },
    next.policies, next.indicators, currentLevel, additionalTaxPressurePercentage, CP,
  );
  next.stellaSpecificState.PP_AGRICOLA = pressures.ppAgricola;
  next.stellaSpecificState.PP_AMBIENTALISTA = pressures.ppAmbientalista;
  next.stellaSpecificState.PP_SOCIAL = pressures.ppSocial;

  // 11. Sync derived indicators from Stella stocks, then clamp every 0-100 indicator (final step,
  //     not per-term — matches the original's ordering, see docs/audit-equations.md item I-3).
  next.indicators.pbi = next.stellaSpecificState.PBI_Real;
  next.indicators.debt = next.stellaSpecificState.Deuda;
  next.indicators.treasuryReserves = next.stellaSpecificState.Reservas_del_Tesoro;
  next.indicators.ppAgricola = next.stellaSpecificState.PP_AGRICOLA;
  next.indicators.ppAmbientalista = next.stellaSpecificState.PP_AMBIENTALISTA;
  next.indicators.ppSocial = next.stellaSpecificState.PP_SOCIAL;
  (Object.keys(next.indicators) as (keyof Indicators)[]).forEach((key) => {
    if (!['co2EqEmissionsPerCapita', 'pbi', 'treasuryReserves', 'debt', 'generalScore'].includes(key as string)) {
      next.indicators[key] = Math.max(0, Math.min(100, next.indicators[key])) as never;
    }
  });

  // 12. Score.
  next.indicators.generalScore = computeScore(next.indicators, currentLevel, CP);

  // 13. Game-over conditions.
  // `gameOverReason` is deliberately left Spanish-only, unlike the log/warning strings just
  // above (phase 12, 12_i18n_completo.md Capa B/C): grep-confirmed it is never rendered as text
  // anywhere in the UI (only read as a boolean via `!!gameOverReason` for the "game over" badge,
  // pattern-matched internally with `.includes('victoria')`/`=== 'Partida abandonada...'` in
  // App.tsx and geminiService.ts, and sent to Gemini as AI context) — Capa C's own guidance
  // (§5) is that context sent to the model can stay Spanish, the model understands it fine.
  // Converting these four strings into locale-aware keys would mean also updating every
  // comparison site across two files for a value nothing ever displays; judged not worth the
  // risk. See docs/DESIGN_DECISIONS_LOG.md, phase 12 entry.
  if (next.indicators.politicalStability <= 5) {
    next.gameOverReason = 'Colapso Político: La nación ha caído en un estado de ingobernabilidad total.';
  } else if (next.indicators.biodiversity <= 5) {
    next.gameOverReason = 'Colapso Ecológico: La pérdida de biodiversidad ha provocado una catástrofe irreversible.';
  } else if (currentLevel >= 2 && next.indicators.foodSecurity <= 10) {
    next.gameOverReason = 'Hambruna: La incapacidad de alimentar a la población ha generado una crisis humanitaria.';
  } else if (next.stellaSpecificState.Reservas_del_Tesoro < -(next.stellaSpecificState.PBI_Real * 0.2) && next.stellaSpecificState.Deuda > next.stellaSpecificState.PBI_Real * 1.5) {
    next.gameOverReason = 'Bancarrota Nacional: La deuda insostenible y la falta de reservas han llevado a la quiebra.';
  }

  // 14. Policy-efficiency-crossed-40%-threshold warning (side effect only: no state besides the
  //     policy's own notification bookkeeping, handled inside checkEfficiencyWarning).
  const warning = checkEfficiencyWarning(next.policies, language);
  if (warning) {
    chatMessages.push({ text: warning, emphasisType: 'policy_efficiency_warning' });
    logs.push(warning);
  }

  const trace = buildTrace(currentYear, before, next.indicators);
  return { next, trace, logs, chatMessages };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────

export interface LevelInitializationResult {
  gameStatePatch: Pick<
    GameState,
    | 'year' | 'currentLevel' | 'policies' | 'landUses' | 'indicators' | 'stellaSpecificState'
    | 'pacts' | 'activeLevelConfig' | 'yearsSimulatedInCurrentLevel' | 'level3EventsTriggeredCount'
    | 'additionalTaxPressurePercentage' | 'decarbonitoProactiveMessageSentInLevel'
    | 'lastConcludedLevelInfo' | 'sentLevelReflectionMessage' | 'levelBaseline'
  >;
  initialHistoricalDataPoint: HistoricalDataPoint;
}

/**
 * Builds the initial per-level game state (year, land uses, Stella stocks/indicators, policies,
 * pacts, level counters). Ported verbatim from `buildLevelInitializationState` in the
 * pre-extraction src/App.tsx — used whenever the game resets to a level's starting conditions
 * (starting the next level after a win, jumping to a level manually, retrying after a loss).
 *
 * Note (docs/audit-equations.md candidate CORREGIR item): `JSON.parse(JSON.stringify(INITIAL_PACTS))`
 * strips the `effects` functions from the cloned pacts, same as in `stepYear`'s own clone above.
 * The original code restores them defensively inside `runSimulationRound` on the *next* simulated
 * year, meaning a level that ends without ever simulating another year could carry pacts with a
 * missing `effects` function. Preserved as-is per the "extract, freeze, then fix" order of
 * operations — flagged for the equations audit, not silently patched here.
 */
export function createInitialState(levelNumber: number): LevelInitializationResult {
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
      policies: JSON.parse(JSON.stringify(INITIAL_POLICIES)),
      landUses: newLandUses,
      indicators: newIndicators,
      stellaSpecificState: newStellaState,
      pacts: JSON.parse(JSON.stringify(INITIAL_PACTS)),
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
    },
    initialHistoricalDataPoint,
  };
}
