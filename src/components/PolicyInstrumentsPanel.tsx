
import React from 'react';
import { Policy, PolicyState, PolicyInstrument } from '../types';
import Tooltip from './common/Tooltip';
import { useLanguageContext } from '../contexts/LanguageContext';
import { getPolicyName, getInstrumentName } from '../legacyContent/gameData';
import { ANCHORS, useAnchor } from './decarbonito/anchors';
import { tFor, useFormat } from '../i18n';
import { instrumentHint, MARGINAL_EFFORT_STEP, policyView } from '../game/modelView';

interface PolicyInstrumentsPanelProps {
  activePolicies: PolicyState[];
  currentLevel: number;
  handleInstrumentEffortChange: (policyId: Policy, instrumentId: string, effort: number) => void;
  disabled: boolean;
  /** Real GDP, for the current and marginal cost of each policy (phase 50). */
  gdp: number;
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
  // Phase 50: where the instrument weighs (INSTRUMENT_CHANNELS, relevance ≥ 0.6) and its just-transition label;
  // replaces the 1.1 INSTRUMENT_IMPACT_HINTS.
  const hint = instrumentHint(policyId, instrument.id);

  return (
    <div ref={sliderRef} className="p-3 bg-gray-700 rounded-md shadow">
      <div className="flex justify-between items-center mb-1">
        <Tooltip text={instrument.description} position="top">
          <h5 className="text-sm font-medium text-gray-200">{displayName}</h5>
        </Tooltip>
        <span className="text-sm text-blue-300">{instrument.effortPercentage}%</span>
      </div>
      {hint && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {hint.channels.map(({ channel, level }) => (
            <span key={channel} className={`text-[10px] px-1.5 py-0.5 rounded ${level === 'high' ? 'bg-hydro/25 text-bone' : 'bg-basalt-600 text-ash'}`}>
              {tFor(language, level === 'high' ? 'instruments.high' : 'instruments.medium', { channel: tFor(language, `instruments.channel.${channel}` as 'instruments.channel.land') })}
            </span>
          ))}
          {hint.tag !== 'neutral' && (
            <Tooltip text={tFor(language, hint.tag === 'support' ? 'instruments.supportTip' : 'instruments.restrictionTip')} position="top">
              <span className={`text-[10px] px-1.5 py-0.5 rounded cursor-help ${hint.tag === 'support' ? 'bg-chlorophyll/20 text-chlorophyll' : 'bg-ochre/20 text-ochre'}`}>
                {tFor(language, hint.tag === 'support' ? 'instruments.support' : 'instruments.restriction')}
              </span>
            </Tooltip>
          )}
        </div>
      )}
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
  activePolicies, currentLevel, handleInstrumentEffortChange, disabled, gdp,
}) => {
  const { language } = useLanguageContext();
  const fmt = useFormat();
  const t = T[language];
  const panelRef = useAnchor<HTMLDivElement>(ANCHORS.instrumentPanel, t.title(currentLevel));

  if (currentLevel < 2 || activePolicies.length === 0) return null;

  return (
    <div ref={panelRef} className="bg-custom-light-gray p-6 rounded-lg shadow-xl mt-6">
      <h3 className="text-xl font-semibold mb-4 text-custom-accent">{t.title(currentLevel)}</h3>
      <p className="text-sm text-gray-400 mb-2">{t.subtitle}</p>
      <p className="text-xs text-gray-500 mb-4">{tFor(language, 'instruments.hintsNote')}</p>
      <div className="space-y-6">
        {activePolicies.map((policy) => {
          const displayPolicyName = getPolicyName(policy.id, language) || policy.name;
          const view = policyView(policy, gdp);
          return (
            <div key={policy.id} className="p-4 border border-gray-700 rounded-lg bg-gray-800">
              <div className="flex justify-between items-baseline mb-3">
                <h4 className="text-lg font-semibold text-blue-300">{displayPolicyName}</h4>
                <span className="text-sm text-gray-400">{t.effortTotal(policy.totalInstrumentEffortApplied || 0)}</span>
              </div>
              <p data-numeric className="text-xs text-gray-400 mb-3 -mt-2">
                {tFor(language, 'policyToggle.cost', { cost: fmt.big(view.annualCost) })} ·{' '}
                {view.marginalCost10 > 0
                  ? tFor(language, 'instruments.marginal', { step: MARGINAL_EFFORT_STEP, cost: fmt.big(view.marginalCost10) })
                  : tFor(language, 'instruments.marginalFull')}
              </p>
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
