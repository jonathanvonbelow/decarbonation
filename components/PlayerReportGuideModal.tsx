import React from 'react';
import { PLAYER_REPORT_GUIDE_QUESTIONS } from '../constants';
import { useLanguageContext } from '../contexts/LanguageContext';
import { REPORT_GUIDE_SECTIONS } from '../i18n/gameData';

const T = {
  es: { title: 'Guía de Reflexión Post-Juego / Lecciones Aprendidas', closeLabel: 'Cerrar guía', intro: 'Has llegado al final de esta etapa. Tómate un momento para reflexionar sobre tu experiencia. Usa las siguientes preguntas como guía. Puedes discutir tus respuestas con DecarboNito en el chat.', startReflection: 'Iniciar Reflexión con DecarboNito', closeBtn: 'Cerrar Guía' },
  en: { title: 'Post-Game Reflection Guide / Lessons Learned', closeLabel: 'Close guide', intro: "You've reached the end of this stage. Take a moment to reflect on your experience. Use the following questions as a guide. You can discuss your answers with DecarboNito in the chat.", startReflection: 'Start Reflection with DecarboNito', closeBtn: 'Close Guide' },
} as const;

interface PlayerReportGuideModalProps {
  onClose: () => void;
  reportQuestions: typeof PLAYER_REPORT_GUIDE_QUESTIONS; // Use the type from the imported constant
  onStartBotReflection: () => void;
}

const PlayerReportGuideModal: React.FC<PlayerReportGuideModalProps> = ({ onClose, reportQuestions, onStartBotReflection }) => {
  const { language } = useLanguageContext();
  const t = T[language];
  const sections = REPORT_GUIDE_SECTIONS[language];

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[1000] p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="player-report-title"
      onClick={onClose}
    >
      <div 
        className="bg-custom-light-gray p-6 sm:p-8 rounded-lg shadow-2xl max-w-3xl w-full text-gray-100 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="player-report-title" className="text-2xl sm:text-3xl font-bold text-custom-accent">{t.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none" aria-label={t.closeLabel}>
            &times;
          </button>
        </div>

        <div className="overflow-y-auto flex-grow mb-6 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 pr-2 space-y-4">
          <p className="text-sm text-gray-300">{t.intro}</p>
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h3 className="text-lg font-semibold text-blue-300 mt-3 mb-1">{section.title}</h3>
              <ul className="list-disc list-inside space-y-1 pl-4">
                {section.questions.map((question, qIndex) => (
                  <li key={qIndex} className="text-sm text-gray-200">{question}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t border-gray-700 space-y-3 sm:space-y-0">
          <button onClick={onStartBotReflection} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors w-full sm:w-auto">
            {t.startReflection}
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-custom-accent hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors w-full sm:w-auto">
            {t.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerReportGuideModal;
