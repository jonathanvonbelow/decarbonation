import React, { useState } from 'react';
import { PostSurveyData } from '../../services/supabaseService';

export type { PostSurveyData };

interface SurveyPostProps {
  onComplete: (data: PostSurveyData) => void;
  onSkip: () => void;
  resultado: 'victoria' | 'derrota' | 'abandono';
  nivelAlcanzado: number;
}

const SurveyPost: React.FC<SurveyPostProps> = ({ onComplete, onSkip, resultado, nivelAlcanzado }) => {
  const [aprendizaje, setAprendizaje] = useState('');
  const [dificultad, setDificultad] = useState<number>(3);
  const [recomendaria, setRecomendaria] = useState<boolean | undefined>(undefined);
  const [comentarios, setComentarios] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({ aprendizaje, dificultad, recomendaria, comentarios });
  };

  const resultadoLabel = resultado === 'victoria'
    ? '¡Victoria!'
    : resultado === 'derrota'
    ? 'Partida terminada'
    : 'Partida abandonada';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[1000] p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-survey-title"
    >
      <div className="bg-custom-light-gray p-6 sm:p-8 rounded-lg shadow-2xl max-w-lg w-full text-gray-100 max-h-[90vh] flex flex-col">
        <h2 id="post-survey-title" className="text-2xl font-bold mb-1 text-custom-accent">
          Encuesta final
        </h2>
        <p className="text-gray-400 text-sm mb-1">
          {resultadoLabel} — Nivel alcanzado: {nivelAlcanzado}
        </p>
        <p className="text-gray-400 text-sm mb-5">
          Tus respuestas nos ayudan a mejorar el juego. Solo toma 2 minutos.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="post-aprendizaje">
              ¿Que aprendiste o te sorprendio durante el juego?
            </label>
            <textarea
              id="post-aprendizaje"
              value={aprendizaje}
              onChange={e => setAprendizaje(e.target.value)}
              rows={3}
              placeholder="Escribe tu respuesta aqui..."
              className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-custom-accent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Dificultad percibida (1 = muy facil, 5 = muy dificil): <span className="font-bold text-white">{dificultad}</span>
            </label>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={dificultad}
              onChange={e => setDificultad(Number(e.target.value))}
              className="w-full accent-custom-accent"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Muy facil</span>
              <span>Muy dificil</span>
            </div>
          </div>

          <div>
            <p className="block text-sm font-medium text-gray-300 mb-2">
              ¿Recomendarias este juego a colegas o estudiantes?
            </p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="recomendaria"
                  value="si"
                  checked={recomendaria === true}
                  onChange={() => setRecomendaria(true)}
                  className="accent-custom-accent"
                />
                <span className="text-sm">Si</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="recomendaria"
                  value="no"
                  checked={recomendaria === false}
                  onChange={() => setRecomendaria(false)}
                  className="accent-custom-accent"
                />
                <span className="text-sm">No</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="post-comentarios">
              Comentarios adicionales o sugerencias (opcional)
            </label>
            <textarea
              id="post-comentarios"
              value={comentarios}
              onChange={e => setComentarios(e.target.value)}
              rows={2}
              placeholder="Cualquier feedback es bienvenido..."
              className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-custom-accent resize-none"
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-custom-accent hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              Enviar respuestas
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-sm"
            >
              Omitir
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SurveyPost;
