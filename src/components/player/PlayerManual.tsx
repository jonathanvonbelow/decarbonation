
import React, { useState, useEffect } from 'react';
import { useLanguageContext } from '../../contexts/LanguageContext';

interface PlayerManualProps {
  onClose: () => void;
}

const SLIDES_ES = [
  {
    title: "Introducción: Pensando Estratégicamente",
    content: (
      <div>
        <p className="mb-4">¡Bienvenido al Manual del Jugador! Esta guía te ayudará a ir más allá de las decisiones individuales para convertirte en un verdadero estratega de la sostenibilidad. El objetivo es pensar en cómo tus políticas se combinan para crear un futuro próspero y sostenible.</p>
        <p className="mb-4">No se trata solo de activar políticas, sino de tejer una red de decisiones coherentes que se refuercen mutuamente a lo largo del tiempo.</p>
        <div className="mt-4 mb-4 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-teal-300 mb-2">🤖 DecarboNito, tu asesor flotante</h4>
          <p className="text-sm">DecarboNito ya no vive en un panel fijo: es un personaje que flota sobre el tablero. Hacé clic en él (o presioná la tecla C) para conversar. Puede responder preguntas, señalarte cualquier control del tablero, y — si se lo pedís explícitamente — operar la interfaz por vos (activar políticas, asignar esfuerzo, simular), siempre pidiendo tu confirmación antes de cambiar algo.</p>
        </div>
        <div className="mt-4 mb-4 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-teal-300 mb-2">🏁 No hay una sola forma de ganar</h4>
          <p className="text-sm">Cada nivel se puede superar por varias rutas distintas (por ejemplo: una vía productiva, una ecológica, una de innovación tecnológica), cada una con su propio perfil de exigencias. El panel "Rutas de victoria" del tablero muestra tu progreso en cada una en tiempo real — no hace falta cumplir un único checklist fijo.</p>
        </div>
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-teal-300 mb-2">👤 Juego Individual</h4>
          <p className="text-sm">Piensa en planes de 5 a 10 años. ¿Cuál es tu visión para la nación? ¿Quieres un paraíso ecológico, una potencia económica verde, o un modelo de equidad social? Tu visión guiará tus decisiones.</p>
        </div>
        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-sky-300 mb-2">👥 Talleres en Grupo</h4>
          <p className="text-sm">Discutan y definan una visión compartida para la nación. Consideren asignar roles (ej. Ministro/a de Ambiente, de Economía, de Bienestar Social) para enriquecer el debate.</p>
        </div>
      </div>
    )
  },
  {
    title: "Sinergias y Antagonismos",
    content: (
      <div>
        <p className="mb-4">Las políticas no actúan de forma aislada. Algunas se ayudan mutuamente (<strong className="text-green-400">sinergias</strong>), mientras que otras entran en conflicto (<strong className="text-red-400">antagonismos</strong>).</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-green-900 bg-opacity-40 rounded-lg">
            <strong className="text-green-300">Ejemplo de Sinergia:</strong><br/>
            Activar <span className="font-semibold">Conservación de Bienes Naturales</span> + <span className="font-semibold">Ganadería Sostenible</span> no solo suma, ¡multiplica! La biodiversidad se dispara y las presiones ambientalistas bajan.
          </div>
          <div className="p-3 bg-red-900 bg-opacity-40 rounded-lg">
            <strong className="text-red-300">Ejemplo de Antagonismo:</strong><br/>
            Combinar <span className="font-semibold">Agricultura Intensiva</span> con <span className="font-semibold">Normativas Ambientales Flexibles</span> puede provocar un colapso en la biodiversidad.
          </div>
        </div>
        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-teal-300 mb-2">👤 Juego Individual</h4>
          <p className="text-sm">Antes de simular, revisa tus políticas activas. ¿Están trabajando juntas hacia tu visión, o se están saboteando entre sí?</p>
        </div>
        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-sky-300 mb-2">👥 Talleres en Grupo</h4>
          <p className="text-sm">El "Ministro de Economía" puede querer políticas que entren en conflicto con las del "Ministro de Ambiente". Negocien y busquen un punto medio.</p>
        </div>
      </div>
    )
  },
  {
    title: "Estrategias para el Nivel 1",
    content: (
      <div>
        <h3 className="text-xl font-bold text-yellow-400 mb-2">Foco: Sentar las Bases</h3>
        <p className="mb-4">En este nivel, el objetivo es detener la sangría ambiental y comenzar a construir un futuro sostenible.</p>
        <p className="font-semibold">Indicadores Clave: <span className="text-green-300">Biodiversidad</span>, <span className="text-cyan-300">Emisiones CO2eq/cápita</span>, <span className="text-yellow-300">% Bosque Nativo</span>.</p>
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-teal-300 mb-2">👤 Juego Individual</h4>
          <p className="text-sm">Una combinación inicial potente es <strong className="text-green-400">Políticas de Conservación</strong> + <strong className="text-yellow-400">Políticas Agroecológicas</strong>. Esto estabilizará la biodiversidad y mejorará tu balance de carbono.</p>
        </div>
        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-sky-300 mb-2">👥 Talleres en Grupo</h4>
          <p className="text-sm">Acuerden una estrategia ambiental fundacional. ¿Priorizamos la protección estricta de bosques o fomentamos la transición a cultivos sostenibles?</p>
        </div>
      </div>
    )
  },
  {
    title: "Estrategias para el Nivel 2",
    content: (
      <div>
        <h3 className="text-xl font-bold text-yellow-400 mb-2">Foco: El Equilibrio Sociopolítico</h3>
        <p className="mb-4">Ahora gestionas también las expectativas y el descontento de tu gente. Las <strong className="text-orange-400">presiones políticas</strong> y los <strong className="text-purple-400">indicadores socioeconómicos</strong> son el centro del escenario.</p>
        <p className="font-semibold mb-2">Nuevas mecánicas: <span className="text-blue-300">Instrumentos de Política</span>.</p>
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-teal-300 mb-2">👤 Juego Individual</h4>
          <p className="text-sm">Mantén un ojo en los medidores de presión. Si la presión agrícola sube demasiado, activa una política que los beneficie. Usa los instrumentos para asignar más esfuerzo a las acciones más eficientes.</p>
        </div>
        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-sky-300 mb-2">👥 Talleres en Grupo</h4>
          <p className="text-sm">La negociación se vuelve crítica. ¿Cómo se llega a un acuerdo entre el "lobby agrícola" y los "grupos ambientalistas"? Los instrumentos permiten negociar el esfuerzo asignado a cada subpolítica.</p>
        </div>
      </div>
    )
  },
  {
    title: "Estrategias para el Nivel 3",
    content: (
      <div>
        <h3 className="text-xl font-bold text-yellow-400 mb-2">Foco: Liderazgo Global y Finanzas</h3>
        <p className="mb-4">Tu nación juega en las grandes ligas. La gestión financiera es tan importante como la ambiental.</p>
        <ul className="list-none space-y-3 text-sm">
          <li><strong className="text-green-300 block">🤝 Pactos Internacionales:</strong> Analizá costos y beneficios a largo plazo antes de unirte.</li>
          <li><strong className="text-yellow-300 block">💰 Préstamos:</strong> Inyección de capital rápida con costo a largo plazo. Ideal para inversión estratégica.</li>
          <li><strong className="text-red-300 block">📊 Presión Fiscal Adicional:</strong> Aumenta ingresos pero reduce bienestar y crecimiento. Herramienta de doble filo.</li>
        </ul>
        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-teal-300 mb-2">👤 Juego Individual</h4>
          <p className="text-sm">Usa préstamos para financiar políticas de alto retorno. Los impuestos adicionales como último recurso.</p>
        </div>
        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-sky-300 mb-2">👥 Talleres en Grupo</h4>
          <p className="text-sm">Debatan como gabinete: ¿Necesitamos este préstamo? ¿Los beneficios del pacto superan los costos?</p>
        </div>
      </div>
    )
  },
  {
    title: "Gestión de Crisis",
    content: (
      <div>
        <p className="mb-4">No entres en pánico, ¡analiza y actúa!</p>
        <ul className="list-none space-y-3 text-sm">
          <li><strong className="text-orange-400 block">🚨 Presión Política por las Nubes:</strong> Identifica qué grupo está más descontento y activa una política que los apacigüe directamente.</li>
          <li><strong className="text-red-400 block">📉 Crisis Económica:</strong> Activa políticas pro-crecimiento. Si estás en Nivel 3, considera un préstamo para invertir en algo productivo.</li>
          <li><strong className="text-green-400 block">🌍 Colapso Ecológico:</strong> Medidas drásticas. Activa todas las políticas pro-ambientales que puedas.</li>
        </ul>
        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-teal-300 mb-2">👤 Juego Individual</h4>
          <p className="text-sm">Pausa y analiza. ¿Cuándo empezó el problema? Entender la causa raíz es el primer paso.</p>
        </div>
        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-sky-300 mb-2">👥 Talleres en Grupo</h4>
          <p className="text-sm">Convoquen una "reunión de gabinete de emergencia". Presenten la crisis y debatan posibles soluciones.</p>
        </div>
      </div>
    )
  },
  {
    title: "Guía para Talleres en Grupo",
    content: (
      <div>
        <p className="mb-4">DecarboNation es una poderosa herramienta para el diálogo y el aprendizaje colaborativo.</p>
        <ul className="list-disc list-inside space-y-4 text-sm">
          <li><strong className="text-sky-300">Juego de Roles:</strong> Asignar roles hace que los debates sean más ricos y realistas.</li>
          <li><strong className="text-sky-300">Mecanismos de Decisión:</strong> Establezcan si se decide por consenso, votación, o "presidencia" con voto de desempate.</li>
          <li><strong className="text-sky-300">Pausas para la Reflexión:</strong> Al cerrar una partida, la app genera automáticamente una síntesis individual (decisiones, trade-offs y preguntas de reflexión). Para el cierre grupal, el facilitador cuenta además con la "Guía del Facilitador — Debriefing de Taller" (documento descargable, con guion paso a paso y preguntas por nivel) para conducir la discusión: ¿Qué funcionó? ¿Qué aprendimos?</li>
          <li><strong className="text-sky-300">Utilicen a DecarboNito:</strong> El chatbot puede actuar como asesor técnico imparcial.</li>
        </ul>
        <p className="mt-6 text-sm italic text-gray-400">El objetivo no es solo "ganar", sino entender las tensiones y compromisos en la gobernanza para la sostenibilidad.</p>
      </div>
    )
  },
];

const SLIDES_EN = [
  {
    title: "Introduction: Thinking Strategically",
    content: (
      <div>
        <p className="mb-4">Welcome to the Player Manual! This guide will help you go beyond individual decisions and become a true sustainability strategist. The goal is to think about how your policies combine to create a prosperous and sustainable future.</p>
        <p className="mb-4">It's not just about activating policies, but about weaving a coherent web of decisions that reinforce each other over time.</p>
        <div className="mt-4 mb-4 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-teal-300 mb-2">🤖 DecarboNito, your floating advisor</h4>
          <p className="text-sm">DecarboNito no longer lives in a fixed panel: it's a character that floats over the board. Click it (or press the C key) to talk. It can answer questions, point at any control on the board, and — if you explicitly ask it to — operate the interface for you (activate policies, assign effort, simulate), always asking for your confirmation before changing anything.</p>
        </div>
        <div className="mt-4 mb-4 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-teal-300 mb-2">🏁 There's no single way to win</h4>
          <p className="text-sm">Each level can be cleared through several different routes (for example: a productive path, an ecological one, a technological-innovation one), each with its own profile of demands. The board's "Win routes" panel shows your progress on each in real time — there's no single fixed checklist to satisfy.</p>
        </div>
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-teal-300 mb-2">👤 Individual Play</h4>
          <p className="text-sm">Think in 5-to-10-year plans. What is your vision for the nation? Do you want an ecological paradise, a green economic powerhouse, or a model of social equity? Your vision will guide your decisions.</p>
        </div>
        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-sky-300 mb-2">👥 Group Workshops</h4>
          <p className="text-sm">Discuss and define a shared vision for the nation. Consider assigning roles (e.g., Environment Minister, Economy Minister, Social Welfare Minister) to enrich the debate.</p>
        </div>
      </div>
    )
  },
  {
    title: "Synergies and Antagonisms",
    content: (
      <div>
        <p className="mb-4">Policies don't act in isolation. Some help each other (<strong className="text-green-400">synergies</strong>), while others conflict (<strong className="text-red-400">antagonisms</strong>). Identifying them is key to a successful strategy.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-green-900 bg-opacity-40 rounded-lg">
            <strong className="text-green-300">Synergy Example:</strong><br/>
            Activating <span className="font-semibold">Natural Assets Conservation</span> + <span className="font-semibold">Sustainable Livestock</span> doesn't just add up — it multiplies! Biodiversity soars and environmental pressures drop.
          </div>
          <div className="p-3 bg-red-900 bg-opacity-40 rounded-lg">
            <strong className="text-red-300">Antagonism Example:</strong><br/>
            Combining <span className="font-semibold">Intensive Agriculture</span> with <span className="font-semibold">Flexible Environmental Regulations</span> may boost short-term production but will cause a biodiversity collapse.
          </div>
        </div>
        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-teal-300 mb-2">👤 Individual Play</h4>
          <p className="text-sm">Before simulating, review your active policies. Are they working together toward your vision, or sabotaging each other?</p>
        </div>
        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-sky-300 mb-2">👥 Group Workshops</h4>
          <p className="text-sm">The "Economy Minister" may want policies that conflict with those of the "Environment Minister." Negotiate and find common ground. Can you use policy instruments (Level 2+) to mitigate negative effects?</p>
        </div>
      </div>
    )
  },
  {
    title: "Strategies for Level 1",
    content: (
      <div>
        <h3 className="text-xl font-bold text-yellow-400 mb-2">Focus: Laying the Foundations</h3>
        <p className="mb-4">At this level, the goal is simple but fundamental: stop the environmental decline and begin building a sustainable future.</p>
        <p className="font-semibold">Key Indicators: <span className="text-green-300">Biodiversity</span>, <span className="text-cyan-300">CO2eq/capita Emissions</span>, <span className="text-yellow-300">% Native Forest</span>.</p>
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-teal-300 mb-2">👤 Individual Play</h4>
          <p className="text-sm">A powerful initial combination is <strong className="text-green-400">Conservation Policies</strong> + <strong className="text-yellow-400">Agro-ecological Policies</strong>. This will stabilize biodiversity and improve your carbon balance.</p>
        </div>
        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-sky-300 mb-2">👥 Group Workshops</h4>
          <p className="text-sm">Agree on a foundational environmental strategy. Do we prioritize strict forest protection or actively promote the transition to sustainable crops?</p>
        </div>
      </div>
    )
  },
  {
    title: "Strategies for Level 2",
    content: (
      <div>
        <h3 className="text-xl font-bold text-yellow-400 mb-2">Focus: Sociopolitical Balance</h3>
        <p className="mb-4">Welcome to complexity! Now you manage not just the environment, but also people's expectations and discontent. <strong className="text-orange-400">Political pressures</strong> and <strong className="text-purple-400">socioeconomic indicators</strong> take center stage.</p>
        <p className="font-semibold mb-2">New mechanics: <span className="text-blue-300">Policy Instruments</span>. Use them to fine-tune your policies' impact.</p>
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-teal-300 mb-2">👤 Individual Play</h4>
          <p className="text-sm">You can't please everyone all the time. Keep an eye on pressure gauges. Use instruments to allocate more effort to the actions that give the best results with the least political cost.</p>
        </div>
        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-sky-300 mb-2">👥 Group Workshops</h4>
          <p className="text-sm">Negotiation becomes critical. How do you reach an agreement between the "agricultural lobby" and "environmental groups"? Instruments allow negotiating effort allocation per sub-policy.</p>
        </div>
      </div>
    )
  },
  {
    title: "Strategies for Level 3",
    content: (
      <div>
        <h3 className="text-xl font-bold text-yellow-400 mb-2">Focus: Global Leadership and Finance</h3>
        <p className="mb-4">Your nation now plays in the big leagues. Financial management is as important as environmental management.</p>
        <ul className="list-none space-y-3 text-sm">
          <li><strong className="text-green-300 block">🤝 International Pacts:</strong> Analyze long-term costs and benefits before joining. Pacts grant passive annual effects on your indicators.</li>
          <li><strong className="text-yellow-300 block">💰 Loans:</strong> Quick capital injection with long-term cost. Ideal for strategic investment, dangerous for covering recurring deficits.</li>
          <li><strong className="text-red-300 block">📊 Additional Tax Pressure:</strong> Increases annual income but reduces economic security, social wellbeing, and GDP growth. A double-edged tool.</li>
        </ul>
        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-teal-300 mb-2">👤 Individual Play</h4>
          <p className="text-sm">Use loans to finance high-return policies like Foreign Investment. Use additional taxes as a last resort.</p>
        </div>
        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-sky-300 mb-2">👥 Group Workshops</h4>
          <p className="text-sm">Debate as a cabinet: Do we need this loan? Do the pact benefits outweigh the costs? Will the population accept a tax increase to fund our green projects?</p>
        </div>
      </div>
    )
  },
  {
    title: "Crisis Management",
    content: (
      <div>
        <p className="mb-4">Every nation faces crises. Your ability to respond will determine your success. Don't panic — analyze and act!</p>
        <ul className="list-none space-y-3 text-sm">
          <li><strong className="text-orange-400 block">🚨 Political Pressure Through the Roof:</strong> Identify which group is most discontented and activate a policy that directly appeases them.</li>
          <li><strong className="text-red-400 block">📉 Economic Crisis (Low Reserves, High Debt):</strong> Activate pro-growth policies like Foreign Investment. In Level 3, a loan may be unavoidable — invest it productively.</li>
          <li><strong className="text-green-400 block">🌍 Ecological Collapse (Critical Biodiversity or Carbon):</strong> Drastic measures. Activate all pro-environmental policies you can, even if you sacrifice some short-term economy.</li>
        </ul>
        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-teal-300 mb-2">👤 Individual Play</h4>
          <p className="text-sm">Pause and analyze. Review trend charts. When did the problem start? Understanding the root cause is the first step to solving it.</p>
        </div>
        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-sky-300 mb-2">👥 Group Workshops</h4>
          <p className="text-sm">Call an "emergency cabinet meeting." Present the crisis and debate possible solutions. A great moment for role-playing and negotiating under pressure.</p>
        </div>
      </div>
    )
  },
  {
    title: "Guide for Group Workshops",
    content: (
      <div>
        <p className="mb-4">DecarboNation is a powerful tool for dialogue and collaborative learning. Here are some ideas to maximize the group experience.</p>
        <ul className="list-disc list-inside space-y-4 text-sm">
          <li><strong className="text-sky-300">Role Play:</strong> Assigning roles (e.g., different ministry ministers, sector representatives) makes debates richer and more realistic. Players must defend their role's interests.</li>
          <li><strong className="text-sky-300">Decision Mechanisms:</strong> Establish how decisions will be made. By consensus? By vote? Is there a "President" with the deciding vote in case of a tie?</li>
          <li><strong className="text-sky-300">Reflection Pauses:</strong> When a session ends, the app automatically generates an individual synthesis (decisions, trade-offs, and reflection questions). For the group closing, the facilitator also has the "Facilitator Guide — Workshop Debriefing" (downloadable document with a step-by-step script and per-level questions) to run the discussion: What worked? What didn't? What did we learn?</li>
          <li><strong className="text-sky-300">Use DecarboNito:</strong> Encourage the group to ask questions to DecarboNito. The chatbot can act as an impartial technical advisor.</li>
        </ul>
        <p className="mt-6 text-sm italic text-gray-400">The goal is not just to "win" the game, but to understand the tensions, trade-offs, and need for an integral vision in governance for sustainability.</p>
      </div>
    )
  },
];

const UI = {
  es: { title: 'Manual del Jugador', close: 'Cerrar manual', page: (c:number,t:number) => `Página ${c} de ${t}`, prev: 'Anterior', next: 'Siguiente', finish: 'Cerrar Manual' },
  en: { title: "Player's Manual", close: 'Close manual', page: (c:number,t:number) => `Page ${c} of ${t}`, prev: 'Previous', next: 'Next', finish: 'Close Manual' },
} as const;

const PlayerManual: React.FC<PlayerManualProps> = ({ onClose }) => {
  const { language } = useLanguageContext();
  const ui = UI[language];
  const slides = language === 'es' ? SLIDES_ES : SLIDES_EN;
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => { setCurrentSlide(0); }, [language]);

  const handleNext = () => { if (currentSlide < slides.length - 1) setCurrentSlide(currentSlide + 1); else onClose(); };
  const handlePrev = () => { if (currentSlide > 0) setCurrentSlide(currentSlide - 1); };
  const slide = slides[currentSlide];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[1000] p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="player-manual-title" onClick={onClose}>
      <div className="bg-custom-light-gray p-6 sm:p-8 rounded-lg shadow-2xl max-w-3xl w-full text-gray-200 max-h-[90vh] flex flex-col border border-gray-700" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-4">
          <h2 id="player-manual-title" className="text-2xl sm:text-3xl font-bold text-custom-accent">{ui.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none" aria-label={ui.close}>&times;</button>
        </div>
        <div className="overflow-y-auto flex-grow mb-6 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 pr-4">
          <h3 className="text-xl font-semibold text-blue-300 mb-4">{slide.title}</h3>
          <div className="text-gray-300 text-base leading-relaxed space-y-4">{slide.content}</div>
        </div>
        <div className="flex justify-between items-center pt-4 border-t border-gray-700">
          <span className="text-xs text-gray-400">{ui.page(currentSlide + 1, slides.length)}</span>
          <div className="space-x-3">
            <button onClick={handlePrev} disabled={currentSlide === 0} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{ui.prev}</button>
            <button onClick={handleNext} className="px-4 py-2 bg-custom-accent hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors">{currentSlide === slides.length - 1 ? ui.finish : ui.next}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerManual;
