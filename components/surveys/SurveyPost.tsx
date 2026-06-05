
import React, { useState } from 'react';

export interface PostSurveyData {
  estrategia_efectiva: string;
  sorpresa_yn: boolean;
  sorpresa_texto?: string;
  cambio_percepcion: number;   // 1-5
  cambio_texto?: string;
  utilidad_docente: number;    // 1-5
  nps: number;                 // 0-10
  comentarios?: string;
}

interface SurveyPostProps {
  resultado: 'victoria' | 'derrota' | 'abandono';
  nivelAlcanzado: number;
  onComplete: (data: PostSurveyData) => void;
  onSkip: () => void;
}

const TOTAL_STEPS = 6;

const SurveyPost: React.FC<SurveyPostProps> = ({
  resultado,
  nivelAlcanzado,
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1
  const [estrategiaEfectiva, setEstrategiaEfectiva] = useState('');

  // Step 2
  const [sorpresaYn, setSorpresaYn] = useState<boolean | null>(null);
  const [sorpresaTexto, setSorpresaTexto] = useState('');

  // Step 3
  const [cambioPercepcion, setCambioPercepcion] = useState<number | null>(null);
  const [cambioTexto, setCambioTexto] = useState('');

  // Step 4
  const [utilidadDocente, setUtilidadDocente] = useState<number | null>(null);

  // Step 5
  const [nps, setNps] = useState<number | null>(null);

  // Step 6
  const [comentarios, setComentarios] = useState('');

  const headerConfig = {
    victoria: {
      text: `¡Felicitaciones! Completaste el Nivel ${nivelAlcanzado}`,
      color: 'text-green-400',
    },
    derrota: {
      text: 'La partida terminó. ¿Aprendiste algo nuevo?',
      color: 'text-red-400',
    },
    abandono: {
      text: 'Gracias por jugar. Tu retroalimentación nos ayuda.',
      color: 'text-yellow-400',
    },
  };

  const header = headerConfig[resultado];

  const canAdvance = (): boolean => {
    switch (currentStep) {
      case 1:
        return true; // textarea libre, puede estar vacío
      case 2:
        return sorpresaYn !== null;
      case 3:
        return cambioPercepcion !== null;
      case 4:
        return utilidadDocente !== null;
      case 5:
        return nps !== null;
      case 6:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    const data: PostSurveyData = {
      estrategia_efectiva: estrategiaEfectiva,
      sorpresa_yn: sorpresaYn ?? false,
      sorpresa_texto: sorpresaYn ? sorpresaTexto : undefined,
      cambio_percepcion: cambioPercepcion ?? 1,
      cambio_texto: cambioTexto || undefined,
      utilidad_docente: utilidadDocente ?? 1,
      nps: nps ?? 0,
      comentarios: comentarios || undefined,
    };
    onComplete(data);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-3">
            <p className="text-sm sm:text-base font-medium text-gray-200">
              ¿Qué estrategia resultó más efectiva en tu partida?
            </p>
            <textarea
              className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-100 text-sm placeholder-gray-400 focus:outline-none focus:border-custom-accent resize-none"
              rows={5}
              placeholder="Describe tu estrategia..."
              value={estrategiaEfectiva}
              onChange={(e) => setEstrategiaEfectiva(e.target.value)}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <p className="text-sm sm:text-base font-medium text-gray-200">
              ¿Algo te sorprendió del comportamiento del sistema?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setSorpresaYn(true)}
                className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                  sorpresaYn === true
                    ? 'bg-custom-accent text-white'
                    : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                }`}
              >
                Sí
              </button>
              <button
                onClick={() => {
                  setSorpresaYn(false);
                  setSorpresaTexto('');
                }}
                className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                  sorpresaYn === false
                    ? 'bg-custom-accent text-white'
                    : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                }`}
              >
                No
              </button>
            </div>
            {sorpresaYn === true && (
              <div className="animate-fade-in">
                <p className="text-sm text-gray-300 mb-2">¿Qué te sorprendió?</p>
                <textarea
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-100 text-sm placeholder-gray-400 focus:outline-none focus:border-custom-accent resize-none"
                  rows={4}
                  placeholder="Describe lo que te sorprendió..."
                  value={sorpresaTexto}
                  onChange={(e) => setSorpresaTexto(e.target.value)}
                />
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <p className="text-sm sm:text-base font-medium text-gray-200">
              ¿El juego cambió alguna percepción previa sobre política climática?
            </p>
            <div className="flex gap-2 justify-between">
              {([1, 2, 3, 4, 5] as const).map((val) => (
                <button
                  key={val}
                  onClick={() => setCambioPercepcion(val)}
                  className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-colors ${
                    cambioPercepcion === val
                      ? 'bg-custom-accent text-white'
                      : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-400 px-1">
              <span>1 - Para nada</span>
              <span>5 - Significativamente</span>
            </div>
            <div>
              <p className="text-sm text-gray-300 mb-2">¿En qué sentido? (opcional)</p>
              <textarea
                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-100 text-sm placeholder-gray-400 focus:outline-none focus:border-custom-accent resize-none"
                rows={3}
                placeholder="Describe en qué cambió tu percepción..."
                value={cambioTexto}
                onChange={(e) => setCambioTexto(e.target.value)}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <p className="text-sm sm:text-base font-medium text-gray-200">
              ¿Qué tan útil sería este juego en un contexto de capacitación o docencia?
            </p>
            <div className="flex gap-2 justify-between">
              {([1, 2, 3, 4, 5] as const).map((val) => (
                <button
                  key={val}
                  onClick={() => setUtilidadDocente(val)}
                  className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-colors ${
                    utilidadDocente === val
                      ? 'bg-custom-accent text-white'
                      : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-400 px-1">
              <span>1 - Nada útil</span>
              <span>5 - Muy útil</span>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <p className="text-sm sm:text-base font-medium text-gray-200">
              ¿Recomendarías el juego?
            </p>
            <div className="grid grid-cols-11 gap-1">
              {Array.from({ length: 11 }, (_, i) => i).map((val) => (
                <button
                  key={val}
                  onClick={() => setNps(val)}
                  className={`h-9 rounded-lg font-semibold text-sm transition-colors ${
                    nps === val
                      ? 'bg-custom-accent text-white'
                      : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-400 px-1">
              <span>0 - Nada probable</span>
              <span>10 - Muy probable</span>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-3">
            <p className="text-sm sm:text-base font-medium text-gray-200">
              Comentarios libres / sugerencias de mejora
            </p>
            <textarea
              className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-100 text-sm placeholder-gray-400 focus:outline-none focus:border-custom-accent resize-none"
              rows={6}
              placeholder="Escribe tus comentarios o sugerencias... (opcional)"
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const canGo = canAdvance();

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[1000] p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="survey-post-title"
    >
      <div className="bg-custom-light-gray p-6 sm:p-8 rounded-lg shadow-2xl max-w-lg w-full text-gray-100 max-h-[90vh] flex flex-col">
        {/* Header contextual */}
        <div className="mb-5">
          <h2
            id="survey-post-title"
            className={`text-xl sm:text-2xl font-bold ${header.color} mb-1`}
          >
            {header.text}
          </h2>
          <p className="text-sm text-gray-400">
            Encuesta de cierre — tus respuestas nos ayudan a mejorar el juego.
          </p>
        </div>

        {/* Contenido del paso */}
        <div className="overflow-y-auto flex-grow mb-6 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 pr-1">
          {renderStepContent()}
        </div>

        {/* Navegación inferior */}
        <div className="pt-4 border-t border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">
              Pregunta {currentStep} de {TOTAL_STEPS}
            </span>
            <div className="flex items-center gap-3">
              {currentStep > 1 && (
                <button
                  onClick={handlePrev}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg transition-colors text-sm"
                >
                  Anterior
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={!canGo}
                className={`px-4 py-2 font-semibold rounded-lg transition-colors text-sm ${
                  canGo
                    ? 'bg-custom-accent hover:bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {currentStep === TOTAL_STEPS ? 'Finalizar' : 'Siguiente'}
              </button>
            </div>
          </div>
          <div className="mt-3 text-center">
            <button
              onClick={onSkip}
              className="text-xs text-gray-500 hover:text-gray-300 underline transition-colors"
            >
              Omitir encuesta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyPost;
