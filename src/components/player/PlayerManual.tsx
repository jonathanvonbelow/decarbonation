
import React, { useState, useEffect } from 'react';
import { useLanguageContext } from '../../contexts/LanguageContext';

interface PlayerManualProps {
  onClose: () => void;
}

type Lang = 'es' | 'en';

const Card: React.FC<{ title: string; tone?: 'teal' | 'sky'; children: React.ReactNode }> = ({ title, tone = 'teal', children }) => (
  <div className="mt-4 p-4 bg-gray-700 rounded-lg">
    <h4 className={`font-semibold text-lg mb-2 ${tone === 'teal' ? 'text-teal-300' : 'text-sky-300'}`}>{title}</h4>
    <div className="text-sm">{children}</div>
  </div>
);

/**
 * Phase 50 (mejora-general/files/50 §1): the manual describes model 2.0 as it works — targets the indicators move
 * toward, policies that start slowly, wear and recover, instrument channels, the just transition, scarce public money —
 * and only the synergy the model really has (Agroecology + Conservation; antagonism Intensive Agriculture + Flexible
 * Regulations). The 1.1 manual described a Conservation + Sustainable Livestock synergy that no equation implements.
 */
function buildSlides(lang: Lang): { title: string; content: React.ReactNode }[] {
  const L = (es: string, en: string) => (lang === 'es' ? es : en);
  const solo = L('👤 Juego individual', '👤 Individual play');
  const group = L('👥 Talleres en grupo', '👥 Group workshops');
  return [
    {
      title: L('Introducción: pensar estratégicamente', 'Introduction: thinking strategically'),
      content: (
        <div>
          <p className="mb-4">{L('Esta guía te ayuda a ir más allá de las decisiones sueltas: el país responde a la combinación de tus políticas, al tiempo que llevan activas y a cómo repartís el esfuerzo y el dinero.', 'This guide helps you go beyond one-off decisions: the country responds to the combination of your policies, how long they have been running and how you split effort and money.')}</p>
          <Card title={L('🤖 DecarboNito, tu asesor flotante', '🤖 DecarboNito, your floating advisor')}>
            {L('Hacé clic en él (o presioná C) para conversar. Responde preguntas con los datos de tu partida, te señala controles del tablero y, si se lo pedís, opera la interfaz por vos, siempre pidiendo confirmación.', 'Click him (or press C) to talk. He answers with your game\'s data, points at controls on the board and, if you ask, operates the interface for you, always asking for confirmation.')}
          </Card>
          <Card title={L('🏁 No hay una sola forma de ganar', '🏁 There is no single way to win')}>
            {L('Al final de cada nivel tenés que cumplir los mínimos de gobernabilidad y una ruta completa: integridad ecológica, transición productiva, innovación (y equilibrio en el Nivel 3). El panel "Rutas de victoria" muestra cuánto te falta en cada una.', 'At the end of each level you must meet the governance floors and one complete route: ecological integrity, productive transition, innovation (and equilibrium on Level 3). The "Win routes" panel shows how far you are from each.')}
          </Card>
          <Card title={group} tone="sky">{L('Definan una visión compartida y repartan roles (Ambiente, Economía, Bienestar Social) para enriquecer el debate.', 'Agree on a shared vision and split roles (Environment, Economy, Social Wellbeing) to enrich the debate.')}</Card>
        </div>
      ),
    },
    {
      title: L('Cómo responde tu país', 'How your country responds'),
      content: (
        <div>
          <p className="mb-4">{L('Cada indicador se mueve cada año una parte del camino hacia un objetivo. Debajo de cada número del tablero ves ese objetivo: "va hacia 52". Si no tocás nada y el territorio no cambia, el objetivo es el valor de partida y el indicador se queda quieto.', 'Every indicator moves each year part of the way toward a target. Under each number on the board you see that target: "heading to 52". If you change nothing and the territory stays the same, the target is the starting value and the indicator stays put.')}</p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>{L('Las decisiones cambian el objetivo enseguida; el indicador lo sigue con inercia. La biodiversidad es la más lenta (deuda de extinción).', 'Decisions change the target right away; the indicator follows it with inertia. Biodiversity is the slowest (extinction debt).')}</li>
            <li>{L('El CO₂ por habitante tiene tres fuentes, que el tablero desglosa: energía, suelo (AFOLU) y cambio de uso. La energía baja con electricidad renovable y eficiencia, que también avanzan de a poco.', 'CO₂ per inhabitant has three sources, broken down on the board: energy, land (AFOLU) and land-use change. Energy falls with renewable electricity and efficiency, which also advance slowly.')}</li>
            <li>{L('El presupuesto de carbono suma lo que emitiste desde el inicio contra una senda que baja hacia 2054: más de 1 es pasarse.', 'The carbon budget adds what you emitted since the start against a path falling toward 2054: above 1 means over budget.')}</li>
          </ul>
          <Card title={solo}>{L('Antes de simular, mirá las flechas: te dicen hacia dónde va cada indicador con lo que ya decidiste.', 'Before simulating, look at the arrows: they tell you where each indicator is heading with what you already decided.')}</Card>
        </div>
      ),
    },
    {
      title: L('Políticas: arrancan, rinden, se desgastan', 'Policies: they start, perform, wear out'),
      content: (
        <div>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong className="text-yellow-300">{L('En marcha', 'Starting up')}</strong>: {L('recién activada rinde poco; tarda entre medio año y dos años y medio en llegar a la mayor parte de su efecto.', 'just activated it yields little; it takes half a year to two and a half years to reach most of its effect.')}</li>
            <li><strong className="text-green-300">{L('Plena', 'Full')}</strong>: {L('rinde lo máximo.', 'it performs at its best.')}</li>
            <li><strong className="text-orange-300">{L('Desgastada', 'Worn')}</strong>: {L('con los años de uso pierde empuje hacia un piso institucional (nunca llega a cero).', 'with years of use it loses push toward an institutional floor (it never reaches zero).')}</li>
            <li><strong className="text-sky-300">{L('Descanso', 'Rest')}</strong>: {L('si la desactivás, se recupera; al reactivarla vuelve a arrancar de a poco.', 'if you deactivate it, it recovers; when reactivated it starts slowly again.')}</li>
          </ul>
          <p className="mt-3 text-sm">{L('Cada política cuesta una parte del PBI por año, que crece con el esfuerzo que le ponés. El Estado ya gasta casi todo lo que recauda: con pocas políticas sobra un 2 % del PBI, con muchas hay déficit y deuda.', 'Each policy costs a share of GDP per year, which grows with the effort you put in. The State already spends almost all it collects: with few policies about 2 % of GDP is left; with many there is a deficit and debt.')}</p>
          <Card title={solo}>{L('Una política desgastada que ya hizo su trabajo puede descansar unos años mientras otra toma la posta.', 'A worn policy that already did its job can rest for a few years while another takes over.')}</Card>
        </div>
      ),
    },
    {
      title: L('Instrumentos, canales y transición justa (Nivel 2+)', 'Instruments, channels and just transition (Level 2+)'),
      content: (
        <div>
          <p className="mb-3 text-sm">{L('Cada política tiene cuatro instrumentos. Cada uno pesa más en un canal: suelo (bosque, hábitat, carbono del suelo), producción (rendimientos, exportaciones, economía) o social (conflicto, presiones). El panel los etiqueta "alto" o "medio". El reparto parejo da el efecto completo; concentrar refuerza un canal y debilita los otros, con rendimientos decrecientes.', 'Each policy has four instruments. Each weighs more on one channel: land (forest, habitat, soil carbon), production (yields, exports, economy) or social (conflict, pressures). The panel tags them "high" or "medium". An even split gives the full effect; concentrating strengthens one channel and weakens the others, with diminishing returns.')}</p>
          <p className="mb-3 text-sm">{L('Algunos instrumentos restringen al sector (áreas protegidas, impuesto al carbono, protección de fuentes de agua) y otros lo acompañan (bioinsumos, capacitación, silvopastoreo). El índice de transición justa J lo mide: restringir sin acompañar sube el conflicto social. También lo sube que la tierra se concentre en cultivo convencional y plantaciones (índice G).', 'Some instruments restrict the sector (protected areas, carbon tax, water-source protection) and others support it (bio-inputs, training, silvopasture). The just-transition index J measures it: restricting without support raises social conflict. So does land concentrating into conventional crops and plantations (index G).')}</p>
          <Card title={group} tone="sky">{L('Los instrumentos permiten negociar: el "lobby agrícola" y los "grupos ambientalistas" pueden discutir cuánto esfuerzo va a restringir y cuánto a acompañar.', 'Instruments allow negotiation: the "farm lobby" and the "environmental groups" can argue how much effort goes to restricting and how much to supporting.')}</Card>
        </div>
      ),
    },
    {
      title: L('Sinergias y antagonismos', 'Synergies and antagonisms'),
      content: (
        <div>
          <p className="mb-4">{L('Las políticas no actúan aisladas. En el modelo hay una combinación que suma más que sus partes y otra que resta más que sus partes:', 'Policies do not act alone. In the model there is one combination that adds more than its parts and one that subtracts more:')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-green-900 bg-opacity-40 rounded-lg">
              <strong className="text-green-300">{L('Sinergia', 'Synergy')}</strong><br />
              {L('Agroecología + Conservación de los Bienes Naturales: juntas suben la biodiversidad más que cada una por separado (cuenta la más débil de las dos, así que conviene sostener ambas).', 'Agroecology + Natural Conservation: together they raise biodiversity more than each one alone (the weaker of the two counts, so it pays to sustain both).')}
            </div>
            <div className="p-3 bg-red-900 bg-opacity-40 rounded-lg">
              <strong className="text-red-300">{L('Antagonismo', 'Antagonism')}</strong><br />
              {L('Agricultura Intensiva + Normativas Ambientales Flexibles: juntas hunden la biodiversidad más que cada una por separado.', 'Intensive Agriculture + Flexible Environmental Regulations: together they sink biodiversity more than each one alone.')}
            </div>
          </div>
          <p className="mt-4 text-sm">{L('Hay además tensiones que no son sinergias sino costos: Conservación baja la presión ambientalista pero sube la agrícola; sacar tierra de producción tensiona al campo; el impuesto al carbono pesa sobre la seguridad económica.', 'There are also tensions that are not synergies but costs: Conservation lowers environmental pressure but raises the agricultural one; taking land out of production strains farmers; the carbon tax weighs on economic security.')}</p>
        </div>
      ),
    },
    {
      title: L('Nivel 1: sentar las bases', 'Level 1: laying the foundations'),
      content: (
        <div>
          <p className="mb-3">{L('Indicadores clave: biodiversidad, CO₂ por habitante, bosque nativo y seguridad económica (las rutas la piden y hay un mínimo). En este nivel el esfuerzo se reparte parejo: solo decidís qué políticas activar.', 'Key indicators: biodiversity, CO₂ per inhabitant, native forest and economic security (routes ask for it and there is a floor). On this level effort is split evenly: you only decide which policies to activate.')}</p>
          <Card title={solo}>{L('Conservación + Agroecología es la sinergia del modelo y frena la frontera agrícola; sin alguna política productiva, la economía y las cuentas públicas se resienten.', 'Conservation + Agroecology is the model\'s synergy and slows the farming frontier; without some productive policy, the economy and public accounts suffer.')}</Card>
        </div>
      ),
    },
    {
      title: L('Nivel 2: equilibrio sociopolítico', 'Level 2: socio-political balance'),
      content: (
        <div>
          <p className="mb-3">{L('Se suman las seguridades alimentaria y económica, el bienestar, la estabilidad y las tres presiones sectoriales, con un mínimo para cada una. Aparecen los instrumentos y el panel de transición justa (G y J).', 'Food and economic security, wellbeing, stability and the three sectoral pressures join, with a floor for each. Instruments and the just-transition panel (G and J) appear.')}</p>
          <Card title={solo}>{L('Si una presión sube, mirá su flecha: te dice si va a seguir subiendo. Acompañar lo que restringís suele bajar el conflicto más que sumar otra política.', 'If a pressure rises, look at its arrow: it tells you whether it will keep rising. Supporting what you restrict usually lowers conflict more than adding another policy.')}</Card>
        </div>
      ),
    },
    {
      title: L('Nivel 3: finanzas y liderazgo global', 'Level 3: finance and global leadership'),
      content: (
        <div>
          <ul className="list-none space-y-3 text-sm">
            <li><strong className="text-yellow-300 block">{L('💰 Dinero escaso', '💰 Scarce money')}</strong>{L('Las reservas nunca bajan del 2 % del PBI: cada déficit se paga con deuda. La deuda cobra intereses que suben si pasa el 60 % del PBI; si los intereses se comen más del 20 % de la recaudación, el estrés fiscal frena la economía. Con deuda por encima del 100 % del PBI e intereses por encima del 20 % durante dos años, la nación quiebra.', 'Reserves never fall below 2 % of GDP: every deficit is paid with debt. Debt pays interest that rises above 60 % of GDP; if interest eats more than 20 % of revenue, fiscal stress slows the economy. With debt above 100 % of GDP and interest above 20 % for two years, the nation goes bankrupt.')}</li>
            <li><strong className="text-green-300 block">{L('🤝 Pactos', '🤝 Pacts')}</strong>{L('Mueven objetivos mientras están vigentes y tienen una adhesión y una cuota anual. Entrar es inversión pública: sin espacio fiscal se rechaza.', 'They shift targets while in force and have an entry fee and an annual fee. Joining is public investment: without fiscal space it is refused.')}</li>
            <li><strong className="text-red-300 block">{L('📊 Préstamos y presión fiscal', '📊 Loans and tax pressure')}</strong>{L('El préstamo adelanta plata para invertir pero es deuda. La presión fiscal adicional sube la recaudación, frena el crecimiento y sube el malestar.', 'A loan prefinances investment but is debt. Additional tax pressure raises revenue, slows growth and raises discontent.')}</li>
          </ul>
          <Card title={group} tone="sky">{L('Debatan como gabinete: ¿este pacto vale su cuota? ¿Qué política dejamos descansar para bajar el déficit?', 'Debate as a cabinet: is this pact worth its fee? Which policy do we rest to cut the deficit?')}</Card>
        </div>
      ),
    },
    {
      title: L('Gestión de crisis', 'Crisis management'),
      content: (
        <div>
          <ul className="list-none space-y-3 text-sm">
            <li><strong className="text-orange-400 block">{L('🚨 Una presión por las nubes', '🚨 A pressure through the roof')}</strong>{L('Identificá qué grupo está peor que al inicio y qué lo empeoró (tierra fuera de producción, restricciones sin apoyo, bienestar en baja).', 'Find which group is worse off than at the start and what made it worse (land out of production, restrictions without support, falling wellbeing).')}</li>
            <li><strong className="text-red-400 block">{L('📉 Deuda creciente', '📉 Rising debt')}</strong>{L('Mirá el saldo primario: dejar descansar políticas costosas o sumar una productiva corta el déficit; un préstamo solo lo posterga.', 'Look at the primary balance: resting costly policies or adding a productive one cuts the deficit; a loan only postpones it.')}</li>
            <li><strong className="text-green-400 block">{L('🌍 Biodiversidad en caída', '🌍 Falling biodiversity')}</strong>{L('Responde lento: actuá antes de que la flecha apunte hacia el mínimo. Proteger y restaurar bosque y sostener la sinergia Agroecología + Conservación.', 'It responds slowly: act before the arrow points to the floor. Protect and restore forest and sustain the Agroecology + Conservation synergy.')}</li>
          </ul>
        </div>
      ),
    },
    {
      title: L('Guía para talleres en grupo', 'Guide for group workshops'),
      content: (
        <div>
          <ul className="list-disc list-inside space-y-4 text-sm">
            <li><strong className="text-sky-300">{L('Juego de roles', 'Role play')}:</strong> {L('asignar ministerios hace los debates más ricos.', 'assigning ministries makes debates richer.')}</li>
            <li><strong className="text-sky-300">{L('Mecanismo de decisión', 'Decision rule')}:</strong> {L('consenso, votación o presidencia con desempate.', 'consensus, vote or a chair with a tie-break.')}</li>
            <li><strong className="text-sky-300">{L('Cierre', 'Close')}:</strong> {L('al terminar, la app arma un informe con lo que hicieron, los índices de la sesión y preguntas de reflexión; el paquete docente trae la guía de debriefing.', 'at the end, the app builds a report with what you did, the session indices and reflection questions; the teacher package has the debriefing guide.')}</li>
          </ul>
          <p className="mt-6 text-sm italic text-gray-400">{L('Las cifras son de un modelo de juego, no proyecciones de un territorio real. El objetivo no es solo ganar: es entender las tensiones de gobernar la transición.', 'The figures come from a game model, not projections of a real territory. The goal is not just to win: it is to understand the tensions of governing the transition.')}</p>
        </div>
      ),
    },
  ];
}

const SLIDES_ES = buildSlides('es');
const SLIDES_EN = buildSlides('en');

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
