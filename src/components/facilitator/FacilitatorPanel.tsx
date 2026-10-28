import React from 'react';
import { ControlParams } from '../../types';
import { useLanguageContext } from '../../contexts/LanguageContext';
import { PARAM_GROUPS_EN, PARAM_GROUPS_ES, RESTART_PARAM_KEYS, SENSITIVE_PARAM_KEYS, type NumericParamKey } from './paramGroups';

interface FacilitatorPanelProps {
  controlParams: ControlParams;
  onChange: (params: ControlParams) => void;
  onClose: () => void;
}

const T = {
  es: { title: 'Panel del Facilitador', closeLabel: 'Cerrar panel', warning: 'Atención: los cambios aquí afectan la simulación en tiempo real. Usar solo con fines de facilitación de talleres.', closeBtn: 'Cerrar', restart: 'se aplica al empezar o reiniciar un nivel', sensitive: 'muy sensible: cambia la viabilidad de toda cartera (ver Manual del Facilitador)' },
  en: { title: 'Facilitator Panel', closeLabel: 'Close panel', warning: 'Warning: changes here affect the simulation in real time. Use only for workshop facilitation purposes.', closeBtn: 'Close', restart: 'applies when a level starts or restarts', sensitive: 'very sensitive: it changes whether any portfolio is viable (see Facilitator Manual)' },
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
                    {RESTART_PARAM_KEYS.includes(key) && <p className="text-[10px] text-ash-dim mb-0.5">{t.restart}</p>}
                    {SENSITIVE_PARAM_KEYS.includes(key) && <p className="text-[10px] text-yellow-400 mb-0.5">{t.sensitive}</p>}
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
