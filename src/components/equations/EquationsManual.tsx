import React, { useState, useMemo } from 'react';
import { GameState, ControlParams, Policy, LandUseType } from '../../types';
import { CONTROL_PARAMS, INITIAL_POLICIES, INITIAL_LAND_USES, LEVEL_CONFIGS } from '../../constants';
import Tooltip from '../common/Tooltip';
import { DESCRIPTIONS } from './descriptions';
import { PARAMS_V2, type LandCode } from '../../sim/v2/params';
import { costShareOf, PID_OF } from '../../sim/v2/policies';
import { useLanguageContext } from '../../contexts/LanguageContext';
const EQ_UI = {
  es: { title: 'Manual de Ecuaciones y Parámetros', subtitle: 'Esta sección contiene la lógica interna de la simulación. Se requiere contraseña.', passwordPlaceholder: 'Contraseña', passwordLabel: 'Contraseña para el manual', verify: 'Verificar', wrongPw: 'Contraseña incorrecta.', mainTitle: 'Manual de Ecuaciones', liveSubtitle: (y:number) => `Datos y Lógica de la Simulación DecarboNation (Valores en vivo para Año: ${y})`, filter: 'Filtrar parámetros...', prev: 'Anterior', next: 'Siguiente', closeLabel: 'Cerrar manual', thParam: 'Parámetro', thValue: 'Valor', thPolicy: 'Política', thCost: 'Costo (% PBI, esfuerzo pleno)', thDecay: 'Puesta en marcha / desgaste (años)', thEfficiency: 'Eficiencia (Vivo)', thEffort: 'Esfuerzo (Vivo)', thLandUse: 'Uso de Suelo', thEmission: 'Flujo (tCO₂e/ha/año)', thSequestration: 'Stock (Mg C/ha)', thArea: 'Área (Viva)', noDescription: 'Sin descripción.' },
  en: { title: 'Equations and Parameters Manual', subtitle: 'This section contains the internal simulation logic. Password required.', passwordPlaceholder: 'Password', passwordLabel: 'Manual password', verify: 'Verify', wrongPw: 'Incorrect password.', mainTitle: 'Equations Manual', liveSubtitle: (y:number) => `DecarboNation Simulation Data & Logic (Live values for Year: ${y})`, filter: 'Filter parameters...', prev: 'Previous', next: 'Next', closeLabel: 'Close manual', thParam: 'Parameter', thValue: 'Value', thPolicy: 'Policy', thCost: 'Cost (% GDP, full effort)', thDecay: 'Start-up / wear (years)', thEfficiency: 'Efficiency (Live)', thEffort: 'Effort (Live)', thLandUse: 'Land Use', thEmission: 'Flux (tCO₂e/ha/yr)', thSequestration: 'Stock (Mg C/ha)', thArea: 'Area (Live)', noDescription: 'No description.' },
} as const;

// Helper components for styling
const Code = ({ children }: { children: React.ReactNode }) => <code className="text-orange-400 bg-gray-900 px-1.5 py-0.5 rounded-md font-mono">{children}</code>;
const Param = ({ children }: { children: React.ReactNode }) => <span className="text-cyan-400 font-mono">{children}</span>;
const LiveValue = ({ children }: { children: React.ReactNode }) => <span className="text-lime-400 font-bold">{children}</span>;
const SectionTitle: React.FC<{ children: React.ReactNode; tooltipText?: string }> = ({ children, tooltipText }) => (
    <h3 className="text-2xl font-semibold text-blue-300 mt-8 mb-4 border-b-2 border-blue-800 pb-2">
        {tooltipText ? <Tooltip position="top-right" text={tooltipText}>{children}</Tooltip> : children}
    </h3>
);
const SubSectionTitle: React.FC<{ children: React.ReactNode; tooltipText?: string }> = ({ children, tooltipText }) => (
    <h4 className="text-xl font-semibold text-purple-300 mt-6 mb-3">
        {tooltipText ? <Tooltip position="top-right" text={tooltipText}>{children}</Tooltip> : children}
    </h4>
);
const Formula = ({ children }: { children: React.ReactNode }) => <div className="bg-gray-900 p-4 rounded-md font-mono text-sm my-3 border-l-4 border-cyan-500 whitespace-pre-wrap">{children}</div>;
const Th: React.FC<{ children: React.ReactNode; tooltipText?: string }> = ({ children, tooltipText }) => (
    <th className="p-2">
        {tooltipText ? <Tooltip position="top-right" text={tooltipText}>{children}</Tooltip> : children}
    </th>
);

// Model 1.1 (phase 34): the OBSOLETE_PARAMS filter is gone with the 70 dead keys it hid; every
// CONTROL_PARAMS entry shown here is read by the model or by the UI.


// Main Component
interface EquationsManualProps {
  onClose: () => void;
  gameState: GameState;
}

const EquationsManual: React.FC<EquationsManualProps> = ({ onClose, gameState }) => {
  const { language } = useLanguageContext();
  const ui = EQ_UI[language];
  // Phase 12 (12_i18n_completo.md Capa B): DESCRIPTIONS is now bilingual
  // (Record<string, Record<Language, string>>) -- this resolves a lookup for the active
  // language, replacing every previous direct DESCRIPTIONS.XXX / DESCRIPTIONS[key] access.
  const d = (key: string): string => DESCRIPTIONS[key]?.[language] ?? '';
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'nito2520') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError(ui.wrongPw);
      setPassword('');
    }
  };

  const controlParamsData = useMemo(() => {
    return Object.entries(CONTROL_PARAMS)
      .map(([key, value]) => ({ key, value: String(value) }))
      .filter(item => item.key.toLowerCase().includes(filter.toLowerCase()));
  }, [filter]);

  const policyData = useMemo(() => {
    return Object.values(INITIAL_POLICIES).map(p => ({
      name: p.name,
      id: p.id,
      // Model 2.0 (phase 36): cost share κ and the ramp / fatigue time constants λ / δ of PARAMS_V2.
      costShare: `${(costShareOf(PID_OF[p.id]) * 100).toFixed(1)} %`,
      decayDuration: `${PARAMS_V2.rampYears[PID_OF[p.id]]} / ${PARAMS_V2.fatigueYears[PID_OF[p.id]]}`,
      liveEfficiency: gameState.policies[p.id]?.isActive ? <LiveValue>{((gameState.policies[p.id].currentEfficiency ?? 0) * 100).toFixed(1)}%</LiveValue> : "—",
      liveEffort: gameState.policies[p.id]?.isActive ? <LiveValue>{(gameState.policies[p.id].totalInstrumentEffortApplied || 0)}%</LiveValue> : "—"
    }));
  }, [gameState.policies, gameState.currentLevel]);

  const landUseData = useMemo(() => {
    // Phase 38: the carbon of each use is PARAMS_V2.flux (+ = emission) and stock, not 1.1 emission/sequestration rates.
    return Object.entries(INITIAL_LAND_USES).map(([key, lu]) => ({
      name: lu.name,
      flux: PARAMS_V2.flux[key as LandCode],
      stock: PARAMS_V2.stock[key as LandCode],
      liveArea: <LiveValue>{gameState.landUses[key as LandUseType].area.toFixed(1)} kHa</LiveValue>
    }));
  }, [gameState.landUses]);

  const passwordScreen = (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-custom-accent mb-4">{ui.title}</h2>
      <p className="text-gray-400 mb-6">{ui.subtitle}</p>
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
          {ui.verify}
        </button>
        {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
      </form>
    </div>
  );
  
  const manualContent = (
    <>
        <div className="flex justify-between items-start mb-4 border-b border-slate-700 pb-4">
          <div>
            <h2 id="manual-title" className="text-2xl sm:text-3xl font-bold text-custom-accent">{ui.mainTitle}</h2>
            <p className="text-xs text-gray-400">{ui.liveSubtitle(gameState.year)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none" aria-label={ui.closeLabel}>&times;</button>
        </div>

        <div className="overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 pr-4">
            
            <SectionTitle tooltipText={d('TITLE_CONTROL_PARAMS')}>Parámetros de Control Global</SectionTitle>
            <input
                type="text"
                placeholder={ui.filter}
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="w-full p-2 mb-3 bg-gray-800 border border-gray-600 rounded-md placeholder-gray-500"
            />
            <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 text-xs">
                <table className="w-full text-left">
                    <thead className="sticky top-0 bg-gray-900">
                        <tr>
                            <Th tooltipText={d('PARAM_TABLE_HEADER_KEY')}>{ui.thParam}</Th>
                            <Th tooltipText={d('PARAM_TABLE_HEADER_VALUE')}>{ui.thValue}</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {controlParamsData.map((item, index) => (
                            <tr key={index} className="border-t border-gray-700 hover:bg-gray-800/50">
                                <td className="p-2">
                                    <Tooltip position="top-right" text={d(item.key) || ui.noDescription}>
                                        <Param>{item.key}</Param>
                                    </Tooltip>
                                </td>
                                <td className="p-2">{item.value}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <SectionTitle tooltipText={d('TITLE_POLICIES')}>Definiciones de Políticas</SectionTitle>
            <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 text-xs">
                <table className="w-full text-left">
                    <thead className="sticky top-0 bg-gray-900">
                        <tr>
                            <Th tooltipText={d('POLICY_TABLE_HEADER_NAME')}>{ui.thPolicy}</Th>
                            <Th tooltipText={d('POLICY_TABLE_HEADER_COST')}>{ui.thCost}</Th>
                            <Th tooltipText={d('POLICY_TABLE_HEADER_DECAY')}>{ui.thDecay}</Th>
                            <Th tooltipText={d('POLICY_TABLE_HEADER_EFFICIENCY_LIVE')}>{ui.thEfficiency}</Th>
                            <Th tooltipText={d('POLICY_TABLE_HEADER_EFFORT_LIVE')}>{ui.thEffort}</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {policyData.map((p, i) => (
                             <tr key={i} className="border-t border-gray-700 hover:bg-gray-800/50">
                                <td className="p-2 text-purple-300">
                                  <Tooltip position="top-right" text={INITIAL_POLICIES[p.id as Policy]?.description}>
                                    {p.name}
                                  </Tooltip>
                                </td>
                                <td className="p-2">{p.costShare}</td>
                                <td className="p-2">{p.decayDuration}</td>
                                <td className="p-2">{p.liveEfficiency}</td>
                                <td className="p-2">{p.liveEffort}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <SectionTitle tooltipText={d('TITLE_LAND_USE')}>Definiciones de Uso de Suelo</SectionTitle>
             <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 text-xs">
                <table className="w-full text-left">
                    <thead className="sticky top-0 bg-gray-900">
                        <tr>
                            <Th tooltipText={d('LAND_USE_TABLE_HEADER_NAME')}>{ui.thLandUse}</Th>
                            <Th tooltipText={d('LAND_USE_TABLE_HEADER_EMISSION')}>{ui.thEmission}</Th>
                            <Th tooltipText={d('LAND_USE_TABLE_HEADER_SEQUESTRATION')}>{ui.thSequestration}</Th>
                            <Th tooltipText={d('LAND_USE_TABLE_HEADER_AREA_LIVE')}>{ui.thArea}</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {landUseData.map((lu, i) => (
                             <tr key={i} className="border-t border-gray-700 hover:bg-gray-800/50">
                                <td className="p-2 text-green-300">
                                  <Tooltip position="top-right" text={Object.values(INITIAL_LAND_USES).find(ilu => ilu.name === lu.name)?.document}>
                                    {lu.name}
                                  </Tooltip>
                                </td>
                                <td className={`p-2 ${lu.flux > 0 ? 'text-red-400' : 'text-green-400'}`}>{lu.flux}</td>
                                <td className="p-2 text-gray-300">{lu.stock}</td>
                                <td className="p-2">{lu.liveArea}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <SectionTitle tooltipText={d('TITLE_EQUATIONS')}>Ecuaciones Fundamentales</SectionTitle>
            
            <SubSectionTitle tooltipText={d('EQUATION_TITLE_POLICY_EFFICIENCY')}>Eficiencia de Política</SubSectionTitle>
            <p className="text-sm mb-2">Una política recién activada tarda en ponerse en marcha (λ años), se desgasta con el uso hacia un piso institucional (δ años) y, si se la deja descansar, recupera su empuje (ρ años).</p>
            <Formula>{`Eficiencia = (1 − e^(−τ/λ)) · [η_min + (1 − η_min) · e^(−T/δ)]
τ: años desde la activación (vuelve a 0 al desactivar) · T: años de uso acumulados (T · e^(−dt/ρ) en reposo)
Canal c = Σ μ_k · φ(e_k) / Σ μ_k · φ(25),  φ(e) = 1 − e^(−e/40)
Costo anual = κ · PBI · (0,3 + 0,7 · esfuerzo total / 100)`}</Formula>
            <p className="text-sm">Por defecto <Param>η_min</Param> = {CONTROL_PARAMS.Eficiencia_Minima_Politicas} y <Param>ρ</Param> = {CONTROL_PARAMS.Recuperacion_Politicas_Anios} años (el facilitador puede cambiarlos). κ es el costo a esfuerzo pleno de la tabla (escala transitoria hasta que exista el gasto público base). Cada instrumento pesa distinto en cada canal (suelo, producción, social); el reparto parejo 25/25/25/25 da 1 en todos, concentrar sube un canal y baja los demás. En el Nivel 1 el esfuerzo siempre es parejo.</p>
            
            <SubSectionTitle tooltipText={d('EQUATION_TITLE_CARBON_BALANCE')}>Balance de Carbono</SubSectionTitle>
            <p className="text-sm mb-2">Inventario en toneladas de CO₂ equivalente por año, con tres componentes: energía, flujo del suelo y cambio de uso. El componente del suelo puede ser negativo (sumidero).</p>
            <Formula>{`Energía = ε0 · (ingreso per cápita relativo)^0,3 · (1 + 0,15·η_SE) · [0,35·(1 − s) + 0,65·(1 − u)] · Población
s* = min(0,9; 0,60·η_CN^elec + min(1; %parques/4 %) + pactos)   u* = min(0,6; 0,35·η_CN^otros + pactos)
s, u avanzan hacia s*, u* un 15 % del camino por año (inercia de infraestructura)
Suelo = Σ flujo_i · Área_i[ha]      Cambio de uso = Σ ha convertidas/año · max(0, stock_i − stock_j) · 44/12
CO₂eq per cápita = (Energía + Suelo + Cambio de uso) / Población`}</Formula>
            <p className="text-sm">ε0 = {PARAMS_V2.energy.eps0[1]} / {PARAMS_V2.energy.eps0[2]} / {PARAMS_V2.energy.eps0[3]} t por habitante (niveles 1 / 2 / 3); población inicial {CONTROL_PARAMS.Poblacion_Inicial.toLocaleString('es')} habitantes. Las políticas cambian el flujo de algunos usos (<Code>Agricultura Intensiva</Code> sube el de cultivos convencionales; <Code>Ganadería Sostenible</Code>, <Code>Agroecología</Code> y <Code>Conservación</Code> lo bajan; <Code>Normativas Flexibles</Code> lo sube en el bosque no protegido). Flujos y stocks por criterio experto (stocks basados en la revisión del Bosque Atlántico, 2024).</p>

            <SubSectionTitle tooltipText={d('EQUATION_TITLE_INDICATORS')}>Cálculo de Indicadores (Ej. Biodiversidad)</SubSectionTitle>
             <p className="text-sm mb-2">Los indicadores socio-ambientales son el resultado de la compleja interacción entre las decisiones políticas y el estado del territorio.</p>
            <Formula>{`Hábitat:   H = Σ h_i · a_i          (a_i = fracción del territorio de cada uso)
Objetivo:  B* = 100 · σ( logit(B₀/100) + D_B )
D_B = z/(1 − B₀/100) · ln(H/H₀) + Σ qB·η^suelo + ${PARAMS_V2.biodiversity.synergyAgroConservation}·min(η_AS, η_CR) − ${PARAMS_V2.biodiversity.synergyIntensiveFlexible}·min(η_PAI, η_FRA) + pactos
      [+ ${PARAMS_V2.biodiversity.connectivityGamma}·ln(K/K₀) en Territorio]
Dinámica:  B ← B* + (B − B*) · (1 − k_B)^dt`}</Formula>
            <p className="text-sm">Relación especies-área de paisaje (Pereira, Ziv y Miranda, 2014) con z = {PARAMS_V2.zSAR}. Afinidades h: bosque protegido {PARAMS_V2.habitat.BNP}, humedal {PARAMS_V2.habitat.HUM}, bosque no protegido {PARAMS_V2.habitat.BNNP}, restauración {PARAMS_V2.habitat.RES}, agroecológico {PARAMS_V2.habitat.CA}, barbecho {PARAMS_V2.habitat.FAL}, plantaciones {PARAMS_V2.habitat.PF}, pasturas {PARAMS_V2.habitat.PRG}, convencional {PARAMS_V2.habitat.CC}, parque energético {PARAMS_V2.habitat.ENR}. qB: Conservación +{PARAMS_V2.qB.CR}, Normativas Flexibles {PARAMS_V2.qB.FRA}. k_B = {CONTROL_PARAMS.Velocidad_Ajuste_Biodiversidad} por año (deuda de extinción). K es la fracción del bosque en el parche continuo más grande del mapa.</p>
            <Formula>{`Oferta:    Q = (1 − x) · [A_CC·${PARAMS_V2.food.yield.CC}·(1 + ${PARAMS_V2.food.yieldPolicy.PAI}·η_PAI) + A_CA·${PARAMS_V2.food.yield.CA}·(1 + ${PARAMS_V2.food.yieldPolicy.AS}·η_AS) + A_PRG·${PARAMS_V2.food.yield.PRG}·(1 + ${PARAMS_V2.food.yieldPolicy.GS}·η_GS)]
               · (1 + ${PARAMS_V2.food.yieldPolicy.AGUA}·η_AGUA) · (1 + ${PARAMS_V2.food.yieldTrend})^t · (1 + ε)
Exportado: x = ${PARAMS_V2.food.export0} + ${PARAMS_V2.food.exportPEA}·η_PEA        ρ = max(Q/P, ${PARAMS_V2.food.rhoFloor}·ρ₀)
Objetivo:  F* = 100 · σ( logit(F₀/100) + ${PARAMS_V2.food.kappa1}·ln(ρ/ρ₀) + ${PARAMS_V2.food.kappa2}·(E − E₀)/${PARAMS_V2.food.econScale} )
Dinámica:  F ← F* + (F − F*) · (1 − k_F)^dt`}</Formula>
            <p className="text-sm">Seguridad alimentaria por balance de oferta y demanda: ρ es la disponibilidad por persona y ρ₀ la del inicio del nivel; E es la seguridad económica del paso anterior (acceso por ingreso). ε es el choque de rendimiento (0 por ahora). k_F = {CONTROL_PARAMS.Velocidad_Ajuste_Seg_Alimentaria} por año.</p>
            
            <SubSectionTitle tooltipText={d('EQUATION_TITLE_POLITICAL_PRESSURE')}>Presión Política (Nivel 2+)</SubSectionTitle>
            <p className="text-sm mb-2">Simula el comportamiento de grupos de interés. La presión no cambia linealmente; crece o decrece lentamente al principio, se acelera, y luego se satura cerca de los extremos, imitando fenómenos sociales reales.</p>
            <Formula>Impulso = (Σ <Param>Efectos de Políticas</Param>) + (Σ <Param>Efectos de Indicadores</Param>)
FuerzaNormalización = (<Param>PuntoEquilibrio</Param> - <Param>PresiónActual</Param>) * <Param>TasaNormalización</Param>
ΔPresión = (<Param>Impulso</Param> + <Param>FuerzaNormalización</Param>) * f(<Param>PresiónActual</Param>)</Formula>
            <p className="text-sm">La función <Code>f()</Code> modera el cambio, haciéndolo más lento cerca de los extremos 0 y 100. Esto evita cambios abruptos y crea una dinámica de 'inercia' social.</p>

            <SubSectionTitle tooltipText={d('EQUATION_TITLE_ECONOMY')}>Economía</SubSectionTitle>
            <p className="text-sm mb-2">Modela la salud financiera de la nación, que es crucial para poder financiar políticas y mantener la estabilidad.</p>
            <Formula>ΔPBI = <Param>PBI_Actual</Param> * (<Param>TasaBase</Param> + Σ(<Param>Efectos Políticas</Param>))
ΔReservas = <Param>Ingresos</Param> - <Param>Egresos</Param></Formula>
            <p className="text-sm"><Code>Ingresos</Code> = Impuestos sobre PBI (con tasa base + tasa adicional en N3) + Préstamos solicitados.</p>
            <p className="text-sm"><Code>Egresos</Code> = Costos de Políticas (<Code>κ · PBI · (0,3 + 0,7 · esfuerzo)</Code>) + Costos Anuales de Pactos + Pago Intereses Deuda + Pago de Capital de la Deuda.</p>

            <SubSectionTitle tooltipText={d('EQUATION_TITLE_STABILITY_CONFLICT')}>Estabilidad y Conflicto</SubSectionTitle>
            <p className="text-sm mb-2">Indicadores que pueden llevar al fin del juego si se descuidan. Representan la cohesión social y la legitimidad del gobierno.</p>
            <Formula>{`Objetivo:  X* = 100 · σ( logit(X₀/100) + D_X )       X ∈ {Seg. Económica, Conflicto, Colapso}
Dinámica:  X ← X* + (X − X*) · (1 − k_X)^dt         (exacta: 12 pasos mensuales = 1 anual)
D_E  = Σ bE·η^prod − 0,15·η_CN^imp + 0,25·(g − g₀)/0,01 + 1,5·(V/V₀ − 1) + 0,15·(B − B₀)/20 − 0,8·φ − 0,04·τ − 0,6·[s(F) − s(F₀)] + pactos
D_C  = 0,6·(F₀ − F)/15 + 0,5·(E₀ − E)/15 + 0,4·(πe − πe₀)/20 + Σ c·η^social − Σ alivio·η^social + 2·Δa_CC + Δa_PF + 0,03·τ + 0,6·φ
D_Pc = 0,9·(W₀ − W)/20 + 0,5·(E₀ − E)/20 + 0,8·φ + 0,5·(polarización − pol₀)/30 + 0,6·(π̄ − π̄₀)/20 + pactos
Bienestar = 100 − Conflicto      Estabilidad = 100 − Colapso`}</Formula>
            <p className="text-sm">Todo término es un desvío respecto del inicio del nivel o el efecto de una política activa: sin políticas y con el territorio quieto, nada se mueve. k = {CONTROL_PARAMS.Velocidad_Ajuste_Seg_Economica} / {CONTROL_PARAMS.Velocidad_Ajuste_Conflicto} / {CONTROL_PARAMS.Velocidad_Ajuste_Colapso} por año (E / C / Pc). τ es el impuesto adicional en puntos; g₀ = {CONTROL_PARAMS.Tasa_Base_Crecimiento_PBI} es el crecimiento base; φ es el estrés fiscal (intereses / recaudación por encima de 0,20); s(F) = 1/(1 + e^((F − 20)/4)) mide una crisis alimentaria.</p>
        </div>
    </>
  );

  return (
    <div
      className="fixed inset-0 bg-slate-900 bg-opacity-95 flex items-center justify-center z-[1000] p-4 animate-fade-in backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 p-6 sm:p-8 rounded-lg shadow-2xl max-w-6xl w-full text-gray-200 max-h-[95vh] flex flex-col border border-slate-700 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]"
        onClick={(e) => e.stopPropagation()}
      >
        {!isAuthenticated ? passwordScreen : manualContent}
      </div>
    </div>
  );
};

export default EquationsManual;
