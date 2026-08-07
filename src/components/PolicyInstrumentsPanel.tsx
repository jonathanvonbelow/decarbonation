
import React from 'react';
import { Policy, PolicyState, PolicyInstrument } from '../types';
import Tooltip from './common/Tooltip';
import { useLanguageContext } from '../contexts/LanguageContext';
import { getPolicyName, getInstrumentName } from '../legacyContent/gameData';
import { ANCHORS, useAnchor } from './decarbonito/anchors';

interface PolicyInstrumentsPanelProps {
  activePolicies: PolicyState[];
  currentLevel: number;
  handleInstrumentEffortChange: (policyId: Policy, instrumentId: string, effort: number) => void;
  disabled: boolean;
}

const T = {
  es: {
    title: (level: number) => `Instrumentos de Política (Nivel ${level})`,
    subtitle: 'Para cada política activa, asigne esfuerzo (0-100%) a sus instrumentos específicos. El esfuerzo total puede sumar hasta 100%. Esta asignación refinará el impacto de la política.',
    effortTotal: (e: number) => `Esfuerzo Total: ${e}% / 100%`,
    noInstruments: 'No hay instrumentos definidos para esta política.',
    effortLabel: (name: string) => `Esfuerzo para ${name}`,
  },
  en: {
    title: (level: number) => `Policy Instruments (Level ${level})`,
    subtitle: 'For each active policy, assign effort (0-100%) to its specific instruments. Total effort can sum up to 100%. This allocation will refine the policy impact.',
    effortTotal: (e: number) => `Total Effort: ${e}% / 100%`,
    noInstruments: 'No instruments defined for this policy.',
    effortLabel: (name: string) => `Effort for ${name}`,
  },
} as const;

const InstrumentControl: React.FC<{
  policyId: Policy;
  instrument: PolicyInstrument;
  onEffortChange: (policyId: Policy, instrumentId: string, effort: number) => void;
  disabled: boolean;
}> = ({ policyId, instrument, onEffortChange, disabled }) => {
  const { language } = useLanguageContext();
  const t = T[language];
  const displayName = getInstrumentName(instrument.id, language) || instrument.name;
  const sliderRef = useAnchor<HTMLDivElement>(ANCHORS.instrumentSlider(instrument.id), displayName);

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onEffortChange(policyId, instrument.id, parseInt(event.target.value, 10));
  };

  return (
    <div ref={sliderRef} className="p-3 bg-gray-700 rounded-md shadow">
      <div className="flex justify-between items-center mb-1">
        <Tooltip text={instrument.description} position="top">
          <h5 className="text-sm font-medium text-gray-200">{displayName}</h5>
        </Tooltip>
        <span className="text-sm text-blue-300">{instrument.effortPercentage}%</span>
      </div>
      <input
        type="range" min="0" max="100" step="5"
        value={instrument.effortPercentage}
        onChange={handleSliderChange}
        disabled={disabled}
        className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${disabled ? 'bg-gray-600' : 'bg-gray-500 accent-blue-500 hover:accent-blue-400'}`}
        aria-label={t.effortLabel(displayName)}
      />
    </div>
  );
};

const PolicyInstrumentsPanel: React.FC<PolicyInstrumentsPanelProps> = ({
  activePolicies, currentLevel, handleInstrumentEffortChange, disabled,
}) => {
  const { language } = useLanguageContext();
  const t = T[language];
  const panelRef = useAnchor<HTMLDivElement>(ANCHORS.instrumentPanel, t.title(currentLevel));

  if (currentLevel < 2 || activePolicies.length === 0) return null;

  return (
    <div ref={panelRef} className="bg-custom-light-gray p-6 rounded-lg shadow-xl mt-6">
      <h3 className="text-xl font-semibold mb-4 text-custom-accent">{t.title(currentLevel)}</h3>
      <p className="text-sm text-gray-400 mb-4">{t.subtitle}</p>
      <div className="space-y-6">
        {activePolicies.map((policy) => {
          const displayPolicyName = getPolicyName(policy.id, language) || policy.name;
          return (
            <div key={policy.id} className="p-4 border border-gray-700 rounded-lg bg-gray-800">
              <div className="flex justify-between items-baseline mb-3">
                <h4 className="text-lg font-semibold text-blue-300">{displayPolicyName}</h4>
                <span className="text-sm text-gray-400">{t.effortTotal(policy.totalInstrumentEffortApplied || 0)}</span>
              </div>
              {policy.instruments && Object.values(policy.instruments).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(Object.values(policy.instruments) as PolicyInstrument[]).map((instrument) => (
                    <InstrumentControl
                      key={instrument.id} policyId={policy.id} instrument={instrument}
                      onEffortChange={handleInstrumentEffortChange} disabled={disabled}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">{t.noInstruments}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PolicyInstrumentsPanel;
