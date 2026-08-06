import React, { useState } from 'react';
import { PreSurveyData } from '../../services/supabaseService';
import { useLanguageContext } from '../../contexts/LanguageContext';

export type { PreSurveyData };

interface SurveyPreProps {
  onComplete: (data: PreSurveyData) => void;
  onSkip: () => void;
}

// Trimmed to the 3-question minimal spec — see
// ultimo-ajuste/05_datos_minimos_supabase.md section 2.
const T = {
  es: {
    title: 'Encuesta inicial',
    subtitle: 'Antes de comenzar, cuéntanos un poco sobre vos. Solo toma 1 minuto.',
    rolLabel: 'Tu vínculo principal con temas de clima/sostenibilidad',
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
    expLabel: '¿Tenés experiencia previa con simulaciones de política pública?',
    yes: 'Sí',
    no: 'No',
    convocatoriaLabel: '¿A través de qué canal llegaste a esta actividad?',
    convocatoriaOptions: [
      { value: '', label: '-- Seleccionar --' },
      { value: '1', label: 'ONG / técnico de ambiente o AFOLU / red temática' },
      { value: '2', label: 'Gobierno, asesoría o consultoría con llegada a decisión' },
      { value: '3', label: 'Universidad, cátedra o espacio docente' },
      { value: '4', label: 'Difusión general / redes / público abierto' },
      { value: 'no_aplica', label: 'No sé / No aplica' },
    ],
    start: 'Comenzar juego',
    skip: 'Omitir',
  },
  en: {
    title: 'Initial Survey',
    subtitle: 'Before we start, tell us a bit about yourself. Takes only 1 minute.',
    rolLabel: 'Your main connection to climate/sustainability topics',
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
    expLabel: 'Do you have prior experience with public policy simulations?',
    yes: 'Yes',
    no: 'No',
    convocatoriaLabel: 'How did you hear about this activity?',
    convocatoriaOptions: [
      { value: '', label: '-- Select --' },
      { value: '1', label: 'NGO / environment or AFOLU technician / thematic network' },
      { value: '2', label: 'Government, advisory, or consulting with decision reach' },
      { value: '3', label: 'University, department, or teaching space' },
      { value: '4', label: 'General outreach / social media / open public' },
      { value: 'no_aplica', label: "Don't know / Not applicable" },
    ],
    start: 'Start game',
    skip: 'Skip',
  },
} as const;

const SurveyPre: React.FC<SurveyPreProps> = ({ onComplete, onSkip }) => {
  const { language } = useLanguageContext();
  const t = T[language];
  const [rol, setRol] = useState('');
  const [experienciaSimulacion, setExperienciaSimulacion] = useState<boolean | undefined>(undefined);
  const [bloqueConvocatoria, setBloqueConvocatoria] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({
      vinculo_clima: rol,
      experiencia_simulacion: !!experienciaSimulacion,
      bloque_convocatoria: bloqueConvocatoria || 'no_aplica',
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
            <p className="block text-sm font-medium text-gray-300 mb-2">{t.expLabel}</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="experienciaSimulacion" value="si" checked={experienciaSimulacion === true} onChange={() => setExperienciaSimulacion(true)} className="accent-custom-accent" />
                <span className="text-sm">{t.yes}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="experienciaSimulacion" value="no" checked={experienciaSimulacion === false} onChange={() => setExperienciaSimulacion(false)} className="accent-custom-accent" />
                <span className="text-sm">{t.no}</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="pre-convocatoria">{t.convocatoriaLabel}</label>
            <select id="pre-convocatoria" value={bloqueConvocatoria} onChange={e => setBloqueConvocatoria(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-custom-accent">
              {t.convocatoriaOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
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
