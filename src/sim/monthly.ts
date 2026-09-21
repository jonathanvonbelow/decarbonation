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
 *   - The fiscal-pressure terms that the 3-level game only applies on level 3 are switched by
 *     `options.fiscalTermsActive` (default: the original `currentLevel === 3` rule).
 *
 * `stepYear` itself is untouched by this module.
 */
import { ALL_RANDOM_EVENTS, CONTROL_PARAMS, INITIAL_PACTS } from '../constants';
import type { ControlParams, GameState, Indicators, Pact, PolicyState, RandomEvent, StellaStocks } from '../types';
import { LandUseType } from '../types';
import type { Language } from '../hooks/useLanguage';
import { getEventDescription, getEventName, getPolicyName } from '../legacyContent/gameData';
import { computeCarbonBalance } from './carbon';
import { computeTotalPactCost, updateEconomy } from './economy';
import { applyRandomEventEffects } from './events';
import { evaluateGameOver } from './gameOver';
import { applyDeferredAdjustments, applyPactEffectsOnDerived, isDerivedIndicator, type DeferredAdjustment } from './deferred';
import {
  calculateBiodiversityChange, calculateEconomicSecurityChange, calculateFoodSecurityChange,
  calculatePoliticalCollapseChange, calculateSocialConflictChange,
} from './indicators';
import { computeLandUseFlows, DEFAULT_LAND_USE_CHANGE_FACTORS, updateLandUse, type LandUseChangeFactors } from './landUse';
import { checkEfficiencyWarning, computeTotalPolicyCost, updatePolicyEfficiency } from './policies';
import { updatePressures } from './pressures';
import type { Rng } from './rng';
import { computeScore } from './score';
import { buildTrace, type SimTrace } from './trace';
import type { StepYearChatMessage } from './index';
import type { LandFlow } from './territory';

export const MONTHS_PER_YEAR = 12;
const DT = 1 / MONTHS_PER_YEAR;

/** One Euler step of Δt = 1/12 toward the value the annual equation would produce. */
const toward = (current: number, annualTarget: number): number => current + (annualTarget - current) * DT;

const clamp100 = (n: number): number => Math.max(0, Math.min(100, n));

export interface MonthlyOptions {
  /** Applies the additional-tax terms in economic security and social conflict. Default: level 3 only. */
  fiscalTermsActive?: boolean;
  /** Event pool. Default: the model's `ALL_RANDOM_EVENTS`. */
  events?: RandomEvent[];
  /**
   * Charges the yearly upkeep of the land under public use (protected forest, wetland, restoration,
   * energy park) to the treasury, as 1/12 per month. Territorio only: off by default, so `stepMonth`
   * stays the exact monthly discretisation of `stepYear` for everything the 3-level game runs.
   */
  publicUseUpkeep?: boolean;
}

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

/** Per-month probability that keeps an event's annual probability `annual`. */
export function monthlyTriggerChance(annual: number): number {
  const p = Math.max(0, Math.min(1, annual));
  return 1 - Math.pow(1 - p, DT);
}

/**
 * Monthly random-event roll: walks the pool in order (like `rollEvent`'s level<3 branch) and fires
 * the first event whose draw lands under its monthly chance. One rng draw per eligible event.
 */
export function rollMonthlyEvent(
  workingState: GameState,
  events: RandomEvent[],
  rng: Rng,
  month: number,
  language: Language = 'es',
  deferred?: DeferredAdjustment[],
): { event: RandomEvent | null; logs: string[]; chatMessage: string | null } {
  const logs: string[] = [];
  for (const event of events) {
    if (event.minLevel && workingState.currentLevel < event.minLevel) continue;
    if (rng() >= monthlyTriggerChance(event.triggerChance(workingState))) continue;
    const name = getEventName(event.id, language);
    const description = getEventDescription(event.id, language, event.description);
    const stamp = `${String(month + 1).padStart(2, '0')}/${workingState.year}`;
    logs.push(language === 'en' ? `EVENT (${stamp}): ${name} - ${description}` : `EVENTO (${stamp}): ${name} - ${description}`);
    applyRandomEventEffects(
      event.effects(workingState), workingState.indicators, workingState.stellaSpecificState,
      workingState.landUses, logs, language, deferred,
    );
    return { event, logs, chatMessage: `${name}: ${description}` };
  }
  return { event: null, logs, chatMessage: null };
}

function areasOf(state: GameState): Record<LandUseType, number> {
  const out = {} as Record<LandUseType, number>;
  (Object.values(LandUseType) as LandUseType[]).forEach((k) => { out[k] = state.landUses[k].area; });
  return out;
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
  const next: GameState = JSON.parse(JSON.stringify(state));
  Object.keys(next.pacts).forEach((pactId) => {
    if (INITIAL_PACTS[pactId] && typeof INITIAL_PACTS[pactId].effects === 'function') {
      next.pacts[pactId].effects = INITIAL_PACTS[pactId].effects;
    }
  });

  const logs: string[] = [];
  const chatMessages: StepYearChatMessage[] = [];
  const before: Indicators = { ...next.indicators };
  const areasBefore = areasOf(next);
  const currentYear = next.year;
  const currentLevel = next.currentLevel;
  const tax = next.additionalTaxPressurePercentage;
  const fiscalTermsActive = options.fiscalTermsActive ?? currentLevel === 3;
  const stella: StellaStocks = next.stellaSpecificState;

  // 0. Population growth (annual rate / 12).
  stella.Poblacion_Total *= 1 + CP.Tasa_Crecimiento_Poblacional_Base * DT;

  // 1. Confirm policy activation year.
  (Object.values(next.policies) as PolicyState[]).forEach((p) => {
    if (p.isActive && p.activationYear === undefined) {
      p.activationYear = currentYear;
      const policyName = getPolicyName(p.id, language);
      logs.push(language === 'en' ? `Policy '${policyName}' in force from ${currentYear}.` : `Política '${policyName}' vigente desde ${currentYear}.`);
    }
  });

  // 2. Random event roll (monthly chance), applied before the rest, as in stepYear.
  next.currentEvent = null;
  const areasBeforeEvent = areasOf(next);
  const deferred: DeferredAdjustment[] = [];
  const rolled = rollMonthlyEvent(next, options.events ?? ALL_RANDOM_EVENTS, rng, month, language, deferred);
  logs.push(...rolled.logs);
  if (rolled.chatMessage) chatMessages.push({ text: rolled.chatMessage, emphasisType: 'game_event' });
  if (rolled.event) next.currentEvent = rolled.event;
  const flows: LandFlow[] = [];
  const areasAfterEvent = areasOf(next);
  (Object.values(LandUseType) as LandUseType[]).forEach((k) => {
    const lost = areasBeforeEvent[k] - areasAfterEvent[k];
    if (lost > 0) flows.push({ from: k, to: 'fallow', kHa: lost });
  });

  // 3. Policy "years active" counters (+1/12) and efficiency decay.
  updatePolicyEfficiency(next.policies, stella, DT);

  // 4. Annual costs, on PBI_Real before this month's growth (spread as 1/12 in step 7).
  const totalPolicyCost = computeTotalPolicyCost(next.policies, stella.PBI_Real);
  const totalPactCost = computeTotalPactCost(next.pacts);

  // 5. Pact effects: each returns the value one full year of the pact would reach; move 1/12 of it.
  let landUseChangeFactors: LandUseChangeFactors = { ...DEFAULT_LAND_USE_CHANGE_FACTORS };
  (Object.values(next.pacts) as Pact[]).forEach((pact) => {
    if (!pact.isActive) return;
    const effects = pact.effects(next.indicators, stella);
    if (effects.indicators) {
      (Object.keys(effects.indicators) as (keyof Indicators)[]).forEach((k) => {
        const target = effects.indicators![k];
        // Derived indicators are applied after the recomputation, below (src/sim/deferred.ts).
        if (typeof target === 'number' && !isDerivedIndicator(k as string)) next.indicators[k] = toward(next.indicators[k], target);
      });
    }
    if (effects.stellaStocks) {
      (Object.keys(effects.stellaStocks) as (keyof StellaStocks)[]).forEach((k) => {
        const target = effects.stellaStocks![k];
        const current = stella[k];
        if (typeof target === 'number' && typeof current === 'number') (stella as any)[k] = toward(current, target);
      });
    }
    if (effects.landUseChangeFactors) {
      const f = effects.landUseChangeFactors;
      landUseChangeFactors = {
        tasa_BNNP_a_BNP: landUseChangeFactors.tasa_BNNP_a_BNP * (f.tasa_BNNP_a_BNP ?? 1),
        tasa_BNNP_a_CC: landUseChangeFactors.tasa_BNNP_a_CC * (f.tasa_BNNP_a_CC ?? 1),
        tasa_BNNP_a_CA: landUseChangeFactors.tasa_BNNP_a_CA * (f.tasa_BNNP_a_CA ?? 1),
        tasa_CA_a_BNNP: landUseChangeFactors.tasa_CA_a_BNNP * (f.tasa_CA_a_BNNP ?? 1),
        tasa_CC_a_CA: landUseChangeFactors.tasa_CC_a_CA * (f.tasa_CC_a_CA ?? 1),
      };
    }
  });

  // 6. Land-use transitions: 1/12 of the annual transfer.
  const annual = computeLandUseFlows(next.landUses, next.policies, currentLevel, landUseChangeFactors, CP);
  flows.push(
    { from: LandUseType.UnprotectedNativeForest, to: LandUseType.ProtectedNativeForest, kHa: annual.BNNP_to_BNP * DT },
    { from: LandUseType.UnprotectedNativeForest, to: LandUseType.ConventionalCrops, kHa: annual.BNNP_to_CC * DT },
    { from: LandUseType.UnprotectedNativeForest, to: LandUseType.AgroecologicalCrops, kHa: annual.BNNP_to_CA * DT },
    { from: LandUseType.AgroecologicalCrops, to: LandUseType.UnprotectedNativeForest, kHa: annual.CA_to_BNNP * DT },
    { from: LandUseType.ConventionalCrops, to: LandUseType.AgroecologicalCrops, kHa: annual.CC_to_CA * DT },
    { from: LandUseType.RestorationForest, to: LandUseType.ProtectedNativeForest, kHa: annual.RES_to_BNP * DT },
  );
  const annualLandUses = updateLandUse(next.landUses, next.policies, currentLevel, landUseChangeFactors, CP);
  (Object.values(LandUseType) as LandUseType[]).forEach((k) => {
    next.landUses[k].area = Math.max(0, toward(next.landUses[k].area, annualLandUses[k].area));
  });

  // 7. Public finances: 1/12 of the annual flows. The loan is handled apart, credited in full.
  let upkeep = 0;
  const econ = updateEconomy(stella, next.policies, currentLevel, tax, totalPolicyCost, totalPactCost, 0, CP, language);
  stella.PBI_Real = toward(stella.PBI_Real, econ.stella.PBI_Real);
  stella.Reservas_del_Tesoro = toward(stella.Reservas_del_Tesoro, econ.stella.Reservas_del_Tesoro);
  stella.Deuda = Math.max(0, toward(stella.Deuda, econ.stella.Deuda));
  if (options.publicUseUpkeep) {
    // What the state protects, it also maintains: park rangers, nurseries, works, operation.
    const publicArea = next.landUses[LandUseType.ProtectedNativeForest].area
      + next.landUses[LandUseType.PublicWetland].area
      + next.landUses[LandUseType.RestorationForest].area
      + next.landUses[LandUseType.EnergyPark].area;
    upkeep = publicArea * CP.Costo_Mantenimiento_Uso_Publico_por_kHa_Anual * DT;
    stella.Reservas_del_Tesoro -= upkeep;
  }
  if (next.loanRequestedThisRound > 0) {
    const loan = next.loanRequestedThisRound;
    stella.Reservas_del_Tesoro += loan;
    stella.Deuda += loan;
    logs.push(language === 'en'
      ? `Loan of ${loan.toFixed(0)} processed. Debt and Reserves updated.`
      : `Préstamo de ${loan.toFixed(0)} procesado. Deuda y Reservas actualizadas.`);
    next.loanRequestedThisRound = 0;
  }

  // 8. Indicators, in stepYear's order (each reads the ones already updated this month).
  next.indicators.biodiversity = toward(
    next.indicators.biodiversity,
    calculateBiodiversityChange(next.policies, next.landUses, next.indicators.biodiversity, currentLevel, CP),
  );
  next.indicators.foodSecurity = toward(
    next.indicators.foodSecurity,
    calculateFoodSecurityChange(next.policies, next.landUses, next.indicators, currentLevel, CP),
  );
  next.indicators.economicSecurity = toward(
    next.indicators.economicSecurity,
    calculateEconomicSecurityChange(next.policies, next.landUses, next.indicators, currentLevel, tax, CP, fiscalTermsActive),
  );
  stella.Conflicto_social = toward(
    stella.Conflicto_social,
    calculateSocialConflictChange(next.policies, next.landUses, stella, next.indicators, currentLevel, tax, CP, fiscalTermsActive),
  );
  next.indicators.socialWellbeing = 100 - stella.Conflicto_social;
  stella.Colapso_politico = toward(stella.Colapso_politico, calculatePoliticalCollapseChange(stella, next.indicators, CP));
  next.indicators.politicalStability = 100 - stella.Colapso_politico;

  // 9. CO2eq per capita — a function of the current state, recomputed every month.
  next.indicators.co2EqEmissionsPerCapita = computeCarbonBalance(next.landUses, next.policies, currentLevel, stella.Poblacion_Total, CP);

  // 10. Sectoral political pressures: 1/12 of the annual impulse/dissipation.
  const pressures = updatePressures(
    { ppAgricola: stella.PP_AGRICOLA, ppAmbientalista: stella.PP_AMBIENTALISTA, ppSocial: stella.PP_SOCIAL },
    next.policies, next.indicators, currentLevel, tax, CP,
  );
  stella.PP_AGRICOLA = toward(stella.PP_AGRICOLA, pressures.ppAgricola);
  stella.PP_AMBIENTALISTA = toward(stella.PP_AMBIENTALISTA, pressures.ppAmbientalista);
  stella.PP_SOCIAL = toward(stella.PP_SOCIAL, pressures.ppSocial);

  // 11. Sync derived indicators, then clamp every 0-100 indicator (same list as stepYear).
  next.indicators.pbi = stella.PBI_Real;
  next.indicators.debt = stella.Deuda;
  next.indicators.treasuryReserves = stella.Reservas_del_Tesoro;
  next.indicators.ppAgricola = stella.PP_AGRICOLA;
  next.indicators.ppAmbientalista = stella.PP_AMBIENTALISTA;
  next.indicators.ppSocial = stella.PP_SOCIAL;
  (Object.keys(next.indicators) as (keyof Indicators)[]).forEach((key) => {
    if (!['co2EqEmissionsPerCapita', 'pbi', 'treasuryReserves', 'debt', 'generalScore'].includes(key as string)) {
      next.indicators[key] = clamp100(next.indicators[key]);
    }
  });

  // 11.5 Pact and event effects on the indicators recomputed this month (src/sim/deferred.ts).
  // A pact's effect is a rate per year of membership, so it moves 1/12 of the way like every other
  // flow; an event's is a one-off shock and lands whole.
  const beforePacts: Indicators = { ...next.indicators };
  applyPactEffectsOnDerived(next.pacts, next.indicators, stella);
  (Object.keys(next.indicators) as (keyof Indicators)[]).forEach((k) => {
    if (isDerivedIndicator(k as string)) next.indicators[k] = toward(beforePacts[k], next.indicators[k]);
  });
  applyDeferredAdjustments(next.indicators, deferred);

  // 12. Score.
  next.indicators.generalScore = computeScore(next.indicators, currentLevel, CP);

  // 13. Game over.
  const gameOverReason = evaluateGameOver(next);
  if (gameOverReason) next.gameOverReason = gameOverReason;

  // 14. Efficiency-below-40% warning.
  const warning = checkEfficiencyWarning(next.policies, language);
  if (warning) {
    chatMessages.push({ text: warning, emphasisType: 'policy_efficiency_warning' });
    logs.push(warning);
  }

  // Calendar.
  let nextMonth = month + 1;
  let yearRolled = false;
  if (nextMonth >= MONTHS_PER_YEAR) {
    nextMonth = 0;
    next.year++;
    next.yearsSimulatedInCurrentLevel++;
    yearRolled = true;
  }

  const areasAfter = areasOf(next);
  const landUseDelta = {} as Record<LandUseType, number>;
  (Object.values(LandUseType) as LandUseType[]).forEach((k) => { landUseDelta[k] = areasAfter[k] - areasBefore[k]; });

  return {
    next,
    month: nextMonth,
    yearRolled,
    event: rolled.event,
    landUseDelta,
    flows,
    upkeep,
    trace: buildTrace(currentYear, before, next.indicators),
    logs,
    chatMessages,
  };
}
