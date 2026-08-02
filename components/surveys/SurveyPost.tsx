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

// Trimmed to the 4-question minimal spec — see
// ultimo-ajuste/05_datos_minimos_supabase.md section 2.
const T = {
  es: {
    title: 'Encuesta final',
    levelReached: 'Nivel alcanzado:',
    subtitle: 'Tus respuestas nos ayudan a mejorar el juego. Solo toma 2 minutos.',
    resultado: { victoria: '¡Victoria!', derrota: 'Partida terminada', abandono: 'Partida abandonada' },
    sintesisLabel: (v: number) => `¿Qué tan útil te resultó la devolución final para pensar tu propio contexto? (1 = nada útil, 5 = muy útil): ${v}`,
    sintesisMin: 'Nada útil', sintesisMax: 'Muy útil',
    sorpresaLabel: '¿Algo te sorprendió del comportamiento del sistema?',
    yes: 'Sí', no: 'No',
    sorpresaPlaceholder: '¿Qué te sorprendió? (opcional)',
    npsLabel: (v: number) => `¿Recomendarías esta herramienta a un colega? (0 = para nada, 10 = totalmente): ${v}`,
    commentsLabel: 'Comentarios adicionales o sugerencias (opcional)',
    commentsPlaceholder: 'Cualquier feedback es bienvenido...',
    submit: 'Enviar respuestas', skip: 'Omitir',
  },
  en: {
    title: 'Final Survey',
    levelReached: 'Level reached:',
    subtitle: 'Your answers help us improve the game. Takes only 2 minutes.',
    resultado: { victoria: 'Victory!', derrota: 'Game over', abandono: 'Game abandoned' },
    sintesisLabel: (v: number) => `How useful was the closing synthesis for thinking about your own context? (1 = not useful, 5 = very useful): ${v}`,
    sintesisMin: 'Not useful', sintesisMax: 'Very useful',
    sorpresaLabel: 'Did anything about the system surprise you?',
    yes: 'Yes', no: 'No',
    sorpresaPlaceholder: 'What surprised you? (optional)',
    npsLabel: (v: number) => `Would you recommend this tool to a colleague? (0 = not at all, 10 = definitely): ${v}`,
    commentsLabel: 'Additional comments or suggestions (optional)',
    commentsPlaceholder: 'Any feedback is welcome...',
    submit: 'Submit answers', skip: 'Skip',
  },
} as const;

const SurveyPost: React.FC<SurveyPostProps> = ({ onComplete, onSkip, resultado, nivelAlcanzado }) => {
  const { language } = useLanguageContext();
  const t = T[language];
  const [utilidadSintesis, setUtilidadSintesis] = useState<number>(3);
  const [sorpresaYn, setSorpresaYn] = useState<boolean | undefined>(undefined);
  const [sorpresaTexto, setSorpresaTexto] = useState('');
  const [nps, setNps] = useState<number>(5);
  const [comentarios, setComentarios] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({
      utilidad_sintesis: utilidadSintesis,
      sorpresa_yn: !!sorpresaYn,
      sorpresa_texto: sorpresaTexto || undefined,
      nps,
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
            <label className="block text-sm font-medium text-gray-300 mb-2">{t.sintesisLabel(utilidadSintesis)}</label>
            <input type="range" min={1} max={5} step={1} value={utilidadSintesis} onChange={e => setUtilidadSintesis(Number(e.target.value))} className="w-full accent-custom-accent" />
            <div className="flex justify-between text-xs text-gray-500 mt-1"><span>{t.sintesisMin}</span><span>{t.sintesisMax}</span></div>
          </div>

          <div>
            <p className="block text-sm font-medium text-gray-300 mb-2">{t.sorpresaLabel}</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="sorpresaYn" value="si" checked={sorpresaYn === true} onChange={() => setSorpresaYn(true)} className="accent-custom-accent" />
                <span className="text-sm">{t.yes}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="sorpresaYn" value="no" checked={sorpresaYn === false} onChange={() => setSorpresaYn(false)} className="accent-custom-accent" />
                <span className="text-sm">{t.no}</span>
              </label>
            </div>
            {sorpresaYn === true && (
              <input type="text" value={sorpresaTexto} onChange={e => setSorpresaTexto(e.target.value)}
                placeholder={t.sorpresaPlaceholder}
                className="w-full mt-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-custom-accent" />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t.npsLabel(nps)}</label>
            <input type="range" min={0} max={10} step={1} value={nps} onChange={e => setNps(Number(e.target.value))} className="w-full accent-custom-accent" />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              {Array.from({ length: 11 }, (_, i) => <span key={i}>{i}</span>)}
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
