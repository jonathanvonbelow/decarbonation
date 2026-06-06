import React, { useState } from 'react';

export interface PostSurveyData {
  aprendizaje: string;
  dificultad: number;
  recomendaria: boolean;
  comentarios: string;
}

interface SurveyPostProps {
  resultado: 'victoria' | 'derrota' | 'abandono';
  nivelAlcanzado: number;
  onComplete: (data: PostSurveyData) => void;
  onSkip: () => void;
}

const SurveyPost: React.FC<SurveyPostProps> = ({ resultado, nivelAlcanzado, onComplete, onSkip }) => {
  const [aprendizaje, setAprendizaje] = useState('');
  const [dificultad, setDificultad] = useState(3);
  const [recomendaria, setRecomendaria] = useState<boolean | null>(null);
  const [comentarios, setComentarios] = useState('');

  const resultadoLabel: Record<typeof resultado, string> = {
    victoria: '¡Victoria!',
    derrota: 'Derrota',
    abandono: 'Partida abandonada',
  };

  const resultadoColor: Record<typeof resultado, string> = {
    victoria: 'text-green-400',
    derrota: 'text-red-400',
    abandono: 'text-yellow-400',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (recomendaria === null) return;
    onComplete({ aprendizaje, dificultad, recomendaria, comentarios });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[1000] p-4">
      <div className="bg-custom-light-gray rounded-xl shadow-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="mb-4">
          <span className={`text-2xl font-bold ${resultadoColor[resultado]}`}>
            {resultadoLabel[resultado]}
          </span>
          <p className="text-gray-400 text-sm mt-1">
            Nivel alcanzado: {nivelAlcanzado}
          </p>
        </div>

        <h2 className="text-lg font-bold text-white mb-1">¿Cómo fue tu experiencia?</h2>
        <p className="text-gray-400 text-sm mb-4">
          Tu feedback nos ayuda a mejorar el juego.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              ¿Qué aprendiste jugando DecarboNation?
            </label>
            <textarea
              value={aprendizaje}
              onChange={e => setAprendizaje(e.target.value)}
              rows={3}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-custom-accent resize-none"
              placeholder="Tu aprendizaje..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              ¿Qué tan difícil te resultó? (1 = muy fácil, 5 = muy difícil)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setDificultad(v)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none ${
                    dificultad === v
                      ? 'bg-custom-accent text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              ¿Lo recomendarías a colegas o estudiantes?
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRecomendaria(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none ${
                  recomendaria === true
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Si
              </button>
              <button
                type="button"
                onClick={() => setRecomendaria(false)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none ${
                  recomendaria === false
                    ? 'bg-red-700 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                No
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Comentarios adicionales (opcional)
            </label>
            <textarea
              value={comentarios}
              onChange={e => setComentarios(e.target.value)}
              rows={2}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-custom-accent resize-none"
              placeholder="Cualquier comentario..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={recomendaria === null}
              className="flex-1 px-4 py-2 bg-custom-accent hover:opacity-90 text-white font-semibold rounded-lg transition-opacity focus:outline-none focus:ring-2 focus:ring-custom-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enviar feedback
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-gray-200 rounded-lg transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Saltar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SurveyPost;
