/**
 * Single integrator of both games (mejora-general/files/35_motor_v2_estructura.md §1, §7).
 *
 * `advance(state, dt, rng, CP, opts)` is one step of model 2.0 for any dt in (0, 1]. Since phase 46 both games run
 * the same discretisation: `stepMonth` (Territorio, src/sim/monthly.ts) is `advance(…, dt = 1/12)` and `stepYear`
 * (3-level game, src/sim/index.ts) is `advanceYear` = 12 × the same monthly step (one clone of the state, then 12
 * in-place sub-steps, `stepInPlace`). One annual step of dt = 1 evaluated the drivers (policy ramp, the pressures read
 * by C and Pc) once a year and stayed up to 2 points away from the monthly engine (criterion C9); the prototype makes
 * the same choice (`play_level`, SUBSTEPS_PER_YEAR) and the golden was regenerated (docs/DESIGN_DECISIONS_LOG.md).
 * `advance(state, 1, …)` still works (one step of a year), but no game uses it.
 *
 * History: phase 35 moved the 1.1 bodies here; 36 replaced the policy clocks and efficiency per channel
 * (src/sim/v2/policies.ts), 37 land use (land.ts), 38 carbon in physical units (carbon.ts) and exact population
 * growth, 39 E / C (W) / Pc (St) by relaxation (indicators.ts), 40 B (biodiversity.ts), 41 F (food.ts), 42 the
 * pressures (pressures.ts), 43 pacts as data (pacts.ts), 44 public finance (finance.ts), 45 the distributive conflict
 * (social.ts), 46 random events 2.0 (independent draws, level shocks, yield shock; src/sim/events.ts) and the exact
 * monthly step. See src/sim/v2/README.md.
 *
 * Order of model 2.0 (each step reads what the previous ones already updated; prototype `step()`):
 *  1. population            P *= (1 + g_P)^dt
 *  2. policy clocks         rampTime/fatigueTime (36)
 *  3. random events         independent draws, level shocks, land -> fallow; then the AR(1) yield shock (46)
 *  4. effective efficiency  per policy and channel (36)
 *  5. land                  conservative transition matrix, realised flows in ha (37)
 *  6. economy               GDP, revenue, base spending, policies, pacts, debt (44)
 *  7. carbon                energy, AFOLU flux, LUC from realised flows (38)
 *  8. indicators            B -> F -> E -> C (W) -> Pc (St) -> pressures (39-42, 45)
 *  9. bookkeeping           sync + clamp, score, game over, fatigue warning, clock, calendar
 *
 * Every relaxation uses `relax(…, dt)` (exact) and every flow is × dt; there are no dt branches left: the calendar
 * advances `opts.month` by 12·dt months and rolls the year after December, for every dt.
 *
 * Pure: `advance` / `advanceYear` never mutate their input; deterministic for a given (state, dt, rng, CP, opts).
 * Nothing here imports React or uses Math.random / Date.now.
 */
import { ALL_RANDOM_EVENTS, INITIAL_LAND_USES } from '../../constants';
import type { ControlParams, GameState, Indicators, PolicyState, RandomEvent, StellaStocks } from '../../types';
import { LandUseType, Policy } from '../../types';
import type { Language } from '../../hooks/useLanguage';
import { getPolicyName } from '../../legacyContent/gameData';
import { updateEnergyState, computeEmissions } from './carbon';
import { createModelState } from './anchors';
import { loanLog, stepFinance } from './finance';
import { pactLandFactors } from './pacts';
import { nextYieldShock, rollEvents, standardNormal } from '../events';
import { evaluateGameOver } from '../gameOver';
import { updateBiodiversity, type Connectivity } from './biodiversity';
import { updateFoodSecurity } from './food';
import { updateRelaxedIndicators } from './indicators';
import {
  applyLandFlows, LAND_USE_TYPES, landFlows, type LandUseChangeFactors, type RealisedLandFlow,
  type TransitionFlow,
} from './land';
import { checkEfficiencyWarning } from '../policies';
import { updatePressures } from './pressures';
import { computeEfficiencies, prodEfficiency, tickPolicyClocks, type PolicyEfficiency } from './policies';
import type { Pid } from './params';
import type { Rng } from '../rng';
import { computeScore } from '../score';
import { toMapFlow, type LandFlow } from '../territory';
import { buildTrace, type SimTrace } from '../trace';

export const MONTHS_PER_YEAR = 12;
/** dt of the monthly step (both games since phase 46). */
export const MONTHLY_DT = 1 / MONTHS_PER_YEAR;

/** Starting population of model 1.0/1.1 (before phase 38), only to re-anchor an old saved state. */
const LEGACY_POPULATION = 10_000_000;

const clamp100 = (n: number): number => Math.max(0, Math.min(100, n));

export interface StepYearChatMessage {
  text: string;
  /** Matches the two emphasisType values the original `runSimulationRound` used for these. */
  emphasisType: 'game_event' | 'policy_efficiency_warning';
}

export interface AdvanceOptions {
  /** Language of logs and chat messages. Default 'es'. */
  language?: Language;
  /** Month (0 = January) of `state.year` being simulated; default 0. */
  month?: number;
  /** Event pool. Default: the model's `ALL_RANDOM_EVENTS`. */
  events?: RandomEvent[];
  /**
   * Charges the yearly upkeep of the land under public use (protected forest the player declared,
   * wetland, restoration, energy park) to the treasury, × dt, and keeps the declared protected area
   * (restoration that matures into protected forest stays public). Territorio only: off by default.
   */
  publicUseUpkeep?: boolean;
  /**
   * Landscape connectivity read from the Territorio map (phase 40 §3): K = share of the forest (BNNP + BNP + RES)
   * in the largest 4-connected patch, now and at the start of the game. Enters D_B as γ_K·ln(K/K0); absent (the
   * 3-level game, which has no map) the term is 0.
   */
  connectivity?: Connectivity;
  /**
   * Wear of the Territorio situations still open (phase 42): logit shifts of the targets of conflict (C) and of the
   * three pressures (a / e / s) this step; Pc: the neglect of the desk, situations that expired unanswered (phase 47).
   * Absent (the 3-level game), every shift is 0.
   */
  wear?: { C?: number; a?: number; e?: number; s?: number; Pc?: number };
  /** Seasonal weights w_m of the drought hazard (phase 46 §4). Territorio only. */
  seasonality?: boolean;
  /** Holds the yield shock ε at 0 (phase 46 §3; the golden test). Without an rng there are no shocks either. */
  noShocks?: boolean;
  /**
   * Year printed in the event logs as "Year Y" instead of the month stamp: `advanceYear` passes year + 1, the 1.1
   * convention of the 3-level game (the activation log and the trace use it too).
   */
  logYear?: number;
}

export interface AdvanceResult {
  next: GameState;
  /** First random event that fired this step, if any (its effects are already applied). */
  event: RandomEvent | null;
  /** Every random event that fired this step, in list order (phase 46: independent draws). */
  events: RandomEvent[];
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
  /** Month (0-11) of `next.year` the next call simulates. */
  month: number;
  /** True when this step advanced `next.year` (the December monthly step; every annual step). */
  yearRolled: boolean;
  trace: SimTrace;
  /** Effective efficiency per policy and channel this step (phase 36), for the trace and later phases. */
  efficiencies: Record<Pid, PolicyEfficiency>;
  /** Narrative log lines produced this step, oldest first. */
  logs: string[];
  /** Chat-worthy messages (event banners, efficiency warnings), oldest first. */
  chatMessages: StepYearChatMessage[];
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

const clone = (state: GameState): GameState => JSON.parse(JSON.stringify(state));

function checkDt(dt: number): void {
  if (!(dt > 0 && dt <= 1)) throw new RangeError(`advance: dt must be in (0, 1], got ${dt}`);
}

/**
 * Records the activation year of policies switched on since the last step and logs it. `annual`: the 3-level wording
 * ("activated and confirmed for year Y", Y = the year being simulated + 1, the 1.1 convention the lock-in of App.tsx
 * reads); otherwise Territorio's ("in force from Y"). Mutates `policies`.
 */
function confirmActivations(next: GameState, year: number, language: Language, annual: boolean, logs: string[]): void {
  (Object.values(next.policies) as PolicyState[]).forEach((p) => {
    if (!p.isActive || p.activationYear !== undefined) return;
    p.activationYear = year;
    const policyName = getPolicyName(p.id, language);
    if (annual) {
      logs.push(language === 'en'
        ? `Policy '${policyName}' activated and confirmed for year ${year}.`
        : `Política '${policyName}' activada y confirmada para el año ${year}.`);
    } else {
      logs.push(language === 'en' ? `Policy '${policyName}' in force from ${year}.` : `Política '${policyName}' vigente desde ${year}.`);
    }
  });
}

/**
 * One step of the model. dt = 1/12 in both games (Territorio: `stepMonth`; 3-level game: 12 of these per `stepYear`).
 * Pure: never mutates its input; deterministic for a given (state, dt, rng, CP, opts).
 * `rng = null` runs without events and without yield shocks.
 */
export function advance(state: GameState, dt: number, rng: Rng | null, CP: ControlParams, opts: AdvanceOptions = {}): AdvanceResult {
  checkDt(dt);
  return stepInPlace(clone(state), dt, rng, CP, opts);
}

/**
 * One simulated year of the 3-level game: the activation log with the annual wording, then 12 monthly sub-steps
 * (months 0–11 of `state.year`, the same `rng` drawn in sequence) on one copy of the state. Stops early on game over.
 * Logs, chat messages, flows and upkeep are the concatenation / sum of the sub-steps; the trace compares the start and
 * the end of the year. `next.currentEvent` is the last event of the year. Pure.
 */
export function advanceYear(state: GameState, rng: Rng | null, CP: ControlParams, opts: Omit<AdvanceOptions, 'month'> = {}): AdvanceResult {
  const language = opts.language ?? 'es';
  const next = clone(state);
  const before: Indicators = { ...next.indicators };
  const areasBefore = areasOf(next);
  const logs: string[] = [];
  confirmActivations(next, next.year + 1, language, true, logs);
  const chatMessages: StepYearChatMessage[] = [];
  const flows: LandFlow[] = [];
  const landFlowsRealised: RealisedLandFlow[] = [];
  const eventLandTransfers: TransitionFlow[] = [];
  const events: RandomEvent[] = [];
  let upkeep = 0;
  let last: AdvanceResult | null = null;
  const logYear = next.year + 1;
  for (let m = 0; m < MONTHS_PER_YEAR; m++) {
    last = stepInPlace(next, MONTHLY_DT, rng, CP, { ...opts, month: m, logYear });
    logs.push(...last.logs);
    chatMessages.push(...last.chatMessages);
    flows.push(...last.flows);
    landFlowsRealised.push(...last.landFlowsRealised);
    eventLandTransfers.push(...last.eventLandTransfers);
    events.push(...last.events);
    upkeep += last.upkeep;
    if (next.gameOverReason) {
      // A game over mid-year stops the year (as the prototype's play_level), but the round still counts as a year for
      // the calendar of the 3-level game (App.tsx scores predictions and adds the chart point when next.year moves).
      if (!last.yearRolled) {
        next.year++;
        next.yearsSimulatedInCurrentLevel++;
      }
      break;
    }
  }
  next.currentEvent = events.length ? events[events.length - 1] : null;
  const areasAfter = areasOf(next);
  const landUseDelta = {} as Record<LandUseType, number>;
  LAND_USE_TYPES.forEach((k) => { landUseDelta[k] = areasAfter[k] - areasBefore[k]; });
  return {
    next,
    event: events[0] ?? null,
    events,
    flows,
    landFlowsRealised,
    eventLandTransfers,
    upkeep,
    landUseDelta,
    month: 0,
    yearRolled: true,
    trace: buildTrace(next.year, before, next.indicators),
    efficiencies: last!.efficiencies,
    logs,
    chatMessages,
  };
}

/** The body of `advance`, on a state the caller owns (mutated in place; `next` of the result is that same object). */
export function stepInPlace(next: GameState, dt: number, rng: Rng | null, CP: ControlParams, opts: AdvanceOptions = {}): AdvanceResult {
  checkDt(dt);
  const language = opts.language ?? 'es';
  const month = opts.month ?? 0;

  // A state built before phase 37 has no fallow entry: it starts at 0 kHa (the area is unchanged).
  if (!next.landUses[LandUseType.Fallow]) next.landUses[LandUseType.Fallow] = { ...INITIAL_LAND_USES[LandUseType.Fallow] };

  const logs: string[] = [];
  const chatMessages: StepYearChatMessage[] = [];
  const before: Indicators = { ...next.indicators };
  const areasBefore = areasOf(next);

  // Calendar: this step simulates month `month` of next.year; the year rolls after December (below).
  const currentYear = next.year;
  const currentLevel = next.currentLevel;

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

  // 1. Population growth, compounded exactly: P *= (1 + g)^dt (phase 38; 1.1 used 1 + g·dt).
  next.stellaSpecificState.Poblacion_Total *= Math.pow(1 + CP.Tasa_Crecimiento_Poblacional_Base, dt);

  // Activation year of the policies switched on since the last step (bookkeeping; advanceYear logs it first).
  confirmActivations(next, currentYear, language, false, logs);

  // 2. Policy clocks: ramp and fatigue run while active; at rest the ramp resets and the fatigue recovers
  //    (phase 36, src/sim/v2/policies.ts). Before the events, as in the prototype.
  tickPolicyClocks(next.policies, dt, CP);

  // 3. Random events (phase 46, src/sim/events.ts): one independent draw per eligible event, p_step = 1 − (1 − p)^(w·dt),
  //    effects as level jumps before the efficiencies, land, money and indicators of this step (the relaxation of step 8
  //    starts from the shocked value), land losses to fallow. Then the persistent yield shock ε (AR(1), Box–Muller from
  //    the same rng), damped by the water policy's η^prod of the previous step (the prototype draws it here, before
  //    compute_eta, with its generic η_AGUA; docs/v6-spec-vs-motor.md).
  next.currentEvent = null;
  const rolled = rng
    ? rollEvents(next, opts.events ?? ALL_RANDOM_EVENTS, rng, { dt, month, seasonal: opts.seasonality, language, yearLabel: opts.logYear })
    : { fired: [] as RandomEvent[], logs: [] as string[], chatMessages: [] as string[], landTransfers: [] as TransitionFlow[] };
  logs.push(...rolled.logs);
  rolled.chatMessages.forEach((text) => chatMessages.push({ text, emphasisType: 'game_event' }));
  if (rolled.fired.length) next.currentEvent = rolled.fired[0];
  const flows: LandFlow[] = rolled.landTransfers.map(toMapFlow);
  if (!rng || opts.noShocks) {
    model.yieldShock = 0;
  } else {
    const water = next.policies[Policy.SustainableWaterManagement];
    const etaWater = water && water.isActive ? prodEfficiency(water, water.currentEfficiency ?? 0) : 0;
    model.yieldShock = nextYieldShock(model.yieldShock ?? 0, dt, etaWater, standardNormal(rng));
  }

  // 4. Effective efficiency per policy and channel (phase 36): stores the base η in `currentEfficiency`.
  const eff: Record<Pid, PolicyEfficiency> = computeEfficiencies(next.policies, currentLevel, CP);
  const stella: StellaStocks = next.stellaSpecificState;

  // Pacts (phase 43): data, not functions. While active they shift the targets of B, E and Pc (step 8), the energy
  // targets (step 7) and the frontier flows of the land matrix (here: protectFactor / deforestFactor).
  const landUseChangeFactors: LandUseChangeFactors = pactLandFactors(next.pacts);

  // 5. Land use: the conservative transition matrix of model 2.0 (phase 37, src/sim/v2/land.ts): frontier flows
  //    (η^land), fallow regrowth, agricultural pool by anchored rents (η^prod), netted, applied exactly with dt and
  //    scaled so no use goes below zero. Σ A is conserved.
  const realised: RealisedLandFlow[] = applyLandFlows(next.landUses, landFlows(next, eff, CP, landUseChangeFactors), dt);
  realised.forEach((f) => { if (f.kHa > 0) flows.push(toMapFlow(f)); });
  // Public restoration that matures into protected forest stays public (model 1.1, phase 34, T-07), kept within the
  // protected forest that exists. Territorio only (the only game with declared land; `publicUseUpkeep` marks it).
  if (opts.publicUseUpkeep) {
    const resToBnp = realised.find((f) => f.from === LandUseType.RestorationForest && f.to === LandUseType.ProtectedNativeForest)?.kHa ?? 0;
    if (resToBnp > 0) next.declaredProtectedArea = (next.declaredProtectedArea ?? 0) + resToBnp;
    if (next.declaredProtectedArea !== undefined) {
      next.declaredProtectedArea = Math.min(next.declaredProtectedArea, next.landUses[LandUseType.ProtectedNativeForest].area);
    }
  }

  // 6. Public finances (phase 44, src/sim/v2/finance.ts): growth with the fiscal stress of the previous step, revenue,
  //    base public spending γ_N·Y', policy costs (on the GDP before growth, as the prototype) + pact fees (on Y') +
  //    upkeep of the public uses (Territorio: only the forest the state declared, T-07, plus wetland, restoration and
  //    energy parks), interest with risk premium, amortisation, the voluntary loan, and the reserve floor 0.02·Y'
  //    financed with automatic debt.
  let upkeep = 0;
  let annualUpkeep = 0;
  if (opts.publicUseUpkeep) {
    const publicArea = declaredProtectedOf(next)
      + next.landUses[LandUseType.PublicWetland].area
      + next.landUses[LandUseType.RestorationForest].area
      + next.landUses[LandUseType.EnergyPark].area;
    annualUpkeep = publicArea * CP.Costo_Mantenimiento_Uso_Publico_por_kHa_Anual;
    upkeep = annualUpkeep * dt;
  }
  const fin = stepFinance(next as GameState & { model: typeof model }, eff, dt, CP, annualUpkeep);
  if (fin.loan > 0) logs.push(loanLog(fin.loan, language));

  // 7. Carbon in physical units (phase 38, src/sim/v2/carbon.ts): renewables and efficiency move toward their targets
  //    with inertia, then energy + AFOLU flux + LUC from this step's realised flows (÷ dt, an annual rate).
  model.energy = updateEnergyState(model.energy, next.landUses, eff, next.pacts, dt);
  const carbon = computeEmissions(
    { level: currentLevel, landUses: next.landUses, population: stella.Poblacion_Total, gdp: stella.PBI_Real, anchors: model.anchors, energy: model.energy },
    eff, realised, dt,
  );
  model.emissions = { energy: carbon.energy, afolu: carbon.afolu, luc: carbon.luc, total: carbon.total };
  model.cumulativeEmissions += carbon.total * dt;
  next.indicators.co2EqEmissionsPerCapita = carbon.perCapita;

  // 8. Indicators B -> F -> E -> C (W) -> Pc (St) -> pressures, each reading the ones already updated this step, each
  //    relaxing exactly toward its anchored target (phases 39–42, 45).
  updateBiodiversity(next as GameState & { model: typeof model }, eff, CP, dt, opts.connectivity);
  updateFoodSecurity(next as GameState & { model: typeof model }, eff, CP, dt);
  updateRelaxedIndicators(next as GameState & { model: typeof model }, eff, CP, dt, opts.wear?.C ?? 0, opts.wear?.Pc ?? 0);
  updatePressures(next as GameState & { model: typeof model }, eff, CP, dt, opts.wear);

  // 9. Sync derived indicators from Stella stocks, then clamp every 0-100 indicator (final step, not per term —
  //    docs/audit-equations.md item I-3).
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

  // Score.
  next.indicators.generalScore = computeScore(next.indicators, currentLevel, CP);

  // Game over. `gameOverReason` stays Spanish-only on purpose (compared as a string in App.tsx and
  // geminiService.ts; never rendered) — docs/DESIGN_DECISIONS_LOG.md, phase 12.
  const gameOverReason = evaluateGameOver(next);
  if (gameOverReason) next.gameOverReason = gameOverReason;

  // Fatigue warning: a policy lost half of its push (phase 36 §3.2).
  checkEfficiencyWarning(next.policies, language).forEach((warning) => {
    chatMessages.push({ text: warning, emphasisType: 'policy_efficiency_warning' });
    logs.push(warning);
  });

  // Clock of the 2.0 sub-state (cumulative emissions are added at step 7) and calendar: 12·dt months, the year rolls
  // after December (one rule for every dt; rounded so 12 steps of 1/12 land exactly on the next January).
  model.t += dt;
  let nextMonth = Math.round((month + dt * MONTHS_PER_YEAR) * 1e9) / 1e9;
  let yearRolled = false;
  while (nextMonth >= MONTHS_PER_YEAR) {
    nextMonth -= MONTHS_PER_YEAR;
    next.year++;
    next.yearsSimulatedInCurrentLevel++;
    yearRolled = true;
  }

  const areasAfter = areasOf(next);
  const landUseDelta = {} as Record<LandUseType, number>;
  LAND_USE_TYPES.forEach((k) => { landUseDelta[k] = areasAfter[k] - areasBefore[k]; });

  return {
    next,
    event: rolled.fired[0] ?? null,
    events: rolled.fired,
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
