
import React from 'react';
import { LevelConfig } from '../../types';
import { LEVEL_ROUTES, type RouteCondition } from '../../sim/winRoutes';
import { tFor, type TranslationKey } from '../../i18n';
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
    winConditions: 'Cómo se gana este nivel:',
    howTo: 'Al final del nivel tenés que cumplir todos los mínimos de gobernabilidad y, además, una ruta completa (la que elijas).',
    allOf: 'todas a la vez',
    someOf: (k: number, n: number) => `${k} de estas ${n}`,
    forward: '¡Adelante!',
  },
  en: {
    welcome: (n:number) => `Welcome to Level ${n}`,
    closeIntro: 'Close introduction',
    duration: (start: number, end: number, years: number) => `This level lasts ${years} simulated years: it starts in the year ${start} and ends in the year ${end}.`,
    winConditions: 'How to win this level:',
    howTo: 'At the end of the level you must meet every governance floor and, on top of that, one complete route (whichever you choose).',
    allOf: 'all at once',
    someOf: (k: number, n: number) => `${k} of these ${n}`,
    forward: "Let's Go!",
  },
} as const;

/**
 * Phase 50 (debt of 49): the intro lists the level's real win rule — the governance floors and the routes of
 * src/sim/winRoutes.ts (LEVEL_ROUTES, calibrated in phase 49) — instead of the 1.1 headline targets of
 * LEVEL_CONFIGS.winConditions, which were deleted.
 */
function conditionText(c: RouteCondition, t: (k: string) => string, lang: Language): string {
  const num = c.target.toLocaleString(lang === 'es' ? 'es-AR' : 'en-US', { maximumFractionDigits: 2 });
  return `${t(c.labelKey)} ${c.dir === 'min' ? '≥' : '≤'} ${num}`;
}
const LevelIntroModal: React.FC<LevelIntroModalProps> = ({ levelConfig, onClose }) => {
  const { language } = useLanguageContext();
  const t = T[language];
  const { levelNumber, name, description } = levelConfig;
  const tr = (k: string) => tFor(language, k as TranslationKey);
  const cfg = LEVEL_ROUTES[levelNumber];
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
          <p className="text-sm text-gray-300 mb-3">{t.howTo}</p>
          {cfg && (
            <div className="space-y-3 text-sm">
              <div className="rounded-md bg-gray-800 p-3">
                <p className="font-semibold text-gray-200">{tr('routes.floorsTitle')} <span className="text-xs font-normal text-gray-400">({t.allOf})</span></p>
                <ul className="mt-1 space-y-0.5 text-gray-300">
                  {cfg.floors.map((f) => <li key={f.labelKey}>🎯 {conditionText(f, tr, language)}</li>)}
                </ul>
              </div>
              {cfg.routes.map((r) => (
                <div key={r.id} className="rounded-md bg-gray-800 p-3">
                  <p className="font-semibold text-blue-300">
                    {tr(r.nameKey)}{' '}
                    <span className="text-xs font-normal text-gray-400">
                      ({r.minConditionsMet !== undefined && r.minConditionsMet < r.conditions.length ? t.someOf(r.minConditionsMet, r.conditions.length) : t.allOf} · ×{r.scoreMultiplier})
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 mb-1">{tr(r.taglineKey)}</p>
                  <ul className="space-y-0.5 text-gray-300">
                    {r.conditions.map((c) => <li key={c.labelKey}>· {conditionText(c, tr, language)}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
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
