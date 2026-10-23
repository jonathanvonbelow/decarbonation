
import React, { useState } from 'react';
import { useLanguageContext } from '../../contexts/LanguageContext';
const FM_UI = {
  es: { access: 'Acceso para Facilitadores', enterPassword: 'Por favor, ingrese la contraseña para ver el manual técnico.', passwordPlaceholder: 'Contraseña', passwordLabel: 'Contraseña para el manual', enter: 'Acceder', wrongPassword: 'Contraseña incorrecta.', subtitle: 'Detrás de Escena de DecarboNation', closeLabel: 'Cerrar manual', page: (c:number,t:number) => `Página ${c} de ${t}`, prev: 'Anterior', next: 'Siguiente' },
  en: { access: 'Facilitator Access', enterPassword: 'Please enter the password to view the technical manual.', passwordPlaceholder: 'Password', passwordLabel: 'Manual password', enter: 'Access', wrongPassword: 'Incorrect password.', subtitle: 'Behind the Scenes of DecarboNation', closeLabel: 'Close manual', page: (c:number,t:number) => `Page ${c} of ${t}`, prev: 'Previous', next: 'Next' },
} as const;
import { CONTROL_PARAMS, LEVEL_CONFIGS, INITIAL_POLICIES, INITIAL_LAND_USES, ALL_RANDOM_EVENTS, INITIAL_PACTS, MAX_ACTIVE_POLICIES, POLICY_LOCK_IN_DURATION, YEARS_PER_LEVEL } from '../../constants';
import { PARAMS_V2, type LandCode } from '../../sim/v2/params';

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
            <li><strong className="text-yellow-400">Eficiencia de Política:</strong> Una política recién activada arranca de a poco (puesta en marcha, <Param>rampYears</Param>), se desgasta con el uso hacia un piso institucional (<Param>Eficiencia_Minima_Politicas</Param>, desgaste <Param>fatigueYears</Param>) y se recupera si descansa (<Param>Recuperacion_Politicas_Anios</Param>).</li>
            <li><strong className="text-yellow-400">Bloqueo de Política:</strong> Una vez activada, una política no puede desactivarse por <Param>{POLICY_LOCK_IN_DURATION}</Param> años.</li>
         </ul>
      </div>
    )
  },
  {
    title: "Políticas e Instrumentos",
    content: (
        <div>
            <p className="mb-4">Las políticas son las principales palancas de cambio. Cada una tiene su costo a esfuerzo pleno (fracción del PBI; hoy la escala transitoria <Param>costShareBridge</Param>, que la fase 44 reemplaza por <Param>costShare</Param>), su puesta en marcha (<Param>rampYears</Param>) y su desgaste (<Param>fatigueYears</Param>), en <Param>PARAMS_V2</Param>.</p>
            <h4 className="font-semibold mt-4 mb-2 text-blue-300">Listado de Políticas</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                {Object.values(INITIAL_POLICIES).map(p => <div key={p.id}>- {p.name}</div>)}
            </div>
             <h4 className="font-semibold mt-4 mb-2 text-blue-300">Instrumentos (Nivel 2+)</h4>
            <p className="text-sm">Cada instrumento pesa distinto en cada canal (suelo, producción, social), con rendimientos decrecientes:</p>
            <div className="bg-slate-800 p-2 rounded font-mono text-xs my-2">
                <p><Param>Canal</Param> = <Param>Eficiencia Base</Param> · Σ μ·(1 − e^(−esfuerzo/40)) / Σ μ·(1 − e^(−25/40))</p>
            </div>
            <p className="text-sm">El reparto parejo (25 % por instrumento, el único posible en el Nivel 1) da el efecto completo en todos los canales; concentrar refuerza un canal y debilita los demás. Un esfuerzo del 0 % anula el efecto, aunque la política siga activa. El costo es κ · PBI · (0,3 + 0,7 · esfuerzo total / 100).</p>
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
            {Object.entries(INITIAL_LAND_USES).map(([key, lu]) => <li key={lu.stellaName}>{lu.name} (Flujo: <Param>{PARAMS_V2.flux[key as LandCode]}</Param> tCO₂e/ha/año, Stock: <Param>{PARAMS_V2.stock[key as LandCode]}</Param> Mg C/ha)</li>)}
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
        <p className="mb-4">Un inventario anual en toneladas de CO₂ equivalente (tCO₂e) con tres componentes, dividido por la población ({CONTROL_PARAMS.Poblacion_Inicial.toLocaleString('es')} habitantes al inicio, crece {CONTROL_PARAMS.Tasa_Crecimiento_Poblacional_Base * 100} % por año).</p>
        <div className="bg-slate-800 p-4 rounded font-mono text-sm">
            <p><span className="text-green-400">CO₂eq per cápita</span> = (<span className="text-red-400">Energía</span> + <span className="text-cyan-400">Flujo del suelo</span> + <span className="text-red-400">Cambio de uso</span>) / Población</p>
        </div>
        <h4 className="font-semibold mt-4 mb-2 text-blue-300">Componentes:</h4>
        <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong className="text-red-400">Energía</strong>: <Code>ε0 · ingreso^{PARAMS_V2.energy.incomeElasticity} · (1 + {PARAMS_V2.energy.subsidyBoost}·η_SE) · [{PARAMS_V2.energy.electricShare}·(1 − s) + {1 - PARAMS_V2.energy.electricShare}·(1 − u)] · Población</Code>, con ε0 = {PARAMS_V2.energy.eps0[1]} / {PARAMS_V2.energy.eps0[2]} / {PARAMS_V2.energy.eps0[3]} t por nivel. <Code>s</Code> es la participación renovable de la electricidad y <Code>u</Code> la eficiencia del resto; avanzan {PARAMS_V2.energy.adjust * 100} % del camino por año hacia sus objetivos.</li>
            <li><strong className="text-cyan-400">Flujo del suelo</strong>: suma de <Code>flujo × hectáreas</Code> de cada uso (puede ser negativo: sumidero).</li>
            <li><strong className="text-red-400">Cambio de uso</strong>: hectáreas convertidas por año × pérdida de stock (Mg C/ha) × 44/12. Solo cuentan las pérdidas; la ganancia llega por el flujo del uso nuevo.</li>
        </ul>
        <h4 className="font-semibold mt-4 mb-2 text-blue-300">Modificadores:</h4>
        <ul className="list-disc list-inside space-y-2 text-sm mt-2">
            <li><strong>Neutralidad de Carbono:</strong> objetivo renovable <Code>s* = min({PARAMS_V2.energy.renewablesCap}; {PARAMS_V2.energy.renewablesMaxCN}·η_elec + min(1; %parques / {PARAMS_V2.energy.parksFullShare * 100} %) + pactos)</Code> y de eficiencia <Code>u* = min({PARAMS_V2.energy.efficiencyCap}; {PARAMS_V2.energy.efficiencyMaxCN}·η_otros + pactos)</Code>. Con 4 % del territorio en parques energéticos la electricidad sería 100 % renovable (un lote representa una cartera de generación, transmisión y almacenamiento).</li>
            <li><strong>Subsidios Energéticos</strong> suben la energía; <strong>Agricultura Intensiva</strong> sube el flujo de cultivos convencionales (×(1 + 0,3·η)); <strong>Ganadería Sostenible</strong>, <strong>Agroecología</strong> y <strong>Conservación</strong> lo bajan en pasturas, cultivos agroecológicos y bosque no protegido; <strong>Normativas Flexibles</strong> lo sube en el bosque no protegido.</li>
            <li><strong>Presupuesto de carbono</strong>: emisiones acumuladas sobre una trayectoria lineal a −{PARAMS_V2.energy.budgetCut2054 * 100} % en 2054; &gt; 1 = por encima del presupuesto.</li>
        </ul>
      </div>
    )
  },
  {
    title: "Indicadores Socio-Ambientales",
    content: (
       <div>
        <p className="mb-4">Estos indicadores (0-100%) se acercan cada año a un objetivo; el objetivo depende de cuánto cambió el territorio desde el inicio del nivel y de las políticas activas. Sin políticas y con el territorio quieto, no se mueven.</p>
        <h4 className="font-semibold mt-4 mb-2 text-blue-300">Biodiversidad: relación especies-área</h4>
        <div className="bg-slate-800 p-2 rounded font-mono text-xs my-2">
            <p><Param>Hábitat H</Param> = Σ afinidad · fracción del territorio de cada uso</p>
            <p><Param>Objetivo B*</Param> = 100 · σ( logit(B₀/100) + <Param>{PARAMS_V2.zSAR}</Param>/(1 − B₀/100) · ln(H/H₀) + Σ calidad de manejo · η + sinergias + pactos )</p>
        </div>
         <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong className="text-cyan-400">Afinidad de hábitat:</strong> bosque protegido <Param>{PARAMS_V2.habitat.BNP}</Param>, humedal <Param>{PARAMS_V2.habitat.HUM}</Param>, bosque no protegido <Param>{PARAMS_V2.habitat.BNNP}</Param>, restauración <Param>{PARAMS_V2.habitat.RES}</Param>, cultivo agroecológico <Param>{PARAMS_V2.habitat.CA}</Param>, barbecho <Param>{PARAMS_V2.habitat.FAL}</Param>, plantaciones <Param>{PARAMS_V2.habitat.PF}</Param>, pasturas <Param>{PARAMS_V2.habitat.PRG}</Param>, cultivo convencional <Param>{PARAMS_V2.habitat.CC}</Param>, parque energético <Param>{PARAMS_V2.habitat.ENR}</Param>. El exponente z = {PARAMS_V2.zSAR} es el de la relación especies-área de paisaje (Pereira, Ziv y Miranda, 2014).</li>
            <li><strong className="text-cyan-400">Calidad de manejo:</strong> cada política suma o resta según su eficiencia; Conservación <Param>+{PARAMS_V2.qB.CR}</Param> y Normativas Flexibles <Param>{PARAMS_V2.qB.FRA}</Param> son los extremos. Sinergias continuas: +{PARAMS_V2.biodiversity.synergyAgroConservation}·min(Agroecología, Conservación) y −{PARAMS_V2.biodiversity.synergyIntensiveFlexible}·min(Agricultura Intensiva, Normativas Flexibles). El Tratado de Biodiversidad desplaza el objetivo <Param>+{PARAMS_V2.pacts.biodiversityTreaty.B}</Param>.</li>
            <li><strong className="text-cyan-400">Inercia:</strong> B recorre un <Param>{Math.round(CONTROL_PARAMS.Velocidad_Ajuste_Biodiversidad * 100)}%</Param> del camino por año (deuda de extinción): el hábitat responde lento.</li>
            <li><strong className="text-cyan-400">Territorio:</strong> además cuenta la conectividad del bosque en el mapa (fracción del bosque en el parche continuo más grande), con peso <Param>{PARAMS_V2.biodiversity.connectivityGamma}</Param>·ln(K/K₀): proteger o restaurar junto al bosque existente rinde más que un lote aislado.</li>
        </ul>
        <h4 className="font-semibold mt-4 mb-2 text-blue-300">Seguridad alimentaria: balance de oferta y demanda</h4>
        <div className="bg-slate-800 p-2 rounded font-mono text-xs my-2">
            <p><Param>Oferta Q</Param> = (1 − exportado) · [CC · {PARAMS_V2.food.yield.CC} · (1 + {PARAMS_V2.food.yieldPolicy.PAI}·η_PAI) + CA · {PARAMS_V2.food.yield.CA} · (1 + {PARAMS_V2.food.yieldPolicy.AS}·η_AS) + Pasturas · {PARAMS_V2.food.yield.PRG} · (1 + {PARAMS_V2.food.yieldPolicy.GS}·η_GS)] · (1 + {PARAMS_V2.food.yieldPolicy.AGUA}·η_AGUA) · (1 + {PARAMS_V2.food.yieldTrend})^t</p>
            <p><Param>Exportado</Param> = {PARAMS_V2.food.export0} + {PARAMS_V2.food.exportPEA}·η_PEA;   <Param>ρ</Param> = max(Q / Población, {PARAMS_V2.food.rhoFloor}·ρ₀)</p>
            <p><Param>Objetivo F*</Param> = 100 · σ( logit(F₀/100) + {PARAMS_V2.food.kappa1}·ln(ρ/ρ₀) + {PARAMS_V2.food.kappa2}·(E − E₀)/{PARAMS_V2.food.econScale} )</p>
        </div>
         <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong className="text-cyan-400">Qué la mueve:</strong> la tierra agrícola (convencional rinde más que agroecológica y que pasturas), los rendimientos (Agricultura Intensiva, Agroecología, Ganadería Sostenible, Gestión del Agua), cuánto se exporta (Exportaciones Agrícolas sube la fracción exportada) y el acceso por ingreso (Seguridad Económica).</li>
            <li><strong className="text-cyan-400">Trade-off:</strong> la población crece {(CONTROL_PARAMS.Tasa_Crecimiento_Poblacional_Base * 100).toLocaleString('es')} %/año y los rendimientos {(PARAMS_V2.food.yieldTrend * 100).toLocaleString('es')} %/año; si se frena la deforestación sin subir rendimientos, la disponibilidad por persona baja. Un 20 % más de alimentos por persona sube el objetivo {PARAMS_V2.food.kappa1}·ln(1,2) unidades logit (unos 11 puntos cerca de 40).</li>
            <li><strong className="text-cyan-400">Inercia:</strong> F recorre un <Param>{Math.round(CONTROL_PARAMS.Velocidad_Ajuste_Seg_Alimentaria * 100)}%</Param> del camino por año.</li>
        </ul>
      </div>
    )
  },
  {
    title: "Dinámica de Presión Política (Nivel 2+)",
    content: (
       <div>
        <p className="mb-2">A partir del Nivel 2, la presión política (0-100) de tres grupos clave se acerca cada año a un <strong className="text-yellow-400">objetivo en S</strong> anclado al inicio del nivel (modelo 2.0, fase 42).</p>
         <div className="bg-slate-800 p-4 rounded font-mono text-sm space-y-2">
            <p>1. <strong className="text-yellow-400">Impulsor D:</strong> suma de los efectos de las políticas activas (factor φ × eficiencia en el canal social ÷ {PARAMS_V2.pressure.phiScale}) y de los desvíos de los indicadores respecto del inicio.</p>
            <p>2. <strong className="text-yellow-400">Objetivo:</strong> <span className="text-cyan-400">π*</span> = 100 · σ( logit(π₀/100) + D ): sin políticas y con todo quieto, π* = π₀.</p>
            <p>3. <strong className="text-yellow-400">Dinámica:</strong> la presión recorre un <Param>{Math.round(CONTROL_PARAMS.Velocidad_Ajuste_Presiones * 100)}%</Param> del camino hacia π* por año; nunca toca 0 ni 100 de golpe.</p>
         </div>
         <h4 className="font-semibold mt-4 mb-2 text-blue-300">Ejemplo: Presión Agrícola</h4>
          <ul className="list-disc list-inside space-y-2 text-sm">
              <li><strong className="text-red-400">La sube:</strong> Seguridad Económica y Alimentaria por debajo de su valor inicial (<Param>{PARAMS_V2.pressure.drivers.a.econ}</Param> y <Param>{PARAMS_V2.pressure.drivers.a.food}</Param> logit por punto), sacar tierra de producción (<Param>{PARAMS_V2.pressure.drivers.a.prodShare}</Param> por unidad de fracción del territorio) y <Code>P-CR</Code> conservación sin compensar (<Param>+{PARAMS_V2.pressure.a.CR}</Param>).</li>
              <li><strong className="text-green-400">La baja:</strong> las políticas que benefician al productor: <Code>P-PAI</Code> (<Param>{PARAMS_V2.pressure.a.PAI}</Param>), <Code>P-PEA</Code> (<Param>{PARAMS_V2.pressure.a.PEA}</Param>), <Code>P-AS</Code> (<Param>{PARAMS_V2.pressure.a.AS}</Param>) y <Code>P-GS</Code> (<Param>{PARAMS_V2.pressure.a.GS}</Param>), multiplicadas por el tamaño del sector productivo.</li>
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
        <p className="text-sm mb-2">Desde el modelo 2.0 (fase 39), Seguridad Económica, Conflicto Social y Colapso Político se mueven cada año una fracción fija del camino hacia un <strong>objetivo</strong>: <Code>X* = 100 · σ(logit(X₀) + D)</Code>. <Code>D</Code> suma desvíos respecto del estado inicial del nivel y efectos de políticas activas, así que sin políticas y con el territorio quieto nada se mueve. No hay umbrales en escalón.</p>
        <h4 className="font-semibold mt-4 mb-2 text-blue-300">Conflicto Social (Inverso al Bienestar Social)</h4>
        <p className="text-sm mb-2"><Code>Bienestar Social = 100 - Conflicto Social</Code>. Se acerca a su objetivo un <Param>{Math.round(CONTROL_PARAMS.Velocidad_Ajuste_Conflicto * 100)}%</Param> del camino por año.</p>
        <p className="font-semibold text-xs text-red-400">Lo que sube el objetivo del conflicto:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
            <li>Seguridad Alimentaria o Económica por debajo de su valor inicial (proporcional al deterioro).</li>
            <li>Presión ambientalista por encima de su valor inicial.</li>
            <li>Políticas activas como <Code>P-FRA</Code>, <Code>P-PAI</Code> o <Code>P-PIE</Code>; la expansión de cultivos convencionales y plantaciones.</li>
            <li>Presión fiscal adicional (en cualquier nivel con impuesto adicional).</li>
            <li>Lo alivian <Code>P-CN</Code>, <Code>P-CR</Code> y <Code>P-AGUA</Code>, en proporción a su eficiencia.</li>
        </ul>
        <h4 className="font-semibold mt-4 mb-2 text-blue-300">Colapso Político (Inverso a la Estabilidad Política)</h4>
        <p className="text-sm mb-2"><Code>Estabilidad Política = 100 - Colapso Político</Code>. Se acerca a su objetivo un <Param>{Math.round(CONTROL_PARAMS.Velocidad_Ajuste_Colapso * 100)}%</Param> del camino por año.</p>
        <p className="font-semibold text-xs text-red-400">Lo que sube el objetivo del colapso:</p>
         <ul className="list-disc list-inside text-xs space-y-1">
            <li>Bienestar Social y Seguridad Económica por debajo de sus valores iniciales.</li>
            <li>Más polarización (diferencia entre la presión más alta y la más baja) que al inicio.</li>
            <li>Presión política media por encima de la inicial.</li>
            <li>El Acuerdo Global de Carbono lo baja un poco mientras está vigente.</li>
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
        <p className="text-sm">Acuerdos que se desbloquean en años específicos (modelo 2.0, fase 43). Unirse cuesta una fracción del PBI del momento y la membresía otra por año (<Code>PARAMS_V2.pacts</Code>): Tratado de Biodiversidad {PARAMS_V2.pacts.biodiversityTreaty.entry * 100} % / {PARAMS_V2.pacts.biodiversityTreaty.annual * 100} %, Acuerdo Global de Carbono {PARAMS_V2.pacts.globalCarbonAccord.entry * 100} % / {PARAMS_V2.pacts.globalCarbonAccord.annual * 100} %, Transferencia Tecnológica {PARAMS_V2.pacts.techTransferInitiative.entry * 100} % / {PARAMS_V2.pacts.techTransferInitiative.annual * 100} %. Mientras está activo, un pacto desplaza objetivos: el tratado +{PARAMS_V2.pacts.biodiversityTreaty.B} logit a la biodiversidad, {PARAMS_V2.pacts.biodiversityTreaty.E} a la seguridad económica, protección ×{PARAMS_V2.pacts.biodiversityTreaty.protectFactor} y deforestación ×{PARAMS_V2.pacts.biodiversityTreaty.deforestFactor}; el <Code>{INITIAL_PACTS.globalCarbonAccord.name}</Code> {PARAMS_V2.pacts.globalCarbonAccord.E} a la seguridad económica, {PARAMS_V2.pacts.globalCarbonAccord.Pc} al colapso y +{PARAMS_V2.pacts.globalCarbonAccord.renewables} a renovables y eficiencia; la transferencia +{PARAMS_V2.pacts.techTransferInitiative.E} a la seguridad económica y +{PARAMS_V2.pacts.techTransferInitiative.renewables} / +{PARAMS_V2.pacts.techTransferInitiative.efficiency} a renovables / eficiencia. El efecto no crece con los años de membresía, y ningún pacto supera a la política más fuerte sobre el mismo indicador.</p>

        <h4 className="font-semibold mt-4 mb-2 text-blue-300">Eventos Aleatorios y Noticias</h4>
        <p className="text-sm">Cada año hay una probabilidad de que ocurra un evento aleatorio (ej. sequía, avance tecnológico), con efectos directos sobre los indicadores. En Nivel 3, si no hay un evento, el sistema de IA genera titulares de noticias basados en el estado actual del juego para aumentar la inmersión.</p>

        <h4 className="font-semibold mt-4 mb-2 text-blue-300">Presión Fiscal Adicional</h4>
        <p className="text-sm">El jugador puede aplicar una tasa impositiva adicional (0-<Param>{CONTROL_PARAMS.Max_Additional_Tax_Rate_Percentage}%</Param>) sobre el PBI. Esto aumenta los ingresos del tesoro pero tiene consecuencias negativas en la economía y genera malestar social.</p>
      </div>
    )
  },
];

const FacilitatorManual: React.FC<FacilitatorManualProps> = ({ onClose }) => {
  const { language } = useLanguageContext();
  const ui = FM_UI[language];
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
      setError(ui.wrongPassword);
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
            <h2 className="text-2xl font-bold text-custom-accent mb-4">{ui.access}</h2>
            <p className="text-gray-400 mb-6">{ui.enterPassword}</p>
            <form onSubmit={handlePasswordSubmit} className="flex flex-col items-center gap-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="p-3 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-custom-accent focus:border-transparent outline-none text-gray-200 placeholder-gray-500 transition-colors w-64 text-center"
                placeholder={ui.passwordPlaceholder}
                aria-label={ui.passwordLabel}
                autoFocus
              />
              <button type="submit" className="px-6 py-2 bg-custom-accent hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors">
                {ui.enter}
              </button>
              {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
            </form>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-4">
              <div>
                <h2 id="manual-title" className="text-2xl sm:text-3xl font-bold text-custom-accent">
                    {language === 'es' ? 'Manual del Facilitador' : 'Facilitator Manual'}: <span className="text-blue-300">{slide.title}</span>
                </h2>
                <p className="text-xs text-gray-400">{ui.subtitle}</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none" aria-label={ui.closeLabel}>&times;</button>
            </div>
            <div className="overflow-y-auto flex-grow mb-6 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 pr-4">
              {slide.content}
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-700">
              <span className="text-xs text-gray-500">
                {ui.page(currentSlide + 1, manualSlides.length)}
              </span>
              <div className="space-x-3">
                <button
                  onClick={handlePrev}
                  disabled={currentSlide === 0}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {ui.prev}
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentSlide === manualSlides.length - 1}
                  className="px-4 py-2 bg-custom-accent hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {ui.next}
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
