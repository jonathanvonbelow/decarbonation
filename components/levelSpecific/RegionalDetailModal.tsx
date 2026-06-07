
import React from 'react';
import { DisplayRegionalZoneData } from '../../types';
import { useLanguageContext } from '../../contexts/LanguageContext';

interface RegionalDetailModalProps {
  region: DisplayRegionalZoneData;
  onClose: () => void;
  currentLevel: number;
}

const T = {
  es: {
    close: 'Cerrar modal', summary: 'Resumen General', keyFocus: 'Enfoque Clave', policyAdoption: 'Adopción de Políticas',
    carbonTrend: 'Tendencia Balance Carbono', hdh: 'IDH (Índice Des. Humano)',
    demographics: 'Demografía', population: 'Población', growthRate: 'Tasa de Crecimiento',
    employment: 'Empleo', employmentRate: 'Tasa de Empleo', mainSectors: 'Sectores Principales',
    economicStructure: 'Estructura Económica', agrarian: 'Agraria', commercial: 'Comercial', industrial: 'Industrial',
    droneView: 'Panorama Regional (Vista de Dron Ilustrativa)',
    droneText: (name: string) => `[Espacio para vista panorámica de dron generada por IA de ${name}]\nImagine ver el paisaje reflejando su estado actual y políticas implementadas.`,
    million: 'millones', perYear: '/ año', closeBtn: 'Cerrar',
  },
  en: {
    close: 'Close modal', summary: 'General Summary', keyFocus: 'Key Focus', policyAdoption: 'Policy Adoption',
    carbonTrend: 'Carbon Balance Trend', hdh: 'HDI (Human Dev. Index)',
    demographics: 'Demographics', population: 'Population', growthRate: 'Growth Rate',
    employment: 'Employment', employmentRate: 'Employment Rate', mainSectors: 'Main Sectors',
    economicStructure: 'Economic Structure', agrarian: 'Agrarian', commercial: 'Commercial', industrial: 'Industrial',
    droneView: 'Regional Panorama (Illustrative Drone View)',
    droneText: (name: string) => `[Space for AI-generated drone panorama of ${name}]\nImagine seeing the landscape reflecting its current state and implemented policies.`,
    million: 'million', perYear: '/ year', closeBtn: 'Close',
  },
} as const;

const DetailItem: React.FC<{ label: string; value: string | number; subValue?: string; className?: string }> = ({ label, value, subValue, className }) => (
  <div className={`mb-2 ${className}`}>
    <span className="font-semibold text-gray-300">{label}: </span>
    <span className="text-gray-100">{value}</span>
    {subValue && <span className="text-xs text-gray-400 ml-1">{subValue}</span>}
  </div>
);

const RegionalDetailModal: React.FC<RegionalDetailModalProps> = ({ region, onClose, currentLevel }) => {
  const { language } = useLanguageContext();
  const t = T[language];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby={`regional-detail-title-${region.id}`}>
      <div className="bg-custom-light-gray p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 id={`regional-detail-title-${region.id}`} className="text-2xl font-bold text-blue-400">{region.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none" aria-label={t.close}>&times;</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-blue-300 mb-2 border-b border-gray-700 pb-1">{t.summary}</h3>
            <DetailItem label={t.keyFocus} value={region.focus} />
            <DetailItem label={t.policyAdoption} value={`${region.dynamicPolicyAdoption?.toFixed(1) || region.basePolicyAdoption.toFixed(1)}%`} />
            <DetailItem label={t.carbonTrend} value={region.carbonBalanceTrend} />
            <DetailItem label={t.hdh} value={region.idh.toFixed(3)} className={region.idh > 0.75 ? 'text-green-300' : region.idh > 0.6 ? 'text-yellow-300' : 'text-red-300'} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-300 mb-2 border-b border-gray-700 pb-1">{t.demographics}</h3>
            <DetailItem label={t.population} value={`${(region.demographics.population / 1000000).toFixed(2)} ${t.million}`} />
            <DetailItem label={t.growthRate} value={`${region.demographics.growthRate.toFixed(1)}% ${t.perYear}`} />
            <h3 className="text-lg font-semibold text-blue-300 mt-3 mb-2 border-b border-gray-700 pb-1">{t.employment}</h3>
            <DetailItem label={t.employmentRate} value={`${region.employment.rate.toFixed(1)}%`} />
            <DetailItem label={t.mainSectors} value={region.employment.mainSectors.join(', ')} />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-blue-300 mb-2 border-b border-gray-700 pb-1">{t.economicStructure}</h3>
          <DetailItem label={t.agrarian} value={region.structure.agrarian} />
          <DetailItem label={t.commercial} value={region.structure.commercial} />
          <DetailItem label={t.industrial} value={region.structure.industrial} />
        </div>

        {currentLevel !== 2 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-blue-300 mb-2 border-b border-gray-700 pb-1">{t.droneView}</h3>
            <div className="bg-gray-700 p-4 rounded-md text-center min-h-[150px] flex items-center justify-center">
              <p className="text-gray-400 italic whitespace-pre-line">{t.droneText(region.name)}</p>
            </div>
          </div>
        )}

        <div className="mt-6 text-right">
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">{t.closeBtn}</button>
        </div>
      </div>
    </div>
  );
};

export default RegionalDetailModal;
