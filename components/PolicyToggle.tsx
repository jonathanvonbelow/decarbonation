import React from 'react';
import { PolicyState } from '../types';
import Tooltip from './common/Tooltip';

interface PolicyToggleProps {
  policy: PolicyState;
  onToggle: () => void;
  currentYear: number;
  policyLockInDuration: number;
  currentLevel: number; // Added to control visibility of efficiency dot
}

const PolicyToggle: React.FC<PolicyToggleProps> = ({ policy, onToggle, currentYear, policyLockInDuration, currentLevel }) => {
  const isLockedForDeactivation =
    policy.isActive &&
    policy.activationYear !== undefined &&
    currentYear < (policy.activationYear + policyLockInDuration);

  const getEfficiencyColor = (efficiency: number | undefined): string => {
    if (efficiency === undefined) return 'bg-gray-400';
    if (efficiency > 0.75) return 'bg-green-500';
    if (efficiency > 0.50) return 'bg-yellow-500';
    if (efficiency > 0.25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getEfficiencyTextColor = (efficiency: number | undefined): string => {
    if (efficiency === undefined) return 'text-gray-400';
    if (efficiency > 0.75) return 'text-green-400';
    if (efficiency > 0.50) return 'text-yellow-400';
    if (efficiency > 0.25) return 'text-orange-400';
    return 'text-red-400';
  };

  const efficiencyPercentage = policy.currentEfficiency !== undefined ? (policy.currentEfficiency * 100).toFixed(0) : null;

  let baseTooltip: React.ReactNode;

  if (currentLevel >= 2 && policy.isActive && efficiencyPercentage !== null) {
    baseTooltip = (
      <>
        <p className="mb-2">{policy.description}</p>
        <div className="border-t border-gray-600 pt-2 mt-2">
            <p className="font-semibold text-base text-center mb-1">
                Eficiencia Actual: <span className={getEfficiencyTextColor(policy.currentEfficiency)}>{efficiencyPercentage}%</span>
            </p>
            <p className="text-xs text-gray-400 text-center">
              La eficiencia varía con el tiempo y factores políticos.
            </p>
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
            <p className="font-semibold text-yellow-400 mb-2">
                🔒 Bloqueada hasta el año {unlockYear}.
            </p>
            {baseTooltip}
        </div>
    );
  } else {
    tooltipContent = baseTooltip;
  }


  return (
    <div className={`p-4 rounded-lg shadow-md transition-all duration-300 ease-in-out
      ${policy.isActive ? 'bg-green-700 hover:bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}
      ${isLockedForDeactivation ? 'opacity-80' : ''}
    `}>
      <label htmlFor={policy.id} className={`flex items-center ${isLockedForDeactivation ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
        <div className="relative">
          <input
            type="checkbox"
            id={policy.id}
            className="sr-only"
            checked={policy.isActive}
            onChange={onToggle}
          />
          <div className={`block w-14 h-8 rounded-full transition-colors ${policy.isActive ? 'bg-green-500' : 'bg-gray-600'}`}></div>
          <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${policy.isActive ? 'transform translate-x-6' : ''}`}></div>
        </div>
        <div className="ml-3 text-gray-200 font-medium flex items-center">
          <Tooltip content={tooltipContent}>
            <span>
              {policy.name}
              {currentLevel >= 2 && policy.isActive && policy.currentEfficiency !== undefined && (
                <span
                  title={`Eficiencia: ${(policy.currentEfficiency * 100).toFixed(0)}%`}
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