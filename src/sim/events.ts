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
import type { Language } from '../hooks/useLanguage';
import { getEventName, getEventDescription, getLandUseName } from '../legacyContent/gameData';

// Phase 12 (12_i18n_completo.md, Capa B/C): `event.name`/`event.description` on the RandomEvent
// objects themselves (constants.ts's ALL_RANDOM_EVENTS) are Spanish-only source content, same
// "domain content indexed by ID" pattern as policies/land uses -- read through
// getEventName/getEventDescription (legacyContent/gameData.ts) instead of raw, so the narrative
// log and the level-3 event banner say the right thing in the player's chosen language.
const eventLabel = (event: RandomEvent, language: Language): { name: string; description: string } => ({
  name: getEventName(event.id, language),
  description: getEventDescription(event.id, language, event.description),
});

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
  language: Language = 'es',
): void {
  effects.forEach((eff) => {
    if (eff.landUseChange) {
      const { target, changeAbsolute_kHa } = eff.landUseChange;
      if (landUses[target]) {
        const originalArea = landUses[target].area;
        landUses[target].area = Math.max(0, originalArea + changeAbsolute_kHa);
        const landUseName = getLandUseName(target, language);
        logs.push(
          language === 'en'
            ? `Event effect: '${landUseName}' area changed by ${changeAbsolute_kHa.toFixed(1)} kHa.`
            : `Efecto de evento: Área de '${landUseName}' cambió en ${changeAbsolute_kHa.toFixed(1)} kHa.`
        );
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
        const warningMsg = language === 'en'
          ? `Attempted to apply a numeric effect to non-numeric property '${eff.indicator}'. Effect skipped.`
          : `Se intentó aplicar un efecto numérico a la propiedad no numérica '${eff.indicator}'. Efecto omitido.`;
        console.warn(warningMsg);
        logs.push(language === 'en' ? `System warning: ${warningMsg}` : `Advertencia del sistema: ${warningMsg}`);
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
  language: Language = 'es',
): EventRollResult {
  const logs: string[] = [];
  let chatMessage: string | null = null;
  const currentLevel = workingState.currentLevel;

  if (currentLevel < 3) {
    for (const event of allEvents) {
      if (event.minLevel && currentLevel < event.minLevel) continue;
      const triggerRoll = rng();
      if (triggerRoll < event.triggerChance(workingState)) {
        const { name, description } = eventLabel(event, language);
        logs.push(language === 'en' ? `EVENT (Year ${workingState.year}): ${name} - ${description}` : `EVENTO (Año ${workingState.year}): ${name} - ${description}`);
        const effects = event.effects(workingState);
        applyRandomEventEffects(effects, workingState.indicators, workingState.stellaSpecificState, workingState.landUses, logs, language);
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
    logs.push(
      language === 'en'
        ? 'Level 3: Dynamic event attempt failed. No eligible event had >0 trigger weight.'
        : 'Nivel 3: Intento de evento dinámico fallido. Ningún evento elegible tenía >0 peso de activación.'
    );
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

  const { name: chosenName, description: chosenDescription } = eventLabel(chosenEvent, language);
  logs.push(
    language === 'en'
      ? `EVENT (L3-Dynamic, Year ${workingState.year}): ${chosenName} - ${chosenDescription}`
      : `EVENTO (N3-Dinámico, Año ${workingState.year}): ${chosenName} - ${chosenDescription}`
  );
  chatMessage = language === 'en' ? `Unexpected Event! ${chosenName}: ${chosenDescription}` : `¡Evento Inesperado! ${chosenName}: ${chosenDescription}`;
  const effects = chosenEvent.effects(workingState);
  applyRandomEventEffects(effects, workingState.indicators, workingState.stellaSpecificState, workingState.landUses, logs, language);

  return { event: chosenEvent, logs, chatMessage };
}
