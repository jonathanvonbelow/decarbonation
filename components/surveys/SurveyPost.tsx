import React, { useState } from 'react';
import { PostSurveyData } from '../../services/supabaseService';
import { useLanguageContext } from '../../contexts/LanguageContext';

export type { PostSurveyData };

interface SurveyPostProps {
  onComplete: (data: PostSurveyData) => void;
  onSkip: () => void;
  resultado: 'victoria' | 'derrota' | 'abandono';
  nivelAlcanzado: number;
}

const T = {
  es: {
    title: 'Encuesta final',
    levelReached: 'Nivel alcanzado:',
    subtitle: 'Tus respuestas nos ayudan a mejorar el juego. Solo toma 2 minutos.',
    resultado: { victoria: '¡Victoria!', derrota: 'Partida terminada', abandono: 'Partida abandonada' },
    learnLabel: '¿Qué aprendiste o te sorprendió durante el juego?',
    placeholder: 'Escribe tu respuesta aquí...',
    diffLabel: (v:number) => `Dificultad percibida (1 = muy fácil, 5 = muy difícil): ${v}`,
    diffMin: 'Muy fácil', diffMax: 'Muy difícil',
    recLabel: '¿Recomendarías este juego a colegas o estudiantes?',
    yes: 'Sí', no: 'No',
    commentsLabel: 'Comentarios adicionales o sugerencias (opcional)',
    commentsPlaceholder: 'Cualquier feedback es bienvenido...',
    submit: 'Enviar respuestas', skip: 'Omitir',
  },
  en: {
    title: 'Final Survey',
    levelReached: 'Level reached:',
    subtitle: 'Your answers help us improve the game. Takes only 2 minutes.',
    resultado: { victoria: 'Victory!', derrota: 'Game over', abandono: 'Game abandoned' },
    learnLabel: 'What did you learn or find surprising during the game?',
    placeholder: 'Write your answer here...',
    diffLabel: (v:number) => `Perceived difficulty (1 = very easy, 5 = very hard): ${v}`,
    diffMin: 'Very easy', diffMax: 'Very hard',
    recLabel: 'Would you recommend this game to colleagues or students?',
    yes: 'Yes', no: 'No',
    commentsLabel: 'Additional comments or suggestions (optional)',
    commentsPlaceholder: 'Any feedback is welcome...',
    submit: 'Submit answers', skip: 'Skip',
  },
} as const;

const SurveyPost: React.FC<SurveyPostProps> = ({ onComplete, onSkip, resultado, nivelAlcanzado }) => {
  const { language } = useLanguageContext();
  const t = T[language];
  const [aprendizaje, setAprendizaje] = useState('');
  const [dificultad, setDificultad] = useState<number>(3);
  const [recomendaria, setRecomendaria] = useState<boolean | undefined>(undefined);
  const [comentarios, setComentarios] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({
      estrategia_efectiva: aprendizaje,
      sorpresa_yn: false,
      cambio_percepcion: dificultad,
      utilidad_docente: recomendaria ? 5 : 2,
      nps: recomendaria ? 9 : 4,
      comentarios,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[1000] p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="post-survey-title">
      <div className="bg-custom-light-gray p-6 sm:p-8 rounded-lg shadow-2xl max-w-lg w-full text-gray-100 max-h-[90vh] flex flex-col">
        <h2 id="post-survey-title" className="text-2xl font-bold mb-1 text-custom-accent">{t.title}</h2>
        <p className="text-gray-400 text-sm mb-1">{t.resultado[resultado]} — {t.levelReached} {nivelAlcanzado}</p>
        <p className="text-gray-400 text-sm mb-5">{t.subtitle}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="post-aprendizaje">{t.learnLabel}</label>
            <textarea id="post-aprendizaje" value={aprendizaje} onChange={e => setAprendizaje(e.target.value)} rows={3}
              placeholder={t.placeholder}
              className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-custom-accent resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t.diffLabel(dificultad)}</label>
            <input type="range" min={1} max={5} step={1} value={dificultad} onChange={e => setDificultad(Number(e.target.value))} className="w-full accent-custom-accent" />
            <div className="flex justify-between text-xs text-gray-500 mt-1"><span>{t.diffMin}</span><span>{t.diffMax}</span></div>
          </div>

          <div>
            <p className="block text-sm font-medium text-gray-300 mb-2">{t.recLabel}</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="recomendaria" value="si" checked={recomendaria === true} onChange={() => setRecomendaria(true)} className="accent-custom-accent" />
                <span className="text-sm">{t.yes}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="recomendaria" value="no" checked={recomendaria === false} onChange={() => setRecomendaria(false)} className="accent-custom-accent" />
                <span className="text-sm">{t.no}</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="post-comentarios">{t.commentsLabel}</label>
            <textarea id="post-comentarios" value={comentarios} onChange={e => setComentarios(e.target.value)} rows={2}
              placeholder={t.commentsPlaceholder}
              className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-custom-accent resize-none" />
          </div>

          <div className="flex gap-3 mt-2">
            <button type="submit" className="flex-1 px-4 py-2 bg-custom-accent hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors text-sm">{t.submit}</button>
            <button type="button" onClick={onSkip} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-sm">{t.skip}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SurveyPost;
