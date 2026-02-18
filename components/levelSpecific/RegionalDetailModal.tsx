
import React from 'react';
import { DisplayRegionalZoneData } from '../../types';

interface RegionalDetailModalProps {
  region: DisplayRegionalZoneData;
  onClose: () => void;
  currentLevel: number; 
}

const DetailItem: React.FC<{ label: string; value: string | number; subValue?: string; className?: string }> = ({ label, value, subValue, className }) => (
  <div className={`mb-2 ${className}`}>
    <span className="font-semibold text-gray-300">{label}: </span>
    <span className="text-gray-100">{value}</span>
    {subValue && <span className="text-xs text-gray-400 ml-1">{subValue}</span>}
  </div>
);

const RegionalDetailModal: React.FC<RegionalDetailModalProps> = ({ region, onClose, currentLevel }) => {
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`regional-detail-title-${region.id}`}
    >
      <div 
        className="bg-custom-light-gray p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id={`regional-detail-title-${region.id}`} className="text-2xl font-bold text-blue-400">{region.name}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white text-2xl leading-none"
            aria-label="Cerrar modal"
          >
            &times;
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-blue-300 mb-2 border-b border-gray-700 pb-1">Resumen General</h3>
            <DetailItem label="Enfoque Clave" value={region.focus} />
            <DetailItem label="Adopción de Políticas" value={`${region.dynamicPolicyAdoption?.toFixed(1) || region.basePolicyAdoption.toFixed(1)}%`} />
            <DetailItem label="Tendencia Balance Carbono" value={region.carbonBalanceTrend} />
            <DetailItem label="IDH (Índice Des. Humano)" value={region.idh.toFixed(3)} className={region.idh > 0.75 ? 'text-green-300' : region.idh > 0.6 ? 'text-yellow-300' : 'text-red-300'} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-300 mb-2 border-b border-gray-700 pb-1">Demografía</h3>
            <DetailItem label="Población" value={`${(region.demographics.population / 1000000).toFixed(2)} millones`} />
            <DetailItem label="Tasa de Crecimiento" value={`${region.demographics.growthRate.toFixed(1)}% / año`} />
            
            <h3 className="text-lg font-semibold text-blue-300 mt-3 mb-2 border-b border-gray-700 pb-1">Empleo</h3>
            <DetailItem label="Tasa de Empleo" value={`${region.employment.rate.toFixed(1)}%`} />
            <DetailItem label="Sectores Principales" value={region.employment.mainSectors.join(', ')} />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-blue-300 mb-2 border-b border-gray-700 pb-1">Estructura Económica</h3>
          <DetailItem label="Agraria" value={region.structure.agrarian} />
          <DetailItem label="Comercial" value={region.structure.commercial} />
          <DetailItem label="Industrial" value={region.structure.industrial} />
        </div>

        {currentLevel !== 2 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-blue-300 mb-2 border-b border-gray-700 pb-1">Panorama Regional (Vista de Dron Ilustrativa)</h3>
            <div className="bg-gray-700 p-4 rounded-md text-center min-h-[150px] flex items-center justify-center">
              <p className="text-gray-400 italic">
                [Espacio para vista panorámica de dron generada por IA de {region.name}]
                <br />
                Imagine ver el paisaje reflejando su estado actual y políticas implementadas.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegionalDetailModal;
