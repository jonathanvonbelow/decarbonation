
import React from 'react';
import { Policy, PolicyState, PolicyInstrument } from '../types';
import Tooltip from './common/Tooltip';

interface PolicyInstrumentsPanelProps {
  activePolicies: PolicyState[];
  currentLevel: number;
  handleInstrumentEffortChange: (policyId: Policy, instrumentId: string, effort: number) => void;
  disabled: boolean;
}

const InstrumentControl: React.FC<{
  policyId: Policy;
  instrument: PolicyInstrument;
  onEffortChange: (policyId: Policy, instrumentId: string, effort: number) => void;
  disabled: boolean;
}> = ({ policyId, instrument, onEffortChange, disabled }) => {
  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onEffortChange(policyId, instrument.id, parseInt(event.target.value, 10));
  };

  return (
    <div className="p-3 bg-gray-700 rounded-md shadow">
      <div className="flex justify-between items-center mb-1">
        <Tooltip text={instrument.description} position="top">
          <h5 className="text-sm font-medium text-gray-200">{instrument.name}</h5>
        </Tooltip>
        <span className="text-sm text-blue-300">{instrument.effortPercentage}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        step="5"
        value={instrument.effortPercentage}
        onChange={handleSliderChange}
        disabled={disabled}
        className={`w-full h-2 rounded-lg appearance-none cursor-pointer 
                    ${disabled ? 'bg-gray-600' : 'bg-gray-500 accent-blue-500 hover:accent-blue-400'}`}
        aria-label={`Esfuerzo para ${instrument.name}`}
      />
    </div>
  );
};

const PolicyInstrumentsPanel: React.FC<PolicyInstrumentsPanelProps> = ({
  activePolicies,
  currentLevel,
  handleInstrumentEffortChange,
  disabled,
}) => {
  if (currentLevel < 2 || activePolicies.length === 0) {
    return null;
  }

  return (
    <div className="bg-custom-light-gray p-6 rounded-lg shadow-xl mt-6">
      <h3 className="text-xl font-semibold mb-4 text-custom-accent">Instrumentos de Política (Nivel {currentLevel})</h3>
      <p className="text-sm text-gray-400 mb-4">
        Para cada política activa a continuación, asigne esfuerzo (0-100%) a sus instrumentos específicos.
        El esfuerzo total para los instrumentos de una política puede sumar hasta 100%.
        Esta asignación detallada refinará el impacto de la política.
      </p>
      <div className="space-y-6">
        {activePolicies.map((policy) => (
          <div key={policy.id} className="p-4 border border-gray-700 rounded-lg bg-gray-800">
            <div className="flex justify-between items-baseline mb-3">
              <h4 className="text-lg font-semibold text-blue-300">{policy.name}</h4>
              <span className="text-sm text-gray-400">
                Esfuerzo Total: {policy.totalInstrumentEffortApplied || 0}% / 100%
              </span>
            </div>
            {policy.instruments && Object.values(policy.instruments).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.values(policy.instruments).map((instrument) => (
                  <InstrumentControl
                    key={instrument.id}
                    policyId={policy.id}
                    instrument={instrument}
                    onEffortChange={handleInstrumentEffortChange}
                    disabled={disabled}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No hay instrumentos definidos para esta política.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PolicyInstrumentsPanel;
