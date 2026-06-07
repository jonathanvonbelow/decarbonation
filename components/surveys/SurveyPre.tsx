import React, { useState } from 'react';
import { PreSurveyData } from '../../services/supabaseService';
import { useLanguageContext } from '../../contexts/LanguageContext';

export type { PreSurveyData };

interface SurveyPreProps {
  onComplete: (data: PreSurveyData) => void;
  onSkip: () => void;
}

const T = {
  es: {
    title: 'Encuesta inicial',
    subtitle: 'Antes de comenzar, cuéntanos un poco sobre vos. Solo toma 1 minuto.',
    rolLabel: 'Tu rol o perfil principal',
    rolOptions: [
      { value: '', label: '-- Seleccionar --' },
      { value: 'estudiante', label: 'Estudiante' },
      { value: 'docente', label: 'Docente / Facilitador' },
      { value: 'investigador', label: 'Investigador' },
      { value: 'sector_publico', label: 'Sector público' },
      { value: 'sector_privado', label: 'Sector privado' },
      { value: 'ong', label: 'ONG / Sociedad civil' },
      { value: 'otro', label: 'Otro' },
    ],
    expLabel: 'Experiencia previa en temas de política climática',
    expOptions: [
      { value: '', label: '-- Seleccionar --' },
      { value: 'ninguna', label: 'Ninguna' },
      { value: 'basica', label: 'Básica (lecturas, artículos)' },
      { value: 'intermedia', label: 'Intermedia (cursos, talleres)' },
      { value: 'avanzada', label: 'Avanzada (trabajo o investigación)' },
    ],
    expectLabel: '¿Qué esperás aprender o experimentar con este juego?',
    expectPlaceholder: 'Escribe tu respuesta aquí...',
    start: 'Comenzar juego',
    skip: 'Omitir',
  },
  en: {
    title: 'Initial Survey',
    subtitle: 'Before we start, tell us a bit about yourself. Takes only 1 minute.',
    rolLabel: 'Your main role or profile',
    rolOptions: [
      { value: '', label: '-- Select --' },
      { value: 'estudiante', label: 'Student' },
      { value: 'docente', label: 'Teacher / Facilitator' },
      { value: 'investigador', label: 'Researcher' },
      { value: 'sector_publico', label: 'Public sector' },
      { value: 'sector_privado', label: 'Private sector' },
      { value: 'ong', label: 'NGO / Civil society' },
      { value: 'otro', label: 'Other' },
    ],
    expLabel: 'Prior experience with climate policy topics',
    expOptions: [
      { value: '', label: '-- Select --' },
      { value: 'ninguna', label: 'None' },
      { value: 'basica', label: 'Basic (readings, articles)' },
      { value: 'intermedia', label: 'Intermediate (courses, workshops)' },
      { value: 'avanzada', label: 'Advanced (work or research)' },
    ],
    expectLabel: 'What do you hope to learn or experience with this game?',
    expectPlaceholder: 'Write your answer here...',
    start: 'Start game',
    skip: 'Skip',
  },
} as const;

const SurveyPre: React.FC<SurveyPreProps> = ({ onComplete, onSkip }) => {
  const { language } = useLanguageContext();
  const t = T[language];
  const [rol, setRol] = useState('');
  const [experiencia, setExperiencia] = useState('');
  const [expectativas, setExpectativas] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({
      vinculo_clima: rol,
      experiencia_simulacion: experiencia,
      familiaridad_afolu: 3,
      expectativa: expectativas,
      pais_region: '',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[1000] p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="pre-survey-title">
      <div className="bg-custom-light-gray p-6 sm:p-8 rounded-lg shadow-2xl max-w-lg w-full text-gray-100 max-h-[90vh] flex flex-col">
        <h2 id="pre-survey-title" className="text-2xl font-bold mb-1 text-custom-accent">{t.title}</h2>
        <p className="text-gray-400 text-sm mb-5">{t.subtitle}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="pre-rol">{t.rolLabel}</label>
            <select id="pre-rol" value={rol} onChange={e => setRol(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-custom-accent">
              {t.rolOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="pre-exp">{t.expLabel}</label>
            <select id="pre-exp" value={experiencia} onChange={e => setExperiencia(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-custom-accent">
              {t.expOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="pre-exp2">{t.expectLabel}</label>
            <textarea id="pre-exp2" value={expectativas} onChange={e => setExpectativas(e.target.value)} rows={3}
              placeholder={t.expectPlaceholder}
              className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-custom-accent resize-none" />
          </div>

          <div className="flex gap-3 mt-2">
            <button type="submit" className="flex-1 px-4 py-2 bg-custom-accent hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors text-sm">{t.start}</button>
            <button type="button" onClick={onSkip} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-sm">{t.skip}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SurveyPre;
