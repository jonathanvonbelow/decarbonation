
import React, { useState } from 'react';
import { MAX_ACTIVE_POLICIES, POLICY_LOCK_IN_DURATION } from '../../constants';

interface TutorialModalProps {
  onClose: () => void;
}

const tutorialSteps = [
  {
    title: "¡Bienvenido a DecarboNation!",
    content: "Embárcate en la misión de guiar a tu nación hacia la neutralidad de carbono y la sostenibilidad. Tus decisiones políticas darán forma al futuro. ¡DecarboNito, tu asesor IA, está aquí para ayudarte!"
  },
  {
    title: "Panel de Control Superior",
    content: `Arriba encontrarás información crucial:
    • **Año Actual**: Sigue el progreso de tu nación a través del tiempo. Cada simulación avanza un año.
    • **Nivel**: Tu etapa actual en el juego. Cada nivel introduce nuevos desafíos y mecánicas.
    • **Puntaje**: Refleja tu desempeño general. ¡Más alto es mejor! Pasa el cursor sobre el puntaje para ver cómo se calcula.
    • **Fijar Nivel**: Estos botones te permiten revisitar o saltar a niveles específicos. Útil para aprender o experimentar, pero la progresion natural del juego es secuencial.`
  },
  {
    title: "Indicadores de Sostenibilidad",
    content: `En el tablero principal, monitorea estos indicadores vitales (valores 0-100%):
    • **Biodiversidad**: La salud de tus ecosistemas. Esencial para la resiliencia.
    • **Emisiones CO2eq/cápita**: Mide las emisiones de gases de efecto invernadero por persona. Un valor bajo es favorable y es tu objetivo clave para la descarbonización.
    • **(Nivel 2+) Seguridad Alimentaria, Económica, Bienestar Social, Estabilidad Política**: Aspectos cruciales para una nación próspera y estable.
    • **(Nivel 3+) PBI Real, Deuda, Reservas del Tesoro**: Indicadores financieros avanzados para gestionar la economía nacional.
    Los colores te dan una pista rápida: Verde (bueno), Amarillo (precaución), Rojo (crítico).`
  },
  {
    title: "Tomando Decisiones: Las Políticas",
    content: `Aquí es donde ejerces tu liderazgo:
    • **Activar/Desactivar**: Haz clic en el interruptor junto al nombre de una política para activarla o desactivarla.
    • **Máximo ${MAX_ACTIVE_POLICIES} Políticas Activas**: Elige tus prioridades estratégicamente.
    • **Bloqueo Temporal**: Una vez activada, una política debe permanecer activa por ${POLICY_LOCK_IN_DURATION} años antes de poder desactivarla.
    • **Información Detallada**: Pasa el cursor sobre el nombre de una política para ver su descripción. En Nivel 2+, también verás su eficiencia actual (un pequeño círculo de color).`
  },
  {
    title: "Afinando el Impacto: Instrumentos (Nivel 2+)",
    content: `A partir del Nivel 2, las políticas activas tienen 'Instrumentos' específicos:
    • **Asigna Esfuerzo**: En el panel 'Instrumentos de Política', puedes distribuir un esfuerzo (0-100%) a cada instrumento.
    • **Límite de Esfuerzo Total**: La suma del esfuerzo de todos los instrumentos de UNA política no puede superar el 100%.
    • **Impacto Refinado**: Esto te permite controlar con más detalle cómo se implementa cada política y optimizar su efectividad.`
  },
  {
    title: "Territorio y Avance del Tiempo",
    content: `Visualiza el impacto de tus decisiones:
    • **Distribución de Uso del Suelo**: Este gráfico de torta muestra cómo se divide el territorio de tu nación (bosques, cultivos, etc.). Cada uso tiene diferentes implicaciones para el carbono y la biodiversidad.
    • **Simular Próximo Año**: Cuando hayas ajustado tus políticas (y sus instrumentos si aplica), presiona este botón para avanzar un año en el juego y observar los resultados.`
  },
  {
    title: "DecarboNito: Tu Asesor IA",
    content: `A la derecha, encontrarás el panel de DecarboNito, tu asistente personal:
    • **Pregunta lo que Necesites**: ¿Dudas sobre mecánicas del juego? ¿Quieres discutir estrategias? ¿No entiendes el impacto de una política? DecarboNito está para ayudarte.
    • **Sugerencias Inteligentes**: Basado en el estado actual de tu juego, DecarboNito te ofrecerá preguntas sugeridas para guiar tu análisis.
    • **Consejo Contextual**: El asesor entiende en qué nivel estás y adaptará sus explicaciones y consejos a los desafíos específicos de esa etapa.`
  },
  {
    title: "Progresión y Desafíos Futuros",
    content: `Cada nivel de DecarboNation te presenta nuevos desafíos y complejidades:
    • **Nivel 1 (Estrategia Nacional Fundacional)**: Enfócate en sentar las bases para la descarbonización y la sostenibilidad a nivel nacional.
    • **Nivel 2 (Coordinación Regional y Sostenibilidad Ampliada)**: Gestiona indicadores socioeconómicos, presiones políticas y coordina políticas entre regiones. Introduce los instrumentos de política.
    • **Nivel 3 (Liderazgo Global en Sostenibilidad)**: Alcanza la neutralidad de carbono y lidera globalmente, manejando finanzas avanzadas (PBI, deuda, préstamos, impuestos), pactos internacionales complejos y eventos dinámicos.
    Presta atención a los objetivos específicos de cada nivel para avanzar.`
  },
  {
    title: "Finanzas Avanzadas y Pactos (Nivel 3)",
    content: `En el Nivel 3, manejarás la economía a un nivel más profundo:
    • **Préstamos**: Te permiten solicitar una inyección de capital que va a tus Reservas del Tesoro. ¡Cuidado! Este monto se suma a tu Deuda total, la cual genera intereses anuales que debes pagar. Es una herramienta poderosa pero peligrosa.
    • **Presión Fiscal Adicional**: Un control deslizante para aplicar un impuesto extra sobre el PBI. Aumenta tus ingresos, pero tiene un costo: reduce la seguridad económica, el bienestar social y el crecimiento del PBI, y aumenta la presión social.
    • **Pactos Internacionales**: Acuerdos con otras naciones. Unirse tiene costos (de adhesión y/o anuales) pero otorga beneficios (o a veces desventajas) continuos a tus indicadores.`
  },
  {
    title: "¡Todo Listo para Liderar!",
    content: "Ahora tienes las herramientas y conocimientos básicos para comenzar tu gestión en DecarboNation. Recuerda que cada decisión cuenta. ¡Explora, experimenta y lleva a tu nación hacia un futuro próspero y sostenible! No dudes en consultar a DecarboNito en cualquier momento. ¡Mucha suerte, líder!"
  }
];

const TutorialModal: React.FC<TutorialModalProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const step = tutorialSteps[currentStep];

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[1000] p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
    >
      <div className="bg-custom-light-gray p-6 sm:p-8 rounded-lg shadow-2xl max-w-2xl w-full text-gray-100 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 id="tutorial-title" className="text-2xl sm:text-3xl font-bold text-custom-accent">{step.title}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white text-3xl leading-none"
            aria-label="Cerrar tutorial"
          >
            &times;
          </button>
        </div>

        <div className="overflow-y-auto flex-grow mb-6 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 pr-2">
          <p className="text-sm sm:text-base whitespace-pre-line leading-relaxed">{step.content}</p>
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t border-gray-700">
          <span className="text-xs text-gray-400">
            Paso {currentStep + 1} de {tutorialSteps.length}
          </span>
          <div className="space-x-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg transition-colors"
              >
                Anterior
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-custom-accent hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
            >
              {currentStep === tutorialSteps.length - 1 ? 'Finalizar Tutorial' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;
