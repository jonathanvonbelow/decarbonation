/**
 * Single integrator of both games (mejora-general/files/35_motor_v2_estructura.md §1, §7).
 *
 * `advance(state, dt, rng, CP, opts)` is the one body behind `stepYear` (dt = 1, src/sim/index.ts) and
 * `stepMonth` (dt = 1/12, src/sim/monthly.ts). In phase 35 it still calls the model-1.1 functions in the
 * 1.1 order — the goal of this phase is to move the code, not the equations: `stepYear` and `stepMonth`
 * produce exactly the numbers they produced before (`npm run sim:check -- --quick` gave a byte-identical
 * report; tests/sim/core.spec.ts pins reference trajectories). The one numeric change of phase 35 is not
 * here but in the data: level 1 starts with Colapso_politico = 5 (src/constants.ts).
 * Phase 36 replaces steps 2 and 4 of 2.0 (policy clocks, efficiency per channel, cost by effort; see
 * src/sim/v2/policies.ts): from here on the numbers differ from 1.1 on purpose (docs/audit-equations.md).
 *
 * Phase 37 replaces step 5 (land use): the conservative transition matrix with fallow and the agricultural
 * pool by anchored rents (src/sim/v2/land.ts), applied exactly with dt (no Euler `toward`), and event /
 * situation land effects become transfers (losses to fallow). Phase 38 replaces step 7 (carbon in physical
 * units, src/sim/v2/carbon.ts: energy with renewables/efficiency inertia, AFOLU flux, LUC from the realised
 * flows; cumulative emissions in `model`) and compounds population growth exactly. Phase 39 replaces the
 * indicators E, C (W) and Pc (St) of step 8 with exact relaxation toward anchored logistic targets
 * (src/sim/v2/indicators.ts); phase 40 does the same for B (species-area, src/sim/v2/biodiversity.ts) and phase 41
 * for F (supply/demand balance, src/sim/v2/food.ts) and phase 42 for the three sectoral pressures (src/sim/v2/pressures.ts).
 * Each later phase replaces
 * one step with its 2.0 equation; see src/sim/v2/README.md for which phase implements what.
 *
 * Order of model 2.0 (target; each step reads what the previous ones already updated):
 *  1. population            P *= (1 + g_P)^dt
 *  2. policy clocks         rampTime/fatigueTime (36)
 *  3. random events         independent draws, level shocks, land -> fallow (46)
 *  4. effective efficiency  per policy and channel (36)
 *  5. land                  conservative transition matrix, realised flows in ha (37)
 *  6. economy               GDP, revenue, base spending, policies, pacts, debt (44)
 *  7. carbon                energy, AFOLU flux, LUC from realised flows (38)
 *  8. indicators            B -> F -> E -> C (W) -> Pc (St) -> pressures (39-42, 45)
 *  9. bookkeeping           cumulative emissions, fiscal history, productive years, game over
 *
 * Order of model 1.1 that this file runs today (numbering of the old stepYear, kept in the comments):
 *  0 population (2.0 step 1, phase 38), 1 activation year, [2.0 step 2: policy clocks, phase 36], 2 event
 *  roll, 3 policy efficiency per channel (2.0 step 4, phase 36), 4 policy (by effort, phase 36) and pact
 *  costs, 5 pact effects, 6 land use (2.0 step 5, phase 37), 7 finances, 7.5 carbon (2.0 step 7, phase 38;
 *  was step 9 of 1.1), 8 indicators B -> F -> E -> C -> Pc, 10 pressures, 11 sync + clamp, 11.5 deferred
 *  effects, 12 score, 13 game over, 14 fatigue warning (phase 36).
 *
 * What still depends on `dt` being the annual step, because 1.1 had two different bodies and this
 * phase must not change a number (each goes away in the phase noted):
 *  - the 1.1 stocks (money) move by Euler `x + (F(x) − x)·dt` toward the value the annual equation gives
 *    (`toward`); with dt = 1 the annual value is taken as is (44, 46); E, C, Pc relax exactly since phase 39,
 *    B since phase 40, F since phase 41, the pressures since phase 42;
 *  - event roll: dt = 1 uses the yearly draw (`rollEvent`, at most one event, level-3 weighting),
 *    dt < 1 the monthly Bernoulli walk (`rollMonthlyEvent`) (46);
 *  - a requested loan: dt = 1 goes through `updateEconomy` (its 1.1 order), dt < 1 is credited whole
 *    after the monthly flows (44);
 *  - calendar: dt = 1 simulates year `state.year + 1` (the year advances first, the 1.1 convention);
 *    dt < 1 simulates month `opts.month` of `state.year` and advances the year after December (46).
 *
 * Pure: never mutates its input; deterministic for a given (state, dt, rng, CP, opts). Nothing here
 * imports React or uses Math.random / Date.now.
 */
import { ALL_RANDOM_EVENTS, INITIAL_LAND_USES } from '../../constants';
import type { ControlParams, GameState, Indicators, Pact, PolicyState, RandomEvent, StellaStocks } from '../../types';
import { LandUseType } from '../../types';
import type { Language } from '../../hooks/useLanguage';
import { getEventDescription, getEventName, getPolicyName } from '../../legacyContent/gameData';
import { updateEnergyState, computeEmissions } from './carbon';
import { createModelState } from './anchors';
import { applyDeferredAdjustments, applyPactEffectsOnDerived, isDerivedIndicator, restorePactFunctions, type DeferredAdjustment } from '../deferred';
import { computeTotalPactCost, updateEconomy } from '../economy';
import { applyRandomEventEffects, rollEvent } from '../events';
import { evaluateGameOver } from '../gameOver';
import { updateBiodiversity, type Connectivity } from './biodiversity';
import { updateFoodSecurity } from './food';
import { fiscalStressOf, interestBurdenOf, updateRelaxedIndicators } from './indicators';
import {
  applyLandFlows, DEFAULT_LAND_USE_CHANGE_FACTORS, LAND_USE_TYPES, landFlows, type LandUseChangeFactors, type RealisedLandFlow,
  type TransitionFlow,
} from './land';
import { checkEfficiencyWarning } from '../policies';
import { updatePressures } from './pressures';
import { computeEfficiencies, policyCost, tickPolicyClocks, type PolicyEfficiency } from './policies';
import type { Pid } from './params';
import type { Rng } from '../rng';
import { computeScore } from '../score';
import { toMapFlow, type LandFlow } from '../territory';
import { buildTrace, type SimTrace } from '../trace';

export const MONTHS_PER_YEAR = 12;
/** dt of the monthly step (Territorio). */
export const MONTHLY_DT = 1 / MONTHS_PER_YEAR;

/** Draw used when `advance` gets no rng: above every trigger chance, so no event fires. */
const NO_EVENTS: Rng = () => 0.999;

/** Starting population of model 1.0/1.1 (before phase 38), only to re-anchor an old saved state. */
const LEGACY_POPULATION = 10_000_000;

/**
 * Model-1.1 move of a stock toward the value its annual equation gives: the annual value itself for
 * dt = 1 (bit-identical to the old stepYear), one Euler step of size dt otherwise (the old stepMonth).
 */
const toward = (current: number, annualValue: number, dt: number): number =>
  (dt === 1 ? annualValue : current + (annualValue - current) * dt);

const clamp100 = (n: number): number => Math.max(0, Math.min(100, n));

export interface StepYearChatMessage {
  text: string;
  /** Matches the two emphasisType values the original `runSimulationRound` used for these. */
  emphasisType: 'game_event' | 'policy_efficiency_warning';
}

export interface AdvanceOptions {
  /** Language of logs and chat messages. Default 'es'. */
  language?: Language;
  /** Month (0 = January) of `state.year` being simulated. Monthly step only (dt < 1); default 0. */
  month?: number;
  /** Event pool. Default: the model's `ALL_RANDOM_EVENTS`. */
  events?: RandomEvent[];
  /**
   * Charges the yearly upkeep of the land under public use (protected forest the player declared,
   * wetland, restoration, energy park) to the treasury, × dt. Territorio only: off by default.
   */
  publicUseUpkeep?: boolean;
  /**
   * Deferred effects decided outside the step (Territorio situations, phase 34 T-12): applied at
   * step 11.5 together with this step's event, after the recomputation that would erase them.
   */
  extraDeferred?: DeferredAdjustment[];
  /**
   * Landscape connectivity read from the Territorio map (phase 40 §3): K = share of the forest (BNNP + BNP + RES)
   * in the largest 4-connected patch, now and at the start of the game. Enters D_B as γ_K·ln(K/K0); absent (the
   * 3-level game, which has no map) the term is 0.
   */
  connectivity?: Connectivity;
  /**
   * Wear of the Territorio situations still open (phase 42): logit shifts of the targets of conflict (C) and of the
   * three pressures (a / e / s) this step. Absent (the 3-level game), every shift is 0.
   */
  wear?: { C?: number; a?: number; e?: number; s?: number };
}

export interface AdvanceResult {
  next: GameState;
  /** Random event that fired this step, if any (its effects are already applied). */
  event: RandomEvent | null;
  /**
   * Land transfers of this step as the Territorio map draws them: what an event moved (losses to
   * 'fallow') and every realised edge of the transition matrix (kHa this step). The map moves parcels
   * along these.
   */
  flows: LandFlow[];
  /** Realised transitions of the matrix this step, in kHa and ha (phase 37; the carbon of phase 38 reads them). */
  landFlowsRealised: RealisedLandFlow[];
  /** Land transfers an event made this step (phase 37 section 3). */
  eventLandTransfers: TransitionFlow[];
  /** Upkeep charged this step for the land under public use (0 unless `publicUseUpkeep`). */
  upkeep: number;
  /** Area change per land use this step, after − before, in kHa. */
  landUseDelta: Record<LandUseType, number>;
  /** Monthly step: month (0-11) of `next.year` the next call simulates. Annual step: always 0. */
  month: number;
  /** True when this step advanced `next.year` (every annual step; the December monthly step). */
  yearRolled: boolean;
  trace: SimTrace;
  /** Effective efficiency per policy and channel this step (phase 36), for the trace and later phases. */
  efficiencies: Record<Pid, PolicyEfficiency>;
  /** Narrative log lines produced this step, oldest first. */
  logs: string[];
  /** Chat-worthy messages (event banners, efficiency warnings), oldest first. */
  chatMessages: StepYearChatMessage[];
}

/** Per-step probability that keeps an event's annual probability `annual` (monthly step: dt = 1/12). */
export function monthlyTriggerChance(annual: number, dt: number = MONTHLY_DT): number {
  const p = Math.max(0, Math.min(1, annual));
  return 1 - Math.pow(1 - p, dt);
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
): { event: RandomEvent | null; logs: string[]; chatMessage: string | null; landTransfers: TransitionFlow[] } {
  const logs: string[] = [];
  for (const event of events) {
    if (event.minLevel && workingState.currentLevel < event.minLevel) continue;
    if (rng() >= monthlyTriggerChance(event.triggerChance(workingState))) continue;
    const name = getEventName(event.id, language);
    const description = getEventDescription(event.id, language, event.description);
    const stamp = `${String(month + 1).padStart(2, '0')}/${workingState.year}`;
    logs.push(language === 'en' ? `EVENT (${stamp}): ${name} - ${description}` : `EVENTO (${stamp}): ${name} - ${description}`);
    const landTransfers = applyRandomEventEffects(
      event.effects(workingState), workingState.indicators, workingState.stellaSpecificState,
      workingState.landUses, logs, language, deferred,
    );
    return { event, logs, chatMessage: `${name}: ${description}`, landTransfers };
  }
  return { event: null, logs, chatMessage: null, landTransfers: [] };
}

/** Protected forest the player declared, never more than the protected forest that exists. */
export function declaredProtectedOf(state: GameState): number {
  return Math.min(state.declaredProtectedArea ?? 0, state.landUses[LandUseType.ProtectedNativeForest].area);
}

function areasOf(state: GameState): Record<LandUseType, number> {
  const out = {} as Record<LandUseType, number>;
  LAND_USE_TYPES.forEach((k) => { out[k] = state.landUses[k]?.area ?? 0; });
  return out;
}



/**
 * One step of the model. dt = 1 (3-level game, `stepYear`) or 1/12 (Territorio, `stepMonth`).
 * Pure: never mutates its input; deterministic for a given (state, dt, rng, CP, opts).
 * `rng = null` runs without events.
 */
export function advance(state: GameState, dt: number, rng: Rng | null, CP: ControlParams, opts: AdvanceOptions = {}): AdvanceResult {
  if (!(dt > 0 && dt <= 1)) throw new RangeError(`advance: dt must be in (0, 1], got ${dt}`);
  const annual = dt === 1;
  const language = opts.language ?? 'es';
  const month = annual ? 0 : opts.month ?? 0;
  const draw = rng ?? NO_EVENTS;

  const next: GameState = JSON.parse(JSON.stringify(state));
  restorePactFunctions(next.pacts);
  // A state built before phase 37 has no fallow entry: it starts at 0 kHa (the area is unchanged).
  if (!next.landUses[LandUseType.Fallow]) next.landUses[LandUseType.Fallow] = { ...INITIAL_LAND_USES[LandUseType.Fallow] };

  const logs: string[] = [];
  const chatMessages: StepYearChatMessage[] = [];
  const before: Indicators = { ...next.indicators };
  const areasBefore = areasOf(next);

  // Calendar (1.1 convention): the annual step simulates year state.year + 1, so it advances first.
  if (annual) {
    next.year++;
    next.yearsSimulatedInCurrentLevel++;
  }
  const currentYear = next.year;
  const currentLevel = next.currentLevel;
  const tax = next.additionalTaxPressurePercentage;

  // A state built before phase 35 has no 2.0 sub-state: anchor it here (the carbon of phase 38 needs it).
  if (!next.model) next.model = createModelState(next, CP);
  const model = next.model;
  // A 2.0 sub-state from before phase 38 has no pop0 and may still carry the 1.1 population (10 million with
  // the 40 000 carbon scale): re-anchor it to CP.Poblacion_Inicial so per-capita figures stay physical.
  if (!(model.anchors.pop0 > 0)) {
    model.anchors = { ...model.anchors, pop0: CP.Poblacion_Inicial };
    if (next.stellaSpecificState.Poblacion_Total > 5 * CP.Poblacion_Inicial) {
      next.stellaSpecificState.Poblacion_Total *= CP.Poblacion_Inicial / LEGACY_POPULATION;
    }
  }

  // 0 (2.0 step 1). Population growth, compounded exactly: P *= (1 + g)^dt (phase 38; 1.1 used 1 + g·dt).
  next.stellaSpecificState.Poblacion_Total *= Math.pow(1 + CP.Tasa_Crecimiento_Poblacional_Base, dt);

  // 1. Confirm policy activation year (bookkeeping only — decay runs after the event roll).
  (Object.values(next.policies) as PolicyState[]).forEach((p) => {
    if (p.isActive && p.activationYear === undefined) {
      p.activationYear = currentYear;
      const policyName = getPolicyName(p.id, language);
      if (annual) {
        logs.push(language === 'en'
          ? `Policy '${policyName}' activated and confirmed for year ${currentYear}.`
          : `Política '${policyName}' activada y confirmada para el año ${currentYear}.`);
      } else {
        logs.push(language === 'en' ? `Policy '${policyName}' in force from ${currentYear}.` : `Política '${policyName}' vigente desde ${currentYear}.`);
      }
    }
  });

  // 2.0 step 2. Policy clocks: ramp and fatigue run while active; at rest the ramp resets and the
  //    fatigue recovers (phase 36, src/sim/v2/policies.ts). Before the event roll, as in the prototype.
  tickPolicyClocks(next.policies, dt, CP);

  // 2. Random event roll, applied BEFORE policy efficiency/costs/land use/finances/indicators. Effects on
  //    indicators this step recomputes are held back and applied at step 11.5 (src/sim/deferred.ts).
  next.currentEvent = null;
  const deferred: DeferredAdjustment[] = [];
  const events = opts.events ?? ALL_RANDOM_EVENTS;
  const rolled = annual
    ? rollEvent(next, events, next.yearsSimulatedInCurrentLevel - 1, draw, language, deferred)
    : rollMonthlyEvent(next, events, draw, month, language, deferred);
  logs.push(...rolled.logs);
  if (rolled.chatMessage) chatMessages.push({ text: rolled.chatMessage, emphasisType: 'game_event' });
  if (rolled.event) next.currentEvent = rolled.event;
  // Land an event moved (phase 37: transfers, losses to fallow), drawn on the map with the matrix flows.
  const flows: LandFlow[] = rolled.landTransfers.map(toMapFlow);

  // 3 (2.0 step 4). Effective efficiency per policy and channel (phase 36): stores the base η in
  //    `currentEfficiency`; the 1.1 submodels read `eff[pid].prod` through getPolicyEfficiency.
  const eff: Record<Pid, PolicyEfficiency> = computeEfficiencies(next.policies, currentLevel, CP);
  const stella: StellaStocks = next.stellaSpecificState;

  // 4. Annual costs (policy + pacts), on PBI_Real before this step's growth (× dt in step 7). Policy
  //    cost by effort, κ·Y·(0.3 + 0.7·ē) (phase 36).
  const totalPolicyCost = policyCost(next.policies, stella.PBI_Real);
  const totalPactCost = computeTotalPactCost(next.pacts);

  // 5. Pact effects: each returns the value one full year of the pact would reach (moved × dt), and the
  //    land-use change-factor multipliers. No pact writes B, F or E here (B and E: target shifts, PARAMS_V2.pacts; F: none).
  let landUseChangeFactors: LandUseChangeFactors = { ...DEFAULT_LAND_USE_CHANGE_FACTORS };
  (Object.values(next.pacts) as Pact[]).forEach((pact) => {
    if (!pact.isActive) return;
    const effects = pact.effects(next.indicators, stella);
    if (effects.indicators) {
      (Object.keys(effects.indicators) as (keyof Indicators)[]).forEach((k) => {
        const value = effects.indicators![k];
        // Derived indicators are applied after the recomputation, at step 11.5 (src/sim/deferred.ts).
        if (typeof value === 'number' && !isDerivedIndicator(k as string)) next.indicators[k] = toward(next.indicators[k], value, dt);
      });
    }
    if (effects.stellaStocks) {
      (Object.keys(effects.stellaStocks) as (keyof StellaStocks)[]).forEach((k) => {
        const value = effects.stellaStocks![k];
        const current = stella[k];
        // Annual step: the old `{ ...stella, ...effects.stellaStocks }` merge (a pact may set a key the state lacks).
        if (typeof value === 'number' && (annual || typeof current === 'number')) (stella as any)[k] = annual ? value : toward(current as number, value, dt);
      });
    }
    if (effects.landUseChangeFactors) {
      const f = effects.landUseChangeFactors;
      landUseChangeFactors = {
        tasa_BNNP_a_BNP: landUseChangeFactors.tasa_BNNP_a_BNP * (f.tasa_BNNP_a_BNP ?? 1),
        tasa_BNNP_a_CC: landUseChangeFactors.tasa_BNNP_a_CC * (f.tasa_BNNP_a_CC ?? 1),
        tasa_BNNP_a_CA: landUseChangeFactors.tasa_BNNP_a_CA * (f.tasa_BNNP_a_CA ?? 1),
        tasa_CA_a_BNNP: landUseChangeFactors.tasa_CA_a_BNNP * (f.tasa_CA_a_BNNP ?? 1),
      };
    }
  });

  // 6 (2.0 step 5). Land use: the conservative transition matrix of model 2.0 (phase 37, src/sim/v2/land.ts):
  //    frontier flows (η^land), fallow regrowth, agricultural pool by anchored rents (η^prod), netted, applied
  //    exactly with dt and scaled so no use goes below zero. Σ A is conserved.
  const realised: RealisedLandFlow[] = applyLandFlows(next.landUses, landFlows(next, eff, CP, landUseChangeFactors), dt);
  realised.forEach((f) => { if (f.kHa > 0) flows.push(toMapFlow(f)); });
  // Public restoration that matures into protected forest stays public (model 1.1, phase 34, T-07),
  // kept within the protected forest that exists. Monthly step only, as in 1.1 (the old stepYear never
  // touched it; Territorio is the only game with declared land).
  if (!annual) {
    const resToBnp = realised.find((f) => f.from === LandUseType.RestorationForest && f.to === LandUseType.ProtectedNativeForest)?.kHa ?? 0;
    if (resToBnp > 0) next.declaredProtectedArea = (next.declaredProtectedArea ?? 0) + resToBnp;
    if (next.declaredProtectedArea !== undefined) {
      next.declaredProtectedArea = Math.min(next.declaredProtectedArea, next.landUses[LandUseType.ProtectedNativeForest].area);
    }
  }

  // 7. Public finances: the annual flows × dt. A requested loan: annual step inside updateEconomy (1.1
  //    order), monthly step credited whole after the flows.
  const loanInEconomy = annual ? next.loanRequestedThisRound : 0;
  const gdpBefore = stella.PBI_Real;
  const debtBefore = stella.Deuda;
  const econ = updateEconomy(stella, next.policies, currentLevel, tax, totalPolicyCost, totalPactCost, loanInEconomy, CP, language);
  if (annual) {
    // The old stepYear merge: every stock updateEconomy returns, as is.
    Object.assign(stella, econ.stella);
  } else {
    stella.PBI_Real = toward(stella.PBI_Real, econ.stella.PBI_Real, dt);
    stella.Reservas_del_Tesoro = toward(stella.Reservas_del_Tesoro, econ.stella.Reservas_del_Tesoro, dt);
    stella.Deuda = Math.max(0, toward(stella.Deuda, econ.stella.Deuda, dt));
  }
  // Annual GDP growth rate of this step (the 1.1 economy gives the annual value for both dt): the growth
  // driver of E* (phase 39) until phase 44 ports the 2.0 economy.
  model.fiscal.growth = gdpBefore > 0 ? econ.stella.PBI_Real / gdpBefore - 1 : CP.Tasa_Base_Crecimiento_PBI;
  // Fiscal stress φ = sHigh(interest / tax revenue; 0.20, 0.04), the prototype's `economy_step` evaluated on the
  // 1.1 stocks (bridge of phase 39 until phase 44 ports the 2.0 economy): the debt weighs on E, C and Pc.
  model.fiscal.interestBurden = interestBurdenOf(debtBefore, gdpBefore, econ.stella.PBI_Real, tax, currentLevel, CP);
  model.fiscal.stress = fiscalStressOf(model.fiscal.interestBurden);
  if (econ.loanProcessedLog) {
    logs.push(econ.loanProcessedLog);
    next.loanRequestedThisRound = 0;
  }
  let upkeep = 0;
  if (opts.publicUseUpkeep) {
    // What the state protects, it also maintains: only the forest the state declared (T-07).
    const publicArea = declaredProtectedOf(next)
      + next.landUses[LandUseType.PublicWetland].area
      + next.landUses[LandUseType.RestorationForest].area
      + next.landUses[LandUseType.EnergyPark].area;
    upkeep = publicArea * CP.Costo_Mantenimiento_Uso_Publico_por_kHa_Anual * dt;
    stella.Reservas_del_Tesoro -= upkeep;
  }
  if (!annual && next.loanRequestedThisRound > 0) {
    const loan = next.loanRequestedThisRound;
    stella.Reservas_del_Tesoro += loan;
    stella.Deuda += loan;
    logs.push(language === 'en'
      ? `Loan of ${loan.toFixed(0)} processed. Debt and Reserves updated.`
      : `Préstamo de ${loan.toFixed(0)} procesado. Deuda y Reservas actualizadas.`);
    next.loanRequestedThisRound = 0;
  }

  // 7.5 (2.0 step 7). Carbon in physical units (phase 38, src/sim/v2/carbon.ts): renewables and efficiency move
  //    toward their targets with inertia, then energy + AFOLU flux + LUC from this step's realised flows (÷ dt,
  //    an annual rate). After the economy (income per capita reads this step's GDP), as in the prototype.
  model.energy = updateEnergyState(model.energy, next.landUses, eff, next.pacts, dt);
  const carbon = computeEmissions(
    { level: currentLevel, landUses: next.landUses, population: stella.Poblacion_Total, gdp: stella.PBI_Real, anchors: model.anchors, energy: model.energy },
    eff, realised, dt,
  );
  model.emissions = { energy: carbon.energy, afolu: carbon.afolu, luc: carbon.luc, total: carbon.total };
  model.cumulativeEmissions += carbon.total * dt;
  next.indicators.co2EqEmissionsPerCapita = carbon.perCapita;

  // 8. Indicators B -> F -> E -> C (W) -> Pc (St), each reading the ones already updated this step. B relaxes
  //    exactly toward its species-area target (phase 40, src/sim/v2/biodiversity.ts; connectivity from the map in
  //    Territorio); F toward its supply/demand target (phase 41, src/sim/v2/food.ts; it reads the E of the previous
  //    step, as in the prototype); E, C and Pc toward their anchored logistic targets (phase 39,
  //    src/sim/v2/indicators.ts). The pacts enter as target shifts. The pressures (phase 42) come after.
  updateBiodiversity(next as GameState & { model: typeof model }, eff, CP, dt, opts.connectivity);
  updateFoodSecurity(next as GameState & { model: typeof model }, eff, CP, dt);
  updateRelaxedIndicators(next as GameState & { model: typeof model }, eff, CP, dt, opts.wear?.C ?? 0);

  // 10 (2.0 step 8, last). Sectoral pressures relax exactly toward their anchored logistic targets (phase 42,
  //     src/sim/v2/pressures.ts): they read the B, F, E, W of this step and the c of step 7.5.
  updatePressures(next as GameState & { model: typeof model }, eff, CP, dt, opts.wear);

  // 11. Sync derived indicators from Stella stocks, then clamp every 0-100 indicator (final step, not
  //     per term — docs/audit-equations.md item I-3).
  next.indicators.pbi = stella.PBI_Real;
  next.indicators.debt = stella.Deuda;
  next.indicators.treasuryReserves = stella.Reservas_del_Tesoro;
  next.indicators.ppAgricola = stella.PP_AGRICOLA;
  next.indicators.ppAmbientalista = stella.PP_AMBIENTALISTA;
  next.indicators.ppSocial = stella.PP_SOCIAL;
  (Object.keys(next.indicators) as (keyof Indicators)[]).forEach((key) => {
    if (!['co2EqEmissionsPerCapita', 'pbi', 'treasuryReserves', 'debt', 'generalScore'].includes(key as string)) {
      next.indicators[key] = clamp100(next.indicators[key]) as never;
    }
  });

  // 11.5 Pact and event effects on the indicators this step recomputed (src/sim/deferred.ts). A pact's
  //      effect is a rate per year of membership (× dt); an event's is a one-off shock and lands whole.
  const beforePacts: Indicators = { ...next.indicators };
  applyPactEffectsOnDerived(next.pacts, next.indicators, stella);
  if (!annual) {
    (Object.keys(next.indicators) as (keyof Indicators)[]).forEach((k) => {
      if (isDerivedIndicator(k as string)) next.indicators[k] = toward(beforePacts[k], next.indicators[k], dt) as never;
    });
  }
  applyDeferredAdjustments(next.indicators, deferred);
  if (opts.extraDeferred?.length) applyDeferredAdjustments(next.indicators, opts.extraDeferred);
  // A shock to W or St is a level jump on its stock (phase 39), and so is a shock to a pressure (phase 42, the
  // prototype's `pi_e += 8`): the next step relaxes it away instead of recomputing from a stock that never saw it.
  stella.Conflicto_social = 100 - next.indicators.socialWellbeing;
  stella.Colapso_politico = 100 - next.indicators.politicalStability;
  stella.PP_AGRICOLA = next.indicators.ppAgricola;
  stella.PP_AMBIENTALISTA = next.indicators.ppAmbientalista;
  stella.PP_SOCIAL = next.indicators.ppSocial;

  // 12. Score.
  next.indicators.generalScore = computeScore(next.indicators, currentLevel, CP);

  // 13. Game over. `gameOverReason` stays Spanish-only on purpose (compared as a string in App.tsx and
  //     geminiService.ts; never rendered) — docs/DESIGN_DECISIONS_LOG.md, phase 12.
  const gameOverReason = evaluateGameOver(next);
  if (gameOverReason) next.gameOverReason = gameOverReason;

  // 14. Fatigue warning: a policy lost half of its push (phase 36 §3.2).
  checkEfficiencyWarning(next.policies, language).forEach((warning) => {
    chatMessages.push({ text: warning, emphasisType: 'policy_efficiency_warning' });
    logs.push(warning);
  });

  // Bookkeeping of the 2.0 sub-state (clock; cumulative emissions are added at step 7.5) and the monthly calendar.
  model.t += dt;
  let nextMonth = 0;
  let yearRolled = annual;
  if (!annual) {
    nextMonth = month + 1;
    if (nextMonth >= MONTHS_PER_YEAR) {
      nextMonth = 0;
      next.year++;
      next.yearsSimulatedInCurrentLevel++;
      yearRolled = true;
    }
  }

  const areasAfter = areasOf(next);
  const landUseDelta = {} as Record<LandUseType, number>;
  LAND_USE_TYPES.forEach((k) => { landUseDelta[k] = areasAfter[k] - areasBefore[k]; });

  return {
    next,
    event: rolled.event,
    flows,
    landFlowsRealised: realised,
    eventLandTransfers: rolled.landTransfers,
    upkeep,
    landUseDelta,
    month: nextMonth,
    yearRolled,
    trace: buildTrace(currentYear, before, next.indicators),
    efficiencies: eff,
    logs,
    chatMessages,
  };
}
