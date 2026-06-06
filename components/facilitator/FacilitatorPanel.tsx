import React from 'react';
import { ControlParams } from '../../types';

interface FacilitatorPanelProps {
  controlParams: ControlParams;
  onChange: (params: ControlParams) => void;
  onClose: () => void;
}

type NumberParamKey = {
  [K in keyof ControlParams]: ControlParams[K] extends number ? K : never;
}[keyof ControlParams];

const PARAM_GROUPS: { label: string; params: { key: NumberParamKey; label: string; min: number; max: number; step: number }[] }[] = [
  {
    label: 'Poblacion y crecimiento',
    params: [
      { key: 'Tasa_Crecimiento_Poblacional_Base', label: 'Tasa crec. poblacional', min: 0, max: 0.05, step: 0.001 },
      { key: 'Tasa_Base_Crecimiento_PBI', label: 'Tasa crec. PBI base', min: 0, max: 0.1, step: 0.005 },
    ],
  },
  {
    label: 'Emisiones CO2',
    params: [
      { key: 'FACTOR_C_A_CO2EQ', label: 'Factor C a CO2eq', min: 1, max: 5, step: 0.1 },
      { key: 'Tasa_Transicion_Emisiones_Base', label: 'Tasa transicion emisiones', min: 0, max: 1, step: 0.05 },
      { key: 'Punto_Saturacion_Emisiones', label: 'Punto saturacion emisiones', min: 0, max: 10, step: 0.5 },
    ],
  },
  {
    label: 'Presiones politicas',
    params: [
      { key: 'Factor_Impulso_Presion_Agricola', label: 'Impulso presion agricola', min: 0, max: 20, step: 1 },
      { key: 'Factor_Impulso_Presion_Ambientalista', label: 'Impulso presion ambiental', min: 0, max: 20, step: 1 },
      { key: 'Factor_Impulso_Presion_Social', label: 'Impulso presion social', min: 0, max: 20, step: 1 },
      { key: 'Tasa_disipacion_social', label: 'Disipacion social', min: 0, max: 0.3, step: 0.01 },
    ],
  },
  {
    label: 'Ponderaciones puntaje',
    params: [
      { key: 'Ponderacion_CO2_Nivel_1', label: 'Pond. CO2 N1', min: 0, max: 1, step: 0.05 },
      { key: 'Ponderacion_Externalidades_Nivel_1', label: 'Pond. Ext N1', min: 0, max: 1, step: 0.05 },
      { key: 'Ponderacion_Usos_coberturas_Nivel_1', label: 'Pond. Usos N1', min: 0, max: 1, step: 0.05 },
    ],
  },
  {
    label: 'Finanzas',
    params: [
      { key: 'Tasa_Impositiva_General_Sobre_PBI', label: 'Tasa impositiva PBI', min: 0, max: 0.5, step: 0.01 },
      { key: 'Pago_deuda_anual_Nivel_1', label: 'Pago deuda anual N1', min: 0, max: 0.5, step: 0.01 },
      { key: 'Pago_deuda_anual_Nivel_2', label: 'Pago deuda anual N2', min: 0, max: 0.5, step: 0.01 },
      { key: 'Pago_deuda_anual_Nivel_3', label: 'Pago deuda anual N3', min: 0, max: 0.5, step: 0.01 },
    ],
  },
];

const FacilitatorPanel: React.FC<FacilitatorPanelProps> = ({ controlParams, onChange, onClose }) => {
  const handleChange = (key: NumberParamKey, value: number) => {
    onChange({ ...controlParams, [key]: value });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[1000] p-4">
      <div className="bg-custom-light-gray rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-xl font-bold text-custom-accent">Panel del Facilitador</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors focus:outline-none"
            aria-label="Cerrar panel"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-6 flex-1">
          <p className="text-gray-400 text-sm">
            Estos parametros modifican la simulacion en tiempo real. Los cambios se aplican a partir del proximo round.
          </p>

          {PARAM_GROUPS.map(group => (
            <div key={group.label}>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
                {group.label}
              </h3>
              <div className="space-y-3">
                {group.params.map(({ key, label, min, max, step }) => {
                  const currentValue = controlParams[key] as number;
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <label className="text-xs text-gray-400 w-48 shrink-0">{label}</label>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={currentValue}
                        onChange={e => handleChange(key, parseFloat(e.target.value))}
                        className="flex-1 accent-custom-accent"
                      />
                      <span className="text-xs text-gray-300 w-16 text-right font-mono">
                        {currentValue.toFixed(step < 0.01 ? 4 : step < 0.1 ? 3 : step < 1 ? 2 : 1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-custom-accent hover:opacity-90 text-white font-semibold rounded-lg transition-opacity focus:outline-none focus:ring-2 focus:ring-custom-accent"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default FacilitatorPanel;
