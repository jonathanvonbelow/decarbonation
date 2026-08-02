
import React, { useState } from 'react';
import { MAX_ACTIVE_POLICIES, POLICY_LOCK_IN_DURATION, INITIAL_YEAR, YEARS_PER_LEVEL } from '../../constants';
import { useEffect } from 'react';
import { useLanguageContext } from '../../contexts/LanguageContext';

const LEVEL_END_YEAR = INITIAL_YEAR + YEARS_PER_LEVEL;

interface TutorialModalProps {
  onClose: () => void;
}

const TUTORIAL_STEPS = {
  es: [
    {
      title: '¡Bienvenido a DecarboNation!',
      content: 'Embárcate en la misión de guiar a tu nación hacia la neutralidad de carbono y la sostenibilidad. Tus decisiones políticas darán forma al futuro. ¡DecarboNito, tu asesor IA, está aquí para ayudarte!'
    },
    {
      title: 'Panel de Control Superior',
      content: `Arriba encontrarás información crucial:
    • **Año Actual**: Sigue el progreso de tu nación a través del tiempo. Cada simulación avanza un año. Junto al año actual verás también el año de finalización del nivel (por ejemplo "${INITIAL_YEAR} / ${LEVEL_END_YEAR}").
    • **Duración del Nivel**: Cada nivel dura ${YEARS_PER_LEVEL} años simulados, desde ${INITIAL_YEAR} hasta ${LEVEL_END_YEAR}.
    • **Nivel**: Tu etapa actual en el juego. Cada nivel introduce nuevos desafíos y mecánicas.
    • **Puntaje**: Refleja tu desempeño general. ¡Más alto es mejor! Pasa el cursor sobre el puntaje para ver cómo se calcula.
    • **Fijar Nivel**: Estos botones te permiten revisitar o saltar a niveles específicos. Útil para aprender o experimentar, pero la progresion natural del juego es secuencial.`
    },
    {
      title: 'Indicadores de Sostenibilidad',
      content: `En el tablero principal, monitorea estos indicadores vitales (valores 0-100%):
    • **Biodiversidad**: La salud de tus ecosistemas. Esencial para la resiliencia.
    • **Emisiones CO2eq/cápita**: Mide las emisiones de gases de efecto invernadero por persona. Un valor bajo es favorable y es tu objetivo clave para la descarbonización.
    • **(Nivel 2+) Seguridad Alimentaria, Económica, Bienestar Social, Estabilidad Política**: Aspectos cruciales para una nación próspera y estable.
    • **(Nivel 3+) PBI Real, Deuda, Reservas del Tesoro**: Indicadores financieros avanzados para gestionar la economía nacional.
    Los colores te dan una pista rápida: Verde (bueno), Amarillo (precaución), Rojo (crítico).`
    },
    {
      title: 'Tomando Decisiones: Las Políticas',
      content: `Aquí es donde ejerces tu liderazgo:
    • **Activar/Desactivar**: Haz clic en el interruptor junto al nombre de una política para activarla o desactivarla.
    • **Máximo ${MAX_ACTIVE_POLICIES} Políticas Activas**: Elige tus prioridades estratégicamente.
    • **Bloqueo Temporal**: Una vez activada, una política debe permanecer activa por ${POLICY_LOCK_IN_DURATION} años antes de poder desactivarla.
    • **Información Detallada**: Pasa el cursor sobre el nombre de una política para ver su descripción. En Nivel 2+, también verás su eficiencia actual (un pequeño círculo de color).`
    },
    {
      title: 'Afinando el Impacto: Instrumentos (Nivel 2+)',
      content: `A partir del Nivel 2, las políticas activas tienen 'Instrumentos' específicos:
    • **Asigna Esfuerzo**: En el panel 'Instrumentos de Política', puedes distribuir un esfuerzo (0-100%) a cada instrumento.
    • **Límite de Esfuerzo Total**: La suma del esfuerzo de todos los instrumentos de UNA política no puede superar el 100%.
    • **Impacto Refinado**: Esto te permite controlar con más detalle cómo se implementa cada política y optimizar su efectividad.`
    },
    {
      title: 'Territorio y Avance del Tiempo',
      content: `Visualiza el impacto de tus decisiones:
    • **Distribución de Uso del Suelo**: Este gráfico de torta muestra cómo se divide el territorio de tu nación (bosques, cultivos, etc.). Cada uso tiene diferentes implicaciones para el carbono y la biodiversidad.
    • **Simular Próximo Año**: Cuando hayas ajustado tus políticas (y sus instrumentos si aplica), presiona este botón para avanzar un año en el juego y observar los resultados.`
    },
    {
      title: 'DecarboNito: Tu Asesor IA',
      content: `A la derecha, encontrarás el panel de DecarboNito, tu asistente personal:
    • **Pregunta lo que Necesites**: ¿Dudas sobre mecánicas del juego? ¿Quieres discutir estrategias? ¿No entiendes el impacto de una política? DecarboNito está para ayudarte.
    • **Sugerencias Inteligentes**: Basado en el estado actual de tu juego, DecarboNito te ofrecerá preguntas sugeridas para guiar tu análisis.
    • **Consejo Contextual**: El asesor entiende en qué nivel estás y adaptará sus explicaciones y consejos a los desafíos específicos de esa etapa.`
    },
    {
      title: 'Progresión y Desafíos Futuros',
      content: `Cada nivel de DecarboNation te presenta nuevos desafíos y complejidades:
    • **Nivel 1 (Estrategia Nacional Fundacional)**: Enfócate en sentar las bases para la descarbonización y la sostenibilidad a nivel nacional.
    • **Nivel 2 (Coordinación Regional y Sostenibilidad Ampliada)**: Gestiona indicadores socioeconómicos, presiones políticas y coordina políticas entre regiones. Introduce los instrumentos de política.
    • **Nivel 3 (Liderazgo Global en Sostenibilidad)**: Alcanza la neutralidad de carbono y lidera globalmente, manejando finanzas avanzadas (PBI, deuda, préstamos, impuestos), pactos internacionales complejos y eventos dinámicos.
    Presta atención a los objetivos específicos de cada nivel para avanzar.`
    },
    {
      title: 'Finanzas Avanzadas y Pactos (Nivel 3)',
      content: `En el Nivel 3, manejarás la economía a un nivel más profundo:
    • **Préstamos**: Te permiten solicitar una inyección de capital que va a tus Reservas del Tesoro. ¡Cuidado! Este monto se suma a tu Deuda total, la cual genera intereses anuales que debes pagar. Es una herramienta poderosa pero peligrosa.
    • **Presión Fiscal Adicional**: Un control deslizante para aplicar un impuesto extra sobre el PBI. Aumenta tus ingresos, pero tiene un costo: reduce la seguridad económica, el bienestar social y el crecimiento del PBI, y aumenta la presión social.
    • **Pactos Internacionales**: Acuerdos con otras naciones. Unirse tiene costos (de adhesión y/o anuales) pero otorga beneficios (o a veces desventajas) continuos a tus indicadores.`
    },
    {
      title: '¡Todo Listo para Liderar!',
      content: 'Ahora tienes las herramientas y conocimientos básicos para comenzar tu gestión en DecarboNation. Recuerda que cada decisión cuenta. ¡Explora, experimenta y lleva a tu nación hacia un futuro próspero y sostenible! No dudes en consultar a DecarboNito en cualquier momento. ¡Mucha suerte, líder!'
    }
  ],
  en: [
    {
      title: 'Welcome to DecarboNation!',
      content: 'Embark on the mission of guiding your nation toward carbon neutrality and long-term sustainability. Your policy decisions will shape the future. DecarboNito, your AI advisor, is here to help you every step of the way!'
    },
    {
      title: 'Top Control Panel',
      content: `At the top you will find crucial information:
    • **Current Year**: Track your nation's progress over time. Each simulation run advances by one year. Next to the current year you will also see the level's end year (e.g. "${INITIAL_YEAR} / ${LEVEL_END_YEAR}").
    • **Level Duration**: Each level lasts ${YEARS_PER_LEVEL} simulated years, from ${INITIAL_YEAR} to ${LEVEL_END_YEAR}.
    • **Level**: Your current stage in the game. Each level introduces new challenges and mechanics.
    • **Score**: Reflects your overall performance. Higher is better! Hover over the score to see how it is calculated.
    • **Lock Level**: These buttons let you revisit or jump to specific levels. Useful for learning or experimenting, though natural game progression is sequential.`
    },
    {
      title: 'Sustainability Indicators',
      content: `On the main dashboard, monitor these vital indicators (values 0–100%):
    • **Biodiversity**: The health of your ecosystems. Essential for ecological resilience.
    • **CO2eq Emissions per capita**: Measures greenhouse gas emissions per person. A lower value is favorable and is your key decarbonisation objective.
    • **(Level 2+) Food Security, Economic Security, Social Wellbeing, Political Stability**: Critical dimensions for a prosperous and stable nation.
    • **(Level 3+) Real GDP, Public Debt, Treasury Reserves**: Advanced financial indicators for managing the national economy.
    Colours provide a quick reading: Green (good), Yellow (caution), Red (critical).`
    },
    {
      title: 'Making Decisions: Policies',
      content: `This is where you exercise your leadership:
    • **Enable/Disable**: Click the toggle next to a policy name to activate or deactivate it.
    • **Maximum ${MAX_ACTIVE_POLICIES} Active Policies**: Choose your priorities strategically.
    • **Policy Lock-in**: Once activated, a policy must remain active for ${POLICY_LOCK_IN_DURATION} years before it can be deactivated.
    • **Detailed Information**: Hover over a policy name to see its description. At Level 2+, you will also see its current efficiency rating (a small coloured circle).`
    },
    {
      title: 'Fine-tuning Impact: Instruments (Level 2+)',
      content: `From Level 2 onwards, active policies have specific 'Instruments':
    • **Allocate Effort**: In the 'Policy Instruments' panel, you can distribute an effort level (0–100%) to each instrument.
    • **Total Effort Cap**: The combined effort of all instruments for ONE policy cannot exceed 100%.
    • **Refined Impact**: This gives you finer control over how each policy is implemented and lets you optimise its effectiveness.`
    },
    {
      title: 'Territory and Advancing Time',
      content: `Visualise the impact of your decisions:
    • **Land-Use Distribution**: This pie chart shows how your nation's territory is divided (forests, cropland, etc.). Each land-use type has different implications for carbon sequestration and biodiversity.
    • **Simulate Next Year**: Once you have adjusted your policies (and their instruments, where applicable), press this button to advance one year in the game and observe the results.`
    },
    {
      title: 'DecarboNito: Your AI Advisor',
      content: `On the right, you will find DecarboNito's panel — your personal assistant:
    • **Ask Anything**: Questions about game mechanics? Want to discuss strategies? Unsure about the impact of a policy? DecarboNito is here to help.
    • **Smart Suggestions**: Based on the current state of your game, DecarboNito will offer suggested questions to guide your analysis.
    • **Contextual Advice**: The advisor understands which level you are on and will tailor its explanations and recommendations to the specific challenges of that stage.`
    },
    {
      title: 'Progression and Future Challenges',
      content: `Each level of DecarboNation presents new challenges and complexities:
    • **Level 1 (Foundational National Strategy)**: Focus on laying the groundwork for decarbonisation and national-level sustainability.
    • **Level 2 (Regional Coordination and Expanded Sustainability)**: Manage socioeconomic indicators, political pressures, and coordinate policies across regions. Policy instruments are introduced at this stage.
    • **Level 3 (Global Sustainability Leadership)**: Achieve carbon neutrality and lead globally, handling advanced public finances (GDP, debt, loans, taxation), complex international pacts, and dynamic events.
    Pay close attention to each level's specific objectives in order to progress.`
    },
    {
      title: 'Advanced Finance and International Pacts (Level 3)',
      content: `At Level 3, you will manage the economy at a deeper level:
    • **Loans**: Allow you to request a capital injection that goes directly to your Treasury Reserves. Beware — this amount is added to your total Public Debt, which accrues annual interest you must service. A powerful but risky instrument.
    • **Additional Fiscal Pressure**: A slider to apply a supplementary tax on GDP. It increases revenues, but at a cost: it reduces economic security, social wellbeing, and GDP growth, while increasing social pressure.
    • **International Pacts**: Agreements with other nations. Joining carries costs (entry and/or annual fees) but grants ongoing benefits — or sometimes disadvantages — to your indicators.`
    },
    {
      title: 'Ready to Lead!',
      content: 'You now have the foundational tools and knowledge to begin your tenure in DecarboNation. Remember that every decision matters. Explore, experiment, and guide your nation toward a prosperous and sustainable future! Do not hesitate to consult DecarboNito at any time. Good luck, leader!'
    }
  ],
} as const;

const UI = {
  es: {
    close: 'Cerrar tutorial',
    prev: 'Anterior',
    next: 'Siguiente',
    finish: 'Finalizar Tutorial',
    step: (c: number, t: number) => `Paso ${c} de ${t}`,
  },
  en: {
    close: 'Close tutorial',
    prev: 'Previous',
    next: 'Next',
    finish: 'Finish Tutorial',
    step: (c: number, t: number) => `Step ${c} of ${t}`,
  },
} as const;

const TutorialModal: React.FC<TutorialModalProps> = ({ onClose }) => {
  const { language } = useLanguageContext();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => { setCurrentStep(0); }, [language]);

  const tutorialSteps = TUTORIAL_STEPS[language];
  const ui = UI[language];

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
            aria-label={ui.close}
          >
            &times;
          </button>
        </div>

        <div className="overflow-y-auto flex-grow mb-6 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 pr-2">
          <p className="text-sm sm:text-base whitespace-pre-line leading-relaxed">{step.content}</p>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-gray-700">
          <span className="text-xs text-gray-400">
            {ui.step(currentStep + 1, tutorialSteps.length)}
          </span>
          <div className="space-x-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg transition-colors"
              >
                {ui.prev}
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-custom-accent hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
            >
              {currentStep === tutorialSteps.length - 1 ? ui.finish : ui.next}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;
