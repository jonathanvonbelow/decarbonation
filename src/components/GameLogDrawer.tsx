/**
 * GameLogDrawer — replaces GameLogPanel.tsx (14_decarbonito_overlay.md §6.2). The activity log
 * stops being a sidebar panel (there is no sidebar anymore, see App.tsx's reflow) and becomes a
 * bottom drawer: a 32px bar with the latest event and a count, expanding to 40vh on click. Reuses
 * GameLogPanel's collapse logic; only the container and position change.
 */
import React, { useState } from 'react';
import { useT } from '../i18n';

interface GameLogDrawerProps {
  logs: string[];
}

const GameLogDrawer: React.FC<GameLogDrawerProps> = ({ logs }) => {
  const { t } = useT();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className="fixed bottom-0 left-0 z-[60] w-full sm:w-[420px] border-t border-r border-basalt-600 bg-basalt-900/95 backdrop-blur-sm shadow-2xl"
      style={{ pointerEvents: 'auto' }}
    >
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full h-8 px-3 flex items-center justify-between text-left hover:bg-basalt-800/60 transition-colors focus:outline-none focus:ring-2 focus:ring-hydro focus:ring-inset"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? t('gameLog.collapse') : t('gameLog.expand')}
      >
        <span className="flex items-center gap-2 min-w-0 text-xs text-ash">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 10a2 2 0 00-2 2v.5a.5.5 0 00.5.5h15a.5.5 0 00.5-.5V16a2 2 0 00-2-2H4z" clipRule="evenodd" />
          </svg>
          <span className="truncate">{logs[0] ?? t('gameLog.empty')}</span>
        </span>
        <span className="flex items-center gap-2 shrink-0 ml-2">
          {logs.length > 0 && <span className="text-[11px] bg-basalt-700 text-ash px-1.5 py-0.5 rounded-full">{logs.length}</span>}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-3.5 w-3.5 text-ash-dim transition-transform duration-200 ${isExpanded ? '' : 'rotate-180'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {isExpanded && (
        <div className="p-3 pt-1 space-y-1.5 overflow-y-auto" style={{ maxHeight: '40vh' }}>
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <p key={index} className="text-xs text-ash-dim border-b border-basalt-700/50 pb-1">{log}</p>
            ))
          ) : (
            <p className="text-sm text-ash-dim italic text-center pt-2">{t('gameLog.empty')}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default GameLogDrawer;
