import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage } from '../types';
import { useLanguageContext } from '../contexts/LanguageContext';
import { useSpeech } from '../hooks/useSpeech';
const T = {
  es: { title: 'DecarboNito Asesor', focus: 'Enfoque:', noKey: 'API Key no configurada', thinking: 'DecarboNito está pensando...', placeholder: 'Pregunta a DecarboNito...', inputLabel: 'Tu pregunta para DecarboNito', sendingLabel: 'Enviando pregunta', sendLabel: 'Enviar pregunta', send: 'Enviar', noKeyMsg: 'El chatbot está desactivado porque la API Key no está configurada.', askLabel: (q:string) => `Preguntar: ${q}`, voiceOn: 'Voz activada — click para silenciar a DecarboNito', voiceOff: 'Voz desactivada — click para que DecarboNito hable', speaking: 'Hablando...' },
  en: { title: 'DecarboNito Advisor', focus: 'Focus:', noKey: 'API Key not configured', thinking: 'DecarboNito is thinking...', placeholder: 'Ask DecarboNito...', inputLabel: 'Your question for DecarboNito', sendingLabel: 'Sending question', sendLabel: 'Send question', send: 'Send', noKeyMsg: 'Chatbot is disabled because the API Key is not configured.', askLabel: (q:string) => `Ask: ${q}`, voiceOn: 'Voice on — click to mute DecarboNito', voiceOff: 'Voice off — click to make DecarboNito speak', speaking: 'Speaking...' },
} as const;

type DecarboNitoMood = 'idle' | 'thinking' | 'talking' | 'excited';

const DecarboNitoIcon: React.FC<{ mood: DecarboNitoMood; className?: string }> = ({ mood, className = 'h-16 w-16' }) => {
  const antennaAnim = mood === 'thinking' ? 'animate-bounce' : mood === 'excited' ? 'animate-ping' : 'animate-pulse';
  const eyeAnim = mood === 'thinking' || mood === 'talking' ? 'animate-pulse' : '';
  const headAnim = mood === 'excited' ? 'animate-wiggle' : mood === 'thinking' ? 'animate-bounce' : 'animate-float';

  return (
    <div className={`relative inline-flex items-center justify-center flex-shrink-0 rounded-full bg-gradient-to-br from-custom-accent to-blue-700 shadow-lg shadow-blue-500/40 ${className}`}>
      {mood === 'excited' && (
        <span className="absolute inset-0 rounded-full ring-4 ring-blue-400 animate-ping" aria-hidden="true" />
      )}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className={`h-2/3 w-2/3 text-white ${headAnim}`}
        aria-hidden="true"
      >
        {/* Antena: siempre animada para que se sienta "vivo" — respira en reposo,
            rebota mientras piensa, hace un pulso más urgente cuando reacciona. */}
        <line x1="12" y1="2.5" x2="12" y2="5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="2" r="1.3" fill="currentColor" className={antennaAnim} />

        {/* Cabeza */}
        <rect x="4" y="5.5" width="16" height="13" rx="4.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />

        {/* "Orejas" laterales tipo robot */}
        <line x1="4.5" y1="10" x2="2.5" y2="9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="19.5" y1="10" x2="21.5" y2="9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />

        {/* Ojos: parpadean mientras piensa o habla */}
        <circle cx="9" cy="12" r="1.7" fill="currentColor" className={eyeAnim} />
        <circle cx="15" cy="12" r="1.7" fill="currentColor" className={eyeAnim} />

        {/* Boca: sonrisa fija en reposo, barra animada tipo "hablando" cuando usa la voz */}
        {mood === 'talking' ? (
          <rect x="9.5" y="14.3" width="5" height="2.4" rx="1.2" fill="currentColor" className="animate-talk" style={{ transformOrigin: '12px 15.5px' }} />
        ) : (
          <path d="M9 15.5 Q12 17 15 15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        )}
      </svg>
    </div>
  );
};

const SpeakerIcon: React.FC<{ enabled: boolean }> = ({ enabled }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none" />
    {enabled ? (
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M16.2 8.8a5 5 0 010 6.4" />
        <path d="M18.8 6.2a8.5 8.5 0 010 11.6" />
      </g>
    ) : (
      <path d="M17 9l4.5 6M21.5 9L17 15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    )}
  </svg>
);

interface ChatbotPanelProps {
  messages: ChatMessage[];
  onUserSubmit: (userInput: string) => Promise<void>;
  isLoading: boolean;
  apiKeyAvailable: boolean;
  currentLevelName: string;
  suggestedQuestions: string[];
}

const ChatbotPanel: React.FC<ChatbotPanelProps> = ({ 
  messages, 
  onUserSubmit, 
  isLoading, 
  apiKeyAvailable, 
  currentLevelName,
  suggestedQuestions 
}) => {
  const { language } = useLanguageContext();
  const t = T[language];
  const [userInput, setUserInput] = useState('');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const speech = useSpeech(apiKeyAvailable);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Habla en voz alta cada mensaje nuevo del bot cuando la voz está activada
  // (una sola vez por mensaje, usando el índice ya narrado como referencia).
  const lastSpokenIndexRef = useRef(-1);
  useEffect(() => {
    if (!speech.enabled) return;
    const lastIndex = messages.length - 1;
    if (lastIndex < 0 || lastIndex === lastSpokenIndexRef.current) return;
    lastSpokenIndexRef.current = lastIndex;
    const lastMessage = messages[lastIndex];
    if (lastMessage.sender === 'bot') {
      speech.speak(lastMessage.text, language);
    }
    // Solo depende de la cantidad/contenido de mensajes y de si la voz está
    // activada — `speech.speak` se recrea en cada render pero es estable en efecto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, speech.enabled, language]);

  // Breve reacción "excitada" cuando llega un mensaje destacado (evento de nivel,
  // evento del juego, o mensaje proactivo) — vuelve a reposo después de un momento.
  const [excited, setExcited] = useState(false);
  const prevMessageCountRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      const lastMessage = messages[messages.length - 1];
      const isNotable = lastMessage.sender === 'bot' &&
        (lastMessage.emphasisType === 'level_event' || lastMessage.emphasisType === 'game_event' || lastMessage.emphasisType === 'proactive_bot');
      if (isNotable) {
        setExcited(true);
        const timer = setTimeout(() => setExcited(false), 1600);
        prevMessageCountRef.current = messages.length;
        return () => clearTimeout(timer);
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  const mood: DecarboNitoMood = isLoading ? 'thinking' : speech.isSpeaking ? 'talking' : excited ? 'excited' : 'idle';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading || !apiKeyAvailable) return;
    
    await onUserSubmit(userInput); 
    setUserInput('');
  };

  const handleSuggestedQuestionClick = async (question: string) => {
    if (isLoading || !apiKeyAvailable) return;
    setUserInput(question); // Show it in the input field
    await onUserSubmit(question); // Submit it
    setUserInput(''); // Clear input field after submission
  };


  return (
    <div className="bg-custom-light-gray rounded-lg shadow-xl flex flex-col flex-1 min-h-[400px]">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <DecarboNitoIcon mood={mood} />
          <div className="flex-grow min-w-0">
            <h3 className="text-xl font-semibold text-custom-accent truncate">{t.title}</h3>
            {currentLevelName && <p className="text-xs text-gray-400 truncate">{t.focus} {currentLevelName}</p>}
            {speech.isSpeaking && <p className="text-xs text-blue-400 animate-pulse">{t.speaking}</p>}
          </div>
          {speech.supported && (
            <button
              type="button"
              onClick={speech.toggle}
              className={`p-2.5 rounded-full transition-colors flex-shrink-0 ${speech.enabled ? 'bg-custom-accent text-white' : 'bg-gray-700 text-gray-400 hover:text-gray-200'}`}
              aria-pressed={speech.enabled}
              aria-label={speech.enabled ? t.voiceOn : t.voiceOff}
              title={speech.enabled ? t.voiceOn : t.voiceOff}
            >
              <SpeakerIcon enabled={speech.enabled} />
            </button>
          )}
        </div>
      </div>
      <div className="flex-grow p-4 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-xl shadow ${
                msg.sender === 'user' ? 'bg-blue-600 text-white' : 
                msg.sender === 'bot' ? 
                  (msg.emphasisType === 'level_event' || msg.emphasisType === 'game_event' || msg.emphasisType === 'proactive_bot' ? 
                    'bg-purple-600 text-purple-100' : 
                    'bg-gray-700 text-gray-200') 
                  : (msg.emphasisType === 'system_error' ? 'bg-red-700 text-white text-sm italic' : 'bg-yellow-700 text-black text-sm italic') // Fallback for other system messages if any
            }`}>
              <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
              {msg.sender !== 'system' && <span className="text-xs opacity-70 block mt-1 text-right">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700 sticky bottom-0 bg-custom-light-gray">
        <div className="flex gap-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={!apiKeyAvailable ? t.noKey : isLoading ? t.thinking : t.placeholder}
            className="flex-grow p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-custom-accent focus:border-transparent outline-none text-gray-200 placeholder-gray-500 transition-colors"
            disabled={isLoading || !apiKeyAvailable}
            aria-label={t.inputLabel}
          />
          <button
            type="submit"
            disabled={isLoading || !userInput.trim() || !apiKeyAvailable}
            className="px-6 py-3 bg-custom-accent text-white font-semibold rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75"
            aria-label={isLoading ? t.sendingLabel : t.sendLabel}
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : t.send}
          </button>
        </div>
         {!apiKeyAvailable && <p className="text-xs text-red-400 mt-1">{t.noKeyMsg}</p>}
      
        {apiKeyAvailable && suggestedQuestions.length > 0 && !isLoading && (
          <div className="mt-3 pt-2 border-t border-gray-700/50">
            <p className="text-xs text-gray-400 mb-1.5">Sugerencias:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestedQuestionClick(q)}
                  className="px-2.5 py-1.5 bg-gray-600 hover:bg-gray-500 text-gray-200 text-xs rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                  aria-label={`Preguntar: ${q}`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default ChatbotPanel;