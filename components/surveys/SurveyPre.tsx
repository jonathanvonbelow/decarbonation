import React, { useState } from 'react';
import type { PreSurveyData } from '../../services/supabaseService';

// Re-exportar para que App.tsx pueda importar el tipo desde aquí (compatibilidad)
export type { PreSurveyData };

interface SurveyPreProps {
  onComplete: (data: PreSurveyData) => void;
  onSkip: () => void;
}

const SurveyPre: React.FC<SurveyPreProps> = ({ onComplete, onSkip }) => {
  const [vinculo_clima, setVinculoClima] = useState('');
  const [experiencia_simulacion, setExperienciaSimulacion] = useState('');
  const [familiaridad_afolu, setFamiliaridadAfolu] = useState(3);
  const [expectativa, setExpectativa] = useState('');
  const [pais_region, setPaisRegion] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({
      vinculo_clima,
      experiencia_simulacion,
      familiaridad_afolu,
      expectativa,
      pais_region,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[1000] p-4">
      <div className="bg-custom-light-gray rounded-xl shadow-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-custom-accent mb-1">Antes de empezar</h2>
        <p className="text-gray-400 text-sm mb-5">
          Tus respuestas nos ayudan a mejorar la experiencia de aprendizaje. Solo lleva 2 minutos.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              ¿Cuál es tu vínculo con el clima o la política ambiental?
            </label>
            <select
              value={vinculo_clima}
              onChange={e => setVinculoClima(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-custom-accent"
            >
              <option value="">Seleccioná una opción...</option>
              <option value="investigacion">Investigación académica</option>
              <option value="docencia">Docencia o formación</option>
              <option value="politica_publica">Política pública o gobierno</option>
              <option value="ong_sociedad_civil">ONG o sociedad civil</option>
              <option value="sector_privado">Sector privado</option>
              <option value="estudiante">Estudiante</option>
              <option value="otro">Otro / Sin vínculo específico</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              ¿Tenés experiencia previa con simulaciones o juegos serios?
            </label>
            <select
              value={experiencia_simulacion}
              onChange={e => setExperienciaSimulacion(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-custom-accent"
            >
              <option value="">Seleccioná una opción...</option>
              <option value="ninguna">Ninguna — primera vez</option>
              <option value="poca">Poca — alguna vez</option>
              <option value="moderada">Moderada — varias veces</option>
              <option value="mucha">Mucha — uso frecuente</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              ¿Qué tan familiarizado/a estás con el sector AFOLU (Agricultura, Silvicultura y Uso del Suelo)?
              <span className="text-gray-500 ml-1">(1 = nada, 5 = experto/a)</span>
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFamiliaridadAfolu(v)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none ${
                    familiaridad_afolu === v
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
            <label className="block text-sm font-medium text-gray-300 mb-1">
              ¿Qué esperás aprender o experimentar con DecarboNation?
            </label>
            <textarea
              value={expectativa}
              onChange={e => setExpectativa(e.target.value)}
              rows={2}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-custom-accent resize-none"
              placeholder="Tu expectativa..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              País o región
            </label>
            <input
              type="text"
              value={pais_region}
              onChange={e => setPaisRegion(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-custom-accent"
              placeholder="Ej: Argentina, Colombia, España..."
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
