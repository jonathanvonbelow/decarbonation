



import React, { useState } from 'react';
import { GameState, Policy, LandUseType, LevelConfig, Pact, PolicyState, HistoricalDataPoint, InstrumentImpactHints } from '../types';
import PolicyToggle from './PolicyToggle';
import { POLICY_UI_ORDER, SIMULATION_YEARS_PER_ROUND, CONTROL_PARAMS, MAX_ACTIVE_POLICIES, POLICY_LOCK_IN_DURATION } from '../constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Text, LineChart, XAxis, YAxis, CartesianGrid, Legend, Line } from 'recharts'; 
import RegionalStatusDashboard from './levelSpecific/RegionalStatusDashboard';
import InnovationGlobalDashboard from './levelSpecific/InnovationGlobalDashboard';
import Tooltip from './common/Tooltip'; 
import PolicyInstrumentsPanel from './PolicyInstrumentsPanel';
import EventsNewsPanel from './levelSpecific/EventsNewsPanel';


interface DashboardProps {
  gameState: GameState;
  historicalData: HistoricalDataPoint[];
  togglePolicy: (policyId: Policy) => void;
  runSimulationRound: () => void;
  gameOver: boolean;
  levelConfig?: LevelConfig;
  requestLoan: (amount: number) => void;
  togglePact: (pactId: string) => void;
  handleInstrumentEffortChange: (policyId: Policy, instrumentId: string, effort: number) => void;
  handleAdditionalTaxPressureChange: (newPressure: number) => void;
  instrumentImpactHints: InstrumentImpactHints;
}

const IndicatorCard: React.FC<{ title: string; value: string | number; color?: string; unit?: string; tooltip?: string; isWinCondition?: boolean }> = ({ title, value, color = 'text-custom-accent', unit = '', tooltip, isWinCondition }) => {
  const cardContent = (
    <div className="bg-gray-700 p-3 rounded-lg shadow-md text-center h-full flex flex-col justify-center relative">
       {isWinCondition && (
        <Tooltip text="Este indicador es un objetivo clave para ganar el nivel actual.">
          <span className="absolute top-1 right-1 text-yellow-400 text-lg" aria-label="Objetivo del Nivel">⭐</span>
        </Tooltip>
      )}
      <h4 className="text-xs sm:text-sm text-gray-400 font-semibold">{title}</h4>
      <p className={`text-xl sm:text-2xl font-bold ${color}`}>{typeof value === 'number' ? value.toFixed(2) : value}{unit}</p>
    </div>
  );

  return tooltip ? (
    <Tooltip text={tooltip} position="top">
      {/* The div wrapper ensures Tooltip's child takes up space for hover and Tooltip applies its own styling */}
      <div className="h-full w-full cursor-help"> 
        {cardContent}
      </div>
    </Tooltip>
  ) : (
    cardContent
  );
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, percent, name, value }: any) => {
  const radius = outerRadius + 20; // How far out the labels are
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const textAnchor = x > cx ? 'start' : 'end';

  const displayName = name.length > 30 ? name.substring(0, 27) + '...' : name; // Adjusted length
  
  if (value === 0 || percent < 0.03) return null; // Don't label tiny slices

  return (
    <text
      x={x}
      y={y}
      fill="#A0AEC0" // Tailwind gray-400
      textAnchor={textAnchor}
      dominantBaseline="central"
      fontSize="10px" 
    >
      {`${displayName} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};


const LandUseDistributionChart: React.FC<{ landUses: GameState['landUses'] }> = ({ landUses }) => {
  const data = Object.entries(landUses).map(([key, value]) => ({
    name: value.name, 
    area: parseFloat(value.area.toFixed(1)),
  })).filter(d => d.area > 0);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#A4DE6C', '#D0ED57', '#FFC658'];

  if (data.length === 0) {
    return (
      <div className="bg-custom-light-gray p-4 rounded-lg shadow-xl flex items-center justify-center h-full">
        <p className="text-gray-400">No hay datos de uso de suelo para mostrar.</p>
      </div>
    );
  }
  
  return (
    <div className="bg-custom-light-gray p-4 rounded-lg shadow-xl">
      <Tooltip text="Muestra cómo se divide el territorio nacional entre diferentes usos (bosques, cultivos, pasturas, etc.). Cada uso tiene un impacto distinto en el carbono y la biodiversidad.">
        <h3 className="text-lg font-semibold mb-2 text-custom-accent inline-block cursor-help">Distribución de Uso del Suelo (kHa)</h3>
      </Tooltip>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={60}
            fill="#8884d8"
            dataKey="area"
            nameKey="name"
            label={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            formatter={(value, entry: any) => (
              <span className="text-xs text-gray-300">
                {value}: {entry.payload?.percent !== undefined
                  ? `${(entry.payload.percent * 100).toFixed(1)}%`
                  : ''}
              </span>
            )}
          />
          <RechartsTooltip
            contentStyle={{ backgroundColor: '#2D3748', border: '1px solid #4A5568', borderRadius: '0.5rem' }}
            itemStyle={{ color: '#E2E8F0' }}
            formatter={(value: number, name: string) => [`${value.toFixed(1)} kHa`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

interface HistoricalChartsProps {
    historicalData: HistoricalDataPoint[];
    currentLevel: number;
}

const HistoricalCharts: React.FC<HistoricalChartsProps> = ({ historicalData, currentLevel }) => {
    if (historicalData.length < 2) {
        return (
            <div className="bg-custom-light-gray p-6 rounded-lg shadow-xl mt-6">
                <h3 className="text-xl font-semibold mb-2 text-custom-accent">Tendencias Históricas</h3>
                <p className="text-gray-400">Simula al menos un año para ver las tendencias.</p>
            </div>
        );
    }

    const formatYAxisNumber = (value: number) => {
        if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
        if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
        return value.toFixed(0);
    };

    return (
        <div className="bg-custom-light-gray p-6 rounded-lg shadow-xl mt-6">
            <h3 className="text-xl font-semibold mb-4 text-custom-accent">Tendencias Históricas</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sostenibilidad Chart */}
                <div>
                    <h4 className="text-lg font-semibold text-blue-300 mb-2">Indicadores de Sostenibilidad</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={historicalData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                            <XAxis dataKey="year" stroke="#A0AEC0" />
                            <YAxis stroke="#A0AEC0" domain={[0, 100]} tickFormatter={(tick) => `${tick}%`} />
                            <RechartsTooltip
                              formatter={(value: number) => [typeof value === 'number' ? value.toFixed(1) : value]}
                              contentStyle={{ backgroundColor: '#2D3748', border: '1px solid #4A5568' }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="biodiversity" name="Biodiversidad" stroke="#48BB78" dot={false} />
                            {currentLevel >= 2 && <Line type="monotone" dataKey="foodSecurity" name="Seg. Alimentaria" stroke="#F6E05E" dot={false} />}
                            {currentLevel >= 2 && <Line type="monotone" dataKey="economicSecurity" name="Seg. Económica" stroke="#4299E1" dot={false} />}
                            {currentLevel >= 2 && <Line type="monotone" dataKey="socialWellbeing" name="Bienestar Social" stroke="#ED64A6" dot={false} />}
                            {currentLevel >= 2 && <Line type="monotone" dataKey="politicalStability" name="Estab. Política" stroke="#A0AEC0" dot={false} />}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                {/* Clima y Puntaje Chart */}
                <div>
                    <h4 className="text-lg font-semibold text-blue-300 mb-2">Clima y Puntaje</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={historicalData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                            <XAxis dataKey="year" stroke="#A0AEC0" />
                            <YAxis yAxisId="left" stroke="#FC8181" label={{ value: 'CO2eq/cápita', angle: -90, position: 'insideLeft', fill: '#FC8181' }} />
                            <YAxis yAxisId="right" orientation="right" stroke="#63B3ED" domain={[0, 1000]} label={{ value: 'Puntaje', angle: 90, position: 'insideRight', fill: '#63B3ED' }} />
                            <RechartsTooltip
                              formatter={(value: number) => [typeof value === 'number' ? value.toFixed(1) : value]}
                              contentStyle={{ backgroundColor: '#2D3748', border: '1px solid #4A5568' }}
                            />
                            <Legend />
                            <Line type="monotone" yAxisId="left" dataKey="co2EqEmissionsPerCapita" name="CO2eq/cápita" stroke="#FC8181" dot={false} />
                            <Line type="monotone" yAxisId="right" dataKey="generalScore" name="Puntaje" stroke="#63B3ED" dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
            {currentLevel >= 2 && (
            <div className="mt-8">
                <h4 className="text-lg font-semibold text-blue-300 mb-2 text-center">Tendencia de Presiones Políticas</h4>
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={historicalData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                        <XAxis dataKey="year" stroke="#A0AEC0" />
                        <YAxis stroke="#A0AEC0" domain={[0, 100]} tickFormatter={(tick) => `${tick}%`} />
                        <RechartsTooltip
                          formatter={(value: number) => [typeof value === 'number' ? value.toFixed(1) : value]}
                          contentStyle={{ backgroundColor: '#2D3748', border: '1px solid #4A5568' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Line type="monotone" dataKey="ppAgricola" name="Presión Agrícola" stroke="#F6E05E" dot={false} />
                        <Line type="monotone" dataKey="ppAmbientalista" name="Presión Ambientalista" stroke="#48BB78" dot={false} />
                        <Line type="monotone" dataKey="ppSocial" name="Presión Social" stroke="#ED64A6" dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            )}
        </div>
    );
};

export const Dashboard: React.FC<DashboardProps> = ({
  gameState,
  historicalData,
  togglePolicy,
  runSimulationRound,
  gameOver,
  levelConfig,
  requestLoan,
  togglePact,
  handleInstrumentEffortChange,
  handleAdditionalTaxPressureChange,
  instrumentImpactHints,
}) => {
  const { indicators, policies, year, currentLevel, stellaSpecificState } = gameState;

  // FIX: Added explicit type annotation to fix 'unknown' type error on 'p' in filter.
  const activePolicies = Object.values(policies).filter((p: PolicyState) => p.isActive);

  const isWinCondition = (indicatorKey: string): boolean => {
    if (!levelConfig || !levelConfig.winConditions) return false;
    const conditions = levelConfig.winConditions;
    const keyMin = `${indicatorKey}Min` as keyof typeof conditions;
    const keyMax = `${indicatorKey}Max` as keyof typeof conditions;
    const keyPercentageMin = `${indicatorKey}MinPercentage` as keyof typeof conditions;
    
    return conditions[keyMin] !== undefined || conditions[keyMax] !== undefined || conditions[keyPercentageMin] !== undefined;
  };

  const getIndicatorColor = (value: number, isInverse: boolean = false, low: number = 40, mid: number = 65): string => {
    if (isInverse) {
      if (value > mid) return 'text-red-400';
      if (value > low) return 'text-yellow-400';
      return 'text-green-400';
    } else {
      if (value < low) return 'text-red-400';
      if (value < mid) return 'text-yellow-400';
      return 'text-green-400';
    }
  };

  const debtRatio = stellaSpecificState.PBI_Real > 0 ? indicators.debt / stellaSpecificState.PBI_Real : 0;
  const reservesRatio = stellaSpecificState.PBI_Real > 0 ? indicators.treasuryReserves / stellaSpecificState.PBI_Real : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <IndicatorCard title="Biodiversidad" value={indicators.biodiversity.toFixed(1)} unit="%" color={getIndicatorColor(indicators.biodiversity)} isWinCondition={isWinCondition('biodiversity')} tooltip="Salud de los ecosistemas." />
        <IndicatorCard title="CO2eq/cápita" value={indicators.co2EqEmissionsPerCapita.toFixed(2)} unit=" t" color={indicators.co2EqEmissionsPerCapita > 8 ? 'text-red-400' : indicators.co2EqEmissionsPerCapita > 4 ? 'text-yellow-400' : 'text-green-400'} isWinCondition={isWinCondition('co2EqEmissionsPerCapita')} tooltip="Emisiones por persona. ¡Reducirlas es clave!" />
        
        {currentLevel >= 2 && (
          <>
            <IndicatorCard title="Seg. Alimentaria" value={indicators.foodSecurity.toFixed(1)} unit="%" color={getIndicatorColor(indicators.foodSecurity)} isWinCondition={isWinCondition('foodSecurity')} tooltip="Disponibilidad y acceso a alimentos." />
            <IndicatorCard title="Seg. Económica" value={indicators.economicSecurity.toFixed(1)} unit="%" color={getIndicatorColor(indicators.economicSecurity)} isWinCondition={isWinCondition('economicSecurity')} tooltip="Estabilidad económica y empleo." />
            <IndicatorCard title="Bienestar Social" value={indicators.socialWellbeing.toFixed(1)} unit="%" color={getIndicatorColor(indicators.socialWellbeing)} isWinCondition={isWinCondition('socialWellbeing')} tooltip="Calidad de vida y cohesión social." />
            <IndicatorCard title="Estab. Política" value={indicators.politicalStability.toFixed(1)} unit="%" color={getIndicatorColor(indicators.politicalStability)} isWinCondition={isWinCondition('politicalStability')} tooltip="Gobernabilidad y riesgo de colapso." />
            <IndicatorCard 
                title="Presión Agrícola" 
                value={indicators.ppAgricola.toFixed(1)} 
                unit="%" 
                color={getIndicatorColor(indicators.ppAgricola, true, 45, 65)} 
                isWinCondition={isWinCondition('ppAgricola')} 
                tooltip="Nivel de descontento del sector agrícola. Aumenta si su seguridad económica o alimentaria es baja. Una presión alta puede llevar a inestabilidad." 
            />
            <IndicatorCard 
                title="Presión Ambientalista" 
                value={indicators.ppAmbientalista.toFixed(1)} 
                unit="%" 
                color={getIndicatorColor(indicators.ppAmbientalista, true, 45, 65)} 
                isWinCondition={isWinCondition('ppAmbientalista')} 
                tooltip="Nivel de descontento de grupos ambientalistas. Aumenta si la biodiversidad es baja o las emisiones son altas. Una presión alta puede llevar a inestabilidad." 
            />
            <IndicatorCard 
                title="Presión Social" 
                value={indicators.ppSocial.toFixed(1)} 
                unit="%" 
                color={getIndicatorColor(indicators.ppSocial, true, 45, 65)} 
                isWinCondition={isWinCondition('ppSocial')} 
                tooltip="Nivel de descontento general de la población. Aumenta si el bienestar social es bajo o por políticas impopulares. Una presión alta puede llevar a inestabilidad." 
            />
          </>
        )}
         {currentLevel >= 3 && (
          <>
             <IndicatorCard title="PBI Real" value={indicators.pbi.toFixed(0)} color={indicators.pbi > 14000 ? 'text-green-400' : indicators.pbi > 11000 ? 'text-yellow-400' : 'text-red-400'} isWinCondition={isWinCondition('pbi')} tooltip="Producto Bruto Interno, mide la actividad económica." />
             <IndicatorCard title="Deuda" value={indicators.debt.toFixed(0)} color={debtRatio > 0.8 ? 'text-red-400' : debtRatio > 0.5 ? 'text-yellow-400' : 'text-green-400'} isWinCondition={isWinCondition('deudaPbi')} tooltip={`Deuda total de la nación. Ratio Deuda/PBI: ${debtRatio.toFixed(2)}`} />
             <IndicatorCard title="Reservas Tesoro" value={indicators.treasuryReserves.toFixed(0)} color={indicators.treasuryReserves < 0 ? 'text-red-400' : reservesRatio < 0.05 ? 'text-yellow-400' : 'text-green-400'} tooltip="Fondos disponibles del gobierno." />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LandUseDistributionChart landUses={gameState.landUses} />
        {gameState.currentLevel === 3 && <EventsNewsPanel currentEvent={gameState.currentEvent} newsHeadlines={gameState.newsHeadlines} gameState={gameState} />}
      </div>
      
      <div className="bg-custom-light-gray p-6 rounded-lg shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
          <h3 className="text-xl font-semibold text-custom-accent">Panel de Políticas</h3>
          <Tooltip text={`Puedes activar hasta ${MAX_ACTIVE_POLICIES} políticas simultáneamente. Una vez activada, una política se bloquea por ${POLICY_LOCK_IN_DURATION} años.`}>
            <span className="text-sm text-gray-400 cursor-help bg-gray-700 px-3 py-1 rounded-full">
              Activas: {activePolicies.length} / {MAX_ACTIVE_POLICIES}
            </span>
          </Tooltip>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {POLICY_UI_ORDER.map(policyId => (
            <PolicyToggle
              key={policyId}
              policy={policies[policyId]}
              onToggle={() => togglePolicy(policyId)}
              currentYear={year}
              policyLockInDuration={POLICY_LOCK_IN_DURATION}
              currentLevel={currentLevel}
            />
          ))}
        </div>
      </div>
      
      {currentLevel >= 2 && activePolicies.length > 0 && (
          <PolicyInstrumentsPanel 
            activePolicies={activePolicies}
            currentLevel={currentLevel}
            handleInstrumentEffortChange={handleInstrumentEffortChange}
            disabled={gameState.isSimulating}
          />
      )}

      {currentLevel === 2 && levelConfig && <RegionalStatusDashboard levelConfig={levelConfig} gameState={gameState} />}
      {currentLevel === 3 && levelConfig && (
        <InnovationGlobalDashboard 
            levelConfig={levelConfig} 
            gameState={gameState} 
            togglePact={togglePact}
            handleAdditionalTaxPressureChange={handleAdditionalTaxPressureChange}
            requestLoan={requestLoan}
        />
      )}
      
      <div className="mt-6 flex justify-center">
        <button
          onClick={runSimulationRound}
          disabled={gameState.isSimulating || gameOver}
          className="px-8 py-4 text-lg font-bold text-white bg-green-600 rounded-lg shadow-lg hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all transform hover:scale-105"
        >
          {gameState.isSimulating ? 'Simulando...' : `Simular Próximo Año (${SIMULATION_YEARS_PER_ROUND})`}
        </button>
      </div>

      <HistoricalCharts historicalData={historicalData} currentLevel={currentLevel}/>
    </div>
  );
};