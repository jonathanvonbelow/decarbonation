import React, { useState } from 'react';
import type { PostSurveyData } from '../../services/supabaseService';

// Re-exportar para que App.tsx pueda importar el tipo desde aquí (compatibilidad)
export type { PostSurveyData };

interface SurveyPostProps {
  resultado: 'victoria' | 'derrota' | 'abandono';
  nivelAlcanzado: number;
  onComplete: (data: PostSurveyData) => void;
  onSkip: () => void;
}

const RESULTADO_CONFIG = {
  victoria: { label: '¡Victoria!',          color: 'text-green-400' },
  derrota:  { label: 'Derrota',             color: 'text-red-400'   },
  abandono: { label: 'Partida abandonada',  color: 'text-yellow-400' },
};

const SurveyPost: React.FC<SurveyPostProps> = ({ resultado, nivelAlcanzado, onComplete, onSkip }) => {
  const [estrategia_efectiva, setEstrategiaEfectiva] = useState('');
  const [sorpresa_yn, setSorpresaYn] = useState<boolean | null>(null);
  const [sorpresa_texto, setSorpresaTexto] = useState('');
  const [cambio_percepcion, setCambioPercepcion] = useState(3);
  const [cambio_texto, setCambioTexto] = useState('');
  const [utilidad_docente, setUtilidadDocente] = useState(3);
  const [nps, setNps] = useState<number | null>(null);
  const [comentarios, setComentarios] = useState('');

  const { label, color } = RESULTADO_CONFIG[resultado];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sorpresa_yn === null || nps === null) return;
    onComplete({
      estrategia_efectiva,
      sorpresa_yn,
      sorpresa_texto,
      cambio_percepcion,
      cambio_texto,
      utilidad_docente,
      nps,
      comentarios,
    });
  };

  const canSubmit = sorpresa_yn !== null && nps !== null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[1000] p-4">
      <div className="bg-custom-light-gray rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header resultado */}
          <div className="mb-4">
            <span className={`text-2xl font-bold ${color}`}>{label}</span>
            <p className="text-gray-400 text-sm mt-1">Nivel alcanzado: <strong className="text-white">{nivelAlcanzado}</strong></p>
          </div>

          <h2 className="text-lg font-bold text-white mb-1">Reflexion final</h2>
          <p className="text-gray-400 text-sm mb-4">Tu feedback mejora el juego para futuros participantes.</p>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                ¿Qué estrategia te resultó más efectiva?
              </label>
              <textarea
                value={estrategia_efectiva}
                onChange={e => setEstrategiaEfectiva(e.target.value)}
                rows={2}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-custom-accent resize-none"
                placeholder="Ej: combinar políticas agroecológicas con conservación..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                ¿Algo te sorprendió durante el juego? <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-3 mb-2">
                <button type="button" onClick={() => setSorpresaYn(true)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none ${sorpresa_yn === true ? 'bg-custom-accent text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                  Si
                </button>
                <button type="button" onClick={() => setSorpresaYn(false)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none ${sorpresa_yn === false ? 'bg-gray-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                  No
                </button>
              </div>
              {sorpresa_yn && (
                <textarea
                  value={sorpresa_texto}
                  onChange={e => setSorpresaTexto(e.target.value)}
                  rows={2}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-custom-accent resize-none"
                  placeholder="¿Qué te sorprendió?"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                ¿Cuánto cambió tu percepción sobre políticas climáticas?
                <span className="text-gray-500 ml-1">(1 = nada, 5 = mucho)</span>
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(v => (
                  <button key={v} type="button" onClick={() => setCambioPercepcion(v)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none ${cambio_percepcion === v ? 'bg-custom-accent text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                    {v}
                  </button>
                ))}
              </div>
              <textarea
                value={cambio_texto}
                onChange={e => setCambioTexto(e.target.value)}
                rows={1}
                className="w-full mt-2 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-custom-accent resize-none"
                placeholder="Describí brevemente (opcional)..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                ¿Qué tan útil sería este juego en un contexto docente?
                <span className="text-gray-500 ml-1">(1 = nada útil, 5 = muy útil)</span>
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(v => (
                  <button key={v} type="button" onClick={() => setUtilidadDocente(v)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none ${utilidad_docente === v ? 'bg-custom-accent text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                ¿Con qué probabilidad recomendarías este juego? (0 = jamás, 10 = seguro)
                <span className="text-red-400 ml-1">*</span>
              </label>
              <div className="flex gap-1 flex-wrap">
                {[0,1,2,3,4,5,6,7,8,9,10].map(v => (
                  <button key={v} type="button" onClick={() => setNps(v)}
                    className={`w-9 h-9 rounded-lg text-xs font-bold transition-colors focus:outline-none ${nps === v ? 'bg-custom-accent text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                    {v}
                  </button>
                ))}
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
                placeholder="Cualquier comentario libre..."
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex-1 px-4 py-2 bg-custom-accent hover:opacity-90 text-white font-semibold rounded-lg transition-opacity focus:outline-none focus:ring-2 focus:ring-custom-accent disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Enviar y ver resumen
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
    </div>
  );
};

export default SurveyPost;
