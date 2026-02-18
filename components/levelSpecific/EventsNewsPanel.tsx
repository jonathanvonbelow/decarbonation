import React from 'react';
import { GameState, RandomEvent } from '../../types'; 
import Tooltip from '../common/Tooltip';

interface EventsNewsPanelProps {
  currentEvent: RandomEvent | null;
  newsHeadlines: string[];
  gameState: GameState; 
}

const EventsNewsPanel: React.FC<EventsNewsPanelProps> = ({ currentEvent, newsHeadlines, gameState }) => {
  const getEventTypeColor = (type: RandomEvent['type']) => {
    switch (type) {
      case 'positive': return 'text-green-400 border-green-500';
      case 'negative': return 'text-red-400 border-red-500';
      case 'neutral': return 'text-yellow-400 border-yellow-500';
      default: return 'text-gray-400 border-gray-500';
    }
  };
  
  const getEventIcon = (category: RandomEvent['category']) => {
    switch (category) {
      case 'environmental': return '🌿'; 
      case 'economic': return '💰';      
      case 'social': return '👥';         
      case 'political': return '🏛️';     
      case 'technological': return '💡'; 
      default: return 'ℹ️';          
    }
  };


  return (
    <div className="p-4 bg-gray-800 bg-opacity-70 rounded-lg shadow-xl border border-gray-700 min-h-[200px] flex flex-col">
      <h3 className="text-xl font-semibold text-purple-300 mb-3 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
        Resumen de Eventos y Noticias - Año {gameState.year}
      </h3>

      {currentEvent ? (
        <div className={`p-4 rounded-md border-l-4 ${getEventTypeColor(currentEvent.type)} bg-gray-700 shadow-lg`}>
          <h4 className={`text-lg font-semibold mb-1 ${getEventTypeColor(currentEvent.type)} flex items-center`}>
            <span className="text-2xl mr-2">{getEventIcon(currentEvent.category)}</span>
            EVENTO: {currentEvent.name}
          </h4>
          <p className="text-sm text-gray-300 mb-2">{currentEvent.description}</p>
          {currentEvent.effects(gameState).length > 0 && (
            <div>
              <p className="text-xs text-gray-400 font-semibold">Impactos Clave:</p>
              <ul className="list-disc list-inside pl-1 text-xs text-gray-300">
                {currentEvent.effects(gameState)
                  .filter(effect => effect && typeof effect.indicator === 'string')
                  .map((effect, index) => (
                    <li key={index}>
                      {effect.indicator!.replace('stella.', '')}:
                      {effect.changeAbsolute ? (effect.changeAbsolute > 0 ? ` +${effect.changeAbsolute}` : ` ${effect.changeAbsolute}`) : ''}
                      {effect.changePercentage ? `${effect.changePercentage > 0 ? ' +' : ' '}${(effect.changePercentage * 100).toFixed(0)}%` : ''}
                    </li>
                  ))
                }
              </ul>
            </div>
          )}
        </div>
      ) : newsHeadlines && newsHeadlines.length > 0 ? (
        <div className="space-y-2 flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 pr-2">
          {newsHeadlines.map((headline, index) => (
            <div key={index} className="p-3 bg-gray-700 rounded-md shadow animate-fadeIn">
              <p className="text-sm text-gray-200">📰 <span className="italic">"{headline}"</span></p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-grow flex items-center justify-center">
          <p className="text-gray-500 italic">
            {gameState.isSimulating ? "Recolectando inteligencia..." : `Monitoreando desarrollos nacionales para el Año ${gameState.year}...`}
          </p>
        </div>
      )}
    </div>
  );
};

export default EventsNewsPanel;
