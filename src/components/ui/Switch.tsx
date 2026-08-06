import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: () => void;
  id?: string;
  /** Reason the switch can't be toggled right now (e.g. policy lock-in). Renders as a ring +
   *  aria-describedby instead of a rejected click. */
  disabledReason?: string;
  label?: string;
  className?: string;
}

/**
 * Replaces the ad-hoc checkbox+div toggle in PolicyToggle.tsx (not wired in yet — phase 10).
 * Touch target is the full 44×44 button, not just the visual track.
 */
export const Switch: React.FC<SwitchProps> = ({ checked, onChange, id, disabledReason, label, className = '' }) => {
  const describedBy = disabledReason ? `${id ?? 'switch'}-locked-reason` : undefined;
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        aria-describedby={describedBy}
        disabled={!!disabledReason}
        onClick={onChange}
        className={`relative inline-flex h-11 w-14 shrink-0 items-center rounded-full
          transition-colors duration-[var(--dur-quick)] ease-[var(--ease-settle)]
          ${checked ? 'bg-chlorophyll' : 'bg-basalt-700'}
          ${disabledReason ? 'ring-2 ring-ochre/60 cursor-not-allowed opacity-80' : 'cursor-pointer'}
          ${className}`}
      >
        <span
          className={`inline-block size-7 rounded-full bg-bone shadow transform
            transition-transform duration-[var(--dur-quick)] ease-[var(--ease-settle)]
            ${checked ? 'translate-x-8' : 'translate-x-2'}`}
          aria-hidden
        />
      </button>
      {disabledReason && (
        <span id={describedBy} className="sr-only">
          {disabledReason}
        </span>
      )}
    </span>
  );
};

export default Switch;
