import React, { useState } from 'react';

export interface PreSurveyData {
  rol: string;
  experienciaClima: string;
  expectativa: string;
}

interface SurveyPreProps {
  onComplete: (data: PreSurveyData) => void;
  onSkip: () => void;
}

const SurveyPre: React.FC<SurveyPreProps> = ({ onComplete, onSkip }) => {
  const [rol, setRol] = useState('');
  const [experienciaClima, setExperienciaClima] = useState('');
  const [expectativa, setExpectativa] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({ rol, experienciaClima, expectativa });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[1000] p-4">
      <div className="bg-custom-light-gray rounded-xl shadow-2xl p-6 max-w-lg w-full">
        <h2 className="text-xl font-bold text-custom-accent mb-1">Antes de empezar</h2>
        <p className="text-gray-400 text-sm mb-5">
          Tus respuestas nos ayudan a mejorar la experiencia de aprendizaje.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              ¿Cuál es tu rol o perfil? (ej: estudiante, docente, profesional)
            </label>
            <input
              type="text"
              value={rol}
              onChange={e => setRol(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-custom-accent"
              placeholder="Tu rol..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              ¿Cuánta experiencia tenés con temas de cambio climático o política ambiental?
            </label>
            <select
              value={experienciaClima}
              onChange={e => setExperienciaClima(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-custom-accent"
            >
              <option value="">Seleccioná una opción...</option>
              <option value="ninguna">Ninguna — soy nuevo/a en el tema</option>
              <option value="basica">Básica — conozco conceptos generales</option>
              <option value="intermedia">Intermedia — trabajo o estudio el tema</option>
              <option value="avanzada">Avanzada — experto/a o investigador/a</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              ¿Qué esperás aprender o experimentar con DecarboNation?
            </label>
            <textarea
              value={expectativa}
              onChange={e => setExpectativa(e.target.value)}
              rows={3}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-custom-accent resize-none"
              placeholder="Tu expectativa..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-custom-accent hover:opacity-90 text-white font-semibold rounded-lg transition-opacity focus:outline-none focus:ring-2 focus:ring-custom-accent"
            >
              Enviar y jugar
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

export default SurveyPre;
