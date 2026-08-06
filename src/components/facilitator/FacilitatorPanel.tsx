import React from 'react';
import { ControlParams } from '../../types';
import { useLanguageContext } from '../../contexts/LanguageContext';

interface FacilitatorPanelProps {
  controlParams: ControlParams;
  onChange: (params: ControlParams) => void;
  onClose: () => void;
}

type NumericParamKey = {
  [K in keyof ControlParams]: ControlParams[K] extends number ? K : never;
}[keyof ControlParams];

const PARAM_GROUPS_ES: { label: string; keys: NumericParamKey[] }[] = [
  { label: 'Crecimiento y población', keys: ['Tasa_Base_Crecimiento_PBI', 'Tasa_Crecimiento_Poblacional_Base', 'Tasa_Impositiva_General_Sobre_PBI'] },
  { label: 'Emisiones y carbono', keys: ['Max_Emisiones_Referencia_Anual', 'Referencia_Max_CO2_per_Capita_Puntaje', 'FACTOR_C_A_CO2EQ', 'CO2_EMISSIONS_SCALING_FACTOR'] },
  { label: 'Presiones políticas — disipación', keys: ['Tasa_disipacion_social', 'Tasa_disipacion_agricola_Nivel_1', 'Tasa_disipacion_agricola_Nivel_2', 'Tasa_disipacion_agricola_Nivel_3', 'Tasa_disipacion_ambientalista_Nivel_1', 'Tasa_disipacion_ambientalista_Nivel_2', 'Tasa_disipacion_ambientalista_Nivel_3'] },
  { label: 'Presupuesto y deuda', keys: ['Pago_deuda_anual_Nivel_1', 'Pago_deuda_anual_Nivel_2', 'Pago_deuda_anual_Nivel_3', 'Tasa_de_interes_Nivel_1', 'Tasa_de_interes_Nivel_2', 'Tasa_de_interes_Nivel_3', 'Monto_del_Prestamo_Unico', 'Ano_Activacion_Prestamo'] },
  { label: 'Presión fiscal (Nivel 3)', keys: ['Max_Additional_Tax_Rate_Percentage', 'EcoSec_Reduction_Factor_Per_Tax_Point', 'SocialConflict_Increase_Factor_Per_Tax_Point', 'PBIGrowth_Reduction_Factor_Per_Tax_Point', 'PPSocial_Increase_Factor_Per_Tax_Point'] },
];

const PARAM_GROUPS_EN: { label: string; keys: NumericParamKey[] }[] = [
  { label: 'Growth & Population', keys: ['Tasa_Base_Crecimiento_PBI', 'Tasa_Crecimiento_Poblacional_Base', 'Tasa_Impositiva_General_Sobre_PBI'] },
  { label: 'Emissions & Carbon', keys: ['Max_Emisiones_Referencia_Anual', 'Referencia_Max_CO2_per_Capita_Puntaje', 'FACTOR_C_A_CO2EQ', 'CO2_EMISSIONS_SCALING_FACTOR'] },
  { label: 'Political Pressures — Dissipation', keys: ['Tasa_disipacion_social', 'Tasa_disipacion_agricola_Nivel_1', 'Tasa_disipacion_agricola_Nivel_2', 'Tasa_disipacion_agricola_Nivel_3', 'Tasa_disipacion_ambientalista_Nivel_1', 'Tasa_disipacion_ambientalista_Nivel_2', 'Tasa_disipacion_ambientalista_Nivel_3'] },
  { label: 'Budget & Debt', keys: ['Pago_deuda_anual_Nivel_1', 'Pago_deuda_anual_Nivel_2', 'Pago_deuda_anual_Nivel_3', 'Tasa_de_interes_Nivel_1', 'Tasa_de_interes_Nivel_2', 'Tasa_de_interes_Nivel_3', 'Monto_del_Prestamo_Unico', 'Ano_Activacion_Prestamo'] },
  { label: 'Fiscal Pressure (Level 3)', keys: ['Max_Additional_Tax_Rate_Percentage', 'EcoSec_Reduction_Factor_Per_Tax_Point', 'SocialConflict_Increase_Factor_Per_Tax_Point', 'PBIGrowth_Reduction_Factor_Per_Tax_Point', 'PPSocial_Increase_Factor_Per_Tax_Point'] },
];

const T = {
  es: { title: 'Panel del Facilitador', closeLabel: 'Cerrar panel', warning: 'Atención: los cambios aquí afectan la simulación en tiempo real. Usar solo con fines de facilitación de talleres.', closeBtn: 'Cerrar' },
  en: { title: 'Facilitator Panel', closeLabel: 'Close panel', warning: 'Warning: changes here affect the simulation in real time. Use only for workshop facilitation purposes.', closeBtn: 'Close' },
} as const;

const FacilitatorPanel: React.FC<FacilitatorPanelProps> = ({ controlParams, onChange, onClose }) => {
  const { language } = useLanguageContext();
  const t = T[language];
  const groups = language === 'es' ? PARAM_GROUPS_ES : PARAM_GROUPS_EN;

  const handleChange = (key: NumericParamKey, value: string) => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) onChange({ ...controlParams, [key]: parsed });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[1000] p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="facilitator-panel-title">
      <div className="bg-custom-light-gray p-6 sm:p-8 rounded-lg shadow-2xl max-w-2xl w-full text-gray-100 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 id="facilitator-panel-title" className="text-2xl font-bold text-custom-accent">{t.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-2xl leading-none" aria-label={t.closeLabel}>&times;</button>
        </div>
        <p className="text-xs text-yellow-400 bg-yellow-900 bg-opacity-40 rounded px-3 py-2 mb-4">{t.warning}</p>

        <div className="overflow-y-auto flex-1 space-y-6 pr-1">
          {groups.map(group => (
            <div key={group.label}>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 border-b border-gray-600 pb-1">{group.label}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {group.keys.map(key => (
                  <div key={key}>
                    <label className="block text-xs text-gray-400 mb-0.5">{key.replace(/_/g, ' ')}</label>
                    <input
                      type="number" step="any"
                      value={controlParams[key] as number}
                      onChange={e => handleChange(key, e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-custom-accent"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button onClick={onClose} className="mt-4 w-full px-4 py-2 bg-custom-accent hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors text-sm">
          {t.closeBtn}
        </button>
      </div>
    </div>
  );
};

export default FacilitatorPanel;
