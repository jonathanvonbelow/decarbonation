/**
 * Random event rolling and effect application. Ported verbatim from src/App.tsx
 * (`runSimulationRound`, the level<3 / level-3 event-roll branches and
 * `processRandomEventEffects`) as part of the phase-2 extraction
 * (mejora-general/files/16_auditoria_ecuaciones.md). No formula or probability changed —
 * the only change is that every `Math.random()` call takes its draw from an injected `Rng`
 * instead, so a whole year is reproducible from `(seed, year)` (see rng.ts).
 */
import { YEARS_PER_LEVEL } from '../constants';
import type { GameState, Indicators, LandUse, LandUseType, NumericIndicatorKeys, NumericStellaKeys, RandomEvent, RandomEventEffect, StellaStocks } from '../types';
import type { Rng } from './rng';

export interface EventRollResult {
  event: RandomEvent | null;
  /** Log lines to append, in order, already formatted like the original narrative log. */
  logs: string[];
  /** Chat message to surface (level-3 "unexpected event" banner), if any. */
  chatMessage: string | null;
}

/**
 * Applies the effects of a triggered event to `indicators`/`stellaState`/`landUses` in place
 * (same mutation style as the original `processRandomEventEffects`), including the derived
 * re-sync of socialWellbeing/politicalStability/pbi/etc. when the underlying Stella stock moved.
 */
export function applyRandomEventEffects(
  effects: RandomEventEffect[],
  indicators: Indicators,
  stellaState: StellaStocks,
  landUses: Record<LandUseType, LandUse>,
  logs: string[],
): void {
  effects.forEach((eff) => {
    if (eff.landUseChange) {
      const { target, changeAbsolute_kHa } = eff.landUseChange;
      if (landUses[target]) {
        const originalArea = landUses[target].area;
        landUses[target].area = Math.max(0, originalArea + changeAbsolute_kHa);
        logs.push(`Efecto de evento: Área de '${landUses[target].name}' cambió en ${changeAbsolute_kHa.toFixed(1)} kHa.`);
      }
    } else if (eff.indicator) {
      let currentValue: number | boolean;
      let targetObject: any;
      let targetKey: string | number | symbol;

      if (eff.indicator.startsWith('stella.')) {
        targetKey = eff.indicator.substring('stella.'.length) as NumericStellaKeys;
        targetObject = stellaState;
        currentValue = stellaState[targetKey];
      } else {
        targetKey = eff.indicator as keyof Indicators;
        targetObject = indicators;
        currentValue = indicators[targetKey as keyof Indicators];
      }

      if (typeof currentValue !== 'number') {
        const warningMsg = `Se intentó aplicar un efecto numérico a la propiedad no numérica '${eff.indicator}'. Efecto omitido.`;
        console.warn(warningMsg);
        logs.push(`Advertencia del sistema: ${warningMsg}`);
        return;
      }

      let newValue: number = currentValue;
      if (eff.changeAbsolute !== undefined) {
        newValue = currentValue + eff.changeAbsolute;
      } else if (eff.changePercentage !== undefined) {
        newValue = currentValue * (1 + eff.changePercentage);
      }

      if (
        targetObject === indicators &&
        !['co2EqEmissionsPerCapita', 'pbi', 'treasuryReserves', 'debt', 'generalScore', 'ppAgricola', 'ppAmbientalista', 'ppSocial'].includes(
          targetKey as string,
        )
      ) {
        newValue = Math.max(0, Math.min(100, newValue));
      } else if (targetKey === 'Colapso_politico' || targetKey === 'Conflicto_social' || targetKey === 'PP_AGRICOLA' || targetKey === 'PP_AMBIENTALISTA' || targetKey === 'PP_SOCIAL') {
        newValue = Math.max(0, Math.min(100, newValue));
      }

      if (eff.indicator.startsWith('stella.')) {
        (targetObject as StellaStocks)[targetKey as NumericStellaKeys] = newValue;
      } else {
        (targetObject as Indicators)[targetKey as NumericIndicatorKeys] = newValue;
      }
    }
  });

  if (effects.some((e) => e.indicator === 'stella.Conflicto_social')) indicators.socialWellbeing = Math.max(0, Math.min(100, 100 - stellaState.Conflicto_social));
  if (effects.some((e) => e.indicator === 'stella.Colapso_politico')) indicators.politicalStability = Math.max(0, Math.min(100, 100 - stellaState.Colapso_politico));
  if (effects.some((e) => e.indicator === 'stella.PBI_Real')) indicators.pbi = stellaState.PBI_Real;
  if (effects.some((e) => e.indicator === 'stella.Reservas_del_Tesoro')) indicators.treasuryReserves = stellaState.Reservas_del_Tesoro;
  if (effects.some((e) => e.indicator === 'stella.Deuda')) indicators.debt = stellaState.Deuda;
  if (effects.some((e) => e.indicator === 'stella.PP_AGRICOLA')) indicators.ppAgricola = stellaState.PP_AGRICOLA;
  if (effects.some((e) => e.indicator === 'stella.PP_AMBIENTALISTA')) indicators.ppAmbientalista = stellaState.PP_AMBIENTALISTA;
  if (effects.some((e) => e.indicator === 'stella.PP_SOCIAL')) indicators.ppSocial = stellaState.PP_SOCIAL;
}

/**
 * Rolls this year's random event (if any) and applies its effects in place. `workingState`
 * must be a state object shaped like `GameState` with the current year's `indicators`,
 * `stellaSpecificState` and `landUses` already reflecting everything computed so far this year
 * — event predicates (`triggerChance`/`effects`) read the live state, exactly like the original.
 */
export function rollEvent(
  workingState: GameState,
  allEvents: RandomEvent[],
  yearsElapsedInCurrentLevel: number,
  rng: Rng,
): EventRollResult {
  const logs: string[] = [];
  let chatMessage: string | null = null;
  const currentLevel = workingState.currentLevel;

  if (currentLevel < 3) {
    for (const event of allEvents) {
      if (event.minLevel && currentLevel < event.minLevel) continue;
      const triggerRoll = rng();
      if (triggerRoll < event.triggerChance(workingState)) {
        logs.push(`EVENTO (Año ${workingState.year}): ${event.name} - ${event.description}`);
        const effects = event.effects(workingState);
        applyRandomEventEffects(effects, workingState.indicators, workingState.stellaSpecificState, workingState.landUses, logs);
        return { event, logs, chatMessage };
      }
    }
    return { event: null, logs, chatMessage };
  }

  // Level 3: dynamic, weighted event roll.
  let eventTriggerProbability = 0.05;
  const timeStressFactor = (yearsElapsedInCurrentLevel / YEARS_PER_LEVEL) * 0.15;
  eventTriggerProbability += timeStressFactor;
  if (workingState.indicators.socialWellbeing < 50) eventTriggerProbability += 0.1;
  if (workingState.indicators.politicalStability < 50) eventTriggerProbability += 0.1;
  const avgPressure = (workingState.indicators.ppAgricola + workingState.indicators.ppAmbientalista + workingState.indicators.ppSocial) / 3;
  if (avgPressure > 65) eventTriggerProbability += 0.12;
  const finalEventChance = Math.min(0.6, eventTriggerProbability);

  if (rng() >= finalEventChance) {
    return { event: null, logs, chatMessage };
  }

  const eligibleEvents = allEvents.filter((e) => e.minLevel === undefined || e.minLevel <= currentLevel);
  if (eligibleEvents.length === 0) return { event: null, logs, chatMessage };

  const totalWeight = eligibleEvents.reduce((sum, event) => sum + event.triggerChance(workingState), 0);
  if (totalWeight <= 0) {
    logs.push('Nivel 3: Intento de evento dinámico fallido. Ningún evento elegible tenía >0 peso de activación.');
    return { event: null, logs, chatMessage };
  }

  let randomNum = rng() * totalWeight;
  let chosenEvent: RandomEvent | null = null;
  for (const event of eligibleEvents) {
    const eventWeight = event.triggerChance(workingState);
    if (randomNum < eventWeight) {
      chosenEvent = event;
      break;
    }
    randomNum -= eventWeight;
  }
  if (!chosenEvent) {
    chosenEvent = eligibleEvents.find((e) => e.triggerChance(workingState) > 0) || eligibleEvents[0];
  }

  logs.push(`EVENTO (N3-Dinámico, Año ${workingState.year}): ${chosenEvent.name} - ${chosenEvent.description}`);
  chatMessage = `¡Evento Inesperado! ${chosenEvent.name}: ${chosenEvent.description}`;
  const effects = chosenEvent.effects(workingState);
  applyRandomEventEffects(effects, workingState.indicators, workingState.stellaSpecificState, workingState.landUses, logs);

  return { event: chosenEvent, logs, chatMessage };
}
