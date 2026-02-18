
import React, { useState } from 'react';

interface PlayerManualProps {
  onClose: () => void;
}

const manualSlides = [
  {
    title: "Introducción: Pensando Estratégicamente",
    content: (
      <div>
        <p className="mb-4">¡Bienvenido al Manual del Jugador! Esta guía te ayudará a ir más allá de las decisiones individuales para convertirte en un verdadero estratega de la sostenibilidad. El objetivo es pensar en cómo tus políticas se combinan para crear un futuro próspero y sostenible.</p>
        <p className="mb-4">No se trata solo de activar políticas, sino de tejer una red de decisiones coherentes que se refuercen mutuamente a lo largo del tiempo.</p>
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-teal-300 mb-2">👤 Juego Individual</h4>
          <p className="text-sm">Piensa en planes de 5 a 10 años. ¿Cuál es tu visión para la nación? ¿Quieres un paraíso ecológico, una potencia económica verde, o un modelo de equidad social? Tu visión guiará tus decisiones.</p>
        </div>
        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-lg text-sky-300 mb-2">👥 Talleres en Grupo</h4>
          <p className="text-sm">Discutan y definan una visión compartida para la nación. Consideren asignar roles (ej. Ministro/a de Ambiente, de Economía, de Bienestar Social) para enriquecer el debate. ¿Cómo negociarán sus diferentes prioridades para alcanzar un objetivo común?</p>
        </div>
      </div>
    )
  },
  {
    title: "Sinergias y Antagonismos",
    content: (
        <div>
            <p className="mb-4">Las políticas no actúan de forma aislada. Algunas se ayudan mutuamente (<strong className="text-green-400">sinergias</strong>), mientras que otras entran en conflicto (<strong className="text-red-400">antagonismos</strong>). Identificarlas es clave para una estrategia exitosa.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-green-900 bg-opacity-40 rounded-lg">
                    <strong className="text-green-300">Ejemplo de Sinergia:</strong><br/>
                    Activar <span className="font-semibold">Conservación de Bienes Naturales</span> + <span className="font-semibold">Ganadería Sostenible</span> no solo suma, ¡multiplica! La biodiversidad se dispara, las presiones ambientalistas bajan y la calidad del suelo mejora notablemente.
                </div>
                <div className="p-3 bg-red-900 bg-opacity-40 rounded-lg">
                    <strong className="text-red-300">Ejemplo de Antagonismo:</strong><br/>
                    Combinar <span className="font-semibold">Agricultura Intensiva</span> con <span className="font-semibold">Normativas Ambientales Flexibles</span> puede aumentar la producción a corto plazo, pero provocará un colapso en la biodiversidad y un aumento drástico de la presión política ambientalista.
                </div>
            </div>
            <div className="mt-6 p-4 bg-gray-700 rounded-lg">
              <h4 className="font-semibold text-lg text-teal-300 mb-2">👤 Juego Individual</h4>
              <p className="text-sm">Antes de simular, revisa tus políticas activas. ¿Están trabajando juntas hacia tu visión, o se están saboteando entre sí? A veces, un antagonismo es un "mal necesario" a corto plazo, pero sé consciente del costo.</p>
            </div>
            <div className="mt-4 p-4 bg-gray-700 rounded-lg">
              <h4 className="font-semibold text-lg text-sky-300 mb-2">👥 Talleres en Grupo</h4>
              <p className="text-sm">Este es el corazón del debate. El "Ministro de Economía" puede querer políticas que entren en conflicto con las del "Ministro de Ambiente". Negocien y busquen un punto medio. ¿Pueden usar los instrumentos de política (Nivel 2+) para mitigar los efectos negativos?</p>
            </div>
        </div>
    )
  },
   {
    title: "Estrategias para el Nivel 1",
    content: (
      <div>
        <h3 className="text-xl font-bold text-yellow-400 mb-2">Foco: Sentar las Bases</h3>
        <p className="mb-4">En este nivel, el objetivo es simple pero fundamental: detener la sangría ambiental y comenzar a construir un futuro sostenible. No te preocupes excesivamente por la economía aún; enfócate en el planeta.</p>
        <p className="font-semibold">Indicadores Clave: <span className="text-green-300">Biodiversidad</span>, <span className="text-cyan-300">Emisiones CO2eq/cápita</span>, <span className="text-yellow-300">% Bosque Nativo</span>.</p>
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
            <h4 className="font-semibold text-lg text-teal-300 mb-2">👤 Juego Individual</h4>
            <p className="text-sm">Tu misión principal es detener la deforestación y empezar a secuestrar más carbono del que emites. Una combinación inicial potente es <strong className="text-green-400">Políticas de Conservación</strong> + <strong className="text-yellow-400">Políticas Agroecológicas</strong>. Esto estabilizará la biodiversidad y mejorará tu balance de carbono.</p>
        </div>
        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <h4 className="font-semibold text-lg text-sky-300 mb-2">👥 Talleres en Grupo</h4>
            <p className="text-sm">Acuerden una estrategia ambiental fundacional. El debate puede girar en torno a: ¿Priorizamos la protección estricta de bosques o fomentamos activamente la transición a cultivos sostenibles? Ambas son buenas, pero sus recursos son limitados. ¿Cuál da el primer paso?</p>
        </div>
      </div>
    )
  },
  {
    title: "Estrategias para el Nivel 2",
    content: (
      <div>
        <h3 className="text-xl font-bold text-yellow-400 mb-2">Foco: El Equilibrio Sociopolítico</h3>
        <p className="mb-4">¡Bienvenido a la complejidad! Ahora no solo gestionas el ambiente, sino también las expectativas y el descontento de tu gente. Las <strong className="text-orange-400">presiones políticas</strong> y los <strong className="text-purple-400">indicadores socioeconómicos</strong> son el centro del escenario.</p>
        <p className="font-semibold mb-2">Nuevas mecánicas: <span className="text-blue-300">Instrumentos de Política</span>. Úsalos para afinar el impacto de tus políticas y optimizar tus recursos.</p>
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
            <h4 className="font-semibold text-lg text-teal-300 mb-2">👤 Juego Individual</h4>
            <p className="text-sm">No puedes contentar a todos todo el tiempo. Mantén un ojo en los medidores de presión. Si la presión agrícola sube demasiado, quizás necesites activar una política que los beneficie (aunque sea temporalmente) para evitar inestabilidad. Usa los instrumentos para asignar más esfuerzo a las acciones que te den los mejores resultados con el menor costo político.</p>
        </div>
        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <h4 className="font-semibold text-lg text-sky-300 mb-2">👥 Talleres en Grupo</h4>
            <p className="text-sm">La negociación se vuelve crítica. El "lobby agrícola" chocará con los "grupos ambientalistas". ¿Cómo se llega a un acuerdo? Aquí es donde los instrumentos brillan: "Ok, aprobaremos la política de Agricultura Intensiva, pero solo asignaremos un 20% de esfuerzo a los subsidios a pesticidas y un 80% a la logística, ¿trato hecho?". Es un ejercicio de consenso y priorización.</p>
        </div>
      </div>
    )
  },
  {
    title: "Estrategias para el Nivel 3",
    content: (
       <div>
        <h3 className="text-xl font-bold text-yellow-400 mb-2">Foco: Liderazgo Global y Finanzas</h3>
        <p className="mb-4">Tu nación ahora juega en las grandes ligas. Debes demostrar que la sostenibilidad es compatible con una economía robusta y un liderazgo internacional. La gestión financiera es tan importante como la ambiental.</p>
        
        <h4 className="font-semibold text-lg text-purple-300 mt-4 mb-2">Análisis de las Nuevas Mecánicas:</h4>
        <ul className="list-none space-y-3 text-sm">
            <li>
                <strong className="text-green-300 block">🤝 Pactos Internacionales:</strong>
                Unirse a un pacto tiene costos (de adhesión y/o anuales) que se descuentan de tus Reservas. A cambio, otorgan efectos pasivos (positivos o negativos) a tus indicadores cada año. Analiza cada pacto: ¿los beneficios a largo plazo justifican el costo inmediato?
            </li>
            <li>
                <strong className="text-yellow-300 block">💰 Préstamos:</strong>
                Te permite añadir una suma de dinero a tus Reservas del Tesoro en el siguiente turno. Este monto se suma a tu Deuda total, la cual genera intereses anuales y debe ser pagada a lo largo del tiempo. Es una inyección de capital rápida con un costo a largo plazo. Ideal para una inversión estratégica, peligroso para cubrir déficits recurrentes.
            </li>
            <li>
                <strong className="text-red-300 block">📊 Presión Fiscal Adicional:</strong>
                Es un control deslizante que te permite añadir un impuesto extra (0-20%) sobre el PBI. Esto aumenta directamente tus ingresos anuales, pero cada punto porcentual de impuesto reduce la seguridad económica, el bienestar social y el crecimiento del PBI, además de aumentar la presión política del grupo social. Es una herramienta de doble filo que debe usarse con extrema precaución.
            </li>
        </ul>

        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
            <h4 className="font-semibold text-lg text-teal-300 mb-2">👤 Juego Individual</h4>
            <p className="text-sm">Tu economía necesita ser fuerte para ganar. Usa los préstamos para financiar políticas de alto retorno como <strong className="text-teal-400">Inversión Extranjera</strong>. Usa los impuestos adicionales como último recurso para evitar una crisis fiscal, y prepárate para mitigar el descontento social.</p>
        </div>
        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <h4 className="font-semibold text-lg text-sky-300 mb-2">👥 Talleres en Grupo</h4>
            <p className="text-sm">El "Ministerio de Finanzas" y el "Banco Central" (imaginarios) se vuelven roles cruces. Debatan como gabinete: ¿Necesitamos este préstamo? ¿Los beneficios de este pacto superan los costos? ¿Soportará la población un aumento de impuestos para financiar nuestros proyectos verdes? Es el momento de formular un verdadero plan económico nacional.</p>
        </div>
      </div>
    )
  },
   {
    title: "Gestión de Crisis: ¿Qué Hacer Cuando Todo Va Mal?",
    content: (
       <div>
        <p className="mb-4">Toda nación enfrenta crisis. Tu habilidad para responder determinará tu éxito. No entres en pánico, ¡analiza y actúa!</p>
        <ul className="list-none space-y-3 text-sm">
            <li><strong className="text-orange-400 block">🚨 Presión Política por las Nubes:</strong><br/> Identifica qué grupo está más descontento (agrícola, ambientalista, social) y mira los indicadores relacionados. ¿Cayó la seguridad económica? ¿La biodiversidad está en mínimos? Activa una política que los apacigüe directamente. Es un parche, pero te da tiempo.</li>
            <li><strong className="text-red-400 block">📉 Crisis Económica (Reservas Bajas, Deuda Alta):</strong><br/> Necesitas ingresos. Activa políticas pro-crecimiento como Inversión Extranjera. Si estás en Nivel 3, un préstamo puede ser inevitable. Úsalo para invertir en algo productivo, no solo para cubrir gastos.</li>
            <li><strong className="text-green-400 block">🌍 Colapso Ecológico (Biodiversidad o Carbono Críticos):</strong><br/> Medidas drásticas. Activa todas las políticas pro-ambientales que puedas, incluso si sacrificas algo de economía a corto plazo. Sin un planeta sano, no hay economía a largo plazo.</li>
        </ul>
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
            <h4 className="font-semibold text-lg text-teal-300 mb-2">👤 Juego Individual</h4>
            <p className="text-sm">Pausa y analiza. Revisa los gráficos de tendencias. ¿Cuándo empezó el problema? ¿Qué decisión lo desencadenó? Entender la causa raíz es el primer paso para solucionarlo.</p>
        </div>
        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <h4 className="font-semibold text-lg text-sky-300 mb-2">👥 Talleres en Grupo</h4>
            <p className="text-sm">Convoquen una "reunión de gabinete de emergencia". Presenten la crisis y debatan las posibles soluciones. Es un gran momento para el juego de roles y la negociación bajo presión.</p>
        </div>
      </div>
    )
  },
   {
    title: "Guía para Talleres en Grupo",
    content: (
      <div>
        <p className="mb-4">DecarboNation es una poderosa herramienta para el diálogo y el aprendizaje colaborativo. Aquí tienes algunas ideas para maximizar la experiencia en grupo.</p>
        <ul className="list-disc list-inside space-y-4 text-sm">
            <li>
                <strong className="text-sky-300">Juego de Roles:</strong> Asignar roles (ej. Ministros/as de diferentes carteras, representantes de sectores de interés como agricultores o ambientalistas) hace que los debates sean más ricos y realistas. Los jugadores deberán defender los intereses de su rol, no solo su opinión personal.
            </li>
            <li>
                <strong className="text-sky-300">Mecanismos de Decisión:</strong> Establezcan cómo se tomarán las decisiones. ¿Será por consenso? ¿Por votación? ¿Habrá un/a "Presidente/a" con el voto final en caso de empate? Definir esto al principio evita conflictos posteriores.
            </li>
            <li>
                <strong className="text-sky-300">Pausas para la Reflexión:</strong> Después de cada nivel, o tras un evento importante (una crisis, un gran logro), pausen la simulación. Usen las preguntas de la "Guía de Reflexión" (accesible al final del juego) para discutir: ¿Qué funcionó? ¿Qué no? ¿Qué aprendimos sobre la complejidad de estos sistemas?
            </li>
             <li>
                <strong className="text-sky-300">Utilicen a DecarboNito:</strong> Animen al grupo a formular preguntas para DecarboNito. El chatbot puede actuar como un asesor técnico imparcial que provee datos para enriquecer el debate.
            </li>
        </ul>
         <p className="mt-6 text-sm italic text-gray-400">El objetivo no es solo "ganar" el juego, sino entender las tensiones, los compromisos y la necesidad de una visión integral en la gobernanza para la sostenibilidad.</p>
      </div>
    )
  },
];

const PlayerManual: React.FC<PlayerManualProps> = ({ onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < manualSlides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };
  
  const slide = manualSlides[currentSlide];

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[1000] p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="player-manual-title"
      onClick={onClose}
    >
      <div 
        className="bg-custom-light-gray p-6 sm:p-8 rounded-lg shadow-2xl max-w-3xl w-full text-gray-200 max-h-[90vh] flex flex-col border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-4">
            <h2 id="player-manual-title" className="text-2xl sm:text-3xl font-bold text-custom-accent">
                Manual del Jugador
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none" aria-label="Cerrar manual">&times;</button>
        </div>
        
        <div className="overflow-y-auto flex-grow mb-6 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 pr-4">
            <h3 className="text-xl font-semibold text-blue-300 mb-4">{slide.title}</h3>
            <div className="text-gray-300 text-base leading-relaxed space-y-4">
             {slide.content}
            </div>
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t border-gray-700">
          <span className="text-xs text-gray-400">
            Página {currentSlide + 1} de {manualSlides.length}
          </span>
          <div className="space-x-3">
            <button
              onClick={handlePrev}
              disabled={currentSlide === 0}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-custom-accent hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
            >
              {currentSlide === manualSlides.length - 1 ? 'Cerrar Manual' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerManual;
