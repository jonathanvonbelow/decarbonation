import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage } from '../types'; 

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
  const [userInput, setUserInput] = useState('');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

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
        <h3 className="text-xl font-semibold text-custom-accent flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          DecarboNito Asesor
        </h3>
        {currentLevelName && <p className="text-xs text-gray-400 ml-8">Enfoque: {currentLevelName}</p>}
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
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={!apiKeyAvailable ? "API Key no configurada" : isLoading ? "DecarboNito está pensando..." : "Pregunta a DecarboNito..."}
            className="flex-grow p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-custom-accent focus:border-transparent outline-none text-gray-200 placeholder-gray-500 transition-colors"
            disabled={isLoading || !apiKeyAvailable}
            aria-label="Tu pregunta para DecarboNito"
          />
          <button
            type="submit"
            disabled={isLoading || !userInput.trim() || !apiKeyAvailable}
            className="px-6 py-3 bg-custom-accent text-white font-semibold rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75"
            aria-label={isLoading ? "Enviando pregunta" : "Enviar pregunta"}
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : 'Enviar'}
          </button>
        </div>
         {!apiKeyAvailable && <p className="text-xs text-red-400 mt-1">El chatbot está desactivado porque la API Key no está configurada.</p>}
      
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