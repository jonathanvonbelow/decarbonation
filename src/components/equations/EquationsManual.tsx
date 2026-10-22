import React, { useState, useMemo } from 'react';
import { GameState, ControlParams, Policy, LandUseType } from '../../types';
import { CONTROL_PARAMS, INITIAL_POLICIES, INITIAL_LAND_USES, LEVEL_CONFIGS } from '../../constants';
import Tooltip from '../common/Tooltip';
import { DESCRIPTIONS } from './descriptions';
import { useLanguageContext } from '../../contexts/LanguageContext';
const EQ_UI = {
  es: { title: 'Manual de Ecuaciones y Parámetros', subtitle: 'Esta sección contiene la lógica interna de la simulación. Se requiere contraseña.', passwordPlaceholder: 'Contraseña', passwordLabel: 'Contraseña para el manual', verify: 'Verificar', wrongPw: 'Contraseña incorrecta.', mainTitle: 'Manual de Ecuaciones', liveSubtitle: (y:number) => `Datos y Lógica de la Simulación DecarboNation (Valores en vivo para Año: ${y})`, filter: 'Filtrar parámetros...', prev: 'Anterior', next: 'Siguiente', closeLabel: 'Cerrar manual', thParam: 'Parámetro', thValue: 'Valor', thPolicy: 'Política', thCost: 'Costo', thDecay: 'Decaimiento (Años)', thEfficiency: 'Eficiencia (Vivo)', thEffort: 'Esfuerzo (Vivo)', thLandUse: 'Uso de Suelo', thEmission: 'Emisión', thSequestration: 'Secuestro', thArea: 'Área (Viva)', noDescription: 'Sin descripción.' },
  en: { title: 'Equations and Parameters Manual', subtitle: 'This section contains the internal simulation logic. Password required.', passwordPlaceholder: 'Password', passwordLabel: 'Manual password', verify: 'Verify', wrongPw: 'Incorrect password.', mainTitle: 'Equations Manual', liveSubtitle: (y:number) => `DecarboNation Simulation Data & Logic (Live values for Year: ${y})`, filter: 'Filter parameters...', prev: 'Previous', next: 'Next', closeLabel: 'Close manual', thParam: 'Parameter', thValue: 'Value', thPolicy: 'Policy', thCost: 'Cost', thDecay: 'Decay (Years)', thEfficiency: 'Efficiency (Live)', thEffort: 'Effort (Live)', thLandUse: 'Land Use', thEmission: 'Emission', thSequestration: 'Sequestration', thArea: 'Area (Live)', noDescription: 'No description.' },
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
      costFactor: p.costFactor,
      initialEfficiency: p.initialEfficiency,
      decayDuration: p.efficiencyDecayDuration,
      liveEfficiency: gameState.policies[p.id]?.isActive ? <LiveValue>{(gameState.policies[p.id].currentEfficiency * 100).toFixed(1)}%</LiveValue> : "Inactiva",
      liveEffort: gameState.currentLevel >= 2 && gameState.policies[p.id]?.isActive ? <LiveValue>{(gameState.policies[p.id].totalInstrumentEffortApplied || 0)}%</LiveValue> : "N/A"
    }));
  }, [gameState.policies, gameState.currentLevel]);

  const landUseData = useMemo(() => {
    return Object.entries(INITIAL_LAND_USES).map(([key, lu]) => ({
      name: lu.name,
      emissionRate: lu.emissionRate,
      sequestrationRate: lu.sequestrationRate,
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
                                <td className="p-2">{p.costFactor}</td>
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
                                <td className="p-2 text-red-400">{lu.emissionRate}</td>
                                <td className="p-2 text-green-400">{lu.sequestrationRate}</td>
                                <td className="p-2">{lu.liveArea}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <SectionTitle tooltipText={d('TITLE_EQUATIONS')}>Ecuaciones Fundamentales</SectionTitle>
            
            <SubSectionTitle tooltipText={d('EQUATION_TITLE_POLICY_EFFICIENCY')}>Eficiencia de Política</SubSectionTitle>
            <p className="text-sm mb-2">La efectividad de una política no es estática; disminuye con el tiempo a medida que el sistema se adapta o surgen nuevas barreras. Esta 'entropía' se modela con un decaimiento exponencial.</p>
            <Formula>Eficiencia = <Param>EficienciaInicial</Param> * e^(-<Param>TiempoActivacion</Param> / <Param>DuracionEfecto</Param>) * <Param>FactorPresionGeneral</Param></Formula>
            <p className="text-sm">Si Nivel &ge; 2, la eficiencia anterior se multiplica por el factor (<Code>EsfuerzoTotalInstrumentos / 100</Code>), permitiendo al jugador 'reinvertir' en una política para mantener su relevancia.</p>
            
            <SubSectionTitle tooltipText={d('EQUATION_TITLE_CARBON_BALANCE')}>Balance de Carbono</SubSectionTitle>
            <p className="text-sm mb-2">Esta es la contabilidad climática de la nación. El objetivo final es hacer que el secuestro supere a las emisiones.</p>
            <Formula>BalanceNetoAnual = (Σ (<Param>AreaUso</Param> * <Param>TasaSecuestro</Param>)) - (Σ (<Param>AreaUso</Param> * <Param>TasaEmision</Param>))</Formula>
            <p className="text-sm">El resultado se ajusta por sinergias (ej. <Code>Conservación</Code> + <Code>Carbono Neutralidad</Code>) y antagonismos (<Code>Subsidios Energéticos</Code> vs <Code>Carbono Neutralidad</Code>) y efectos directos de instrumentos de política (Nivel 2+).</p>

            <SubSectionTitle tooltipText={d('EQUATION_TITLE_INDICATORS')}>Cálculo de Indicadores (Ej. Biodiversidad)</SubSectionTitle>
             <p className="text-sm mb-2">Los indicadores socio-ambientales son el resultado de la compleja interacción entre las decisiones políticas y el estado del territorio.</p>
            <Formula>ΔBiodiversidad = (Σ(<Param>Efic. Política</Param> * <Param>Peso</Param>)) * <Param>Factor_P</Param> + (Σ(<Param>% AreaUso</Param> * <Param>Peso</Param>)) * <Param>Factor_U</Param></Formula>
            <p className="text-sm">El cambio anual en cada indicador (Biodiversidad, Seg. Alimentaria, etc.) es una suma ponderada del impacto de las políticas activas (positivas o negativas) y de la distribución actual del uso del suelo. Algunos indicadores también se afectan entre sí.</p>
            
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
            <p className="text-sm"><Code>Egresos</Code> = Costos de Políticas (basado en su <Code>costFactor</Code> y PBI) + Costos Anuales de Pactos + Pago Intereses Deuda + Pago de Capital de la Deuda.</p>

            <SubSectionTitle tooltipText={d('EQUATION_TITLE_STABILITY_CONFLICT')}>Estabilidad y Conflicto</SubSectionTitle>
            <p className="text-sm mb-2">Indicadores que pueden llevar al fin del juego si se descuidan. Representan la cohesión social y la legitimidad del gobierno.</p>
            <Formula>ΔConflictoSocial = Σ(<Param>Factores de Descontento</Param>) - <Param>TasaDisipación</Param>
ΔColapsoPolítico = Σ(<Param>Factores de Inestabilidad</Param>) - <Param>Tasa</Param></Formula>
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
