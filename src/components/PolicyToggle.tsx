import React from 'react';
import { PolicyState } from '../types';
import Tooltip from './common/Tooltip';
import { useT } from '../i18n';
import { getPolicyName } from '../legacyContent/gameData';
import { ANCHORS, useAnchor } from './decarbonito/anchors';

interface PolicyToggleProps {
  policy: PolicyState;
  onToggle: () => void;
  currentYear: number;
  policyLockInDuration: number;
  currentLevel: number;
}


const PolicyToggle: React.FC<PolicyToggleProps> = ({ policy, onToggle, currentYear, policyLockInDuration, currentLevel }) => {
  const { t, locale } = useT();

  const isLockedForDeactivation =
    policy.isActive &&
    policy.activationYear !== undefined &&
    currentYear < (policy.activationYear + policyLockInDuration);

  // v3 tokens (19_estetica_visual.md §2) — same four-tier logic, reskinned.
  const getEfficiencyColor = (efficiency: number | undefined): string => {
    if (efficiency === undefined) return 'bg-ash-dim';
    if (efficiency > 0.75) return 'bg-chlorophyll';
    if (efficiency > 0.50) return 'bg-ochre';
    if (efficiency > 0.25) return 'bg-ochre';
    return 'bg-ember';
  };

  const getEfficiencyTextColor = (efficiency: number | undefined): string => {
    if (efficiency === undefined) return 'text-ash-dim';
    if (efficiency > 0.75) return 'text-chlorophyll';
    if (efficiency > 0.50) return 'text-ochre';
    if (efficiency > 0.25) return 'text-ochre';
    return 'text-ember';
  };

  const efficiencyPercentage = policy.currentEfficiency !== undefined ? (policy.currentEfficiency * 100).toFixed(0) : null;
  const displayName = getPolicyName(policy.id, locale) || policy.name;
  const rowRef = useAnchor<HTMLDivElement>(ANCHORS.policyRow(policy.id), displayName);

  let baseTooltip: React.ReactNode;
  if (currentLevel >= 2 && policy.isActive && efficiencyPercentage !== null) {
    baseTooltip = (
      <>
        <p className="mb-2">{policy.description}</p>
        <div className="border-t border-gray-600 pt-2 mt-2">
          <p className="font-semibold text-base text-center mb-1">
            {t('policyToggle.currentEfficiency')} <span className={getEfficiencyTextColor(policy.currentEfficiency)}>{efficiencyPercentage}%</span>
          </p>
          <p className="text-xs text-gray-400 text-center">{t('policyToggle.efficiencyNote')}</p>
        </div>
      </>
    );
  } else {
    baseTooltip = <p>{policy.description}</p>;
  }

  let tooltipContent: React.ReactNode;
  if (isLockedForDeactivation && policy.activationYear !== undefined) {
    const unlockYear = policy.activationYear + policyLockInDuration;
    tooltipContent = (
      <div>
        <p className="font-semibold text-yellow-400 mb-2">{t('policyToggle.lockedUntil', { year: unlockYear })}</p>
        {baseTooltip}
      </div>
    );
  } else {
    tooltipContent = baseTooltip;
  }

  return (
    <div ref={rowRef} className={`p-4 rounded-lg border transition-all duration-300 ease-in-out
      ${policy.isActive ? 'bg-chlorophyll/10 border-chlorophyll/40 hover:bg-chlorophyll/15' : 'bg-basalt-800 border-basalt-700 hover:bg-basalt-700'}
      ${isLockedForDeactivation ? 'opacity-80' : ''}
    `}>
      <label htmlFor={policy.id} className={`flex items-center ${isLockedForDeactivation ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
        <div className="relative">
          <input type="checkbox" id={policy.id} className="sr-only" checked={policy.isActive} onChange={onToggle} />
          <div className={`block w-14 h-8 rounded-full transition-colors ${policy.isActive ? 'bg-chlorophyll' : 'bg-basalt-600'}`}></div>
          <div className={`dot absolute left-1 top-1 bg-bone w-6 h-6 rounded-full transition-transform ${policy.isActive ? 'transform translate-x-6' : ''}`}></div>
        </div>
        <div className="ml-3 text-bone font-medium flex items-center">
          <Tooltip content={tooltipContent}>
            <span>
              {displayName}
              {currentLevel >= 2 && policy.isActive && policy.currentEfficiency !== undefined && (
                <span
                  title={t('policyToggle.efficiencyTitle', { value: (policy.currentEfficiency * 100).toFixed(0) })}
                  className={`inline-block w-3 h-3 rounded-full ml-2 ${getEfficiencyColor(policy.currentEfficiency)}`}
                ></span>
              )}
              {isLockedForDeactivation ? <span className="ml-1">🔒</span> : ''}
            </span>
          </Tooltip>
        </div>
      </label>
    </div>
  );
};

export default PolicyToggle;
