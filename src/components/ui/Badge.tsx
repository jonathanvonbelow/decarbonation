import React from 'react';

type Tone = 'chlorophyll' | 'ochre' | 'ember' | 'hydro' | 'ash';

interface BadgeProps {
  children: React.ReactNode;
  tone?: Tone;
  title?: string;
  className?: string;
}

const TONE_CLASSES: Record<Tone, string> = {
  chlorophyll: 'bg-chlorophyll/15 text-chlorophyll border-chlorophyll/30',
  ochre: 'bg-ochre/15 text-ochre border-ochre/30',
  ember: 'bg-ember/15 text-ember border-ember/30',
  hydro: 'bg-hydro/15 text-hydro border-hydro/30',
  ash: 'bg-basalt-700 text-ash border-basalt-600',
};

/** Trade-off chip (`↑ Biodiversidad`, `↓ Seg. alimentaria`). Not wired into any screen yet. */
export const Badge: React.FC<BadgeProps> = ({ children, tone = 'ash', title, className = '' }) => (
  <span
    title={title}
    className={`inline-flex items-center gap-1 rounded-[3px] border px-2 py-0.5 text-[13px] font-medium ${TONE_CLASSES[tone]} ${className}`}
  >
    {children}
  </span>
);

export default Badge;
