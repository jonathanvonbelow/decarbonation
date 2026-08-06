
import React, { useState } from 'react';
import { GameState, Policy, LandUseType, LandUse, LevelConfig, Pact, PolicyState, HistoricalDataPoint, InstrumentImpactHints } from '../types';
import PolicyToggle from './PolicyToggle';
import { POLICY_UI_ORDER, SIMULATION_YEARS_PER_ROUND, CONTROL_PARAMS, MAX_ACTIVE_POLICIES, POLICY_LOCK_IN_DURATION } from '../constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Text, LineChart, XAxis, YAxis, CartesianGrid, Legend, Line, ReferenceLine } from 'recharts';
import RegionalStatusDashboard from './levelSpecific/RegionalStatusDashboard';
import InnovationGlobalDashboard from './levelSpecific/InnovationGlobalDashboard';
import Tooltip from './common/Tooltip';
import PolicyInstrumentsPanel from './PolicyInstrumentsPanel';
import EventsNewsPanel from './levelSpecific/EventsNewsPanel';
import { useLanguageContext } from '../contexts/LanguageContext';
import { getLandUseName } from '../legacyContent/gameData';

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

const IndicatorCard: React.FC<{ title: string; value: string | number; color?: string; unit?: string; tooltip?: string; isWinCondition?: boolean; winLabel?: string }> = ({ title, value, color = 'text-custom-accent', unit = '', tooltip, isWinCondition, winLabel = '⭐' }) => {
  const cardContent = (
    <div className="bg-gray-700 p-3 rounded-lg shadow-md text-center h-full flex flex-col justify-center relative">
      {isWinCondition && (
        <Tooltip text={winLabel}>
          <span className="absolute top-1 right-1 text-yellow-400 text-lg" aria-label={winLabel}>⭐</span>
        </Tooltip>
      )}
      <h4 className="text-xs sm:text-sm text-gray-400 font-semibold">{title}</h4>
      <p className={`text-xl sm:text-2xl font-bold ${color}`}>{typeof value === 'number' ? value.toFixed(2) : value}{unit}</p>
    </div>
  );
  return tooltip ? (
    <Tooltip text={tooltip} position="top">
      <div className="h-full w-full cursor-help">{cardContent}</div>
    </Tooltip>
  ) : cardContent;
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, percent, name, value }: any) => {
  const radius = outerRadius + 20;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const textAnchor = x > cx ? 'start' : 'end';
  const displayName = name.length > 30 ? name.substring(0, 27) + '...' : name;
  if (value === 0 || percent < 0.03) return null;
  return (
    <text x={x} y={y} fill="#A0AEC0" textAnchor={textAnchor} dominantBaseline="central" fontSize="10px">
      {`${displayName} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};

const LandUseDistributionChart: React.FC<{ landUses: GameState['landUses'] }> = ({ landUses }) => {
  const { language } = useLanguageContext();
  const T = {
    es: { title: 'Distribución de Uso del Suelo (kHa)', tooltip: 'Muestra cómo se divide el territorio nacional entre diferentes usos (bosques, cultivos, pasturas, etc.). Cada uso tiene un impacto distinto en el carbono y la biodiversidad.', noData: 'No hay datos de uso de suelo para mostrar.' },
    en: { title: 'Land Use Distribution (kHa)', tooltip: 'Shows how national territory is divided among different uses (forests, crops, pastures, etc.). Each use has a distinct impact on carbon and biodiversity.', noData: 'No land use data to display.' },
  } as const;
  const t = T[language];

  const data = (Object.entries(landUses) as [string, LandUse][]).map(([key, value]) => ({
    name: getLandUseName(key, language),
    area: parseFloat(value.area.toFixed(1)),
  })).filter(d => d.area > 0);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#A4DE6C', '#D0ED57', '#FFC658'];

  if (data.length === 0) {
    return (
      <div className="bg-custom-light-gray p-4 rounded-lg shadow-xl flex items-center justify-center h-full">
        <p className="text-gray-400">{t.noData}</p>
      </div>
    );
  }

  return (
    <div className="bg-custom-light-gray p-4 rounded-lg shadow-xl">
      <Tooltip text={t.tooltip}>
        <h3 className="text-lg font-semibold mb-2 text-custom-accent inline-block cursor-help">{t.title}</h3>
      </Tooltip>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <Pie data={data} cx="50%" cy="50%" outerRadius={60} fill="#8884d8" dataKey="area" nameKey="name" label={false}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Legend
            layout="vertical" align="right" verticalAlign="middle"
            formatter={(value, entry: any) => (
              <span className="text-xs text-gray-300">
                {value}: {entry.payload?.percent !== undefined ? `${(entry.payload.percent * 100).toFixed(1)}%` : ''}
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

const HistoricalCharts: React.FC<{ historicalData: HistoricalDataPoint[]; currentLevel: number; levelConfig?: LevelConfig }> = ({ historicalData, currentLevel, levelConfig }) => {
  const { language } = useLanguageContext();
  const T = {
    es: {
      title: 'Tendencias Históricas', noData: 'Simula al menos un año para ver las tendencias.',
      sustainability: 'Indicadores de Sostenibilidad', climateScore: 'Clima y Puntaje', pressure: 'Tendencia de Presiones Políticas',
      biodiversity: 'Biodiversidad', foodSec: 'Seg. Alimentaria', econSec: 'Seg. Económica',
      socialWell: 'Bienestar Social', polStab: 'Estab. Política',
      co2: 'CO2eq/cápita', score: 'Puntaje',
      ppAgr: 'Presión Agrícola', ppEnv: 'Presión Ambientalista', ppSoc: 'Presión Social',
      minThreshold: 'Umbral mínimo', maxThreshold: 'Umbral máximo',
    },
    en: {
      title: 'Historical Trends', noData: 'Simulate at least one year to see trends.',
      sustainability: 'Sustainability Indicators', climateScore: 'Climate & Score', pressure: 'Political Pressure Trends',
      biodiversity: 'Biodiversity', foodSec: 'Food Security', econSec: 'Econ. Security',
      socialWell: 'Social Wellbeing', polStab: 'Pol. Stability',
      co2: 'CO2eq/capita', score: 'Score',
      ppAgr: 'Agricultural Pressure', ppEnv: 'Environmental Pressure', ppSoc: 'Social Pressure',
      minThreshold: 'Minimum threshold', maxThreshold: 'Maximum threshold',
    },
  } as const;
  const t = T[language];
  const winConditions = levelConfig?.winConditions;
  const THRESHOLD_COLOR = '#94A3B8';

  if (historicalData.length < 2) {
    return (
      <div className="bg-custom-light-gray p-6 rounded-lg shadow-xl mt-6">
        <h3 className="text-xl font-semibold mb-2 text-custom-accent">{t.title}</h3>
        <p className="text-gray-400">{t.noData}</p>
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
      <h3 className="text-xl font-semibold mb-4 text-custom-accent">{t.title}</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h4 className="text-lg font-semibold text-blue-300 mb-2">{t.sustainability}</h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={historicalData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
              <XAxis dataKey="year" stroke="#A0AEC0" />
              <YAxis stroke="#A0AEC0" domain={[0, 100]} tickFormatter={(tick) => `${tick}%`} />
              <RechartsTooltip formatter={(value: number) => [typeof value === 'number' ? value.toFixed(1) : value]} contentStyle={{ backgroundColor: '#2D3748', border: '1px solid #4A5568' }} />
              <Legend />
              <Line type="monotone" dataKey="biodiversity" name={t.biodiversity} stroke="#48BB78" dot={false} />
              {currentLevel >= 2 && <Line type="monotone" dataKey="foodSecurity" name={t.foodSec} stroke="#F6E05E" dot={false} />}
              {currentLevel >= 2 && <Line type="monotone" dataKey="economicSecurity" name={t.econSec} stroke="#4299E1" dot={false} />}
              {currentLevel >= 2 && <Line type="monotone" dataKey="socialWellbeing" name={t.socialWell} stroke="#ED64A6" dot={false} />}
              {currentLevel >= 2 && <Line type="monotone" dataKey="politicalStability" name={t.polStab} stroke="#A0AEC0" dot={false} />}
              {winConditions?.biodiversityMin !== undefined && (
                <ReferenceLine y={winConditions.biodiversityMin} stroke={THRESHOLD_COLOR} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `${t.biodiversity}: ${t.minThreshold}`, position: 'insideBottomLeft', fill: THRESHOLD_COLOR, fontSize: 9 }} />
              )}
              {currentLevel >= 2 && winConditions?.foodSecurityMin !== undefined && (
                <ReferenceLine y={winConditions.foodSecurityMin} stroke={THRESHOLD_COLOR} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `${t.foodSec}: ${t.minThreshold}`, position: 'insideTopLeft', fill: THRESHOLD_COLOR, fontSize: 9 }} />
              )}
              {currentLevel >= 2 && winConditions?.economicSecurityMin !== undefined && (
                <ReferenceLine y={winConditions.economicSecurityMin} stroke={THRESHOLD_COLOR} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `${t.econSec}: ${t.minThreshold}`, position: 'insideBottomLeft', fill: THRESHOLD_COLOR, fontSize: 9 }} />
              )}
              {currentLevel >= 2 && winConditions?.bienestarSocialMin !== undefined && (
                <ReferenceLine y={winConditions.bienestarSocialMin} stroke={THRESHOLD_COLOR} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `${t.socialWell}: ${t.minThreshold}`, position: 'insideTopLeft', fill: THRESHOLD_COLOR, fontSize: 9 }} />
              )}
              {currentLevel >= 2 && winConditions?.politicalStabilityMin !== undefined && (
                <ReferenceLine y={winConditions.politicalStabilityMin} stroke={THRESHOLD_COLOR} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `${t.polStab}: ${t.minThreshold}`, position: 'insideBottomLeft', fill: THRESHOLD_COLOR, fontSize: 9 }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div>
          <h4 className="text-lg font-semibold text-blue-300 mb-2">{t.climateScore}</h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={historicalData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
              <XAxis dataKey="year" stroke="#A0AEC0" />
              <YAxis yAxisId="left" stroke="#FC8181" label={{ value: t.co2, angle: -90, position: 'insideLeft', fill: '#FC8181' }} />
              <YAxis yAxisId="right" orientation="right" stroke="#63B3ED" domain={[0, 1000]} label={{ value: t.score, angle: 90, position: 'insideRight', fill: '#63B3ED' }} />
              <RechartsTooltip formatter={(value: number) => [typeof value === 'number' ? value.toFixed(1) : value]} contentStyle={{ backgroundColor: '#2D3748', border: '1px solid #4A5568' }} />
              <Legend />
              <Line type="monotone" yAxisId="left" dataKey="co2EqEmissionsPerCapita" name={t.co2} stroke="#FC8181" dot={false} />
              <Line type="monotone" yAxisId="right" dataKey="generalScore" name={t.score} stroke="#63B3ED" dot={false} />
              {winConditions?.co2EqEmissionsPerCapitaMax !== undefined && (
                <ReferenceLine yAxisId="left" y={winConditions.co2EqEmissionsPerCapitaMax} stroke={THRESHOLD_COLOR} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `${t.co2}: ${t.maxThreshold}`, position: 'insideBottomLeft', fill: THRESHOLD_COLOR, fontSize: 9 }} />
              )}
              {winConditions?.puntajeGeneralMin !== undefined && (
                <ReferenceLine yAxisId="right" y={winConditions.puntajeGeneralMin} stroke={THRESHOLD_COLOR} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `${t.score}: ${t.minThreshold}`, position: 'insideTopRight', fill: THRESHOLD_COLOR, fontSize: 9 }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      {currentLevel >= 2 && (
        <div className="mt-8">
          <h4 className="text-lg font-semibold text-blue-300 mb-2 text-center">{t.pressure}</h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={historicalData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
              <XAxis dataKey="year" stroke="#A0AEC0" />
              <YAxis stroke="#A0AEC0" domain={[0, 100]} tickFormatter={(tick) => `${tick}%`} />
              <RechartsTooltip formatter={(value: number) => [typeof value === 'number' ? value.toFixed(1) : value]} contentStyle={{ backgroundColor: '#2D3748', border: '1px solid #4A5568' }} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line type="monotone" dataKey="ppAgricola" name={t.ppAgr} stroke="#F6E05E" dot={false} />
              <Line type="monotone" dataKey="ppAmbientalista" name={t.ppEnv} stroke="#48BB78" dot={false} />
              <Line type="monotone" dataKey="ppSocial" name={t.ppSoc} stroke="#ED64A6" dot={false} />
              {winConditions?.ppAgricolaMax !== undefined && (
                <ReferenceLine y={winConditions.ppAgricolaMax} stroke={THRESHOLD_COLOR} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `${t.ppAgr}: ${t.maxThreshold}`, position: 'insideTopLeft', fill: THRESHOLD_COLOR, fontSize: 9 }} />
              )}
              {winConditions?.ppAmbientalistaMax !== undefined && (
                <ReferenceLine y={winConditions.ppAmbientalistaMax} stroke={THRESHOLD_COLOR} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `${t.ppEnv}: ${t.maxThreshold}`, position: 'insideBottomLeft', fill: THRESHOLD_COLOR, fontSize: 9 }} />
              )}
              {winConditions?.ppSocialMax !== undefined && (
                <ReferenceLine y={winConditions.ppSocialMax} stroke={THRESHOLD_COLOR} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `${t.ppSoc}: ${t.maxThreshold}`, position: 'insideTopRight', fill: THRESHOLD_COLOR, fontSize: 9 }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({
  gameState, historicalData, togglePolicy, runSimulationRound, gameOver,
  levelConfig, requestLoan, togglePact, handleInstrumentEffortChange,
  handleAdditionalTaxPressureChange, instrumentImpactHints,
}) => {
  const { language } = useLanguageContext();
  const { indicators, policies, year, currentLevel, stellaSpecificState } = gameState;
  const activePolicies = Object.values(policies).filter((p: PolicyState) => p.isActive);

  const T = {
    es: {
      winStar: 'Este indicador es un objetivo clave para ganar el nivel actual.',
      biodiversity: 'Biodiversidad', biodiversityTip: 'Salud de los ecosistemas.',
      co2: 'CO2eq/cápita', co2Tip: 'Emisiones por persona. ¡Reducirlas es clave!',
      foodSec: 'Seg. Alimentaria', foodSecTip: 'Disponibilidad y acceso a alimentos.',
      econSec: 'Seg. Económica', econSecTip: 'Estabilidad económica y empleo.',
      socialWell: 'Bienestar Social', socialWellTip: 'Calidad de vida y cohesión social.',
      polStab: 'Estab. Política', polStabTip: 'Gobernabilidad y riesgo de colapso.',
      ppAgr: 'Presión Agrícola', ppAgrTip: 'Nivel de descontento del sector agrícola. Aumenta si su seguridad económica o alimentaria es baja.',
      ppEnv: 'Presión Ambientalista', ppEnvTip: 'Nivel de descontento de grupos ambientalistas. Aumenta si la biodiversidad es baja o las emisiones son altas.',
      ppSoc: 'Presión Social', ppSocTip: 'Nivel de descontento general de la población. Aumenta si el bienestar social es bajo.',
      pbi: 'PBI Real', pbiTip: 'Producto Bruto Interno, mide la actividad económica.',
      debt: 'Deuda', debtTip: (r:string) => `Deuda total de la nación. Ratio Deuda/PBI: ${r}`,
      reserves: 'Reservas Tesoro', reservesTip: 'Fondos disponibles del gobierno.',
      policyPanel: 'Panel de Políticas',
      activePolicies: (a:number,m:number) => `Activas: ${a} / ${m}`,
      policyPanelTip: (m:number,d:number) => `Puedes activar hasta ${m} políticas simultáneamente. Una vez activada, una política se bloquea por ${d} años.`,
      simulate: (y:number) => `Simular Próximo Año (${y})`,
      simulating: 'Simulando...',
    },
    en: {
      winStar: 'This indicator is a key objective to win the current level.',
      biodiversity: 'Biodiversity', biodiversityTip: 'Ecosystem health.',
      co2: 'CO2eq/capita', co2Tip: 'Emissions per person. Reducing them is key!',
      foodSec: 'Food Security', foodSecTip: 'Food availability and access.',
      econSec: 'Econ. Security', econSecTip: 'Economic stability and employment.',
      socialWell: 'Social Wellbeing', socialWellTip: 'Quality of life and social cohesion.',
      polStab: 'Pol. Stability', polStabTip: 'Governance and collapse risk.',
      ppAgr: 'Agricultural Pressure', ppAgrTip: 'Agricultural sector discontent. Increases if their economic or food security is low.',
      ppEnv: 'Environmental Pressure', ppEnvTip: 'Environmental group discontent. Increases if biodiversity is low or emissions are high.',
      ppSoc: 'Social Pressure', ppSocTip: 'General population discontent. Increases if social wellbeing is low.',
      pbi: 'Real GDP', pbiTip: 'Gross Domestic Product, measures economic activity.',
      debt: 'Debt', debtTip: (r:string) => `Total national debt. Debt/GDP ratio: ${r}`,
      reserves: 'Treasury Reserves', reservesTip: 'Available government funds.',
      policyPanel: 'Policy Panel',
      activePolicies: (a:number,m:number) => `Active: ${a} / ${m}`,
      policyPanelTip: (m:number,d:number) => `You can activate up to ${m} policies simultaneously. Once activated, a policy is locked for ${d} years.`,
      simulate: (y:number) => `Simulate Next Year (${y})`,
      simulating: 'Simulating...',
    },
  } as const;
  const t = T[language];

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
        <IndicatorCard title={t.biodiversity} value={indicators.biodiversity.toFixed(1)} unit="%" color={getIndicatorColor(indicators.biodiversity)} isWinCondition={isWinCondition('biodiversity')} tooltip={t.biodiversityTip} winLabel={t.winStar} />
        <IndicatorCard title={t.co2} value={indicators.co2EqEmissionsPerCapita.toFixed(2)} unit=" t" color={indicators.co2EqEmissionsPerCapita > 8 ? 'text-red-400' : indicators.co2EqEmissionsPerCapita > 4 ? 'text-yellow-400' : 'text-green-400'} isWinCondition={isWinCondition('co2EqEmissionsPerCapita')} tooltip={t.co2Tip} winLabel={t.winStar} />

        {currentLevel >= 2 && (
          <>
            <IndicatorCard title={t.foodSec} value={indicators.foodSecurity.toFixed(1)} unit="%" color={getIndicatorColor(indicators.foodSecurity)} isWinCondition={isWinCondition('foodSecurity')} tooltip={t.foodSecTip} winLabel={t.winStar} />
            <IndicatorCard title={t.econSec} value={indicators.economicSecurity.toFixed(1)} unit="%" color={getIndicatorColor(indicators.economicSecurity)} isWinCondition={isWinCondition('economicSecurity')} tooltip={t.econSecTip} winLabel={t.winStar} />
            <IndicatorCard title={t.socialWell} value={indicators.socialWellbeing.toFixed(1)} unit="%" color={getIndicatorColor(indicators.socialWellbeing)} isWinCondition={isWinCondition('socialWellbeing')} tooltip={t.socialWellTip} winLabel={t.winStar} />
            <IndicatorCard title={t.polStab} value={indicators.politicalStability.toFixed(1)} unit="%" color={getIndicatorColor(indicators.politicalStability)} isWinCondition={isWinCondition('politicalStability')} tooltip={t.polStabTip} winLabel={t.winStar} />
            <IndicatorCard title={t.ppAgr} value={indicators.ppAgricola.toFixed(1)} unit="%" color={getIndicatorColor(indicators.ppAgricola, true, 45, 65)} isWinCondition={isWinCondition('ppAgricola')} tooltip={t.ppAgrTip} winLabel={t.winStar} />
            <IndicatorCard title={t.ppEnv} value={indicators.ppAmbientalista.toFixed(1)} unit="%" color={getIndicatorColor(indicators.ppAmbientalista, true, 45, 65)} isWinCondition={isWinCondition('ppAmbientalista')} tooltip={t.ppEnvTip} winLabel={t.winStar} />
            <IndicatorCard title={t.ppSoc} value={indicators.ppSocial.toFixed(1)} unit="%" color={getIndicatorColor(indicators.ppSocial, true, 45, 65)} isWinCondition={isWinCondition('ppSocial')} tooltip={t.ppSocTip} winLabel={t.winStar} />
          </>
        )}
        {currentLevel >= 3 && (
          <>
            <IndicatorCard title={t.pbi} value={indicators.pbi.toFixed(0)} color={indicators.pbi > 14000 ? 'text-green-400' : indicators.pbi > 11000 ? 'text-yellow-400' : 'text-red-400'} isWinCondition={isWinCondition('pbi')} tooltip={t.pbiTip} winLabel={t.winStar} />
            <IndicatorCard title={t.debt} value={indicators.debt.toFixed(0)} color={debtRatio > 0.8 ? 'text-red-400' : debtRatio > 0.5 ? 'text-yellow-400' : 'text-green-400'} isWinCondition={isWinCondition('deudaPbi')} tooltip={t.debtTip(debtRatio.toFixed(2))} winLabel={t.winStar} />
            <IndicatorCard title={t.reserves} value={indicators.treasuryReserves.toFixed(0)} color={indicators.treasuryReserves < 0 ? 'text-red-400' : reservesRatio < 0.05 ? 'text-yellow-400' : 'text-green-400'} tooltip={t.reservesTip} winLabel={t.winStar} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LandUseDistributionChart landUses={gameState.landUses} />
        {gameState.currentLevel === 3 && <EventsNewsPanel currentEvent={gameState.currentEvent} newsHeadlines={gameState.newsHeadlines} gameState={gameState} />}
      </div>

      <div className="bg-custom-light-gray p-6 rounded-lg shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
          <h3 className="text-xl font-semibold text-custom-accent">{t.policyPanel}</h3>
          <Tooltip text={t.policyPanelTip(MAX_ACTIVE_POLICIES, POLICY_LOCK_IN_DURATION)}>
            <span className="text-sm text-gray-400 cursor-help bg-gray-700 px-3 py-1 rounded-full">
              {t.activePolicies(activePolicies.length, MAX_ACTIVE_POLICIES)}
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
          levelConfig={levelConfig} gameState={gameState}
          togglePact={togglePact} handleAdditionalTaxPressureChange={handleAdditionalTaxPressureChange}
          requestLoan={requestLoan}
        />
      )}

      <div className="mt-6 flex justify-center">
        <button
          onClick={runSimulationRound}
          disabled={gameState.isSimulating || gameOver}
          className="px-8 py-4 text-lg font-bold text-white bg-green-600 rounded-lg shadow-lg hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all transform hover:scale-105"
        >
          {gameState.isSimulating ? t.simulating : t.simulate(SIMULATION_YEARS_PER_ROUND)}
        </button>
      </div>

      <HistoricalCharts historicalData={historicalData} currentLevel={currentLevel} levelConfig={levelConfig} />
    </div>
  );
};
