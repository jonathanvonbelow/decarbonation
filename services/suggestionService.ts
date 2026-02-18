
import { GameState, Policy, PolicyState } from '../types';
import { INITIAL_YEAR, MAX_ACTIVE_POLICIES } from '../constants';

const MAX_SUGGESTIONS = 4;

export const getSuggestedQuestions = (gameState: GameState): string[] => {
  const suggestions: Set<string> = new Set();
  const { currentLevel, indicators, policies, year, currentEvent, pacts, yearsSimulatedInCurrentLevel, stellaSpecificState } = gameState;

  if (suggestions.size < MAX_SUGGESTIONS) {
    suggestions.add("¿Cuáles son mis principales desafíos ahora?");
  }
  if (suggestions.size < MAX_SUGGESTIONS && yearsSimulatedInCurrentLevel > 2) {
    suggestions.add("¿Cómo puedo mejorar mi puntaje general de manera efectiva?");
  }

  // Suggest based on low indicators
  if (suggestions.size < MAX_SUGGESTIONS && indicators.biodiversity < 35) {
    suggestions.add("¿Cómo puedo mejorar la biodiversidad?");
  }
  if (suggestions.size < MAX_SUGGESTIONS && indicators.co2EqEmissionsPerCapita > 10) {
    suggestions.add("¿Qué políticas reducen más las emisiones de CO2?");
  }
  if (suggestions.size < MAX_SUGGESTIONS && currentLevel >= 2 && indicators.politicalStability < 50) {
    suggestions.add("¿Por qué mi estabilidad política es baja?");
  }
  if (suggestions.size < MAX_SUGGESTIONS && currentLevel >= 2 && indicators.economicSecurity < 40) {
    suggestions.add("¿Cómo puedo mejorar la seguridad económica?");
  }

  // Suggest based on high political pressure
  if (suggestions.size < MAX_SUGGESTIONS && currentLevel >= 2 && indicators.ppAmbientalista > 65) {
    suggestions.add("¿Cómo puedo reducir la presión ambientalista?");
  }
  if (suggestions.size < MAX_SUGGESTIONS && currentLevel >= 2 && indicators.ppAgricola > 65) {
    suggestions.add("¿Cómo puedo reducir la presión agrícola?");
  }
  if (suggestions.size < MAX_SUGGESTIONS && currentLevel >= 2 && indicators.ppSocial > 65) {
    suggestions.add("¿Cómo puedo reducir la presión social?");
  }

  // Suggest based on game mechanics
  // FIX: Added explicit type annotation for 'p' to resolve 'unknown' type error on property access.
  const activePolicies = Object.values(policies).filter((p: PolicyState) => p.isActive);
  if (suggestions.size < MAX_SUGGESTIONS && activePolicies.length > 1) {
    suggestions.add("¿Hay sinergias o conflictos entre mis políticas activas?");
  }

  if (currentLevel >= 2) {
    const policyNeedsEffort = activePolicies.find(p => p.instruments && Object.keys(p.instruments).length > 0 && (p.totalInstrumentEffortApplied || 0) === 0);
    if (suggestions.size < MAX_SUGGESTIONS && policyNeedsEffort) {
      suggestions.add(`La política "${policyNeedsEffort.name}" no tiene esfuerzo asignado, ¿qué debo hacer?`);
    }
  }

  if (currentLevel >= 3) {
      const availablePact = Object.values(pacts).find(p => !p.isActive && year >= (p.unlockYear || year + 1));
      if (suggestions.size < MAX_SUGGESTIONS && availablePact) {
          suggestions.add(`El pacto "${availablePact.name}" está disponible. ¿Debería unirme?`);
      }
      if (suggestions.size < MAX_SUGGESTIONS && stellaSpecificState.Deuda > stellaSpecificState.PBI_Real * 0.5) {
          suggestions.add("Mi deuda es alta, ¿qué puedo hacer?");
      }
  }

  // Generic fallback suggestions
  if (suggestions.size < MAX_SUGGESTIONS) {
    suggestions.add("Explícame el indicador de Bienestar Social.");
  }
  if (suggestions.size < MAX_SUGGESTIONS) {
    suggestions.add("¿Qué política es mejor para la economía?");
  }
  
  return Array.from(suggestions);
};
