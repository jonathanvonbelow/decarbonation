
import React from 'react';
import { LevelConfig } from '../../types';

interface LevelIntroModalProps {
  levelConfig: LevelConfig;
  onClose: () => void;
}

const formatWinConditions = (winConditions: LevelConfig['winConditions']): string[] => {
    if (!winConditions) return ["No hay objetivos específicos definidos para este nivel."];
    
    const conditions: string[] = [];
    const wc = winConditions;

    if (wc.puntajeGeneralMin !== undefined) conditions.push(`Puntaje General debe ser mayor que ${wc.puntajeGeneralMin}.`);
    if (wc.biodiversityMin !== undefined) conditions.push(`Biodiversidad debe ser mayor que ${wc.biodiversityMin}%.`);
    if (wc.co2EqEmissionsPerCapitaMax !== undefined) conditions.push(`Emisiones CO2eq/cápita deben ser menores que ${wc.co2EqEmissionsPerCapitaMax} t/hab.`);
    if (wc.nativeForestTotalMinPercentage !== undefined) conditions.push(`El Bosque Nativo Total debe cubrir más del ${(wc.nativeForestTotalMinPercentage * 100).toFixed(0)}% del territorio.`);
    if (wc.foodSecurityMin !== undefined) conditions.push(`Seguridad Alimentaria debe ser mayor que ${wc.foodSecurityMin}%.`);
    if (wc.economicSecurityMin !== undefined) conditions.push(`Seguridad Económica debe ser mayor que ${wc.economicSecurityMin}%.`);
    if (wc.bienestarSocialMin !== undefined) conditions.push(`Bienestar Social debe ser mayor que ${wc.bienestarSocialMin}%.`);
    if (wc.politicalStabilityMin !== undefined) conditions.push(`Estabilidad Política debe ser mayor que ${wc.politicalStabilityMin}%.`);
    if (wc.ppAgricolaMax !== undefined) conditions.push(`La Presión Agrícola debe ser menor que ${wc.ppAgricolaMax}%.`);
    if (wc.ppAmbientalistaMax !== undefined) conditions.push(`La Presión Ambientalista debe ser menor que ${wc.ppAmbientalistaMax}%.`);
    if (wc.ppSocialMax !== undefined) conditions.push(`La Presión Social debe ser menor que ${wc.ppSocialMax}%.`);
    if (wc.pbiMin !== undefined) conditions.push(`El PBI Real debe ser mayor que ${wc.pbiMin}.`);
    if (wc.deudaPbiMax !== undefined) conditions.push(`La ratio Deuda/PBI debe ser menor que ${wc.deudaPbiMax}.`);
    if (wc.colapsoPoliticoMax !== undefined) conditions.push(`El Colapso Político debe ser menor que ${wc.colapsoPoliticoMax}%.`);

    return conditions.length > 0 ? conditions : ["Completa el ciclo para avanzar."];
};


const LevelIntroModal: React.FC<LevelIntroModalProps> = ({ levelConfig, onClose }) => {
  const { levelNumber, name, description, winConditions } = levelConfig;
  const formattedGoals = formatWinConditions(winConditions);

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
            Bienvenido al Nivel {levelNumber}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-3xl leading-none"
            aria-label="Cerrar introducción"
          >
            &times;
          </button>
        </div>

        <div className="overflow-y-auto flex-grow mb-6 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 pr-2">
          <h3 className="text-xl font-semibold text-blue-300 mb-3">{name}</h3>
          {description && (
            <p className="text-sm sm:text-base whitespace-pre-line leading-relaxed mb-4">{description}</p>
          )}
          
          <h4 className="text-md font-semibold text-gray-200 mb-2">Condiciones de Victoria:</h4>
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
          <button
            onClick={onClose}
            className="px-6 py-2 bg-custom-accent hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
          >
            ¡Adelante!
          </button>
        </div>
      </div>
    </div>
  );
};

export default LevelIntroModal;
