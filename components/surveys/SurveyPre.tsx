import React, { useState } from 'react';
import { PreSurveyData } from '../../services/supabaseService';

export type { PreSurveyData };

interface SurveyPreProps {
  onComplete: (data: PreSurveyData) => void;
  onSkip: () => void;
}

const SurveyPre: React.FC<SurveyPreProps> = ({ onComplete, onSkip }) => {
  const [rol, setRol] = useState('');
  const [experiencia, setExperiencia] = useState('');
  const [expectativas, setExpectativas] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({ rol, experiencia_previa: experiencia, expectativas });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[1000] p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pre-survey-title"
    >
      <div className="bg-custom-light-gray p-6 sm:p-8 rounded-lg shadow-2xl max-w-lg w-full text-gray-100 max-h-[90vh] flex flex-col">
        <h2 id="pre-survey-title" className="text-2xl font-bold mb-1 text-custom-accent">
          Encuesta inicial
        </h2>
        <p className="text-gray-400 text-sm mb-5">
          Antes de comenzar, cuentanos un poco sobre vos. Solo toma 1 minuto.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="pre-rol">
              Tu rol o perfil principal
            </label>
            <select
              id="pre-rol"
              value={rol}
              onChange={e => setRol(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-custom-accent"
            >
              <option value="">-- Seleccionar --</option>
              <option value="estudiante">Estudiante</option>
              <option value="docente">Docente / Facilitador</option>
              <option value="investigador">Investigador</option>
              <option value="sector_publico">Sector publico</option>
              <option value="sector_privado">Sector privado</option>
              <option value="ong">ONG / Sociedad civil</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="pre-exp">
              Experiencia previa en temas de politica climatica
            </label>
            <select
              id="pre-exp"
              value={experiencia}
              onChange={e => setExperiencia(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-custom-accent"
            >
              <option value="">-- Seleccionar --</option>
              <option value="ninguna">Ninguna</option>
              <option value="basica">Basica (lectures, articulos)</option>
              <option value="intermedia">Intermedia (cursos, talleres)</option>
              <option value="avanzada">Avanzada (trabajo o investigacion)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="pre-exp2">
              Que esperas aprender o experimentar con este juego?
            </label>
            <textarea
              id="pre-exp2"
              value={expectativas}
              onChange={e => setExpectativas(e.target.value)}
              rows={3}
              placeholder="Escribe tu respuesta aqui..."
              className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-custom-accent resize-none"
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-custom-accent hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              Comenzar juego
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

export default SurveyPre;
