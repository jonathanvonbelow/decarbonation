import React, { useEffect } from 'react';

const TINTS: Record<number, string> = {
  1: '111 208 140', // chlorophyll — foundational, vegetal
  2: '224 164  88', // ochre       — agricultural tension
  3: '232  97  60', // ember       — global stakes
};

/**
 * Side-effect-only component: shifts the ambient background tint (--level-tint CSS custom
 * property, declared in src/index.css) when the level changes. Not mounted anywhere yet — the
 * body background it's meant to drive is still the flat phase-1 `bg-custom-gray`, and wiring
 * both together is phase 10's job.
 */
export const LevelAmbience: React.FC<{ level: number }> = ({ level }) => {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--level-tint', TINTS[level] ?? TINTS[1]);
    root.style.setProperty('--level-tint-alpha', level === 3 ? '0.07' : '0.05');
  }, [level]);
  return null;
};

export default LevelAmbience;
