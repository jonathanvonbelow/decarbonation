
import React, { useState } from 'react';

export interface PreSurveyData {
  vinculo_clima: string;
  experiencia_simulacion: string;
  familiaridad_afolu: number;     // 1-5
  expectativa: string;
  pais_region: string;
  comentario_abierto?: string;
}

interface SurveyPreProps {
  onComplete: (data: PreSurveyData) => void;
  onSkip: () => void;
}

const TOTAL_STEPS = 5;

const vinculoOptions: { value: string; label: string }[] = [
  { value: 'investigacion', label: 'Investigación' },
  { value: 'docencia', label: 'Docencia' },
  { value: 'gestion_publica', label: 'Gestión pública' },
  { value: 'sector_privado', label: 'Sector privado' },
  { value: 'estudiante', label: 'Estudiante' },
  { value: 'otro', label: 'Otro' },
];

const experienciaOptions: { value: string; label: string }[] = [
  { value: 'si', label: 'Sí' },
  { value: 'no', label: 'No' },
  { value: 'algo_similar', label: 'Algo similar' },
];

const expectativaOptions: { value: string; label: string }[] = [
  { value: 'aprender_politica_climatica', label: 'Aprender sobre política climática' },
  { value: 'herramienta_pedagogica', label: 'Explorar el juego como herramienta pedagógica' },
  { value: 'investigacion_evaluacion', label: 'Investigación/evaluación' },
  { value: 'diversion_curiosidad', label: 'Diversión y curiosidad' },
  { value: 'otra', label: 'Otra' },
];

const familiaridadLabels: Record<number, string> = {
  1: '1 - Nada',
  2: '2',
  3: '3',
  4: '4',
  5: '5 - Muy familiarizado',
};

const optionButtonClass = (selected: boolean, extraClasses = ''): string =>
  [
    'bg-gray-700 hover:bg-gray-600 border rounded-lg px-4 py-2 text-sm transition-colors text-left',
    selected
      ? 'border-custom-accent bg-custom-accent text-white'
      : 'border-gray-500 text-gray-100',
    extraClasses,
  ]
    .filter(Boolean)
    .join(' ');

const SurveyPre: React.FC<SurveyPreProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<PreSurveyData>>({});

  // Derived: is the current step's required field filled?
  const isCurrentStepComplete = (): boolean => {
    switch (currentStep) {
      case 0:
        return Boolean(answers.vinculo_clima);
      case 1:
        return Boolean(answers.experiencia_simulacion);
      case 2:
        return Boolean(answers.familiaridad_afolu && answers.familiaridad_afolu >= 1);
      case 3:
        return Boolean(answers.expectativa);
      case 4:
        return Boolean(answers.pais_region && answers.pais_region.trim() !== '');
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Last step: submit
      const data: PreSurveyData = {
        vinculo_clima: answers.vinculo_clima!,
        experiencia_simulacion: answers.experiencia_simulacion!,
        familiaridad_afolu: answers.familiaridad_afolu!,
        expectativa: answers.expectativa!,
        pais_region: answers.pais_region!,
        comentario_abierto: answers.comentario_abierto,
      };
      onComplete(data);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const setField = <K extends keyof PreSurveyData>(key: K, value: PreSurveyData[K]) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="flex flex-col gap-3">
            <p className="text-base sm:text-lg font-semibold text-gray-100 mb-1">
              ¿Cuál es tu vínculo principal con temas de clima y sostenibilidad?
            </p>
            {vinculoOptions.map((opt) => (
              <button
                key={opt.value}
                className={optionButtonClass(answers.vinculo_clima === opt.value)}
                onClick={() => setField('vinculo_clima', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        );

      case 1:
        return (
          <div className="flex flex-col gap-3">
            <p className="text-base sm:text-lg font-semibold text-gray-100 mb-1">
              ¿Has jugado algún juego de simulación de políticas públicas antes?
            </p>
            {experienciaOptions.map((opt) => (
              <button
                key={opt.value}
                className={optionButtonClass(answers.experiencia_simulacion === opt.value)}
                onClick={() => setField('experiencia_simulacion', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        );

      case 2:
        return (
          <div className="flex flex-col gap-3">
            <p className="text-base sm:text-lg font-semibold text-gray-100 mb-1">
              ¿Qué tan familiarizado/a estás con el sector AFOLU y sus implicancias en el balance de carbono?
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {([1, 2, 3, 4, 5] as const).map((val) => (
                <button
                  key={val}
                  className={optionButtonClass(
                    answers.familiaridad_afolu === val,
                    'flex-1 min-w-[60px] font-semibold text-xs sm:text-sm text-center'
                  )}
                  onClick={() => setField('familiaridad_afolu', val)}
                >
                  {familiaridadLabels[val]}
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="flex flex-col gap-3">
            <p className="text-base sm:text-lg font-semibold text-gray-100 mb-1">
              ¿Cuál es tu expectativa principal al jugar DecarboNation hoy?
            </p>
            {expectativaOptions.map((opt) => (
              <button
                key={opt.value}
                className={optionButtonClass(answers.expectativa === opt.value)}
                onClick={() => setField('expectativa', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        );

      case 4:
        return (
          <div className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="survey-pais-region"
                className="block text-base sm:text-lg font-semibold text-gray-100 mb-2"
              >
                País / región de referencia principal en tu trabajo
              </label>
              <input
                id="survey-pais-region"
                type="text"
                value={answers.pais_region ?? ''}
                onChange={(e) => setField('pais_region', e.target.value)}
                placeholder="Ej: Argentina, Sudamérica, España..."
                className="w-full bg-gray-700 border border-gray-500 rounded-lg px-4 py-2 text-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:border-custom-accent transition-colors"
              />
            </div>
            <div>
              <label
                htmlFor="survey-comentario"
                className="block text-sm font-semibold text-gray-300 mb-2"
              >
                Comentarios o sugerencias previas al juego{' '}
                <span className="text-gray-500 font-normal">(opcional)</span>
              </label>
              <textarea
                id="survey-comentario"
                value={answers.comentario_abierto ?? ''}
                onChange={(e) => setField('comentario_abierto', e.target.value)}
                placeholder="Cualquier observación que quieras compartir antes de comenzar..."
                rows={3}
                className="w-full bg-gray-700 border border-gray-500 rounded-lg px-4 py-2 text-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:border-custom-accent transition-colors resize-none"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const stepComplete = isCurrentStepComplete();

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[1000] p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="survey-pre-title"
    >
      <div className="bg-custom-light-gray p-6 sm:p-8 rounded-lg shadow-2xl max-w-lg w-full text-gray-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="mb-4">
          <h2
            id="survey-pre-title"
            className="text-xl sm:text-2xl font-bold text-custom-accent"
          >
            Antes de empezar &mdash; cuéntanos un poco sobre vos
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Pregunta {currentStep + 1} de {TOTAL_STEPS}
          </p>
        </div>

        {/* Step content */}
        <div className="overflow-y-auto flex-grow mb-6 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 pr-1">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-700">
          <button
            onClick={onSkip}
            className="text-xs text-gray-400 hover:text-gray-200 underline transition-colors"
          >
            Omitir encuesta
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={[
                'px-4 py-2 font-semibold rounded-lg transition-colors text-sm',
                currentStep === 0
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-600 hover:bg-gray-500 text-white',
              ].join(' ')}
            >
              Anterior
            </button>
            <button
              onClick={handleNext}
              disabled={!stepComplete}
              className={[
                'px-4 py-2 font-semibold rounded-lg transition-colors text-sm',
                stepComplete
                  ? 'bg-custom-accent hover:bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed',
              ].join(' ')}
            >
              {currentStep === TOTAL_STEPS - 1 ? 'Finalizar' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyPre;
