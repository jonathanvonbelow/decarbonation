import React from 'react';

interface EffortSliderProps {
  label: string;
  value: number;
  /** How much of the shared 100% budget is left, counting this slider's own current value. */
  remaining: number;
  onChange: (value: number) => void;
  id?: string;
  className?: string;
}

/**
 * Effort slider for policy instruments (level 2+), sharing a 100% budget across siblings.
 * The exhausted zone is shown visually (ash-dim fill past what's left), not communicated after
 * the fact with an error toast — see mejora-general/files/11_design_system.md §4.4.
 * Not wired into any screen yet — PolicyInstrumentsPanel migration is phase 10.
 */
export const EffortSlider: React.FC<EffortSliderProps> = ({ label, value, remaining, onChange, id, className = '' }) => {
  const exhaustedFrom = Math.min(100, value + remaining);
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-[15px] text-bone">{label}</label>
        <output htmlFor={id} data-numeric className="text-[13px] text-ash">{value}%</output>
      </div>
      <div className="relative h-2 rounded-full bg-basalt-800 overflow-hidden">
        {/* Exhausted zone: what's already committed to sibling instruments. */}
        <div
          className="absolute inset-y-0 right-0 bg-ash-dim/40"
          style={{ width: `${100 - exhaustedFrom}%` }}
          aria-hidden
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-hydro transition-[width] duration-[var(--dur-quick)] ease-[var(--ease-settle)]"
          style={{ width: `${value}%` }}
          aria-hidden
        />
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={exhaustedFrom}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-hydro"
        aria-valuetext={`${value}%`}
      />
    </div>
  );
};

export default EffortSlider;
