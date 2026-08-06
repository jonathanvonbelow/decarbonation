import React from 'react';
import type { GameState } from '../../types';
import { evaluateLevel, type RouteId } from '../../sim';
import { useT, useFormat } from '../../i18n';
import { ANCHORS, useAnchor } from '../decarbonito/anchors';

interface WinRoutesPanelProps {
  gameState: GameState;
}

const ACCENT_CLASSES: Record<string, string> = {
  chlorophyll: 'border-green-500 text-green-400',
  ochre: 'border-yellow-500 text-yellow-400',
  hydro: 'border-blue-400 text-blue-300',
  bone: 'border-gray-300 text-gray-200',
};

/**
 * "Rutas de Victoria" panel (mejora-general/files/17_multiples_vias_victoria.md §4.1). Uses the
 * *existing* Tailwind tokens (bg-custom-light-gray, etc.), not the phase-4 basalt-* palette —
 * consistent with the "phase 10 does the reskin" boundary from that phase's design log entry.
 * Cards sort by progress descending and never label any route as "the correct one".
 */
export const WinRoutesPanel: React.FC<WinRoutesPanelProps> = ({ gameState }) => {
  const { t } = useT();
  const fmt = useFormat();
  const baseline: GameState = { ...gameState, indicators: gameState.levelBaseline };
  const outcome = evaluateLevel(gameState, baseline);
  // useAnchor sets the same data-dn-anchor attribute this panel already carried, but now the id
  // is also registered in the live registry (src/components/decarbonito/anchors.ts) so DecarboNito
  // and the tutorial engine (phase 9) can actually find and point at this panel, not just style it.
  const panelRef = useAnchor<HTMLDivElement>(ANCHORS.winRoutesPanel, t('routes.panelTitle'));

  const sortedRoutes = [...outcome.routes].sort((a, b) => b.progress - a.progress);
  const leaderId: RouteId | null = sortedRoutes[0]?.route.id ?? null;

  return (
    <div ref={panelRef} className="bg-custom-light-gray rounded-lg shadow-xl p-4">
      <h3 className="text-lg font-semibold text-custom-accent mb-1">{t('routes.panelTitle')}</h3>
      <p className="text-xs text-gray-400 mb-3">{t('routes.panelSubtitle')}</p>

      {!outcome.floorsMet && (
        <p className="text-xs text-red-400 mb-3 border border-red-700 rounded px-2 py-1">
          {t('routes.floorsBroken')}: {outcome.failedFloors.map((f) => t(f.labelKey as any)).join(', ')}
        </p>
      )}

      <div className="space-y-3">
        {sortedRoutes.map((rp) => {
          const isLeader = rp.route.id === leaderId;
          const accent = ACCENT_CLASSES[rp.route.accent] ?? ACCENT_CLASSES.bone;
          return (
            <div
              key={rp.route.id}
              className={`rounded-lg border p-3 transition-opacity ${accent} ${isLeader ? 'opacity-100' : 'opacity-70'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm">{t(rp.route.nameKey as any)}</span>
                <span className="text-xs tabular-nums">{fmt.pct(rp.progress * 100, 0)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-700 overflow-hidden mb-2">
                <div
                  className="h-full rounded-full bg-current transition-[width] duration-300"
                  style={{ width: `${rp.progress * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-400 mb-1">{t(rp.route.taglineKey as any)}</p>
              {!rp.met && rp.bottleneck && (
                <p className="text-[11px] text-gray-300">
                  {t('routes.bottleneck', { condition: t(rp.bottleneck.labelKey as any), gap: '' }).replace(' ()', '')}
                </p>
              )}
              {rp.met && (
                <p className="text-[11px] text-green-400">✓ {t('routes.achieved', { route: t(rp.route.nameKey as any) })}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WinRoutesPanel;
