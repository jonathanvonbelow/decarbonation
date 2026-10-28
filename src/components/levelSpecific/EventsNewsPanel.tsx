import React from 'react';
import { GameState, RandomEvent } from '../../types';
import { useLanguageContext } from '../../contexts/LanguageContext';
import { eventArtUrl } from '../../territorio/newsArt';
import { ALL_RANDOM_EVENTS } from '../../constants';
import { getEventDescription, getEventName } from '../../legacyContent/gameData';
const T = {
  es: { title: (y:number) => `Resumen de Eventos y Noticias - Año ${y}`, event: 'EVENTO:', impacts: 'Impactos Clave:', simulating: 'Recolectando inteligencia...', monitoring: (y:number) => `Monitoreando desarrollos nacionales para el Año ${y}...`, several: (n:number) => `${n} eventos este año (cada evento se sortea por separado: pueden coincidir).` },
  en: { title: (y:number) => `Events and News Summary - Year ${y}`, event: 'EVENT:', impacts: 'Key Impacts:', simulating: 'Gathering intelligence...', monitoring: (y:number) => `Monitoring national developments for Year ${y}...`, several: (n:number) => `${n} events this year (each event is drawn separately: they can coincide).` },
} as const;

interface EventsNewsPanelProps {
  newsHeadlines: string[];
  gameState: GameState;
}

/**
 * Level-3 events of the last simulated year. Since model 2.0 (phase 46) every event is drawn independently, so a year
 * can bring several: the panel lists all of them (`GameState.eventsThisYear`, phase 50), falling back to the last one
 * (`currentEvent`) for a state saved before phase 50. With no event, the AI headlines of the year.
 */
const EventsNewsPanel: React.FC<EventsNewsPanelProps> = ({ newsHeadlines, gameState }) => {
  const { language } = useLanguageContext();
  const t = T[language];
  // Each event is drawn in each of the 12 monthly sub-steps, so the same one can fire twice in a year: one card per
  // distinct event, with how many times it fired.
  const ids = gameState.eventsThisYear ?? (gameState.currentEvent ? [gameState.currentEvent.id] : []);
  const timesFired = ids.reduce<Record<string, number>>((acc, id) => ({ ...acc, [id]: (acc[id] ?? 0) + 1 }), {});
  const events: RandomEvent[] = Object.keys(timesFired).flatMap((id) => {
    const def = ALL_RANDOM_EVENTS.find((e) => e.id === id) ?? (gameState.currentEvent?.id === id ? gameState.currentEvent : undefined);
    return def ? [def] : [];
  });
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

  const renderEvent = (event: RandomEvent, withArt: boolean) => {
    const eventArt = withArt ? eventArtUrl(event.id) : null;
    const effects = event.effects(gameState).filter((effect) => effect && typeof effect.indicator === 'string');
    return (
      <div key={event.id} className={`rounded-md border-l-4 ${getEventTypeColor(event.type)} bg-gray-700 shadow-lg overflow-hidden`}>
        {/* Agency photo of what the event is about, when the pack has one for it (newsArt.ts); only the first
            event of the year carries it, so several events do not stack photographs. */}
        {eventArt && <img src={eventArt} alt="" loading="lazy" className="h-28 w-full object-cover" />}
        <div className="p-4">
          <h4 className={`text-lg font-semibold mb-1 ${getEventTypeColor(event.type)} flex items-center`}>
            <span className="text-2xl mr-2">{getEventIcon(event.category)}</span>
            {t.event} {getEventName(event.id, language) || event.name}{(timesFired[event.id] ?? 1) > 1 ? ` ×${timesFired[event.id]}` : ''}
          </h4>
          <p className="text-sm text-gray-300 mb-2">{getEventDescription(event.id, language, event.description)}</p>
          {effects.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 font-semibold">{t.impacts}</p>
              <ul className="list-disc list-inside pl-1 text-xs text-gray-300">
                {effects.map((effect, index) => (
                  <li key={index}>
                    {effect.indicator!.replace('stella.', '')}:
                    {effect.changeAbsolute ? (effect.changeAbsolute > 0 ? ` +${effect.changeAbsolute}` : ` ${effect.changeAbsolute}`) : ''}
                    {effect.changePercentage ? `${effect.changePercentage > 0 ? ' +' : ' '}${(effect.changePercentage * 100).toFixed(0)}%` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 bg-gray-800 bg-opacity-70 rounded-lg shadow-xl border border-gray-700 min-h-[200px] flex flex-col">
      <h3 className="text-xl font-semibold text-purple-300 mb-3 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
        {t.title(gameState.year)}
      </h3>

      {events.length > 0 ? (
        <div className="space-y-3 flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 pr-1">
          {ids.length > 1 && <p className="text-xs text-gray-400">{t.several(ids.length)}</p>}
          {events.map((event, i) => renderEvent(event, i === 0))}
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
            {gameState.isSimulating ? t.simulating : t.monitoring(gameState.year)}
          </p>
        </div>
      )}
    </div>
  );
};

export default EventsNewsPanel;
