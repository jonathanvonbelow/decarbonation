
import React, { useState, useMemo } from 'react';
import { GameState, ControlParams, Policy, LandUseType } from '../../types';
import { CONTROL_PARAMS, INITIAL_POLICIES, INITIAL_LAND_USES, LEVEL_CONFIGS } from '../../constants';
import Tooltip from '../common/Tooltip';
import { DESCRIPTIONS } from './descriptions';

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

const OBSOLETE_PARAMS = new Set([
    'Factor_sensibilidad_Indicador_eficiencia',
    'Monto_del_Prestamo_Unico',
    'Amplificacion_mediatica_social_Nivel_1',
    'Amplificacion_mediatica_social_Nivel_2',
    'Amplificacion_mediatica_social_Nivel_3',
    'Factor_Impulso_Presion_Agricola',
    'Factor_Impulso_Presion_Ambientalista',
    'Factor_Impulso_Presion_Social',
    'Tasa_disipacion_agricola_Nivel_1',
    'Tasa_disipacion_agricola_Nivel_2',
    'Tasa_disipacion_agricola_Nivel_3',
    'Tasa_disipacion_ambientalista_Nivel_1',
    'Tasa_disipacion_ambientalista_Nivel_2',
    'Tasa_disipacion_ambientalista_Nivel_3',
    'Peso_Influencia_Presiones_CP',
    'Peso_Factor_Polarizacion_CP',
    'Peso_Agricola_Colapso',
    'Peso_Ambientalista_Colapso',
    'Peso_Social_Colapso',
    'Ponderacion_CO2_Nivel_1',
    'Ponderacion_CO2_Nivel_2',
    'Ponderacion_CO2_Nivel_3',
    'Ponderacion_Externalidades_Nivel_1',
    'Ponderacion_Externalidades_Nivel_2',
    'Ponderacion_Externalidades_Nivel_3',
    'Ponderacion_Usos_coberturas_Nivel_1',
    'Ponderacion_Usos_coberturas_Nivel_2',
    'Ponderacion_Usos_coberturas_Nivel_3',
    'Peso_Biodiversidad_Ext',
    'Peso_Seguridad_Alimentaria_Ext',
    'Peso_Seguridad_Economica_Ext',
    'Peso_Bienestar_Social_Ext',
    'Peso_BNNP_Nivel_1',
    'Peso_BNP_Nivel_1',
    'Peso_CA_Nivel_1',
    'Peso_CC_Nivel_1',
    'Peso_PF_Nivel_1',
    'Peso_PRG_Nivel_1',
    'Umbral_Influencia_Agricola_Nivel_1',
    'Umbral_Influencia_Agricola_Nivel_2',
    'Umbral_Influencia_Agricola_Nivel_3',
    'Factor_Impacto_Politicas_y_Presiones_en_Bienestar_Peso',
    'Factor_Impacto_Usos_en_Bienestar_Peso',
    'Impacto_Submodulos_en_Bienestar_Peso',
    'Impacto_Sinergias_Antagonismos_Bienestar_Peso',
    'Punto_Inflexion_SA_Biodiversidad',
    'Punto_Inflexion_SE_Biodiversidad',
    'Punto_Inflexion_BS_Biodiversidad',
    'Punto_Inflexion_BS_SA',
    'Punto_Inflexion_BS_SE',
    'Capacidad_Maxima_SA_Impacto_Biodiversidad',
    'Capacidad_Maxima_SA_Impacto_SE',
    'Capacidad_Maxima_BS_Impacto_Biodiversidad',
    'Capacidad_Maxima_BS_Impacto_SA',
    'Capacidad_Maxima_BS_Impacto_SE',
    'Duracion_Efecto_Al', 
    'Duracion_Efecto_CBN', 
    'Duracion_Efecto_CN',
    'Duracion_Efecto_EA', 
    'Duracion_Efecto_GRH', 
    'Duracion_Efecto_GS',
    'Duracion_Efecto_IE', 
    'Duracion_Efecto_NAF', 
    'Duracion_Efecto_PA',
    'Duracion_Efecto_SE',
]);


// Main Component
interface EquationsManualProps {
  onClose: () => void;
  gameState: GameState;
}

const EquationsManual: React.FC<EquationsManualProps> = ({ onClose, gameState }) => {
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
      setError('Contraseña incorrecta.');
      setPassword('');
    }
  };

  const controlParamsData = useMemo(() => {
    return Object.entries(CONTROL_PARAMS)
      .filter(([key]) => !OBSOLETE_PARAMS.has(key))
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
      <h2 className="text-2xl font-bold text-custom-accent mb-4">Manual de Ecuaciones y Parámetros</h2>
      <p className="text-gray-400 mb-6">Esta sección contiene la lógica interna de la simulación. Se requiere contraseña.</p>
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
          Verificar
        </button>
        {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
      </form>
    </div>
  );
  
  const manualContent = (
    <>
        <div className="flex justify-between items-start mb-4 border-b border-slate-700 pb-4">
          <div>
            <h2 id="manual-title" className="text-2xl sm:text-3xl font-bold text-custom-accent">Manual de Ecuaciones</h2>
            <p className="text-xs text-gray-400">Datos y Lógica de la Simulación DecarboNation (Valores en vivo para Año: <LiveValue>{gameState.year}</LiveValue>)</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none" aria-label="Cerrar manual">&times;</button>
        </div>

        <div className="overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 pr-4">
            
            <SectionTitle tooltipText={DESCRIPTIONS.TITLE_CONTROL_PARAMS}>Parámetros de Control Global</SectionTitle>
            <input
                type="text"
                placeholder="Filtrar parámetros..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="w-full p-2 mb-3 bg-gray-800 border border-gray-600 rounded-md placeholder-gray-500"
            />
            <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 text-xs">
                <table className="w-full text-left">
                    <thead className="sticky top-0 bg-gray-900">
                        <tr>
                            <Th tooltipText={DESCRIPTIONS.PARAM_TABLE_HEADER_KEY}>Parámetro</Th>
                            <Th tooltipText={DESCRIPTIONS.PARAM_TABLE_HEADER_VALUE}>Valor</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {controlParamsData.map((item, index) => (
                            <tr key={index} className="border-t border-gray-700 hover:bg-gray-800/50">
                                <td className="p-2">
                                    <Tooltip position="top-right" text={DESCRIPTIONS[item.key] || 'Sin descripción.'}>
                                        <Param>{item.key}</Param>
                                    </Tooltip>
                                </td>
                                <td className="p-2">{item.value}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <SectionTitle tooltipText={DESCRIPTIONS.TITLE_POLICIES}>Definiciones de Políticas</SectionTitle>
            <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 text-xs">
                <table className="w-full text-left">
                    <thead className="sticky top-0 bg-gray-900">
                        <tr>
                            <Th tooltipText={DESCRIPTIONS.POLICY_TABLE_HEADER_NAME}>Política</Th>
                            <Th tooltipText={DESCRIPTIONS.POLICY_TABLE_HEADER_COST}>Costo</Th>
                            <Th tooltipText={DESCRIPTIONS.POLICY_TABLE_HEADER_DECAY}>Decaimiento (Años)</Th>
                            <Th tooltipText={DESCRIPTIONS.POLICY_TABLE_HEADER_EFFICIENCY_LIVE}>Eficiencia (Vivo)</Th>
                            <Th tooltipText={DESCRIPTIONS.POLICY_TABLE_HEADER_EFFORT_LIVE}>Esfuerzo (Vivo)</Th>
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
            
            <SectionTitle tooltipText={DESCRIPTIONS.TITLE_LAND_USE}>Definiciones de Uso de Suelo</SectionTitle>
             <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 text-xs">
                <table className="w-full text-left">
                    <thead className="sticky top-0 bg-gray-900">
                        <tr>
                            <Th tooltipText={DESCRIPTIONS.LAND_USE_TABLE_HEADER_NAME}>Uso de Suelo</Th>
                            <Th tooltipText={DESCRIPTIONS.LAND_USE_TABLE_HEADER_EMISSION}>Emisión</Th>
                            <Th tooltipText={DESCRIPTIONS.LAND_USE_TABLE_HEADER_SEQUESTRATION}>Secuestro</Th>
                            <Th tooltipText={DESCRIPTIONS.LAND_USE_TABLE_HEADER_AREA_LIVE}>Área (Viva)</Th>
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

            <SectionTitle tooltipText={DESCRIPTIONS.TITLE_EQUATIONS}>Ecuaciones Fundamentales</SectionTitle>
            
            <SubSectionTitle tooltipText={DESCRIPTIONS.EQUATION_TITLE_POLICY_EFFICIENCY}>Eficiencia de Política</SubSectionTitle>
            <p className="text-sm mb-2">La efectividad de una política no es estática; disminuye con el tiempo a medida que el sistema se adapta o surgen nuevas barreras. Esta 'entropía' se modela con un decaimiento exponencial.</p>
            <Formula>Eficiencia = <Param>EficienciaInicial</Param> * e^(-<Param>TiempoActivacion</Param> / <Param>DuracionEfecto</Param>) * <Param>FactorPresionGeneral</Param></Formula>
            <p className="text-sm">Si Nivel &ge; 2, la eficiencia anterior se multiplica por el factor (<Code>EsfuerzoTotalInstrumentos / 100</Code>), permitiendo al jugador 'reinvertir' en una política para mantener su relevancia.</p>
            
            <SubSectionTitle tooltipText={DESCRIPTIONS.EQUATION_TITLE_CARBON_BALANCE}>Balance de Carbono</SubSectionTitle>
            <p className="text-sm mb-2">Esta es la contabilidad climática de la nación. El objetivo final es hacer que el secuestro supere a las emisiones.</p>
            <Formula>BalanceNetoAnual = (Σ (<Param>AreaUso</Param> * <Param>TasaSecuestro</Param>)) - (Σ (<Param>AreaUso</Param> * <Param>TasaEmision</Param>))</Formula>
            <p className="text-sm">El resultado se ajusta por sinergias (ej. <Code>Conservación</Code> + <Code>Carbono Neutralidad</Code>) y antagonismos (<Code>Subsidios Energéticos</Code> vs <Code>Carbono Neutralidad</Code>) y efectos directos de instrumentos de política (Nivel 2+).</p>

            <SubSectionTitle tooltipText={DESCRIPTIONS.EQUATION_TITLE_INDICATORS}>Cálculo de Indicadores (Ej. Biodiversidad)</SubSectionTitle>
             <p className="text-sm mb-2">Los indicadores socio-ambientales son el resultado de la compleja interacción entre las decisiones políticas y el estado del territorio.</p>
            <Formula>ΔBiodiversidad = (Σ(<Param>Efic. Política</Param> * <Param>Peso</Param>)) * <Param>Factor_P</Param> + (Σ(<Param>% AreaUso</Param> * <Param>Peso</Param>)) * <Param>Factor_U</Param></Formula>
            <p className="text-sm">El cambio anual en cada indicador (Biodiversidad, Seg. Alimentaria, etc.) es una suma ponderada del impacto de las políticas activas (positivas o negativas) y de la distribución actual del uso del suelo. Algunos indicadores también se afectan entre sí.</p>
            
            <SubSectionTitle tooltipText={DESCRIPTIONS.EQUATION_TITLE_POLITICAL_PRESSURE}>Presión Política (Nivel 2+)</SubSectionTitle>
            <p className="text-sm mb-2">Simula el comportamiento de grupos de interés. La presión no cambia linealmente; crece o decrece lentamente al principio, se acelera, y luego se satura cerca de los extremos, imitando fenómenos sociales reales.</p>
            <Formula>Impulso = (Σ <Param>Efectos de Políticas</Param>) + (Σ <Param>Efectos de Indicadores</Param>)
FuerzaNormalización = (<Param>PuntoEquilibrio</Param> - <Param>PresiónActual</Param>) * <Param>TasaNormalización</Param>
ΔPresión = (<Param>Impulso</Param> + <Param>FuerzaNormalización</Param>) * f(<Param>PresiónActual</Param>)</Formula>
            <p className="text-sm">La función <Code>f()</Code> modera el cambio, haciéndolo más lento cerca de los extremos 0 y 100. Esto evita cambios abruptos y crea una dinámica de 'inercia' social.</p>

            <SubSectionTitle tooltipText={DESCRIPTIONS.EQUATION_TITLE_ECONOMY}>Economía</SubSectionTitle>
            <p className="text-sm mb-2">Modela la salud financiera de la nación, que es crucial para poder financiar políticas y mantener la estabilidad.</p>
            <Formula>ΔPBI = <Param>PBI_Actual</Param> * (<Param>TasaBase</Param> + Σ(<Param>Efectos Políticas</Param>))
ΔReservas = <Param>Ingresos</Param> - <Param>Egresos</Param></Formula>
            <p className="text-sm"><Code>Ingresos</Code> = Impuestos sobre PBI (con tasa base + tasa adicional en N3) + Préstamos solicitados.</p>
            <p className="text-sm"><Code>Egresos</Code> = Costos de Políticas (basado en su <Code>costFactor</Code> y PBI) + Costos Anuales de Pactos + Pago Intereses Deuda + Pago de Capital de la Deuda.</p>

            <SubSectionTitle tooltipText={DESCRIPTIONS.EQUATION_TITLE_STABILITY_CONFLICT}>Estabilidad y Conflicto</SubSectionTitle>
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
