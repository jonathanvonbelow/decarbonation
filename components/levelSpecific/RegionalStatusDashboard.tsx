
import React, { useState } from 'react';
import { GameState, LevelConfig, RegionalZoneData, DisplayRegionalZoneData } from '../../types';
import RegionalDetailModal from './RegionalDetailModal'; 
import { INITIAL_REGIONAL_ZONES_DATA, INITIAL_YEAR } from '../../constants'; 

interface RegionalStatusDashboardProps {
  levelConfig: LevelConfig;
  gameState: GameState;
}

const TrendArrow: React.FC<{ trend: string }> = ({ trend }) => {
  if (trend === "improving" || trend === "excellent") return <span className="text-green-400 ml-1">↑</span>; // Mejorando o Excelente
  if (trend === "worsening") return <span className="text-red-400 ml-1">↓</span>; // Empeorando
  return <span className="text-yellow-400 ml-1">↔</span>; // Estable
};

const RegionalStatusDashboard: React.FC<RegionalStatusDashboardProps> = ({ levelConfig, gameState }) => {
  const [selectedRegion, setSelectedRegion] = useState<DisplayRegionalZoneData | null>(null);

  const regionalDisplayData: DisplayRegionalZoneData[] = INITIAL_REGIONAL_ZONES_DATA.map(region => {
    const yearsIntoLevel = gameState.year - INITIAL_YEAR; // Años desde el inicio del juego (o del nivel si se reinicia el año)
    const yearFactor = yearsIntoLevel * 0.1; 
    const scoreFactor = Math.floor(gameState.indicators.generalScore / 200); 

    let dynamicPolicyAdoption = Math.min(100, Math.max(0, region.basePolicyAdoption + yearFactor + scoreFactor));
    let dynamicIdh = Math.min(1, Math.max(0.3, region.idh + (yearFactor / 50) + (scoreFactor / 20)));
    
    let dynamicPopulation = Math.floor(region.demographics.population * (1 + (region.demographics.growthRate / 100) * (yearsIntoLevel * 0.1))); // Ajuste para que el crecimiento sea más gradual
    if (gameState.indicators.socialWellbeing < 30) dynamicPopulation *= 0.98; 
    
    let dynamicEmploymentRate = Math.min(98, Math.max(40, region.employment.rate + scoreFactor - ( (80 - gameState.indicators.economicSecurity)/10 ) ));

    let newAgrarian = region.structure.agrarian;
    if (gameState.policies["Políticas Agroecológicas (P-AS)"]?.isActive) {
        if (!newAgrarian.includes("diversificando")) newAgrarian += ", diversificando con agroecología";
    }
    if (gameState.policies["Políticas Agrícolas Intensivas (P-PAI)"]?.isActive) {
        if (!newAgrarian.includes("intensificando")) newAgrarian += ", intensificación convencional";
    }
    
    return {
      ...region,
      dynamicPolicyAdoption: parseFloat(dynamicPolicyAdoption.toFixed(1)),
      idh: parseFloat(dynamicIdh.toFixed(2)),
      demographics: {
        ...region.demographics,
        population: dynamicPopulation,
      },
      employment: {
        ...region.employment,
        rate: parseFloat(dynamicEmploymentRate.toFixed(1)),
      },
      structure: {
        ...region.structure,
        agrarian: newAgrarian.substring(0,100), 
      }
    };
  });

  const handleRegionClick = (region: DisplayRegionalZoneData) => {
    setSelectedRegion(region);
  };

  const handleCloseModal = () => {
    setSelectedRegion(null);
  };

  return (
    <div className="p-6 bg-gray-800 bg-opacity-70 rounded-lg shadow-xl border border-gray-700">
      <h3 className="text-xl font-semibold text-blue-300 mb-3">Estado de Coordinación Regional</h3>
      <p className="text-sm text-gray-400 mb-4">
        Enfóquese en equilibrar el desarrollo y la sostenibilidad en diversas regiones. La coordinación efectiva es clave. Haga clic en una región para ver detalles.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {regionalDisplayData.map((region) => (
          <button
            key={region.id}
            onClick={() => handleRegionClick(region)}
            className="bg-gray-700 p-4 rounded-lg shadow-md hover:bg-gray-600 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={`Ver detalles de ${region.name}`}
          >
            <h4 className="text-lg font-medium text-blue-200">{region.name}</h4>
            <p className="text-sm text-gray-300">
              IDH: <span className={`font-semibold ${region.idh > 0.7 ? 'text-green-400' : region.idh > 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>{region.idh.toFixed(2)}</span>
            </p>
            <p className="text-sm text-gray-300">
              Adopción de Políticas: {region.dynamicPolicyAdoption}%
            </p>
            <p className="text-sm text-gray-300">
              Población: {(region.demographics.population / 1000000).toFixed(2)} M
            </p>
            <div className="mt-1">
                <span className="text-xs text-gray-400">Enfoque Clave: </span>
                <span className="text-xs text-gray-300">{region.focus}</span>
            </div>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-4 italic">
        Nota: Los datos regionales son ilustrativos y reflejan disparidades potenciales y áreas de enfoque. Sus políticas nacionales influyen en estos resultados.
      </p>

      {selectedRegion && (
        <RegionalDetailModal
          region={selectedRegion}
          onClose={handleCloseModal}
          currentLevel={gameState.currentLevel}
        />
      )}
    </div>
  );
};

export default RegionalStatusDashboard;
