import React, { useMemo, useState } from 'react';
import { useLanguageContext } from '../../contexts/LanguageContext';
import type { Language } from '../../hooks/useLanguage';
import { CONTROL_PARAMS, INITIAL_POLICIES, INITIAL_LAND_USES, MAX_ACTIVE_POLICIES, POLICY_LOCK_IN_DURATION, YEARS_PER_LEVEL } from '../../constants';
import { PARAMS_V2, type LandCode } from '../../sim/v2/params';
import { CARBON_CEILING_FACTOR, GDP_FULL_MULTIPLE, SCORE_WEIGHTS } from '../../sim/score';
import { LEVEL_ROUTES } from '../../sim/winRoutes';
import { getPolicyName } from '../../legacyContent/gameData';
import { PID_OF } from '../../sim/v2/policies';
import { tFor, type TranslationKey } from '../../i18n';

const FM_UI = {
  es: { access: 'Acceso para Facilitadores', enterPassword: 'Por favor, ingrese la contraseña para ver el manual técnico.', passwordPlaceholder: 'Contraseña', passwordLabel: 'Contraseña para el manual', enter: 'Acceder', wrongPassword: 'Contraseña incorrecta.', subtitle: 'Detrás de Escena de DecarboNation (modelo 2.0)', closeLabel: 'Cerrar manual', page: (c:number,t:number) => `Página ${c} de ${t}`, prev: 'Anterior', next: 'Siguiente', title: 'Manual del Facilitador' },
  en: { access: 'Facilitator Access', enterPassword: 'Please enter the password to view the technical manual.', passwordPlaceholder: 'Password', passwordLabel: 'Manual password', enter: 'Access', wrongPassword: 'Incorrect password.', subtitle: 'Behind the Scenes of DecarboNation (model 2.0)', closeLabel: 'Close manual', page: (c:number,t:number) => `Page ${c} of ${t}`, prev: 'Previous', next: 'Next', title: 'Facilitator Manual' },
} as const;

interface FacilitatorManualProps {
  onClose: () => void;
}

const Code: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <code className="text-orange-300 bg-gray-900 px-1.5 py-0.5 rounded-md text-xs mx-1">{children}</code>
);

const Param: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="text-cyan-400 font-medium">{children}</span>
);

const Box: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-slate-800 p-2 rounded font-mono text-xs my-2 space-y-1">{children}</div>
);
const H: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h4 className="font-semibold mt-4 mb-2 text-blue-300">{children}</h4>
);

const pct = (x: number, lang: Language, digits = 1) => `${(100 * x).toLocaleString(lang === 'es' ? 'es-AR' : 'en-US', { maximumFractionDigits: digits })} %`;
const num = (x: number, lang: Language) => x.toLocaleString(lang === 'es' ? 'es-AR' : 'en-US', { maximumFractionDigits: 3 });

/**
 * Phase 50 (mejora-general/files/50 §1): rewritten for model 2.0 and bilingual. Every number is read from the code
 * (CONTROL_PARAMS, PARAMS_V2, SCORE_WEIGHTS, LEVEL_ROUTES), never copied by hand.
 */
function buildSlides(lang: Language): { title: string; content: React.ReactNode }[] {
  const es = lang === 'es';
  const L = (a: string, b: string) => (es ? a : b);
  const tr = (k: string) => tFor(lang, k as TranslationKey);
  const P = PARAMS_V2;
  const CP = CONTROL_PARAMS;
  return [
  {
    title: L('Introducción y conceptos clave', 'Introduction and key concepts'),
    content: (
      <div>
        <p className="mb-4">{L('Este manual explica la lógica interna del modelo 2.0 de DecarboNation: qué ecuaciones mueven cada indicador, qué parámetros puede tocar el facilitador y qué conviene no tocar.', "This manual explains the inner logic of DecarboNation's model 2.0: which equations move each indicator, which parameters the facilitator may change and which are better left alone.")}</p>
        <H>{L('Flujo del juego', 'Game flow')}</H>
        <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>{L('El jugador activa hasta', 'The player activates up to')} <Param>{MAX_ACTIVE_POLICIES}</Param> {L('políticas; cada una queda vigente al menos', 'policies; each one stays in force at least')} <Param>{POLICY_LOCK_IN_DURATION}</Param> {L('años.', 'years.')}</li>
            <li>{L('(Nivel 2+) Reparte el esfuerzo entre los cuatro instrumentos de cada política activa.', '(Level 2+) They split the effort across the four instruments of each active policy.')}</li>
            <li>{L('(Nivel 3) Pactos internacionales, préstamos y presión fiscal adicional.', '(Level 3) International pacts, loans and additional tax pressure.')}</li>
            <li>{L('"Simular Próximo Año" avanza doce pasos mensuales del mismo integrador que usa Territorio.', '"Simulate Next Year" runs twelve monthly steps of the same integrator Territorio uses.')}</li>
        </ol>
        <H>{L('La idea central: ancla y objetivo', 'The core idea: anchor and target')}</H>
        <p className="text-sm">{L('Cada indicador acotado (biodiversidad, seguridades, bienestar, estabilidad, presiones) se mueve cada año una fracción fija del camino hacia un objetivo X* = 100·σ(logit(X₀) + D). D suma desvíos respecto del inicio del nivel y efectos de políticas activas: sin políticas y con el territorio quieto, X* = X₀ y nada se mueve. El tablero muestra ese objetivo ("va hacia NN") bajo cada indicador.', 'Each bounded indicator (biodiversity, food and economic security, wellbeing, stability, pressures) moves a fixed fraction of the way each year toward a target X* = 100·σ(logit(X₀) + D). D adds deviations from the level start and the effects of active policies: with no policies and an unchanged territory, X* = X₀ and nothing moves. The dashboard shows that target ("heading to NN") under each indicator.')}</p>
      </div>
    ),
  },
  {
    title: L('Políticas: puesta en marcha, desgaste y descanso', 'Policies: start-up, wear and rest'),
    content: (
      <div>
        <Box>
          <p>η = (1 − e^(−τ/λ)) · [η_min + (1 − η_min) · e^(−T/δ)]</p>
          <p>{L('τ: años desde la activación (vuelve a 0 al desactivar) · T: años de uso acumulados, que en reposo bajan como T·e^(−dt/ρ)', 'τ: years since activation (back to 0 on deactivation) · T: accumulated years of use, which decay as T·e^(−dt/ρ) at rest')}</p>
        </Box>
        <ul className="list-disc list-inside space-y-2 text-sm">
          <li><strong className="text-yellow-400">{L('Puesta en marcha', 'Start-up')}</strong> (λ, <Code>PARAMS_V2.rampYears</Code>): {L('años hasta alcanzar el 63 % del efecto. La interfaz la muestra como "En marcha (NN %)".', 'years to reach 63 % of the effect. The interface shows "Starting up (NN %)".')}</li>
          <li><strong className="text-yellow-400">{L('Desgaste', 'Wear')}</strong> (δ, <Code>PARAMS_V2.fatigueYears</Code>): {L('años de uso tras los que perdió el 63 % de su empuje por encima del piso institucional', 'years of use after which it lost 63 % of its push above the institutional floor')} <Param>η_min = {CP.Eficiencia_Minima_Politicas}</Param> (<Code>Eficiencia_Minima_Politicas</Code>). {L('Por debajo de la mitad se muestra "Desgastada (NN %)".', 'Below half it shows "Worn (NN %)".')}</li>
          <li><strong className="text-yellow-400">{L('Descanso', 'Rest')}</strong> (ρ = <Param>{CP.Recuperacion_Politicas_Anios}</Param> {L('años', 'years')}, <Code>Recuperacion_Politicas_Anios</Code>): {L('una política desactivada recupera su empuje; al reactivarla vuelve a arrancar de a poco.', 'a deactivated policy recovers its push; when reactivated it starts slowly again.')}</li>
        </ul>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-gray-400"><th className="p-1">{L('Política', 'Policy')}</th><th className="p-1">λ</th><th className="p-1">δ</th><th className="p-1">κ ({L('% PBI', '% GDP')})</th></tr></thead>
            <tbody>
              {Object.values(INITIAL_POLICIES).map((p) => {
                const pid = PID_OF[p.id];
                return pid ? (
                  <tr key={p.id} className="border-t border-slate-700"><td className="p-1">{getPolicyName(p.id, lang) || p.name}</td><td className="p-1">{num(P.rampYears[pid], lang)}</td><td className="p-1">{num(P.fatigueYears[pid], lang)}</td><td className="p-1">{pct(P.costShare[pid], lang)}</td></tr>
                ) : null;
              })}
            </tbody>
          </table>
        </div>
      </div>
    ),
  },
  {
    title: L('Instrumentos y canales', 'Instruments and channels'),
    content: (
      <div>
        <p className="text-sm mb-2">{L('Cada política tiene cuatro instrumentos. Cada instrumento pesa distinto (relevancia μ: 1 alta, 0,6 media, 0,3 baja) en tres canales: suelo (flujos de uso del suelo, hábitat, carbono del suelo), producción (rendimientos, exportaciones, seguridad económica) y social (conflicto, presiones, transición justa). Neutralidad de Carbono tiene además electricidad renovable, eficiencia del resto de la energía y recaudación del impuesto al carbono.', 'Each policy has four instruments. Each instrument weighs differently (relevance μ: 1 high, 0.6 medium, 0.3 low) on three channels: land (land-use flows, habitat, soil carbon), production (yields, exports, economic security) and social (conflict, pressures, just transition). Carbon Neutrality also has renewable electricity, efficiency of the rest of energy and carbon-tax revenue.')}</p>
        <Box>
          <p>{L('canal', 'channel')} c = η · Σ μ_k^c·φ(e_k) / Σ μ_k^c·φ(25),   φ(e) = 1 − e^(−e/{P.effortE0})</p>
          <p>{L('costo anual', 'annual cost')} = κ · {L('PBI', 'GDP')} · ({P.costFixedShare} + {num(1 - P.costFixedShare, lang)} · {L('esfuerzo total', 'total effort')} / 100)</p>
        </Box>
        <p className="text-sm">{L('El reparto parejo 25/25/25/25 (el único del Nivel 1, que no tiene panel de instrumentos) da 1 en todos los canales; concentrar sube un canal y baja los demás, con rendimientos decrecientes. Con 0 % de esfuerzo la política no hace nada aunque esté activa, pero paga la parte fija del costo. El panel de instrumentos etiqueta cada uno con sus canales altos/medios y si restringe o acompaña al sector (transición justa).', 'The even split 25/25/25/25 (the only one on Level 1, which has no instrument panel) gives 1 on every channel; concentrating raises one channel and lowers the others, with diminishing returns. With 0 % effort the policy does nothing even if active, but it still pays the fixed part of the cost. The instrument panel tags each one with its high/medium channels and whether it restricts or supports the sector (just transition).')}</p>
      </div>
    ),
  },
  {
    title: L('Uso del suelo: matriz de transición', 'Land use: transition matrix'),
    content: (
      <div>
        <p className="mb-2 text-sm">{L('El suelo cambia por una matriz conservativa (el área total no cambia): flujos de frontera desde el bosque nativo no protegido, un pool agrícola que se reasigna según la renta de cada uso, y el barbecho.', 'Land changes through a conservative matrix (total area is constant): frontier flows out of unprotected native forest, an agricultural pool reallocated by each use\'s rent, and fallow.')}</p>
        <Box>
          <p>BNNP→BNP = A·({CP.Tasa_de_BNNP_a_BNP_Base} + {P.land.frontier.BNNP_BNP.CR}·η_CR)  ·  BNNP→CC = A·({CP.Tasa_de_BNNP_a_CC_Base} + {P.land.frontier.BNNP_CC.PAI}·η_PAI + {P.land.frontier.BNNP_CC.FRA}·η_FRA)·(1 − η_CR)</p>
          <p>{L('pool', 'pool')} = Σ {P.land.poolShare}·A_k + {P.land.fallowReentry}·A_FAL,   {L('reparto', 'split')} ∝ e^(β·r_k), β = {P.land.rentBeta}</p>
          <p>FAL→BNNP = {P.land.fallowRegen}·A_FAL   ({L('el barbecho se regenera', 'fallow regenerates')})</p>
        </Box>
        <p className="text-sm">{L('Las rentas r_k están ancladas al inicio: Agricultura Intensiva y Exportaciones suben la del cultivo convencional, Agroecología la del agroecológico, Ganadería Sostenible la de pasturas; el impuesto al carbono baja la del convencional. Sequías y situaciones mandan tierra a barbecho, que deja de producir hasta reingresar o regenerarse.', 'Rents r_k are anchored to the start: Intensive Agriculture and Exports raise conventional crops\', Agroecology raises agroecological crops\', Sustainable Livestock raises pastures\'; the carbon tax lowers conventional crops\'. Droughts and situations send land to fallow, which stops producing until it re-enters or regenerates.')}</p>
        <ul className="list-disc list-inside space-y-1 text-xs mt-2">
          {Object.entries(INITIAL_LAND_USES).map(([key, lu]) => <li key={lu.stellaName}>{lu.name}: {L('flujo', 'flux')} <Param>{P.flux[key as LandCode]}</Param> tCO₂e/ha/{L('año', 'yr')}, stock <Param>{P.stock[key as LandCode]}</Param> Mg C/ha, {L('hábitat', 'habitat')} <Param>{P.habitat[key as LandCode]}</Param></li>)}
        </ul>
      </div>
    ),
  },
  {
    title: L('Carbono', 'Carbon'),
    content: (
      <div>
        <p className="mb-3 text-sm">{L('Inventario anual en tCO₂e con tres componentes, dividido por la población', 'Yearly inventory in tCO₂e with three components, divided by the population')} ({CP.Poblacion_Inicial.toLocaleString(es ? 'es-AR' : 'en-US')} {L('habitantes al inicio, crece', 'inhabitants at the start, growing')} {pct(CP.Tasa_Crecimiento_Poblacional_Base, lang)} {L('por año', 'per year')}).</p>
        <Box>
          <p>{L('Energía', 'Energy')} = ε0 · ({L('ingreso relativo', 'relative income')})^{P.energy.incomeElasticity} · (1 + {P.energy.subsidyBoost}·η_SE) · [{P.energy.electricShare}·(1 − s) + {num(1 - P.energy.electricShare, lang)}·(1 − u)] · {L('Población', 'Population')}</p>
          <p>s* = min({P.energy.renewablesCap}; {P.energy.renewablesMaxCN}·η_CN^elec + min(1; %{L('parques', 'parks')}/{pct(P.energy.parksFullShare, lang, 0)}) + {L('pactos', 'pacts')})   u* = min({P.energy.efficiencyCap}; {P.energy.efficiencyMaxCN}·η_CN^other + {L('pactos', 'pacts')})</p>
          <p>{L('Suelo (AFOLU)', 'Land (AFOLU)')} = Σ {L('flujo', 'flux')}_i · ha_i   ·   {L('Cambio de uso', 'Land-use change')} = Σ {L('ha convertidas', 'converted ha')} · max(0, stock_i − stock_j) · 44/12</p>
        </Box>
        <p className="text-sm">ε0 = {P.energy.eps0[1]} / {P.energy.eps0[2]} / {P.energy.eps0[3]} t/{L('hab', 'cap')} ({L('niveles', 'levels')} 1/2/3). {L('s y u avanzan', 's and u move')} {pct(P.energy.adjust, lang, 0)} {L('del camino por año (inercia de infraestructura). El presupuesto de carbono compara las emisiones acumuladas con una senda lineal a', 'of the way per year (infrastructure inertia). The carbon budget compares cumulative emissions with a linear path to')} −{pct(P.energy.budgetCut2054, lang, 0)} {L('en 2054; más de 1 = por encima. El tablero muestra el desglose por fuente.', 'in 2054; above 1 = over. The dashboard shows the breakdown by source.')}</p>
      </div>
    ),
  },
  {
    title: L('Biodiversidad y seguridad alimentaria', 'Biodiversity and food security'),
    content: (
      <div>
        <H>{L('Biodiversidad: especies-área', 'Biodiversity: species-area')}</H>
        <Box>
          <p>H = Σ h_i · a_i   ·   B* = 100·σ( logit(B₀) + z/(1 − B₀/100)·ln(H/H₀) + Σ qB·η^{L('suelo', 'land')} + {P.biodiversity.synergyAgroConservation}·min(η_AS, η_CR) − {P.biodiversity.synergyIntensiveFlexible}·min(η_PAI, η_FRA) + {L('pactos', 'pacts')} )</p>
        </Box>
        <p className="text-sm">z = {P.zSAR} ({L('relación especies-área de paisaje, Pereira, Ziv y Miranda, 2014', 'countryside species-area relationship, Pereira, Ziv & Miranda, 2014')}). {L('Sinergia real del modelo: Agroecología + Conservación; antagonismo: Agricultura Intensiva + Normativas Flexibles. En Territorio suma la conectividad del bosque', 'The model\'s real synergy: Agroecology + Conservation; antagonism: Intensive Agriculture + Flexible Regulations. In Territorio forest connectivity adds')} {P.biodiversity.connectivityGamma}·ln(K/K₀). k_B = {CP.Velocidad_Ajuste_Biodiversidad} {L('por año (deuda de extinción).', 'per year (extinction debt).')}</p>
        <H>{L('Seguridad alimentaria: oferta y demanda', 'Food security: supply and demand')}</H>
        <Box>
          <p>Q = (1 − x)·[CC·{P.food.yield.CC}·(1 + {P.food.yieldPolicy.PAI}·η_PAI) + CA·{P.food.yield.CA}·(1 + {P.food.yieldPolicy.AS}·η_AS) + PRG·{P.food.yield.PRG}·(1 + {P.food.yieldPolicy.GS}·η_GS)]·(1 + {P.food.yieldPolicy.AGUA}·η_AGUA)·(1 + {P.food.yieldTrend})^t·(1 + ε)</p>
          <p>x = {P.food.export0} + {P.food.exportPEA}·η_PEA   ·   F* = 100·σ( logit(F₀) + {P.food.kappa1}·ln(ρ/ρ₀) + {P.food.kappa2}·(E − E₀)/{P.food.econScale} )</p>
        </Box>
        <p className="text-sm">{L('ρ = Q / población. ε es el choque de rendimiento (AR(1), persistencia', 'ρ = Q / population. ε is the yield shock (AR(1), persistence')} {P.events.yieldShock.persistence}, σ = {P.events.yieldShock.sigma}; {L('la Gestión del Agua lo amortigua', 'Water Management damps it')}). k_F = {CP.Velocidad_Ajuste_Seg_Alimentaria}.</p>
      </div>
    ),
  },
  {
    title: L('Presiones sectoriales (Nivel 2+)', 'Sectoral pressures (Level 2+)'),
    content: (
      <div>
        <p className="mb-2 text-sm">{L('Las presiones agrícola, ambientalista y social (0–100) se acercan cada año a un objetivo en S anclado al inicio del nivel: π* = 100·σ(logit(π₀) + D_π).', 'The agricultural, environmentalist and social pressures (0–100) approach each year an S-shaped target anchored at the level start: π* = 100·σ(logit(π₀) + D_π).')}</p>
        <Box>
          <p>D_πa = σ_prod·Σ φa·η^social/{P.pressure.phiScale} + {P.pressure.drivers.a.econ}·(E₀ − E) + {P.pressure.drivers.a.food}·(F₀ − F) + {P.pressure.drivers.a.prodShare}·(a_prod,0 − a_prod)</p>
          <p>D_πe = Σ φe·η^social/{P.pressure.phiScale} + {P.pressure.drivers.e.biodiversity}·(B₀ − B) + {P.pressure.drivers.e.co2}·(c − c₀)/c₀</p>
          <p>D_πs = Σ φs·η^social/{P.pressure.phiScale} + {P.pressure.drivers.s.wellbeing}·(W₀ − W) + {P.pressure.drivers.s.tax}·τ</p>
        </Box>
        <p className="text-sm">{L('Conservación baja la ambientalista', 'Conservation lowers the environmentalist pressure')} ({P.pressure.e.CR}) {L('pero sube la agrícola', 'but raises the agricultural one')} (+{P.pressure.a.CR}): {L('conservar sin compensar tensiona al campo. Sacar tierra de producción (usos públicos) también. k_π =', 'conserving without compensation strains farmers. Taking land out of production (public uses) does too. k_π =')} {CP.Velocidad_Ajuste_Presiones}.</p>
      </div>
    ),
  },
  {
    title: L('Finanzas públicas', 'Public finance'),
    content: (
      <div>
        <Box>
          <p>g = {CP.Tasa_Base_Crecimiento_PBI} + {P.finance.growthPIE}·η_PIE + {P.finance.growthPEA}·η_PEA − {P.finance.growthTaxDrag}·τ − {P.finance.growthStress}·φ</p>
          <p>{L('SP = recaudación − gasto base γ_N·Y − costo de políticas − cuotas de pactos', 'PB = revenue − base spending γ_N·Y − policy costs − pact fees')}   ({L('recaudación', 'revenue')} = Y·({CP.Tasa_Impositiva_General_Sobre_PBI} + τ/100) + {P.finance.carbonTaxRevenue}·Y·η_CN^tax)</p>
          <p>i = i_N + {P.finance.riskPremium}·max(0, D/Y − {P.finance.debtThreshold})   ·   R' = R + SP − i·D − α_N·D   ·   {L('si', 'if')} R' &lt; {P.finance.reserveFloor}·Y: {L('la diferencia se paga con deuda', 'the gap is paid with debt')}</p>
          <p>φ = sHigh({L('intereses/recaudación', 'interest/revenue')}; {P.finance.stressMid}, {P.finance.stressWidth})</p>
        </Box>
        <ul className="list-disc list-inside space-y-2 text-sm">
          <li><strong className="text-red-400">{L('Gasto público base', 'Base public spending')}</strong> <Code>Gasto_Publico_Base_Nivel_N</Code> = {CP.Gasto_Publico_Base_Nivel_1} / {CP.Gasto_Publico_Base_Nivel_2} / {CP.Gasto_Publico_Base_Nivel_3} ({L('Territorio usa el Nivel 2', 'Territorio uses Level 2')}). <strong>{L('Advertencia: es el parámetro más sensible del modelo.', 'Warning: it is the most sensitive parameter of the model.')}</strong> {L('Con 15 % de recaudación deja un superávit de 2–2,5 % del PBI antes de las políticas; +20 % de γ le quita a una cartera verde unos 14 puntos de seguridad económica en el Nivel 2. No lo cambie sin correr', 'With 15 % revenue it leaves a surplus of 2–2.5 % of GDP before policies; +20 % on γ takes about 14 points of economic security from a green portfolio on Level 2. Do not change it without running')} <Code>npm run sim:check</Code>.</li>
          <li><strong className="text-red-400">{L('Inversión pública', 'Public investment')}</strong>: {L('entrar a un pacto, declarar un uso público (Territorio) o una opción paga se paga con las reservas por encima del piso y el resto con deuda mientras D/Y ≤', 'joining a pact, declaring a public use (Territorio) or a paid option is paid from reserves above the floor and the rest with debt while D/Y ≤')} {P.finance.debtThreshold}; {L('si no, se rechaza: "sin espacio fiscal".', 'otherwise it is refused: "no fiscal space".')}</li>
          <li><strong className="text-red-400">{L('Quiebra', 'Bankruptcy')}</strong>: D/Y &gt; {P.finance.bankruptcyDebtRatio} {L('con intereses', 'with interest')} &gt; {pct(P.finance.bankruptcyInterestBurden, lang, 0)} {L('de la recaudación durante', 'of revenue for')} {P.finance.bankruptcyYears} {L('años seguidos (24 meses en Territorio).', 'years in a row (24 months in Territorio).')}</li>
          <li>{L('Préstamo voluntario: hasta 10 % del PBI por año (Nivel 3; Niveles 1–2 y Territorio desde', 'Voluntary loan: up to 10 % of GDP per year (Level 3; Levels 1–2 and Territorio from')} <Param>{CP.Ano_Activacion_Prestamo}</Param>); {L('entra entero a reservas y deuda en el paso siguiente.', 'it enters reserves and debt in full in the next step.')}</li>
        </ul>
      </div>
    ),
  },
  {
    title: L('Economía, conflicto y transición justa', 'Economy, conflict and just transition'),
    content: (
      <div>
        <Box>
          <p>D_E = Σ bE·η^prod − {P.relaxation.E.carbonTax}·η_CN^tax + {P.relaxation.E.growth}·(g − g₀)/{P.relaxation.E.growthScale} + {P.relaxation.E.landValue}·(V/V₀ − 1) + {P.relaxation.E.biodiversity}·(B − B₀)/{P.relaxation.E.biodiversityScale} − {P.relaxation.E.fiscalStress}·φ − {P.relaxation.E.tax}·τ + {L('pactos', 'pacts')}</p>
          <p>D_C = {P.conflictWeights.food}·(F₀ − F)/{P.relaxation.C.foodScale} + {P.conflictWeights.econ}·(E₀ − E)/{P.relaxation.C.econScale} + {P.conflictWeights.envPressure}·(πe − πe₀)/{P.relaxation.C.envPressureScale} + Σ c·η^social − Σ {L('alivio', 'relief')}·η^social + {P.relaxation.C.shareCC}·Δa_CC + {P.relaxation.C.sharePF}·Δa_PF + {P.relaxation.C.tax}·τ + {P.relaxation.C.fiscalStress}·φ + {P.conflictWeights.gini}·(G − G₀) + {P.conflictWeights.just}·(1 − J)·R</p>
          <p>D_Pc = {P.relaxation.Pc.wellbeing}·(W₀ − W)/{P.relaxation.Pc.wellbeingScale} + {P.relaxation.Pc.econ}·(E₀ − E)/{P.relaxation.Pc.econScale} + {P.relaxation.Pc.fiscalStress}·φ + {P.relaxation.Pc.polarisation}·({L('polarización', 'polarisation')} − pol₀)/{P.relaxation.Pc.polarisationScale} + {P.relaxation.Pc.pressureMean}·(π̄ − π̄₀)/{P.relaxation.Pc.pressureMeanScale} + {L('pactos', 'pacts')}</p>
          <p>{L('Bienestar', 'Wellbeing')} W = 100 − C   ·   {L('Estabilidad', 'Stability')} St = 100 − Pc</p>
        </Box>
        <ul className="list-disc list-inside space-y-2 text-sm">
          <li><strong className="text-yellow-400">G</strong>: {L('concentración de la tierra = (cultivo convencional + plantaciones) / tierra productiva. Si sube respecto del inicio, sube el conflicto.', 'land concentration = (conventional crops + plantations) / productive land. If it rises above the start, conflict rises.')}</li>
          <li><strong className="text-yellow-400">J</strong>: {L('transición justa (0–1). R es la carga de restricciones (Conservación', 'just transition (0–1). R is the restriction load (Conservation')} {P.justTransition.restriction.CR}, {L('impuesto al carbono', 'carbon tax')} {P.justTransition.restriction.CN}, {L('protección de fuentes de agua', 'water-source protection')} {P.justTransition.restriction.AGUA}); {L('el apoyo viene de Agroecología y Ganadería Sostenible', 'support comes from Agroecology and Sustainable Livestock')} ({P.justTransition.support.AS} / {P.justTransition.support.GS}). {L('Restringir sin acompañar (J bajo con R alto) sube el conflicto. El tablero muestra G y J desde el Nivel 2.', 'Restricting without support (low J with high R) raises conflict. The dashboard shows G and J from Level 2.')}</li>
          <li>k_E / k_C / k_Pc = {CP.Velocidad_Ajuste_Seg_Economica} / {CP.Velocidad_Ajuste_Conflicto} / {CP.Velocidad_Ajuste_Colapso} {L('por año.', 'per year.')}</li>
        </ul>
      </div>
    ),
  },
  {
    title: L('Puntaje', 'Score'),
    content: (
      <div>
        <p className="mb-3 text-sm">{L('El Puntaje General (0–1000) está anclado al inicio de cada nivel: el componente de carbono vale 100 en', 'The General Score (0–1000) is anchored to each level\'s start: the carbon component is 100 at')} {num(CARBON_CEILING_FACTOR - 1, lang)}·c₀ {L('y 0 en', 'and 0 at')} {num(CARBON_CEILING_FACTOR, lang)}·c₀ (c₀ = {L('CO₂ por habitante al inicio', 'CO₂ per inhabitant at the start')}); {L('el de PBI se llena al', 'the GDP one fills up at')} {GDP_FULL_MULTIPLE}× {L('el PBI inicial.', 'the starting GDP.')}</p>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>{L('Nivel 1', 'Level 1')}: B {pct(SCORE_WEIGHTS[1].biodiversity, lang, 0)}, {L('carbono', 'carbon')} {pct(SCORE_WEIGHTS[1].carbon, lang, 0)}, E {pct(SCORE_WEIGHTS[1].economic, lang, 0)}</li>
          <li>{L('Nivel 2', 'Level 2')}: B {pct(SCORE_WEIGHTS[2].biodiversity, lang, 0)}, {L('carbono', 'carbon')} {pct(SCORE_WEIGHTS[2].carbon, lang, 0)}, {L('presiones', 'pressures')} {pct(SCORE_WEIGHTS[2].pressure, lang, 0)}, {L('promedio F/E/W/St', 'mean F/E/W/St')} {pct(SCORE_WEIGHTS[2].externalities, lang, 0)}</li>
          <li>{L('Nivel 3', 'Level 3')}: B {pct(SCORE_WEIGHTS[3].biodiversity, lang, 0)}, {L('carbono', 'carbon')} {pct(SCORE_WEIGHTS[3].carbon, lang, 0)}, {L('presiones', 'pressures')} {pct(SCORE_WEIGHTS[3].pressure, lang, 0)}, {L('promedio F/E/W/St', 'mean F/E/W/St')} {pct(SCORE_WEIGHTS[3].externalities, lang, 0)}, {L('PBI', 'GDP')} {pct(SCORE_WEIGHTS[3].gdp, lang, 0)}</li>
        </ul>
        <p className="text-xs italic mt-3">{L('Cada ruta multiplica el puntaje final del nivel (la más exigente paga más).', 'Each route multiplies the level\'s final score (the hardest pays more).')}</p>
      </div>
    ),
  },
  {
    title: L('Cómo se gana y cómo se pierde', 'How to win and how to lose'),
    content: (
      <div>
        <p className="mb-3 text-sm">{L('Al final de cada nivel', 'At the end of each level')} (<Param>{YEARS_PER_LEVEL}</Param> {L('años) hay que cumplir todos los mínimos de gobernabilidad y una ruta completa. Umbrales calibrados con', 'years) every governance floor and one complete route must be met. Thresholds calibrated with')} <Code>npm run sim:check</Code> ({L('fase 49', 'phase 49')}).</p>
        <div className="space-y-3">
          {[1, 2, 3].map((lvl) => (
            <div key={lvl} className="bg-slate-800 p-3 rounded-md text-xs">
              <h4 className="font-semibold text-blue-300 text-sm">{L('Nivel', 'Level')} {lvl}</h4>
              <p className="mt-1"><span className="text-gray-400">{tr('routes.floorsTitle')}:</span> {LEVEL_ROUTES[lvl].floors.map((f) => `${tr(f.labelKey)} ${f.dir === 'min' ? '≥' : '≤'} ${num(f.target, lang)}`).join(' · ')}</p>
              {LEVEL_ROUTES[lvl].routes.map((r) => (
                <p key={r.id} className="mt-1"><span className="text-cyan-400">{tr(r.nameKey)}</span> (×{r.scoreMultiplier}{r.minConditionsMet ? `, ${r.minConditionsMet}/${r.conditions.length}` : ''}): {r.conditions.map((c) => `${tr(c.labelKey)} ${c.dir === 'min' ? '≥' : '≤'} ${num(c.target, lang)}`).join(' · ')}</p>
              ))}
            </div>
          ))}
        </div>
        <H>{L('Derrota inmediata', 'Immediate defeat')}</H>
        <ul className="list-disc list-inside text-sm text-red-300">
          <li>{L('Colapso político', 'Political collapse')} ≥ 95 %</li>
          <li>{L('Quiebra (ver Finanzas públicas)', 'Bankruptcy (see Public finance)')}</li>
          <li>{L('Catástrofe ecológica (Biodiversidad ≤ 5 %)', 'Ecological catastrophe (Biodiversity ≤ 5 %)')}</li>
          <li>{L('Hambruna (Seguridad Alimentaria ≤ 10 %)', 'Famine (Food Security ≤ 10 %)')}</li>
        </ul>
      </div>
    ),
  },
  {
    title: L('Pactos y eventos (Nivel 3)', 'Pacts and events (Level 3)'),
    content: (
      <div>
        <H>{L('Pactos internacionales', 'International pacts')}</H>
        <p className="text-sm">{L('Mientras está activo, un pacto desplaza objetivos (no suma un salto por año). Adhesión / cuota anual como fracción del PBI:', 'While active, a pact shifts targets (it does not add a jump per year). Entry / annual fee as a share of GDP:')} {L('Tratado de Biodiversidad', 'Biodiversity Treaty')} {pct(P.pacts.biodiversityTreaty.entry, lang)} / {pct(P.pacts.biodiversityTreaty.annual, lang)} (B +{P.pacts.biodiversityTreaty.B} logit, E {P.pacts.biodiversityTreaty.E}); {L('Acuerdo Global de Carbono', 'Global Carbon Accord')} {pct(P.pacts.globalCarbonAccord.entry, lang)} / {pct(P.pacts.globalCarbonAccord.annual, lang)} (E {P.pacts.globalCarbonAccord.E}, Pc {P.pacts.globalCarbonAccord.Pc}, {L('renovables', 'renewables')} +{P.pacts.globalCarbonAccord.renewables}); {L('Transferencia Tecnológica', 'Technology Transfer')} {pct(P.pacts.techTransferInitiative.entry, lang)} / {pct(P.pacts.techTransferInitiative.annual, lang)} (E +{P.pacts.techTransferInitiative.E}, {L('renovables', 'renewables')} +{P.pacts.techTransferInitiative.renewables}). {L('La adhesión es inversión pública: sin espacio fiscal se rechaza.', 'Joining is a public investment: without fiscal space it is refused.')}</p>
        <H>{L('Eventos aleatorios', 'Random events')}</H>
        <p className="text-sm">{L('Cada mes cada evento se sortea por separado (puede haber varios en un año; el panel del Nivel 3 los lista todos). La sequía crece con la tendencia climática y con la pérdida de bosque, y es más probable sin Gestión del Agua. Si no hubo evento, la IA genera titulares a partir del estado del juego.', 'Every month each event is drawn separately (a year can have several; the Level 3 panel lists them all). Drought grows with the climate trend and with forest loss, and is likelier without Water Management. With no event, the AI writes headlines from the game state.')}</p>
        <H>{L('Presión fiscal adicional', 'Additional tax pressure')}</H>
        <p className="text-sm">0–<Param>{CP.Max_Additional_Tax_Rate_Percentage} %</Param>: {L('sube la recaudación, frena el crecimiento y sube la presión social y el conflicto.', 'raises revenue, slows growth and raises social pressure and conflict.')}</p>
      </div>
    ),
  },
  {
    title: L('Panel del facilitador', 'Facilitator panel'),
    content: (
      <div>
        <p className="text-sm mb-2">{L('El panel solo expone claves que el motor lee (cada una tiene un test que verifica que mueve algo). Los cambios valen en vivo, salvo la población inicial, que se aplica al reiniciar o empezar un nivel.', 'The panel only exposes keys the engine reads (each one has a test that checks it moves something). Changes apply live, except the initial population, which applies when a level starts or restarts.')}</p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>{L('Crecimiento y población', 'Growth and population')}: <Code>Tasa_Base_Crecimiento_PBI</Code> <Code>Tasa_Crecimiento_Poblacional_Base</Code> <Code>Poblacion_Inicial</Code></li>
          <li>{L('Velocidades de ajuste', 'Adjustment speeds')}: <Code>Velocidad_Ajuste_*</Code></li>
          <li>{L('Políticas', 'Policies')}: <Code>Eficiencia_Minima_Politicas</Code> <Code>Recuperacion_Politicas_Anios</Code></li>
          <li>{L('Finanzas', 'Finance')}: <Code>Tasa_Impositiva_General_Sobre_PBI</Code> <Code>Gasto_Publico_Base_Nivel_1..3</Code> <Code>Tasa_de_interes_Nivel_1..3</Code> <Code>Pago_deuda_anual_Nivel_1..3</Code> <Code>Max_Additional_Tax_Rate_Percentage</Code> <Code>Ano_Activacion_Prestamo</Code></li>
        </ul>
        <p className="text-sm mt-3 text-yellow-300">{L('Gasto_Publico_Base_* es el más sensible: pequeños cambios deciden si las carteras verdes son viables. Las cifras del modelo son de un juego calibrado, no proyecciones de un territorio real.', 'Gasto_Publico_Base_* is the most sensitive: small changes decide whether green portfolios are viable. The model\'s figures come from a calibrated game, not projections of a real territory.')}</p>
      </div>
    ),
  },
  ];
}

const FacilitatorManual: React.FC<FacilitatorManualProps> = ({ onClose }) => {
  const { language } = useLanguageContext();
  const ui = FM_UI[language];
  const manualSlides = useMemo(() => buildSlides(language), [language]);
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
                    {ui.title}: <span className="text-blue-300">{slide.title}</span>
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
