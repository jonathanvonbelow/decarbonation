
import React from 'react';
import { MAX_LEVELS } from '../constants';
import Tooltip from './common/Tooltip';
import type { Language } from '../hooks/useLanguage';

interface HeaderProps {
  year: number;
  score: number;
  level: number;
  levelName?: string;
  headerSuffix?: string;
  gameOver: boolean;
  setCurrentLevelManually: (levelNumber: number) => void;
  scoreTooltipText: string;
  scoreColorClass: string;
  onShowTutorial: () => void;
  onShowFacilitatorManual: () => void;
  onShowPlayerManual: () => void;
  onShowEquationsManual: () => void;
  wonLevels: number[];
  onToggleFacilitatorPanel: () => void;
  onAbandon?: () => void;
  language: Language;
  onToggleLanguage: () => void;
}

// Textos del header según idioma
const HEADER_COPY = {
  es: {
    tutorial:       'Ayuda/Tutorial',
    playerManual:   'Manual del Jugador',
    facilitators:   'Facilitadores',
    equations:      'Ecuaciones',
    facilitatorPanel: 'Panel Facilitador',
    facilitatorTooltip: 'Panel del Facilitador — ajustar parámetros de simulación',
    abandon:        'Abandonar',
    gameOver:       'JUEGO TERMINADO',
    levelLabel:     'Nivel',
    yearLabel:      'Año',
    scoreLabel:     'Puntaje',
    currentFocus:   'Enfoque Actual',
    setLevel:       'Fijar Nvl',
    setLevelTip:    (n: number) => `Fijar Nivel ${n}`,
    alreadyTip:     (n: number) => `Ya estás en el Nivel ${n}`,
    langBtn:        'English',
    langFlag:       '🇬🇧',
    langAriaLabel:  'Switch to English',
  },
  en: {
    tutorial:       'Help/Tutorial',
    playerManual:   "Player's Manual",
    facilitators:   'Facilitators',
    equations:      'Equations',
    facilitatorPanel: 'Facilitator',
    facilitatorTooltip: 'Facilitator Panel — adjust simulation parameters',
    abandon:        'Abandon',
    gameOver:       'GAME OVER',
    levelLabel:     'Level',
    yearLabel:      'Year',
    scoreLabel:     'Score',
    currentFocus:   'Current Focus',
    setLevel:       'Set Lvl',
    setLevelTip:    (n: number) => `Set Level ${n}`,
    alreadyTip:     (n: number) => `Already at Level ${n}`,
    langBtn:        'Español',
    langFlag:       '🇦🇷',
    langAriaLabel:  'Cambiar a Español',
  },
} as const;

const Header: React.FC<HeaderProps> = ({
  year,
  score,
  level,
  levelName,
  headerSuffix,
  gameOver,
  setCurrentLevelManually,
  scoreTooltipText,
  scoreColorClass,
  onShowTutorial,
  onShowFacilitatorManual,
  onShowPlayerManual,
  onShowEquationsManual,
  wonLevels,
  onToggleFacilitatorPanel,
  onAbandon,
  language,
  onToggleLanguage,
}) => {
  const t = HEADER_COPY[language];

  return (
    <header className="bg-custom-light-gray text-white p-4 shadow-md">
      <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center">
        <div className="flex items-center mb-2 sm:mb-0">
          <h1 className="text-3xl font-bold text-custom-accent tracking-tight">
            DecarboNation <span className="text-xl text-blue-300">{headerSuffix}</span>
          </h1>
          <div className="flex flex-wrap items-center ml-2 sm:ml-4">
            <button
              onClick={onShowTutorial}
              className="m-1 px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label={t.tutorial}
            >
              {t.tutorial}
            </button>
            <button
              onClick={onShowPlayerManual}
              className="m-1 px-3 py-1.5 text-xs bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400"
              aria-label={t.playerManual}
            >
              {t.playerManual}
            </button>
            <button
              onClick={onShowFacilitatorManual}
              className="m-1 px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
              aria-label={t.facilitators}
            >
              {t.facilitators}
            </button>
            <button
              onClick={onShowEquationsManual}
              className="m-1 px-3 py-1.5 text-xs bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500"
              aria-label={t.equations}
            >
              {t.equations}
            </button>
            <Tooltip text={t.facilitatorTooltip} position="bottom">
              <button
                onClick={onToggleFacilitatorPanel}
                className="m-1 px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                aria-label={t.facilitatorPanel}
              >
                ⚙ {t.facilitatorPanel}
              </button>
            </Tooltip>
            {!gameOver && onAbandon && (
              <button
                onClick={onAbandon}
                className="m-1 px-3 py-1.5 text-xs bg-red-800 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label={t.abandon}
              >
                {t.abandon}
              </button>
            )}
            {/* Selector de idioma */}
            <Tooltip text={t.langAriaLabel} position="bottom">
              <button
                onClick={onToggleLanguage}
                className="m-1 px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 flex items-center gap-1"
                aria-label={t.langAriaLabel}
              >
                <span className="text-sm leading-none">{t.langFlag}</span>
                {t.langBtn}
              </button>
            </Tooltip>
          </div>
        </div>
        <div className="flex space-x-4 sm:space-x-6 items-center">
          <div className="text-center">
            <span className="block text-xs text-gray-400 uppercase">{t.levelLabel}</span>
            <span className="text-xl font-semibold">{level}</span>
          </div>
          <div className="text-center">
            <span className="block text-xs text-gray-400 uppercase">{t.yearLabel}</span>
            <span className="text-xl font-semibold">{year}</span>
          </div>
          <Tooltip text={scoreTooltipText} position="bottom">
            <div className="text-center cursor-help">
              <span className="block text-xs text-gray-400 uppercase">{t.scoreLabel}</span>
              <span className={`text-xl font-semibold ${scoreColorClass}`}>
                {score.toFixed(1)}
              </span>
            </div>
          </Tooltip>
          {gameOver && (
            <span className="text-lg font-semibold text-red-500 px-2 py-1 bg-red-900 rounded">
              {t.gameOver}
            </span>
          )}
        </div>
      </div>
      {levelName && !gameOver && (
        <div className="text-center text-base text-gray-300 mt-1 sm:mt-0 sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:top-12">
          {t.currentFocus}: {levelName}
        </div>
      )}
      {!gameOver && (
        <div className="container mx-auto flex justify-center space-x-2 mt-2">
          {[...Array(MAX_LEVELS)].map((_, i) => {
            const levelNum = i + 1;
            const isDisabled = level === levelNum || gameOver;
            return (
              <Tooltip
                key={`level-btn-tooltip-${levelNum}`}
                text={isDisabled && level === levelNum ? t.alreadyTip(levelNum) : t.setLevelTip(levelNum)}
                position="bottom"
              >
                <button
                  key={levelNum}
                  onClick={() => setCurrentLevelManually(levelNum)}
                  disabled={isDisabled}
                  className={`px-3 py-1 text-xs rounded transition-colors mr-1 last:mr-0
                    ${level === levelNum ? 'bg-blue-700 text-white cursor-default' :
                      (gameOver ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white')
                    }
                  `}
                  aria-disabled={isDisabled}
                >
                  {t.setLevel} {levelNum}
                </button>
              </Tooltip>
            );
          })}
        </div>
      )}
    </header>
  );
};

export default Header;
