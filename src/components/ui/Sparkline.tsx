import React from 'react';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  className?: string;
}

/**
 * Pure-SVG trend line (no Recharts) meant to embed inside a StatTile. 60×18px by default per
 * mejora-general/files/11_design_system.md §4.4. Not wired into any screen yet.
 */
export const Sparkline: React.FC<SparklineProps> = ({ values, width = 60, height = 18, stroke = 'var(--color-hydro)', className = '' }) => {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = width / (values.length - 1);

  const points = values
    .map((v, i) => `${(i * stepX).toFixed(1)},${(height - ((v - min) / span) * height).toFixed(1)}`)
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export default Sparkline;
