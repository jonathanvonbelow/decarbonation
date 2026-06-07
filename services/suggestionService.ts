
import { GameState, Policy, PolicyState } from '../types';
import { INITIAL_YEAR, MAX_ACTIVE_POLICIES } from '../constants';
import { Language } from '../hooks/useLanguage';
import { getPolicyName, getPactName } from '../i18n/gameData';

const MAX_SUGGESTIONS = 4;

const SUGGESTIONS = {
  es: {
    mainChallenges: '¿Cuáles son mis principales desafíos ahora?',
    improveScore: '¿Cómo puedo mejorar mi puntaje general de manera efectiva?',
    biodiversity: '¿Cómo puedo mejorar la biodiversidad?',
    co2: '¿Qué políticas reducen más las emisiones de CO2?',
    polStability: '¿Por qué mi estabilidad política es baja?',
    econSecurity: '¿Cómo puedo mejorar la seguridad económica?',
    envPressure: '¿Cómo puedo reducir la presión ambientalista?',
    agrPressure: '¿Cómo puedo reducir la presión agrícola?',
    socPressure: '¿Cómo puedo reducir la presión social?',
    synergies: '¿Hay sinergias o conflictos entre mis políticas activas?',
    noEffort: (name: string) => `La política "${name}" no tiene esfuerzo asignado, ¿qué debo hacer?`,
    pact: (name: string) => `El pacto "${name}" está disponible. ¿Debería unirme?`,
    debt: 'Mi deuda es alta, ¿qué puedo hacer?',
    socialWellbeing: 'Explícame el indicador de Bienestar Social.',
    bestEconPolicy: '¿Qué política es mejor para la economía?',
  },
  en: {
    mainChallenges: 'What are my main challenges right now?',
    improveScore: 'How can I effectively improve my general score?',
    biodiversity: 'How can I improve biodiversity?',
    co2: 'Which policies reduce CO2 emissions the most?',
    polStability: 'Why is my political stability low?',
    econSecurity: 'How can I improve economic security?',
    envPressure: 'How can I reduce environmental pressure?',
    agrPressure: 'How can I reduce agricultural pressure?',
    socPressure: 'How can I reduce social pressure?',
    synergies: 'Are there synergies or conflicts between my active policies?',
    noEffort: (name: string) => `Policy "${name}" has no effort assigned — what should I do?`,
    pact: (name: string) => `Pact "${name}" is available. Should I join?`,
    debt: 'My debt is high — what can I do?',
    socialWellbeing: 'Explain the Social Wellbeing indicator to me.',
    bestEconPolicy: 'Which policy is best for the economy?',
  },
} as const;

export const getSuggestedQuestions = (gameState: GameState, language: Language = 'es'): string[] => {
  const suggestions: Set<string> = new Set();
  const { currentLevel, indicators, policies, year, currentEvent, pacts, yearsSimulatedInCurrentLevel, stellaSpecificState } = gameState;
  const s = SUGGESTIONS[language];

  if (suggestions.size < MAX_SUGGESTIONS) suggestions.add(s.mainChallenges);
  if (suggestions.size < MAX_SUGGESTIONS && yearsSimulatedInCurrentLevel > 2) suggestions.add(s.improveScore);

  if (suggestions.size < MAX_SUGGESTIONS && indicators.biodiversity < 35) suggestions.add(s.biodiversity);
  if (suggestions.size < MAX_SUGGESTIONS && indicators.co2EqEmissionsPerCapita > 10) suggestions.add(s.co2);
  if (suggestions.size < MAX_SUGGESTIONS && currentLevel >= 2 && indicators.politicalStability < 50) suggestions.add(s.polStability);
  if (suggestions.size < MAX_SUGGESTIONS && currentLevel >= 2 && indicators.economicSecurity < 40) suggestions.add(s.econSecurity);
  if (suggestions.size < MAX_SUGGESTIONS && currentLevel >= 2 && indicators.ppAmbientalista > 65) suggestions.add(s.envPressure);
  if (suggestions.size < MAX_SUGGESTIONS && currentLevel >= 2 && indicators.ppAgricola > 65) suggestions.add(s.agrPressure);
  if (suggestions.size < MAX_SUGGESTIONS && currentLevel >= 2 && indicators.ppSocial > 65) suggestions.add(s.socPressure);

  const activePolicies = Object.values(policies).filter((p: PolicyState) => p.isActive);
  if (suggestions.size < MAX_SUGGESTIONS && activePolicies.length > 1) suggestions.add(s.synergies);

  if (currentLevel >= 2) {
    const policyNeedsEffort = activePolicies.find(p => p.instruments && Object.keys(p.instruments).length > 0 && (p.totalInstrumentEffortApplied || 0) === 0);
    if (suggestions.size < MAX_SUGGESTIONS && policyNeedsEffort) {
      suggestions.add(s.noEffort(getPolicyName(policyNeedsEffort.id, language) || policyNeedsEffort.name));
    }
  }

  if (currentLevel >= 3) {
    const availablePact = Object.values(pacts).find(p => !p.isActive && year >= (p.unlockYear || year + 1));
    if (suggestions.size < MAX_SUGGESTIONS && availablePact) {
      suggestions.add(s.pact(getPactName(availablePact.id, language) || availablePact.name));
    }
    if (suggestions.size < MAX_SUGGESTIONS && stellaSpecificState.Deuda > stellaSpecificState.PBI_Real * 0.5) {
      suggestions.add(s.debt);
    }
  }

  if (suggestions.size < MAX_SUGGESTIONS) suggestions.add(s.socialWellbeing);
  if (suggestions.size < MAX_SUGGESTIONS) suggestions.add(s.bestEconPolicy);

  return Array.from(suggestions);
};
