import React, { useState } from 'react';
import { useLanguageContext } from '../../contexts/LanguageContext';

interface CoverScreenProps {
  /**
   * 'gate' — first-entry cover shown before the login/demo flow (dismiss = proceed to that flow).
   * 'about' — reopened on demand via the persistent "Acerca de" header button, layered on top of
   *           an in-progress game session. Must never reset/unmount game state.
   */
  mode?: 'gate' | 'about';
  /** Called when the user dismisses the screen. `dontShowAgain` reflects the checkbox state. */
  onStart: (dontShowAgain: boolean) => void;
  /** Only used in 'about' mode, to render a dedicated close (X) affordance. */
  onClose?: () => void;
  /** Whether "no volver a mostrar" is currently persisted, to pre-check the checkbox. */
  initialDontShowAgain?: boolean;
}

const T = {
  es: {
    eyebrow: 'Proyecto IKI',
    institutions: 'FCF-UNaM · Fundación Bariloche · CONICET',
    subtitle: 'Simulador estratégico y laboratorio de escenarios de política climática',
    whatIsTitle: 'Qué es DecarboNation',
    whatIsBody: [
      <>
        <strong>DecarboNation</strong> es un <em>simulador estratégico y laboratorio de escenarios</em> para
        explorar políticas nacionales de reducción de emisiones, con foco en las complejas interacciones del
        sector AFOLU y sus vínculos con dimensiones sociales, económicas, ambientales y político-institucionales.
        Su propósito no es predecir de manera exacta el comportamiento del sistema real, sino ofrecer un entorno
        controlado donde distintos usuarios puedan ensayar combinaciones de políticas, visualizar trade-offs,
        anticipar restricciones de implementación y comparar trayectorias alternativas de descarbonización sin
        asumir los costos de experimentarlas directamente en la realidad.
      </>,
      <>
        DecarboNation ofrece un espacio de prueba de estrategias públicas: permite aprender de manera iterativa,
        identificar tensiones entre objetivos —como mitigación, producción, biodiversidad, bienestar, estabilidad
        política o restricciones fiscales— y fortalecer una forma de razonamiento más sistémica, deliberativa y
        orientada al largo plazo.
      </>,
      <>
        El principal valor de DecarboNation no radica en ofrecer una respuesta única o una predicción cerrada,
        sino en facilitar el intercambio y ampliación de criterios de decisión, para la preparación de decisiones
        en contextos donde el corto plazo, la fragmentación sectorial y la subestimación de los efectos cruzados
        suelen limitar la construcción de estrategias efectivas.
      </>,
    ],
    whatYouGetTitle: 'Qué vas a obtener',
    whatYouGetBody: (
      <>
        La experiencia culmina con una devolución sintética de resultados que traduce el recorrido realizado en
        un insumo útil para la discusión: una breve síntesis de decisiones, tensiones, impactos intersectoriales
        y lecciones estratégicas, pensada para apoyar la reflexión individual, el diálogo entre sectores y la
        consideración de trayectorias alternativas de política.
      </>
    ),
    dontShowAgain: 'No volver a mostrar esta pantalla',
    startCta: 'Comenzar exploración',
    backCta: 'Volver al simulador',
    closeLabel: 'Cerrar',
    illustrationAlt: 'Ilustración: transición de una economía de altas emisiones hacia la regeneración ambiental',
    illustrationCaption: 'De las emisiones a la regeneración',
  },
  en: {
    eyebrow: 'IKI Project',
    institutions: 'FCF-UNaM · Fundación Bariloche · CONICET',
    subtitle: 'A strategic simulator and scenario laboratory for climate policy',
    whatIsTitle: 'What DecarboNation is',
    whatIsBody: [
      <>
        <strong>DecarboNation</strong> is a <em>strategic simulator and scenario laboratory</em> for exploring
        national emissions-reduction policies, with a focus on the complex interactions of the AFOLU sector and
        its links to social, economic, environmental and political-institutional dimensions. Its purpose is not
        to predict the real system's behavior with exact precision, but to offer a controlled environment where
        different users can test policy combinations, visualize trade-offs, anticipate implementation
        constraints, and compare alternative decarbonization pathways without bearing the costs of testing them
        directly in reality.
      </>,
      <>
        DecarboNation provides a testing ground for public strategies: it enables iterative learning, helps
        identify tensions between objectives — such as mitigation, production, biodiversity, wellbeing, political
        stability or fiscal constraints — and strengthens a more systemic, deliberative and long-term-oriented
        way of reasoning.
      </>,
      <>
        DecarboNation's main value lies not in offering a single answer or a closed prediction, but in
        facilitating the exchange and broadening of decision-making criteria, to help prepare decisions in
        contexts where short-termism, sectoral fragmentation and the underestimation of cross-cutting effects
        often limit the construction of effective strategies.
      </>,
    ],
    whatYouGetTitle: "What you'll get",
    whatYouGetBody: (
      <>
        The experience concludes with a synthetic results debrief that translates the completed journey into a
        useful input for discussion: a brief synthesis of decisions, tensions, cross-sectoral impacts and
        strategic lessons, designed to support individual reflection, dialogue between sectors, and the
        consideration of alternative policy pathways.
      </>
    ),
    dontShowAgain: "Don't show this screen again",
    startCta: 'Start exploring',
    backCta: 'Back to the simulator',
    closeLabel: 'Close',
    illustrationAlt: 'Illustration: transition from a high-emissions economy toward environmental regeneration',
    illustrationCaption: 'From emissions to regeneration',
  },
} as const;

/**
 * Full-screen "arrival" cover — presents DecarboNation's identity, backers and purpose before the
 * user reaches the login/demo flow or the Dashboard. Shown automatically on first entry (gated by
 * the `decarbonationCoverSeen_v1` localStorage flag) and reachable at any time via the "Acerca de"
 * button in the Header (mode="about"), in which case it overlays the running session without
 * touching game state.
 */
const CoverScreen: React.FC<CoverScreenProps> = ({ mode = 'gate', onStart, onClose, initialDontShowAgain = false }) => {
  const { language } = useLanguageContext();
  const t = T[language];
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(initialDontShowAgain);

  const handlePrimaryAction = () => onStart(dontShowAgain);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[1000] p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cover-screen-title"
    >
      <div className="bg-custom-light-gray rounded-lg shadow-2xl max-w-3xl w-full text-gray-100 max-h-[95vh] flex flex-col animate-fade-in-scale-up overflow-hidden">
        {/* Header: wordmark + institutional mentions.
            NOTE: no real institutional logo image assets exist in this repo yet (FCF-UNaM,
            Fundación Bariloche, CONICET, proyecto IKI). These are styled-text placeholders,
            intentionally NOT <img> tags, pending real logo files from the funder. */}
        <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4 relative border-b border-gray-700">
          {mode === 'about' && onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-3xl leading-none"
              aria-label={t.closeLabel}
            >
              &times;
            </button>
          )}
          <h1 id="cover-screen-title" className="text-3xl sm:text-4xl font-bold text-custom-accent tracking-tight">
            DecarboNation
          </h1>
          <p className="text-sm sm:text-base text-gray-300 mt-1">{t.subtitle}</p>
          <div className="mt-3 text-xs sm:text-sm text-gray-400">
            <span className="uppercase tracking-widest text-[10px] sm:text-xs text-gray-500 mr-2">{t.eyebrow}</span>
            <span className="font-medium text-gray-300">{t.institutions}</span>
          </div>
        </div>

        <div className="overflow-y-auto flex-grow px-6 sm:px-8 py-6 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {/* Illustration placeholder: pure CSS/SVG climate-transition motif — a factory
              (high-emissions starting point) whose trajectory dips and then rises into a
              tree (regeneration), read left-to-right like the gray-to-green background.
              No stock photography, no copyrighted characters. Swap for final art in a
              future pass. A visible caption backs up the motif so the concept doesn't
              depend on reading it correctly. */}
          <div
            className="w-full h-32 sm:h-40 rounded-lg mb-6 relative overflow-hidden bg-gradient-to-r from-gray-700 via-emerald-700 to-emerald-400 flex flex-col items-center justify-center gap-1.5"
            role="img"
            aria-label={t.illustrationAlt}
          >
            <svg viewBox="0 0 200 60" className="w-2/3 h-16 sm:h-20" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Factory: the high-emissions starting point */}
              <rect x="8" y="40" width="24" height="12" rx="1.5" fill="rgba(255,255,255,0.55)" />
              <rect x="12" y="24" width="5" height="17" rx="1" fill="rgba(255,255,255,0.55)" />
              <rect x="21" y="30" width="4" height="11" rx="1" fill="rgba(255,255,255,0.45)" />
              {/* Trajectory: dips (transition strain) then rises sharply toward the tree */}
              <path
                d="M36 26 C55 32, 68 46, 92 42 C118 38, 140 18, 163 10"
                stroke="rgba(255,255,255,0.9)"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M156 4 L165 10 L155 15"
                stroke="rgba(255,255,255,0.9)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              {/* Tree: the regenerative destination */}
              <circle cx="178" cy="22" r="9" fill="rgba(255,255,255,0.95)" />
              <circle cx="170" cy="26" r="6" fill="rgba(255,255,255,0.8)" />
              <circle cx="186" cy="26" r="6" fill="rgba(255,255,255,0.8)" />
              <rect x="175.5" y="30" width="5" height="12" rx="1.5" fill="rgba(255,255,255,0.95)" />
            </svg>
            <p className="text-[10px] sm:text-xs font-medium tracking-wide text-white/85 uppercase px-2 text-center">
              {t.illustrationCaption}
            </p>
          </div>

          <section className="mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-blue-300 mb-2">{t.whatIsTitle}</h2>
            <div className="space-y-3 text-sm sm:text-base leading-relaxed text-gray-200">
              {t.whatIsBody.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-blue-300 mb-2">{t.whatYouGetTitle}</h2>
            <p className="text-sm sm:text-base leading-relaxed text-gray-200">{t.whatYouGetBody}</p>
          </section>
        </div>

        <div className="px-6 sm:px-8 py-4 border-t border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <label className="flex items-center gap-2 text-xs sm:text-sm text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-custom-gray text-custom-accent focus:ring-custom-accent"
            />
            {t.dontShowAgain}
          </label>
          <button
            onClick={handlePrimaryAction}
            className="w-full sm:w-auto px-6 py-3 bg-custom-accent hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {mode === 'about' ? t.backCta : t.startCta}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoverScreen;
