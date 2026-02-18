
import React, { useState } from 'react';
import { CONTROL_PARAMS, LEVEL_CONFIGS, INDICATOR_IMPACT_WEIGHTS, INITIAL_POLICIES, INITIAL_LAND_USES, ALL_RANDOM_EVENTS, INITIAL_PACTS, MAX_ACTIVE_POLICIES, POLICY_LOCK_IN_DURATION, YEARS_PER_LEVEL } from '../../constants';
import { Policy, LandUseType } from '../../types';

interface FacilitatorManualProps {
  onClose: () => void;
}

const Code: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <code className="text-orange-300 bg-gray-900 px-1.5 py-0.5 rounded-md text-xs mx-1">{children}</code>
);

const Param: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="text-cyan-400 font-medium">{children}</span>
);

const manualSlides = [
  {
    title: "Introducción y Conceptos Clave",
    content: (
      <div>
        <p className="mb-4">Este manual desglosa la lógica interna de la simulación de DecarboNation, revelando los supuestos y parámetros que impulsan el juego.</p>
        <h4 className="font-semibold mt-4 mb-2 text-blue-300">Flujo del Juego</h4>
        <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>El jugador selecciona un conjunto de <strong className="text-yellow-400">Políticas</strong> (máximo <Param>{MAX_ACTIVE_POLICIES}</Param>).</li>
            <li>(Nivel 2+) El jugador asigna <strong className="text-yellow-400">Esfuerzo</strong> a los <strong className="text-yellow-400">Instrumentos</strong> de cada política activa.</li>
            <li>El jugador presiona <strong className="text-green-400">"Simular Próximo Año"</strong>.</li>
            <li>El motor de simulación avanza un año, calculando cambios en el uso del suelo, indicadores, finanzas y presiones políticas.</li>
            <li>La interfaz se actualiza para reflejar el nuevo estado de la nación.</li>
        </ol>
        <h4 className="font-semibold mt-4 mb-2 text-blue-300">Conceptos Fundamentales</h4>
         <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong className="text-yellow-400">Eficiencia de Política:</strong> Cada política tiene una eficiencia que decae con el tiempo (<Param>efficiencyDecayDuration</Param>) y se ve afectada por factores como la estabilidad política. Una política con 0% de eficiencia no tiene efecto.</li>
            <li><strong className="text-yellow-400">Bloqueo de Política:</strong> Una vez activada, una política no puede desactivarse por <Param>{POLICY_LOCK_IN_DURATION}</Param> años.</li>
         </ul>
      </div>
    )
  },
  {
    title: "Políticas e Instrumentos",
    content: (
        <div>
            <p className="mb-4">Las políticas son las principales palancas de cambio. Cada una tiene un <Param>costFactor</Param>, <Param>initialEfficiency</Param>, y un <Param>efficiencyDecayDuration</Param> único.</p>
            <h4 className="font-semibold mt-4 mb-2 text-blue-300">Listado de Políticas</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                {Object.values(INITIAL_POLICIES).map(p => <div key={p.id}>- {p.name}</div>)}
            </div>
             <h4 className="font-semibold mt-4 mb-2 text-blue-300">Instrumentos (Nivel 2+)</h4>
            <p className="text-sm">A partir del Nivel 2, la eficiencia de una política se calcula como:</p>
            <div className="bg-slate-800 p-2 rounded font-mono text-xs my-2">
                <p><Param>Eficiencia Final</Param> = <Param>Eficiencia Base Actual</Param> * (<Param>Esfuerzo Total de Instrumentos</Param> / 100)</p>
            </div>
            <p className="text-sm">Esto permite un control granular sobre el impacto de la política. Un esfuerzo del 0% en los instrumentos anula el efecto de la política, aunque siga activa.</p>
        </div>
    )
  },
   {
    title: "Dinámica de Uso del Suelo",
    content: (
      <div>
        <p className="mb-4">Las políticas impactan directamente las tasas de transición entre diferentes usos del suelo.</p>
        <h4 className="font-semibold mt-4 mb-2 text-blue-300">Usos del Suelo y Propiedades</h4>
        <ul className="list-disc list-inside space-y-1 text-xs">
            {Object.values(INITIAL_LAND_USES).map(lu => <li key={lu.stellaName}>{lu.name} (Emisión: <Param>{lu.emissionRate}</Param>, Secuestro: <Param>{lu.sequestrationRate}</Param>)</li>)}
        </ul>
        <h4 className="font-semibold mt-4 mb-2 text-blue-300">Lógica de Transición (Ejemplo)</h4>
        <p className="text-sm">La tasa de conversión de Bosque Nativo No Protegido (BNNP) a Cultivos Convencionales (CC) se calcula así:</p>
         <div className="bg-slate-800 p-2 rounded font-mono text-xs my-2">
            <p><Param>Tasa BNNP a CC</Param> = (<Param>Tasa Base ({CONTROL_PARAMS.Tasa_de_BNNP_a_CC_Base})</Param> + <Param>Eficiencia P-PAI</Param> * 0.04 + <Param>Eficiencia P-FRA</Param> * 0.01) * (1 - <Param>Eficiencia P-CR</Param>)</p>
        </div>
        <p className="text-sm">Políticas como Agricultura Intensiva (<Code>P-PAI</Code>) y Normativas Flexibles (<Code>P-FRA</Code>) aceleran la conversión, mientras que Conservación (<Code>P-CR</Code>) la frena.</p>
      </div>
    )
  },
  {
    title: "Cálculo del Balance de Carbono",
    content: (
      <div>
        <h3 className="text-xl font-bold text-yellow-400 mb-2">Cálculo del Balance de Carbono</h3>
        <p className="mb-4">El balance neto anual es la diferencia entre el carbono secuestrado y el emitido.</p>
        <div className="bg-slate-800 p-4 rounded font-mono text-sm">
            <p><span className="text-green-400">Balance Anual</span> = <span className="text-cyan-400">Total Secuestrado</span> - <span className="text-red-400">Total Emitido</span></p>
        </div>
        <h4 className="font-semibold mt-4 mb-2 text-blue-300">Componentes:</h4>
        <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong className="text-cyan-400">Total Secuestrado</strong>: Suma de <Code>(Área de Uso de Suelo * Tasa de Secuestro)</Code> para todos los usos.</li>
            <li><strong className="text-red-400">Total Emitido</strong>: Suma de <Code>(Área de Uso de Suelo * Tasa de Emisión)</Code> para todos los usos.</li>
        </ul>
        <h4 className="font-semibold mt-4 mb-2 text-blue-300">Modificadores y Sinergias:</h4>
        <p className="text-sm">El resultado se ajusta por sinergias y antagonismos entre políticas activas.</p>
        <ul className="list-disc list-inside space-y-2 text-sm mt-2">
            <li><strong>Sinergia Conservación + Carbono:</strong> Si ambas políticas están activas, el secuestro se multiplica por <Code>(1 + {CONTROL_PARAMS.Peso_Sin_CR_C_Carbono_Stella})</Code>.</li>
            <li><strong>Antagonismo Carbono + Subsidios:</strong> Si ambas políticas están activas, las emisiones aumentan en un factor de <Code>{CONTROL_PARAMS.Peso_Ant_C_SE_Carbono_Stella}</Code>.</li>
            <li><strong>Instrumentos (Nivel 2+):</strong> Instrumentos como 'Fomento a Renovables' o 'I+D en CAC' modifican directamente las emisiones o el secuestro, aplicando factores como <Code>Factor_Reduccion_Emisiones_Renovables_PCN</Code>.</li>
        </ul>
      </div>
    )
  },
  {
    title: "Indicadores Socio-Ambientales",
    content: (
       <div>
        <p className="mb-4">Estos indicadores (0-100%) se calculan en base a los pesos definidos en <Code>INDICATOR_IMPACT_WEIGHTS</Code>.</p>
        <h4 className="font-semibold mt-4 mb-2 text-blue-300">Ejemplo: Cálculo de Biodiversidad</h4>
        <div className="bg-slate-800 p-2 rounded font-mono text-xs my-2">
            <p><Param>Cambio Biodiversidad</Param> = (<Param>Impacto Políticas</Param> * <Param>{CONTROL_PARAMS.Factor_Impacto_Politicas_y_Presiones_en_Biodiversidad_Peso}</Param>) + (<Param>Impacto Uso Suelo</Param> * <Param>{CONTROL_PARAMS.Factor_Impacto_Usos_del_Suelo_en_Biodiversidad_Peso}</Param>)</p>
        </div>
         <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong className="text-cyan-400">Impacto Políticas:</strong> Suma de <Code>(Eficiencia Política * Peso)</Code>. Por ejemplo, P. Conservación tiene un peso positivo de <Param>{INDICATOR_IMPACT_WEIGHTS.BIODIVERSITY.POLICIES[Policy.NaturalConservation]}</Param>, mientras que P. Normativas Flexibles tiene un peso negativo de <Param>{INDICATOR_IMPACT_WEIGHTS.BIODIVERSITY.POLICIES[Policy.FlexibleEnvironmentalRegulations]}</Param>.</li>
            <li><strong className="text-cyan-400">Impacto Uso Suelo:</strong> Suma de <Code>(% Área / 100 * Peso)</Code>. Por ejemplo, Bosque Nativo Protegido tiene el peso más alto con <Param>{INDICATOR_IMPACT_WEIGHTS.BIODIVERSITY.LAND_USE[LandUseType.ProtectedNativeForest]}</Param>.</li>
        </ul>
         <h4 className="font-semibold mt-4 mb-2 text-blue-300">Interdependencias</h4>
         <p className="text-sm">Los indicadores se influyen mutuamente. Por ejemplo, un cambio en la Seguridad Económica tiene un impacto en la Seguridad Alimentaria, ponderado por <Code>ECONOMIC_SECURITY_IMPACT_ON_FOOD_SECURITY</Code>.</p>
      </div>
    )
  },
  {
    title: "Dinámica de Presión Política (Nivel 2+)",
    content: (
       <div>
        <p className="mb-2">A partir del Nivel 2, la presión política (0-100) de tres grupos clave se simula con un modelo de <strong className="text-yellow-400">Impulso vs. Disipación</strong>.</p>
         <div className="bg-slate-800 p-4 rounded font-mono text-sm space-y-2">
            <p>1. <strong className="text-yellow-400">Calcular Impulso:</strong> Suma de todos los factores de influencia (efectos de políticas e indicadores desalineados con los umbrales).</p>
            <p>2. <strong className="text-yellow-400">Calcular Fuerza de Disipación:</strong> La presión existente decae naturalmente. <br/>   <span className="text-cyan-400">FuerzaDisipacion</span> = <span className="text-cyan-400">PresionActual</span> * <span className="text-cyan-400">Tasa_disipacion_...</span></p>
            <p>3. <strong className="text-yellow-400">Calcular Cambio Neto:</strong> El cambio es la diferencia lineal, limitada entre 0 y 100.<br/>   <span className="text-cyan-400">NuevaPresion</span> = <span className="text-cyan-400">PresionActual</span> + <span className="text-cyan-400">Impulso</span> - <span className="text-cyan-400">FuerzaDisipacion</span></p>
         </div>
         <h4 className="font-semibold mt-4 mb-2 text-blue-300">Ejemplo: Factores de Presión Agrícola</h4>
          <ul className="list-disc list-inside space-y-2 text-sm">
              <li><strong className="text-red-400">Aumenta Impulso (más presión):</strong> Indicadores de Seg. Económica y Alimentaria por debajo de sus umbrales (<Param>{CONTROL_PARAMS.Umbral_PP_Agricola_SegEconomica}%</Param> y <Param>{CONTROL_PARAMS.Umbral_PP_Agricola_SegAlimentaria}%</Param>). Políticas percibidas como desfavorables, ej. <Code>P-AS</Code> (Factor: <Param>{CONTROL_PARAMS.Factor_Presion_Agricola_PAS}</Param>).</li>
              <li><strong className="text-green-400">Reduce Impulso (menos presión):</strong> Políticas percibidas como favorables, ej. <Code>P-PAI</Code> (Factor: <Param>{CONTROL_PARAMS.Factor_Presion_Agricola_PPAI}</Param>) y <Code>P-PEA</Code> (Factor: <Param>{CONTROL_PARAMS.Factor_Presion_Agricola_PPEA}</Param>).</li>
          </ul>
      </div>
    )
  },
   {
    title: "Modelo Económico y Financiero",
    content: (
      <div>
        <p className="mb-4">La economía se modela a través del PBI, Reservas del Tesoro y Deuda.</p>
        <h4 className="font-semibold mt-4 mb-2 text-blue-300">Crecimiento del PBI</h4>
        <p className="text-sm">La tasa de crecimiento anual se basa en una tasa base más los efectos de las políticas:</p>
        <div className="bg-slate-800 p-2 rounded font-mono text-xs my-2">
            <p><Param>Tasa Crecimiento</Param> = <Param>Tasa Base ({CONTROL_PARAMS.Tasa_Base_Crecimiento_PBI})</Param> + <Param>Efecto P-PIE</Param> + <Param>Efecto P-PEA</Param> - <Param>Impacto Impuestos (N3)</Param></p>
        </div>
        <h4 className="font-semibold mt-4 mb-2 text-blue-300">Finanzas del Tesoro</h4>
         <div className="bg-slate-800 p-2 rounded font-mono text-xs my-2">
            <p><Param>Reservas Anuales</Param> += (<Param>Ingresos</Param> - <Param>Egresos</Param>)</p>
        </div>
         <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong className="text-green-400">Ingresos:</strong> Recaudación de impuestos (un % del PBI, <Param>{CONTROL_PARAMS.Tasa_Impositiva_General_Sobre_PBI}</Param>, más impuestos adicionales en Nivel 3) y préstamos solicitados.</li>
            <li><strong className="text-red-400">Egresos:</strong> Costos de políticas activas, costos de pactos, pago de intereses de la deuda y pago anual de capital de la deuda.</li>
        </ul>
        <h4 className="font-semibold mt-4 mb-2 text-blue-300">Deuda</h4>
        <p className="text-sm">La deuda aumenta con nuevos préstamos y disminuye con los pagos anuales. Genera un pago de intereses que afecta a las reservas del tesoro.</p>
      </div>
    )
  },
  {
    title: "Estabilidad Política y Conflicto",
    content: (
      <div>
        <p className="mb-4">Estos dos indicadores clave reflejan la gobernabilidad de la nación y son cruciales para evitar el fin del juego.</p>
        <h4 className="font-semibold mt-4 mb-2 text-blue-300">Conflicto Social (Inverso al Bienestar Social)</h4>
        <p className="text-sm mb-2">Un valor de 0 a 100 que aumenta por factores de descontento. <Code>Bienestar Social = 100 - Conflicto Social</Code>.</p>
        <p className="font-semibold text-xs text-red-400">Factores que aumentan el conflicto:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
            <li>Ratio Deuda/PBI &gt; <Param>{INDICATOR_IMPACT_WEIGHTS.SOCIAL_WELLBEING.CONFLICT_INCREMENT_FACTORS.DEBT_PBI_THRESHOLD * 100}%</Param></li>
            <li>Seguridad Alimentaria &lt; <Param>{INDICATOR_IMPACT_WEIGHTS.SOCIAL_WELLBEING.CONFLICT_INCREMENT_FACTORS.LOW_FOOD_SECURITY_THRESHOLD}%</Param></li>
            <li>Seguridad Económica &lt; <Param>{INDICATOR_IMPACT_WEIGHTS.SOCIAL_WELLBEING.CONFLICT_INCREMENT_FACTORS.LOW_ECONOMIC_SECURITY_THRESHOLD}%</Param></li>
            <li>Políticas activas como <Code>P-FRA</Code> o <Code>P-PAI</Code>.</li>
            <li>Presión fiscal adicional (Nivel 3).</li>
        </ul>
        <h4 className="font-semibold mt-4 mb-2 text-blue-300">Colapso Político (Inverso a la Estabilidad Política)</h4>
        <p className="text-sm mb-2">Un valor de 0 a 100 que representa el riesgo de un colapso del gobierno. <Code>Estabilidad Política = 100 - Colapso Político</Code>.</p>
        <p className="font-semibold text-xs text-red-400">Factores que aumentan el colapso:</p>
         <ul className="list-disc list-inside text-xs space-y-1">
            <li>Bienestar Social &lt; <Param>{INDICATOR_IMPACT_WEIGHTS.POLITICAL_STABILITY.COLLAPSE_INCREMENT_FACTORS.LOW_SOCIAL_WELLBEING_THRESHOLD}%</Param></li>
            <li>Reservas del Tesoro muy negativas.</li>
            <li>Polarización política alta (gran diferencia entre presiones) &gt; <Param>{CONTROL_PARAMS.Umbral_polarizacion}</Param>.</li>
            <li>Cualquier grupo de presión política individual por encima de <Param>{INDICATOR_IMPACT_WEIGHTS.POLITICAL_STABILITY.COLLAPSE_INCREMENT_FACTORS.PP_AGRICOLA_THRESHOLD}%</Param>.</li>
        </ul>
      </div>
    )
  },
   {
    title: "Sistema de Puntuación",
    content: (
       <div>
        <p className="mb-4">El Puntaje General (0-1000) se calcula de forma diferente en cada nivel para reflejar los objetivos de esa etapa.</p>
        <div className="space-y-4">
            <div>
                <h4 className="font-semibold text-blue-300">Nivel 1: Estrategia Fundacional</h4>
                <ul className="list-disc list-inside text-sm">
                    <li>Biodiversidad (Peso: <Param>50%</Param>)</li>
                    <li>Componente de Carbono (Peso: <Param>50%</Param>)</li>
                </ul>
            </div>
            <div>
                <h4 className="font-semibold text-blue-300">Nivel 2: Sostenibilidad Ampliada</h4>
                <ul className="list-disc list-inside text-sm">
                    <li>Biodiversidad (Peso: <Param>15%</Param>)</li>
                    <li>Componente de Carbono (Peso: <Param>20%</Param>)</li>
                    <li>Desempeño Político (basado en el promedio de las 3 presiones, peso: <Param>30%</Param>)</li>
                    <li>Indicadores Socio-Económicos (promedio de las 4 "seguridades", peso: <Param>35%</Param>)</li>
                </ul>
            </div>
             <div>
                <h4 className="font-semibold text-blue-300">Nivel 3: Liderazgo Global</h4>
                <ul className="list-disc list-inside text-sm">
                    <li>Biodiversidad (Peso: <Param>10%</Param>)</li>
                    <li>Componente de Carbono (Peso: <Param>15%</Param>)</li>
                    <li>Desempeño Político (Peso: <Param>20%</Param>)</li>
                    <li>Indicadores Socio-Económicos (Peso: <Param>25%</Param>)</li>
                    <li>Desempeño del PBI (Peso: <Param>30%</Param>)</li>
                </ul>
            </div>
        </div>
        <p className="text-xs italic mt-4">La suma ponderada de estos componentes (0-100) se multiplica por 10 para obtener el puntaje final.</p>
      </div>
    )
  },
   {
    title: "Condiciones de Victoria/Derrota",
    content: (
      <div>
        <p className="mb-4">Para progresar, se deben cumplir todas las condiciones de victoria al final del ciclo de un nivel (<Param>{YEARS_PER_LEVEL}</Param> años).</p>
        <div className="space-y-4">
            {LEVEL_CONFIGS.map(level => (
                <div key={level.levelNumber} className="bg-slate-800 p-3 rounded-md">
                    <h4 className="font-semibold text-blue-300">Nivel {level.levelNumber}: {level.name}</h4>
                    <ul className="list-disc list-inside text-xs mt-2 space-y-1">
                        {Object.entries(level.winConditions || {}).map(([key, value]) => {
                           const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/Min$|Max$/, m => m === 'Min' ? ' (mín.)' : ' (máx.)').trim();
                           return <li key={key}>{formattedKey}: <Param>{value.toString()}</Param></li>
                        })}
                    </ul>
                </div>
            ))}
        </div>
        <h4 className="font-semibold mt-4 mb-2 text-red-400">Condiciones de Derrota Instantánea</h4>
         <ul className="list-disc list-inside text-sm text-red-300">
            <li>Colapso político &ge; 95%</li>
            <li>Crisis fiscal severa (Reservas muy negativas y Deuda muy alta)</li>
            <li>Catástrofe ecológica (Biodiversidad &le; 5%)</li>
            <li>Hambruna (Seguridad Alimentaria &le; 10%)</li>
        </ul>
      </div>
    )
  },
   {
    title: "Mecánicas Avanzadas (Nivel 3)",
    content: (
      <div>
        <p className="mb-4">El Nivel 3 introduce herramientas y eventos que aumentan la complejidad y el realismo.</p>
        <h4 className="font-semibold mt-4 mb-2 text-blue-300">Pactos Internacionales</h4>
        <p className="text-sm">Acuerdos que se desbloquean en años específicos. Unirse tiene un costo inicial (<Code>costToJoin</Code>) y/o anual (<Code>annualCost</Code>) y otorga beneficios (o penalizaciones) a ciertos indicadores. Ejemplo: El <Code>{INITIAL_PACTS.globalCarbonAccord.name}</Code> mejora el balance de carbono pero reduce la seguridad económica.</p>

        <h4 className="font-semibold mt-4 mb-2 text-blue-300">Eventos Aleatorios y Noticias</h4>
        <p className="text-sm">Cada año hay una probabilidad de que ocurra un evento aleatorio (ej. sequía, avance tecnológico), con efectos directos sobre los indicadores. En Nivel 3, si no hay un evento, el sistema de IA genera titulares de noticias basados en el estado actual del juego para aumentar la inmersión.</p>

        <h4 className="font-semibold mt-4 mb-2 text-blue-300">Presión Fiscal Adicional</h4>
        <p className="text-sm">El jugador puede aplicar una tasa impositiva adicional (0-<Param>{CONTROL_PARAMS.Max_Additional_Tax_Rate_Percentage}%</Param>) sobre el PBI. Esto aumenta los ingresos del tesoro pero tiene consecuencias negativas en la economía y genera malestar social.</p>
      </div>
    )
  },
];

const FacilitatorManual: React.FC<FacilitatorManualProps> = ({ onClose }) => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'carbo25') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Contraseña incorrecta.');
      setPassword('');
    }
  };

  const handleNext = () => {
    if (currentSlide < manualSlides.length - 1) {
      setCurrentSlide(currentSlide + 1);
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
      className="fixed inset-0 bg-slate-900 bg-opacity-95 flex items-center justify-center z-[1000] p-4 animate-fade-in backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 p-6 sm:p-8 rounded-lg shadow-2xl max-w-4xl w-full text-gray-200 max-h-[95vh] flex flex-col border border-slate-700 bg-[radial-gradient(#293447_1px,transparent_1px)] [background-size:24px_24px]"
        onClick={(e) => e.stopPropagation()}
      >
        {!isAuthenticated ? (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-custom-accent mb-4">Acceso para Facilitadores</h2>
            <p className="text-gray-400 mb-6">Por favor, ingrese la contraseña para ver el manual técnico.</p>
            <form onSubmit={handlePasswordSubmit} className="flex flex-col items-center gap-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="p-3 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-custom-accent focus:border-transparent outline-none text-gray-200 placeholder-gray-500 transition-colors w-64 text-center"
                placeholder="Contraseña"
                aria-label="Contraseña para el manual"
                autoFocus
              />
              <button type="submit" className="px-6 py-2 bg-custom-accent hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors">
                Acceder
              </button>
              {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
            </form>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-4">
              <div>
                <h2 id="manual-title" className="text-2xl sm:text-3xl font-bold text-custom-accent">
                    Manual del Facilitador: <span className="text-blue-300">{slide.title}</span>
                </h2>
                <p className="text-xs text-gray-400">Detrás de Escena de DecarboNation</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none" aria-label="Cerrar manual">&times;</button>
            </div>
            <div className="overflow-y-auto flex-grow mb-6 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 pr-4">
              {slide.content}
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-700">
              <span className="text-xs text-gray-500">
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
                  disabled={currentSlide === manualSlides.length - 1}
                  className="px-4 py-2 bg-custom-accent hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FacilitatorManual;
