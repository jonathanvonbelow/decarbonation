import React from 'react';
import { useFormat } from '../../i18n';

export type Trend = 'up' | 'down' | 'flat';

interface StatTileProps {
  label: string;
  value: number;
  unit?: string;
  /** Decimal places. Indicators use 1; money uses 0. */
  precision?: number;
  /** Change since previous year, already computed by the sim trace. */
  delta?: number;
  /** true when a rising value is bad (emissions, debt, political pressure). */
  invert?: boolean;
  /** Target line from the active level/route, drawn as a notch on the bar. */
  threshold?: number;
  /** 0–100 indicators render a bar; open-ended values (PBI) don't. */
  scale?: [number, number] | null;
  /** Breakdown of the delta by source — the causal legibility fix (see file 10 §D2). */
  attribution?: Array<{ sourceLabel: string; amount: number }>;
  anchorId?: string;
}

/**
 * The most-used piece of the interface: a single measured value with its trend, an optional
 * 0–100 progress bar with a threshold notch, and (once phase 16's SimTrace feeds it) a
 * per-source attribution shown on hover over the delta pill.
 *
 * Not wired into any screen yet — that's phase 10 (mejora-general/files/19_estetica_visual.md).
 */
export const StatTile: React.FC<StatTileProps> = ({
  label, value, unit, precision = 1, delta, invert = false,
  threshold, scale = [0, 100], attribution, anchorId,
}) => {
  const fmt = useFormat();
  const good = delta === undefined || delta === 0
    ? null
    : invert ? delta < 0 : delta > 0;

  const pct = scale
    ? Math.max(0, Math.min(100, ((value - scale[0]) / (scale[1] - scale[0])) * 100))
    : null;

  return (
    <div
      data-dn-anchor={anchorId}
      className="panel p-4 flex flex-col gap-2 transition-colors duration-[var(--dur-quick)] hover:border-basalt-700"
    >
      <p className="label-eyebrow">{label}</p>

      <div className="flex items-baseline gap-2">
        <output data-numeric className="text-[28px] leading-[30px] text-bone">
          {fmt.num(value, precision)}
        </output>
        {unit && <span className="text-[13px] text-ash-dim">{unit}</span>}

        {delta !== undefined && delta !== 0 && (
          <span
            data-numeric
            className={`ml-auto text-[13px] ${good ? 'text-chlorophyll' : 'text-ember'}`}
            title={attribution?.map((a) => `${a.sourceLabel}: ${fmt.num(a.amount, 1)}`).join(' · ')}
          >
            {delta > 0 ? '▲' : '▼'} {fmt.num(Math.abs(delta), precision)}
          </span>
        )}
      </div>

      {pct !== null && (
        <div className="relative h-1.5 rounded-full bg-basalt-800 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-current transition-[width] duration-[var(--dur-base)] ease-[var(--ease-settle)]"
            style={{
              width: `${pct}%`,
              color: good === false ? 'var(--color-ember)' : 'var(--color-chlorophyll)',
            }}
          />
          {threshold !== undefined && scale && (
            <div
              className="absolute inset-y-[-3px] w-px bg-bone/70"
              style={{ left: `${((threshold - scale[0]) / (scale[1] - scale[0])) * 100}%` }}
              aria-hidden
            />
          )}
        </div>
      )}
    </div>
  );
};

export default StatTile;
