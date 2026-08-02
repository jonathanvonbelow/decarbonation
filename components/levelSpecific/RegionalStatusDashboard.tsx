
import React, { useState } from 'react';
import { GameState, LevelConfig, RegionalZoneData, DisplayRegionalZoneData } from '../../types';
import RegionalDetailModal from './RegionalDetailModal';
import { INITIAL_REGIONAL_ZONES_DATA, INITIAL_YEAR } from '../../constants';
import { useLanguageContext } from '../../contexts/LanguageContext';
import { getRegionName, REGION_CONTENT } from '../../i18n/gameData';

interface RegionalStatusDashboardProps {
  levelConfig: LevelConfig;
  gameState: GameState;
}

const T = {
  es: {
    title: 'Estado de Coordinación Regional',
    subtitle: 'Enfóquese en equilibrar el desarrollo y la sostenibilidad en diversas regiones. La coordinación efectiva es clave. Haga clic en una región para ver detalles.',
    hdh: 'IDH:',
    policyAdoption: 'Adopción de Políticas:',
    population: 'Población:',
    keyFocus: 'Enfoque Clave:',
    viewDetails: (name: string) => `Ver detalles de ${name}`,
    note: 'Nota: Este panel es informativo/ilustrativo. No afecta directamente su puntaje ni otros indicadores del juego: visualiza posibles disparidades regionales a partir de sus decisiones de política a nivel nacional.',
  },
  en: {
    title: 'Regional Coordination Status',
    subtitle: 'Focus on balancing development and sustainability across diverse regions. Effective coordination is key. Click on a region to see details.',
    hdh: 'HDI:',
    policyAdoption: 'Policy Adoption:',
    population: 'Population:',
    keyFocus: 'Key Focus:',
    viewDetails: (name: string) => `View details for ${name}`,
    note: 'Note: This panel is informational/illustrative only. It does not directly affect your score or other game indicators — it visualizes potential regional disparities based on your national-level policy choices.',
  },
} as const;

const TrendArrow: React.FC<{ trend: string }> = ({ trend }) => {
  if (trend === 'improving' || trend === 'excellent') return <span className="text-green-400 ml-1">↑</span>;
  if (trend === 'worsening') return <span className="text-red-400 ml-1">↓</span>;
  return <span className="text-yellow-400 ml-1">↔</span>;
};

const RegionalStatusDashboard: React.FC<RegionalStatusDashboardProps> = ({ levelConfig, gameState }) => {
  const { language } = useLanguageContext();
  const t = T[language];
  const [selectedRegion, setSelectedRegion] = useState<DisplayRegionalZoneData | null>(null);

  const regionalDisplayData: DisplayRegionalZoneData[] = INITIAL_REGIONAL_ZONES_DATA.map(region => {
    const yearsIntoLevel = gameState.year - INITIAL_YEAR;
    const yearFactor = yearsIntoLevel * 0.1;
    const scoreFactor = Math.floor(gameState.indicators.generalScore / 200);

    const content = REGION_CONTENT[region.id]?.[language];
    const localizedName = getRegionName(region.id, language) || region.name;
    const localizedFocus = content?.focus ?? region.focus;
    const localizedSectors = content?.mainSectors ?? region.employment.mainSectors;
    const localizedAgrarian = content?.agrarian ?? region.structure.agrarian;
    const localizedCommercial = content?.commercial ?? region.structure.commercial;
    const localizedIndustrial = content?.industrial ?? region.structure.industrial;

    let dynamicPolicyAdoption = Math.min(100, Math.max(0, region.basePolicyAdoption + yearFactor + scoreFactor));
    let dynamicIdh = Math.min(1, Math.max(0.3, region.idh + (yearFactor / 50) + (scoreFactor / 20)));
    let dynamicPopulation = Math.floor(region.demographics.population * (1 + (region.demographics.growthRate / 100) * (yearsIntoLevel * 0.1)));
    if (gameState.indicators.socialWellbeing < 30) dynamicPopulation *= 0.98;
    let dynamicEmploymentRate = Math.min(98, Math.max(40, region.employment.rate + scoreFactor - ((80 - gameState.indicators.economicSecurity) / 10)));

    return {
      ...region,
      name: localizedName,
      focus: localizedFocus,
      dynamicPolicyAdoption: parseFloat(dynamicPolicyAdoption.toFixed(1)),
      idh: parseFloat(dynamicIdh.toFixed(2)),
      demographics: { ...region.demographics, population: dynamicPopulation },
      employment: { ...region.employment, rate: parseFloat(dynamicEmploymentRate.toFixed(1)), mainSectors: localizedSectors },
      structure: { agrarian: localizedAgrarian.substring(0, 100), commercial: localizedCommercial, industrial: localizedIndustrial },
    };
  });

  return (
    <div className="p-6 bg-gray-800 bg-opacity-70 rounded-lg shadow-xl border border-gray-700">
      <h3 className="text-xl font-semibold text-blue-300 mb-3">{t.title}</h3>
      <p className="text-sm text-gray-400 mb-4">{t.subtitle}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {regionalDisplayData.map((region) => (
          <button
            key={region.id}
            onClick={() => setSelectedRegion(region)}
            className="bg-gray-700 p-4 rounded-lg shadow-md hover:bg-gray-600 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={t.viewDetails(region.name)}
          >
            <h4 className="text-lg font-medium text-blue-200">{region.name}</h4>
            <p className="text-sm text-gray-300">
              {t.hdh} <span className={`font-semibold ${region.idh > 0.7 ? 'text-green-400' : region.idh > 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>{region.idh.toFixed(2)}</span>
            </p>
            <p className="text-sm text-gray-300">{t.policyAdoption} {region.dynamicPolicyAdoption}%</p>
            <p className="text-sm text-gray-300">{t.population} {(region.demographics.population / 1000000).toFixed(2)} M</p>
            <div className="mt-1">
              <span className="text-xs text-gray-400">{t.keyFocus} </span>
              <span className="text-xs text-gray-300">{region.focus}</span>
            </div>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-4 italic">{t.note}</p>
      {selectedRegion && (
        <RegionalDetailModal region={selectedRegion} onClose={() => setSelectedRegion(null)} currentLevel={gameState.currentLevel} />
      )}
    </div>
  );
};

export default RegionalStatusDashboard;
