/**
 * Random events of model 2.0 (mejora-general/files/46_eventos_y_paso_mensual.md §1–3; prototype `events_step` in
 * scripts/reference/modelo_v2.py). Phase 46 replaced the 1.1 roll (first event whose draw hit won; on level 3 a
 * growing global chance plus a weighted pick) with independent draws:
 *
 *   p_k          annual probability of event k (its `triggerChance` in ALL_RANDOM_EVENTS, evaluated on the live state)
 *   p_k,step     = 1 − (1 − p_k)^(w·dt)       w = 1, or the drought's seasonal weight w_m in Territorio (mean 1)
 *   fires        if rng() < p_k,step          one draw per eligible event and step, in list order (determinism)
 *
 * Several events can fire in the same step; each one reads the state the previous ones left. Effects are level jumps:
 * on a bounded indicator or stock (F, E, B, C, Pc, the pressures) the value jumps and the relaxation of the indicators
 * step dissipates it; on money (GDP, reserves, debt) it is a stock change; land losses go to fallow (phase 37). There
 * are no deferred effects any more (src/sim/deferred.ts was deleted in phase 46): an effect written on a derived
 * indicator (W, St, a pressure, money) is written on the stock it derives from.
 *
 * After the events, the persistent yield shock (AR(1), §3) is drawn with Box–Muller from the same rng.
 * Pure apart from mutating the working state advance() owns; no Math.random.
 */
import type { GameState, Indicators, LandUse, LandUseType, NumericIndicatorKeys, NumericStellaKeys, RandomEvent, RandomEventEffect, StellaStocks } from '../types';
import type { Rng } from './rng';
import type { Language } from '../hooks/useLanguage';
import { getEventName, getEventDescription, getLandUseName } from '../legacyContent/gameData';
import { applyLandEffects, type LandEffect, type TransitionFlow } from './v2/land';
import { PARAMS_V2 } from './v2/params';

const clamp100 = (n: number): number => Math.max(0, Math.min(100, n));

/**
 * Derived indicators and the stock each one is written to (phase 46: an effect on them is a jump of the stock).
 * `invert`: the indicator is 100 − stock (W = 100 − C, St = 100 − Pc).
 */
const STOCK_OF: Partial<Record<keyof Indicators, { stock: NumericStellaKeys; invert?: boolean; bounded: boolean }>> = {
  socialWellbeing: { stock: 'Conflicto_social', invert: true, bounded: true },
  politicalStability: { stock: 'Colapso_politico', invert: true, bounded: true },
  ppAgricola: { stock: 'PP_AGRICOLA', bounded: true },
  ppAmbientalista: { stock: 'PP_AMBIENTALISTA', bounded: true },
  ppSocial: { stock: 'PP_SOCIAL', bounded: true },
  pbi: { stock: 'PBI_Real', bounded: false },
  treasuryReserves: { stock: 'Reservas_del_Tesoro', bounded: false },
  debt: { stock: 'Deuda', bounded: false },
};

/** Indicators that are functions of the state each step (never written by an effect). */
const RECOMPUTED: Set<string> = new Set(['co2EqEmissionsPerCapita', 'generalScore']);

const BOUNDED_STOCKS: Set<string> = new Set(['Colapso_politico', 'Conflicto_social', 'PP_AGRICOLA', 'PP_AMBIENTALISTA', 'PP_SOCIAL']);

/**
 * Applies the effects of a fired event (or of a Territorio situation option) to `indicators` / `stellaState` /
 * `landUses` in place, as level jumps (see the module comment). Returns the land transfers it made (phase 37).
 */
export function applyRandomEventEffects(
  effects: RandomEventEffect[],
  indicators: Indicators,
  stellaState: StellaStocks,
  landUses: Record<LandUseType, LandUse>,
  logs: string[],
  language: Language = 'es',
): TransitionFlow[] {
  // Land effects are transfers (model 2.0, phase 37 §3): ± pairs move area origin → destination, a loose
  // loss goes to fallow and a loose gain comes from fallow, then PRG, then CC. Total area is conserved.
  const landEffects: LandEffect[] = [];
  effects.forEach((eff) => {
    if (eff.landUseChange && landUses[eff.landUseChange.target]) {
      landEffects.push({ target: eff.landUseChange.target, kHa: eff.landUseChange.changeAbsolute_kHa });
    }
  });
  const transfers = landEffects.length ? applyLandEffects(landUses, landEffects) : [];
  transfers.forEach((t) => {
    const fromName = getLandUseName(t.from, language);
    const toName = getLandUseName(t.to, language);
    logs.push(
      language === 'en'
        ? `Event effect: ${t.kHa.toFixed(1)} kHa moved from '${fromName}' to '${toName}'.`
        : `Efecto de evento: ${t.kHa.toFixed(1)} kHa pasaron de '${fromName}' a '${toName}'.`
    );
  });

  const change = (value: number, eff: RandomEventEffect): number => {
    if (eff.changeAbsolute !== undefined) return value + eff.changeAbsolute;
    if (eff.changePercentage !== undefined) return value * (1 + eff.changePercentage);
    return value;
  };
  const warn = (msg: string) => {
    console.warn(msg);
    logs.push(language === 'en' ? `System warning: ${msg}` : `Advertencia del sistema: ${msg}`);
  };

  effects.filter((eff) => !eff.landUseChange).forEach((eff) => {
    if (!eff.indicator) return;
    if (eff.indicator.startsWith('stella.')) {
      const key = eff.indicator.substring('stella.'.length) as NumericStellaKeys;
      const current = stellaState[key];
      if (typeof current !== 'number') {
        warn(language === 'en'
          ? `Attempted to apply a numeric effect to non-numeric property '${eff.indicator}'. Effect skipped.`
          : `Se intentó aplicar un efecto numérico a la propiedad no numérica '${eff.indicator}'. Efecto omitido.`);
        return;
      }
      const v = change(current, eff);
      stellaState[key] = BOUNDED_STOCKS.has(key) ? clamp100(v) : v;
      return;
    }
    const key = eff.indicator as keyof Indicators;
    const current = indicators[key];
    if (typeof current !== 'number' || RECOMPUTED.has(key)) {
      warn(language === 'en'
        ? `Effect on '${eff.indicator}' skipped: it is recomputed from the state every step.`
        : `Efecto sobre '${eff.indicator}' omitido: se recalcula a partir del estado en cada paso.`);
      return;
    }
    const stock = STOCK_OF[key];
    if (stock) {
      // A derived indicator: the effect is a jump of the stock it derives from (it relaxes from there).
      const v = change(current, eff);
      const indicatorValue = stock.bounded ? clamp100(v) : v;
      stellaState[stock.stock] = stock.invert ? 100 - indicatorValue : indicatorValue;
      return;
    }
    // B, F, E: a level jump on the indicator itself.
    indicators[key as NumericIndicatorKeys] = clamp100(change(current, eff)) as never;
  });

  // Re-sync the derived indicators from their stocks.
  indicators.socialWellbeing = clamp100(100 - stellaState.Conflicto_social);
  indicators.politicalStability = clamp100(100 - stellaState.Colapso_politico);
  indicators.pbi = stellaState.PBI_Real;
  indicators.treasuryReserves = stellaState.Reservas_del_Tesoro;
  indicators.debt = stellaState.Deuda;
  indicators.ppAgricola = stellaState.PP_AGRICOLA;
  indicators.ppAmbientalista = stellaState.PP_AMBIENTALISTA;
  indicators.ppSocial = stellaState.PP_SOCIAL;
  return transfers;
}

/**
 * Probability that an event of annual probability `annual` fires in a step of `dt` years with hazard weight `weight`:
 * 1 − (1 − p)^(weight·dt). Twelve monthly steps with weights of mean 1 keep the annual probability exactly.
 */
export function eventStepChance(annual: number, dt: number, weight = 1): number {
  const p = Math.max(0, Math.min(1, Number.isFinite(annual) ? annual : 0));
  if (p >= 1) return 1;
  return 1 - Math.pow(1 - p, Math.max(0, weight) * dt);
}

/** Seasonal hazard weight of an event in month `month` (0 = January): only the drought, only when asked (Territorio). */
export function seasonalWeight(eventId: string, month: number, seasonal: boolean): number {
  if (!seasonal || eventId !== 'drought_severe') return 1;
  const w = PARAMS_V2.events.droughtSeasonality;
  return w[((Math.floor(month) % 12) + 12) % 12];
}

export interface EventRollOptions {
  dt: number;
  /** Month (0-11) of `state.year` simulated (log stamp and seasonality). */
  month: number;
  /** Seasonal weights of the drought (Territorio). */
  seasonal?: boolean;
  language?: Language;
  /** 3-level game: log "Year Y" (the 1.1 convention, year being simulated + 1) instead of the month stamp. */
  yearLabel?: number;
}

export interface EventRollResult {
  /** Events that fired this step, in list order (their effects are already applied). */
  fired: RandomEvent[];
  logs: string[];
  /** One chat line per fired event. */
  chatMessages: string[];
  /** Land transfers the events made (losses go to fallow). */
  landTransfers: TransitionFlow[];
}

/**
 * Independent Bernoulli draw of every eligible event (minimum level met), in list order, one rng() each; a fired event
 * applies its effects at once, and the next event's probability reads the state it left. Mutates `state`.
 */
export function rollEvents(state: GameState, events: RandomEvent[], rng: Rng, opts: EventRollOptions): EventRollResult {
  const language = opts.language ?? 'es';
  const out: EventRollResult = { fired: [], logs: [], chatMessages: [], landTransfers: [] };
  for (const event of events) {
    if (event.minLevel && state.currentLevel < event.minLevel) continue;
    const chance = eventStepChance(event.triggerChance(state), opts.dt, seasonalWeight(event.id, opts.month, !!opts.seasonal));
    if (!(rng() < chance)) continue;
    const name = getEventName(event.id, language);
    const description = getEventDescription(event.id, language, event.description);
    const stamp = opts.yearLabel !== undefined
      ? (language === 'en' ? `Year ${opts.yearLabel}` : `Año ${opts.yearLabel}`)
      : `${String(Math.floor(opts.month) + 1).padStart(2, '0')}/${state.year}`;
    out.logs.push(language === 'en' ? `EVENT (${stamp}): ${name} - ${description}` : `EVENTO (${stamp}): ${name} - ${description}`);
    out.chatMessages.push(`${name}: ${description}`);
    out.fired.push(event);
    out.landTransfers.push(...applyRandomEventEffects(
      event.effects(state), state.indicators, state.stellaSpecificState, state.landUses, out.logs, language,
    ));
  }
  return out;
}

/**
 * Standard normal from two uniform draws (Box–Muller, sine branch): √(−2·ln u1)·sin(2π·u2). u1 is floored at 1e-12 (ln
 * stays finite). The sine branch makes the constant test draws neutral: rng = 0 gives z = 0 and the no-event draw 0.999
 * gives z ≈ −3e-4 (spec 46 §3: "almost 0"), so `() => 0.999` adds no systematic yield bias.
 */
export function standardNormal(rng: Rng): number {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
}

/**
 * One step of the persistent yield shock (§3): ε ← persistence^dt·ε + σ·√dt·z, σ = sigma·(1 − waterDamping·η_AGUA).
 * `z` is a standard normal (0 with no shocks).
 */
export function nextYieldShock(prev: number, dt: number, etaWater: number, z: number): number {
  const y = PARAMS_V2.events.yieldShock;
  const sd = y.sigma * (1 - y.waterDamping * Math.max(0, Math.min(1, etaWater)));
  return Math.pow(y.persistence, dt) * (Number.isFinite(prev) ? prev : 0) + sd * Math.sqrt(dt) * z;
}
