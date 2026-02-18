
import React from 'react';
import { MAX_LEVELS } from '../constants';
import Tooltip from './common/Tooltip';

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
}

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
  wonLevels
}) => {

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
              aria-label="Mostrar tutorial"
            >
              Ayuda/Tutorial
            </button>
            <button
              onClick={onShowPlayerManual}
              className="m-1 px-3 py-1.5 text-xs bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400"
              aria-label="Abrir manual del jugador"
            >
              Manual del Jugador
            </button>
            <button
              onClick={onShowFacilitatorManual}
              className="m-1 px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
              aria-label="Abrir manual para facilitadores"
            >
              Facilitadores
            </button>
             <button
              onClick={onShowEquationsManual}
              className="m-1 px-3 py-1.5 text-xs bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500"
              aria-label="Abrir manual de ecuaciones"
            >
              Ecuaciones
            </button>
          </div>
        </div>
        <div className="flex space-x-4 sm:space-x-6 items-center">
          <div className="text-center">
            <span className="block text-xs text-gray-400 uppercase">Nivel</span>
            <span className="text-xl font-semibold">{level}</span>
          </div>
          <div className="text-center">
            <span className="block text-xs text-gray-400 uppercase">Año</span>
            <span className="text-xl font-semibold">{year}</span>
          </div>
          <Tooltip text={scoreTooltipText} position="bottom">
            <div className="text-center cursor-help">
              <span className="block text-xs text-gray-400 uppercase">Puntaje</span>
              <span className={`text-xl font-semibold ${scoreColorClass}`}>
                {score.toFixed(1)}
              </span>
            </div>
          </Tooltip>
           {gameOver && <span className="text-lg font-semibold text-red-500 px-2 py-1 bg-red-900 rounded">JUEGO TERMINADO</span>}
        </div>
      </div>
      {levelName && !gameOver && (
         <div className="text-center text-base text-gray-300 mt-1 sm:mt-0 sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:top-12">Enfoque Actual: {levelName}</div>
      )}
      {!gameOver && (
        <div className="container mx-auto flex justify-center space-x-2 mt-2">
          {[...Array(MAX_LEVELS)].map((_, i) => {
            const levelNum = i + 1;
            const isDisabled = level === levelNum || gameOver;
            return (
              <Tooltip 
                key={`level-btn-tooltip-${levelNum}`}
                text={isDisabled && level === levelNum ? `Ya estás en el Nivel ${levelNum}` : `Fijar Nivel ${levelNum}`}
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
                  Fijar Nvl {levelNum}
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
