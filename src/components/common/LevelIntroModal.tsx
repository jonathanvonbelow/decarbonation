
import React from 'react';
import { LevelConfig } from '../../types';
import { useLanguageContext } from '../../contexts/LanguageContext';
import { Language } from '../../hooks/useLanguage';
import { INITIAL_YEAR, YEARS_PER_LEVEL } from '../../constants';

interface LevelIntroModalProps {
  levelConfig: LevelConfig;
  onClose: () => void;
}

const T = {
  es: {
    welcome: (n:number) => `Bienvenido al Nivel ${n}`,
    closeIntro: 'Cerrar introducción',
    duration: (start: number, end: number, years: number) => `Este nivel dura ${years} años simulados: comienza en el año ${start} y finaliza en el año ${end}.`,
    winConditions: 'Condiciones de Victoria:',
    forward: '¡Adelante!',
    noObjectives: 'No hay objetivos específicos definidos para este nivel.',
    completeLevel: 'Completa el ciclo para avanzar.',
    wc: {
      generalScore: (v:number) => `Puntaje General debe ser mayor que ${v}.`,
      biodiversity: (v:number) => `Biodiversidad debe ser mayor que ${v}%.`,
      co2: (v:number) => `Emisiones CO2eq/cápita deben ser menores que ${v} t/hab.`,
      forest: (v:number) => `El Bosque Nativo Total debe cubrir más del ${v}% del territorio.`,
      food: (v:number) => `Seguridad Alimentaria debe ser mayor que ${v}%.`,
      economic: (v:number) => `Seguridad Económica debe ser mayor que ${v}%.`,
      social: (v:number) => `Bienestar Social debe ser mayor que ${v}%.`,
      political: (v:number) => `Estabilidad Política debe ser mayor que ${v}%.`,
      ppAgr: (v:number) => `La Presión Agrícola debe ser menor que ${v}%.`,
      ppAmb: (v:number) => `La Presión Ambientalista debe ser menor que ${v}%.`,
      ppSoc: (v:number) => `La Presión Social debe ser menor que ${v}%.`,
      pbi: (v:number) => `El PBI Real debe ser mayor que ${v}.`,
      debt: (v:number) => `La ratio Deuda/PBI debe ser menor que ${v}.`,
      collapse: (v:number) => `El Colapso Político debe ser menor que ${v}%.`,
    },
  },
  en: {
    welcome: (n:number) => `Welcome to Level ${n}`,
    closeIntro: 'Close introduction',
    duration: (start: number, end: number, years: number) => `This level lasts ${years} simulated years: it starts in the year ${start} and ends in the year ${end}.`,
    winConditions: 'Victory Conditions:',
    forward: "Let's Go!",
    noObjectives: 'No specific objectives defined for this level.',
    completeLevel: 'Complete the cycle to advance.',
    wc: {
      generalScore: (v:number) => `General Score must be greater than ${v}.`,
      biodiversity: (v:number) => `Biodiversity must be greater than ${v}%.`,
      co2: (v:number) => `CO2eq/capita emissions must be less than ${v} t/hab.`,
      forest: (v:number) => `Total Native Forest must cover more than ${v}% of the territory.`,
      food: (v:number) => `Food Security must be greater than ${v}%.`,
      economic: (v:number) => `Economic Security must be greater than ${v}%.`,
      social: (v:number) => `Social Wellbeing must be greater than ${v}%.`,
      political: (v:number) => `Political Stability must be greater than ${v}%.`,
      ppAgr: (v:number) => `Agricultural Pressure must be less than ${v}%.`,
      ppAmb: (v:number) => `Environmentalist Pressure must be less than ${v}%.`,
      ppSoc: (v:number) => `Social Pressure must be less than ${v}%.`,
      pbi: (v:number) => `Real GDP must be greater than ${v}.`,
      debt: (v:number) => `Debt/GDP ratio must be less than ${v}.`,
      collapse: (v:number) => `Political Collapse must be less than ${v}%.`,
    },
  },
} as const;

function formatWinConditions(winConditions: LevelConfig['winConditions'], lang: Language): string[] {
  const t = T[lang];
  if (!winConditions) return [t.noObjectives];
  const conditions: string[] = [];
  const wc = winConditions;
  if (wc.puntajeGeneralMin !== undefined) conditions.push(t.wc.generalScore(wc.puntajeGeneralMin));
  if (wc.biodiversityMin !== undefined) conditions.push(t.wc.biodiversity(wc.biodiversityMin));
  if (wc.co2EqEmissionsPerCapitaMax !== undefined) conditions.push(t.wc.co2(wc.co2EqEmissionsPerCapitaMax));
  if (wc.nativeForestTotalMinPercentage !== undefined) conditions.push(t.wc.forest(parseFloat((wc.nativeForestTotalMinPercentage * 100).toFixed(0))));
  if (wc.foodSecurityMin !== undefined) conditions.push(t.wc.food(wc.foodSecurityMin));
  if (wc.economicSecurityMin !== undefined) conditions.push(t.wc.economic(wc.economicSecurityMin));
  if (wc.bienestarSocialMin !== undefined) conditions.push(t.wc.social(wc.bienestarSocialMin));
  if (wc.politicalStabilityMin !== undefined) conditions.push(t.wc.political(wc.politicalStabilityMin));
  if (wc.ppAgricolaMax !== undefined) conditions.push(t.wc.ppAgr(wc.ppAgricolaMax));
  if (wc.ppAmbientalistaMax !== undefined) conditions.push(t.wc.ppAmb(wc.ppAmbientalistaMax));
  if (wc.ppSocialMax !== undefined) conditions.push(t.wc.ppSoc(wc.ppSocialMax));
  if (wc.pbiMin !== undefined) conditions.push(t.wc.pbi(wc.pbiMin));
  if (wc.deudaPbiMax !== undefined) conditions.push(t.wc.debt(wc.deudaPbiMax));
  if (wc.colapsoPoliticoMax !== undefined) conditions.push(t.wc.collapse(wc.colapsoPoliticoMax));
  return conditions.length > 0 ? conditions : [t.completeLevel];
}

const LevelIntroModal: React.FC<LevelIntroModalProps> = ({ levelConfig, onClose }) => {
  const { language } = useLanguageContext();
  const t = T[language];
  const { levelNumber, name, description, winConditions } = levelConfig;
  const formattedGoals = formatWinConditions(winConditions, language);
  const endYear = levelConfig.targetYear ?? (INITIAL_YEAR + YEARS_PER_LEVEL);
  const startYear = endYear - YEARS_PER_LEVEL;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[1000] p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`level-intro-title-${levelNumber}`}
    >
      <div className="bg-custom-light-gray p-6 sm:p-8 rounded-lg shadow-2xl max-w-2xl w-full text-gray-100 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 id={`level-intro-title-${levelNumber}`} className="text-2xl sm:text-3xl font-bold text-custom-accent">
            {t.welcome(levelNumber)}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none" aria-label={t.closeIntro}>
            &times;
          </button>
        </div>
        <div className="overflow-y-auto flex-grow mb-6 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 pr-2">
          <h3 className="text-xl font-semibold text-blue-300 mb-3">{name}</h3>
          <p className="text-sm sm:text-base font-semibold text-yellow-300 mb-4">
            {t.duration(startYear, endYear, YEARS_PER_LEVEL)}
          </p>
          {description && <p className="text-sm sm:text-base whitespace-pre-line leading-relaxed mb-4">{description}</p>}
          <h4 className="text-md font-semibold text-gray-200 mb-2">{t.winConditions}</h4>
          <ul className="list-disc list-inside space-y-1 pl-4 text-sm sm:text-base">
            {formattedGoals.map((goal, index) => (
              <li key={index} className="flex items-start">
                <span className="text-yellow-400 mr-2 mt-1">🎯</span>
                <span>{goal}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="text-right pt-4 border-t border-gray-700">
          <button onClick={onClose} className="px-6 py-2 bg-custom-accent hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors">
            {t.forward}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LevelIntroModal;
