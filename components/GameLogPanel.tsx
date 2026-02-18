import React, { useState } from 'react';

interface GameLogPanelProps {
  logs: string[];
}

const GameLogPanel: React.FC<GameLogPanelProps> = ({ logs }) => {
  // Starts collapsed by default — feedback indicated this panel is secondary
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-custom-light-gray rounded-lg shadow-xl flex flex-col">
      {/* Header — always visible, acts as toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-700/30 transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-custom-accent focus:ring-opacity-50"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Colapsar registro de actividades' : 'Expandir registro de actividades'}
      >
        <h3 className="text-lg font-semibold text-custom-accent flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 10a2 2 0 00-2 2v.5a.5.5 0 00.5.5h15a.5.5 0 00.5-.5V16a2 2 0 00-2-2H4z" clipRule="evenodd" />
          </svg>
          Registro de Actividades
          {!isExpanded && logs.length > 0 && (
            <span className="ml-2 text-xs bg-gray-600 text-gray-300 px-2 py-0.5 rounded-full">
              {logs.length}
            </span>
          )}
        </h3>
        {/* Chevron icon indicating collapse state */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsible content */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-2 overflow-y-auto max-h-48 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <p key={index} className="text-xs text-gray-400 border-b border-gray-700/50 pb-1 animate-fadeIn">
                {log}
              </p>
            ))
          ) : (
            <p className="text-sm text-gray-500 italic text-center pt-2">Aún no se han registrado actividades.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default GameLogPanel;
