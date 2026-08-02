
import React from 'react';
import { MAX_LEVELS } from '../constants';
import Tooltip from './common/Tooltip';
import { useLanguageContext } from '../contexts/LanguageContext';

interface HeaderProps {
  year: number;
  targetYear?: number;
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
}

const T = {
  es: {
    tutorial: 'Ayuda/Tutorial',
    playerManual: 'Manual del Jugador',
    facilitators: 'Facilitadores',
    equations: 'Ecuaciones',
    abandon: 'Abandonar',
    gameOver: 'JUEGO TERMINADO',
    levelLabel: 'Nivel',
    yearLabel: 'Año',
    yearOfTotal: (year: number, target: number) => `${year} / ${target}`,
    yearTooltip: (target: number) => `El nivel finaliza en el año ${target}.`,
    scoreLabel: 'Puntaje',
    currentFocus: 'Enfoque Actual',
    setLevel: (n: number) => `Fijar Nivel ${n}`,
    alreadyAt: (n: number) => `Ya estás en el Nivel ${n}`,
    setLevelShort: (n: number) => `Fijar Nvl ${n}`,
    facilitatorPanelLabel: 'Panel del facilitador',
    langBtn: 'English',
    langFlag: '🇬🇧',
  },
  en: {
    tutorial: 'Help/Tutorial',
    playerManual: "Player's Manual",
    facilitators: 'Facilitators',
    equations: 'Equations',
    abandon: 'Abandon',
    gameOver: 'GAME OVER',
    levelLabel: 'Level',
    yearLabel: 'Year',
    yearOfTotal: (year: number, target: number) => `${year} / ${target}`,
    yearTooltip: (target: number) => `The level ends in the year ${target}.`,
    scoreLabel: 'Score',
    currentFocus: 'Current Focus',
    setLevel: (n: number) => `Set Level ${n}`,
    alreadyAt: (n: number) => `Already at Level ${n}`,
    setLevelShort: (n: number) => `Set Lvl ${n}`,
    facilitatorPanelLabel: 'Facilitator panel',
    langBtn: 'Español',
    langFlag: '🇦🇷',
  },
} as const;

const Header: React.FC<HeaderProps> = ({
  year,
  targetYear,
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
}) => {
  const { language, toggleLanguage } = useLanguageContext();
  const t = T[language];

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
            {onAbandon && !gameOver && (
              <button
                onClick={onAbandon}
                className="m-1 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 border border-red-700 hover:border-red-500 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label={t.abandon}
              >
                {t.abandon}
              </button>
            )}
            <button
              onClick={toggleLanguage}
              className="m-1 px-3 py-1.5 text-xs text-gray-300 hover:text-white border border-gray-600 hover:border-gray-400 rounded-lg transition-colors focus:outline-none focus:ring-1 focus:ring-gray-400"
              aria-label={t.langBtn}
              title={t.langBtn}
            >
              {t.langFlag} {t.langBtn}
            </button>
          </div>
        </div>
        <div className="flex space-x-4 sm:space-x-6 items-center">
          <div className="text-center">
            <span className="block text-xs text-gray-400 uppercase">{t.levelLabel}</span>
            <span className="text-xl font-semibold">{level}</span>
          </div>
          <div className="text-center">
            <span className="block text-xs text-gray-400 uppercase">{t.yearLabel}</span>
            {targetYear ? (
              <Tooltip text={t.yearTooltip(targetYear)} position="bottom">
                <span className="text-xl font-semibold cursor-help">{t.yearOfTotal(year, targetYear)}</span>
              </Tooltip>
            ) : (
              <span className="text-xl font-semibold">{year}</span>
            )}
          </div>
          <Tooltip text={scoreTooltipText} position="bottom">
            <div className="text-center cursor-help">
              <span className="block text-xs text-gray-400 uppercase">{t.scoreLabel}</span>
              <span className={`text-xl font-semibold ${scoreColorClass}`}>
                {score.toFixed(1)}
              </span>
            </div>
          </Tooltip>
          {gameOver && <span className="text-lg font-semibold text-red-500 px-2 py-1 bg-red-900 rounded">{t.gameOver}</span>}
          <button
            onClick={onToggleFacilitatorPanel}
            className="text-gray-400 hover:text-gray-200 text-xl ml-2 focus:outline-none focus:ring-1 focus:ring-gray-400 rounded"
            aria-label={t.facilitatorPanelLabel}
            title={t.facilitatorPanelLabel}
          >
            &#9881;
          </button>
        </div>
      </div>
      {levelName && !gameOver && (
        <div className="text-center text-base text-gray-300 mt-1 sm:mt-0 sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:top-12">{t.currentFocus}: {levelName}</div>
      )}
      {!gameOver && (
        <div className="container mx-auto flex justify-center space-x-2 mt-2">
          {[...Array(MAX_LEVELS)].map((_, i) => {
            const levelNum = i + 1;
            const isDisabled = level === levelNum || gameOver;
            return (
              <Tooltip
                key={`level-btn-tooltip-${levelNum}`}
                text={isDisabled && level === levelNum ? t.alreadyAt(levelNum) : t.setLevel(levelNum)}
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
                  {t.setLevelShort(levelNum)}
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
