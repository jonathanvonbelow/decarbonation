import React, { useState } from 'react';
import { GameState, LevelConfig, Pact } from '../../types';
import Tooltip from '../common/Tooltip';
import { CONTROL_PARAMS } from '../../constants';
import { useLanguageContext } from '../../contexts/LanguageContext';
import { getPactName, INNOVATION_DATA_NAMES } from '../../legacyContent/gameData';

interface InnovationGlobalDashboardProps {
  levelConfig: LevelConfig;
  gameState: GameState;
  togglePact: (pactId: string) => void;
  handleAdditionalTaxPressureChange: (newPressure: number) => void;
  requestLoan: (amount: number) => void;
}

const T = {
  es: {
    title: 'Innovación e Integración Global',
    subtitle: 'Impulse el desarrollo sostenible mediante avances tecnológicos y cooperación internacional.',
    techAdvance: 'Avance Tecnológico',
    pacts: (n: number) => `Pactos Internacionales (${n} Activos)`,
    noPacts: 'No hay pactos internacionales disponibles o aplicables actualmente.',
    join: 'Unirse', leave: 'Salir',
    costJoin: 'Costo Adhesión:', costAnnual: 'Anual:',
    note: 'Nota: Los datos de innovación y pactos globales son ilustrativos. Sus políticas en I+D, diplomacia y fortaleza económica influyen en estos resultados.',
    fiscalTools: 'Herramientas Fiscales Avanzadas',
    loanAmount: 'Monto del Préstamo',
    loanAriaLabel: 'Monto del préstamo',
    requestLoan: 'Solicitar',
    loanAvailableFrom: (y: number) => `(Disponible desde ${y})`,
    loanNote: 'Aumenta la deuda pero provee fondos a Reservas.',
    fiscalPressure: (p: number) => `Presión Fiscal Adicional: ${p}%`,
    fiscalAriaLabel: 'Presión Fiscal Adicional',
    fiscalNote: 'Ajuste la tasa impositiva adicional sobre el PBI.',
    carbonCaptureTip: "El desarrollo de la Captura de Carbono (CAC) se acelera con una economía robusta y un buen desempeño nacional. Activar 'Neutralidad de Carbono' e invertir en su instrumento de I+D en CAC es crucial.",
    renewablesTip: "La eficiencia de las Energías Renovables Avanzadas mejora con un ecosistema saludable y políticas proactivas. La política de 'Neutralidad de Carbono' impulsa directamente este sector.",
    materialsTip: "La investigación de Materiales Sostenibles progresa más rápido en una sociedad con alto Bienestar Social.",
    loanTip: (maxLoan: string, year: number) => `Puedes solicitar un préstamo de hasta el 10% de tu PBI Real actual (${maxLoan}). Disponible desde el año ${year}. El monto solicitado se sumará a tu Deuda pero ingresará a las Reservas del Tesoro.`,
    fiscalTip: 'Aumentar la presión fiscal incrementa la recaudación del Tesoro, pero puede impactar negativamente la seguridad económica, el bienestar social, el crecimiento del PBI y la presión política social.',
    efficiencyPotential: 'Eficiencia Potencial',
    costReduction: 'Reducción Costo Potencial',
    adoption: 'Adopción',
  },
  en: {
    title: 'Innovation & Global Integration',
    subtitle: 'Drive sustainable development through technological advances and international cooperation.',
    techAdvance: 'Technological Advance',
    pacts: (n: number) => `International Pacts (${n} Active)`,
    noPacts: 'No international pacts are currently available or applicable.',
    join: 'Join', leave: 'Leave',
    costJoin: 'Joining Cost:', costAnnual: 'Annual:',
    note: 'Note: Innovation and global pact data is illustrative. Your R&D, diplomacy, and economic strength policies influence these outcomes.',
    fiscalTools: 'Advanced Fiscal Tools',
    loanAmount: 'Loan Amount',
    loanAriaLabel: 'Loan amount',
    requestLoan: 'Request',
    loanAvailableFrom: (y: number) => `(Available from year ${y})`,
    loanNote: 'Increases debt but provides funds to Treasury Reserves.',
    fiscalPressure: (p: number) => `Additional Tax Pressure: ${p}%`,
    fiscalAriaLabel: 'Additional Tax Pressure',
    fiscalNote: 'Adjust the additional tax rate on GDP.',
    carbonCaptureTip: "Carbon Capture (CCS) development accelerates with a robust economy and strong national performance. Activating 'Carbon Neutrality' and investing in its CCS R&D instrument is crucial.",
    renewablesTip: "Advanced Renewables efficiency improves with a healthy ecosystem and proactive policies. The 'Carbon Neutrality' policy directly drives this sector.",
    materialsTip: "Sustainable Materials research progresses faster in a society with high Social Wellbeing.",
    loanTip: (maxLoan: string, year: number) => `You can request a loan of up to 10% of your current Real GDP (${maxLoan}). Available from year ${year}. The amount adds to your Debt but immediately enters Treasury Reserves.`,
    fiscalTip: 'Increasing tax pressure raises Treasury revenue, but can negatively impact economic security, social wellbeing, GDP growth, and social political pressure.',
    efficiencyPotential: 'Potential Efficiency',
    costReduction: 'Potential Cost Reduction',
    adoption: 'Adoption',
  },
} as const;

const InnovationGlobalDashboard: React.FC<InnovationGlobalDashboardProps> = ({
  levelConfig, gameState, togglePact, handleAdditionalTaxPressureChange, requestLoan,
}) => {
  const { language } = useLanguageContext();
  const t = T[language];
  const inn = INNOVATION_DATA_NAMES[language];
  const { indicators, year, pacts, additionalTaxPressurePercentage, currentLevel } = gameState;
  const [loanAmount, setLoanAmount] = useState(100000);

  const dynamicCarbonCaptureReadiness = () => {
    if (indicators.economicSecurity > 70 && indicators.generalScore > 750) return inn.high;
    if (indicators.economicSecurity > 50 && indicators.generalScore > 650) return inn.medium;
    return inn.low;
  };

  const availablePacts = (Object.values(pacts) as Pact[]).filter(pact => year >= (pact.unlockYear || 0));
  const activePactsCount = availablePacts.filter(pact => pact.isActive).length;

  return (
    <div className="p-6 bg-gray-800 bg-opacity-80 rounded-lg shadow-xl border border-gray-600">
      <h3 className="text-xl font-semibold text-purple-300 mb-3">{t.title}</h3>
      <p className="text-sm text-gray-400 mb-4">{t.subtitle}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-lg font-medium text-purple-200 mb-2">{t.techAdvance}</h4>
          <div className="space-y-3">
            <Tooltip text={t.carbonCaptureTip} position="right">
              <div className="bg-gray-700 p-3 rounded cursor-help">
                <p className="text-sm text-gray-200">{inn.carbonCapture}:
                  <span className="font-semibold ml-1">{dynamicCarbonCaptureReadiness()} {inn.carbonCaptureReadiness}</span>
                  {` (+${15 + Math.floor(indicators.generalScore / 200)}% ${t.efficiencyPotential})`}
                </p>
              </div>
            </Tooltip>
            <Tooltip text={t.renewablesTip} position="right">
              <div className="bg-gray-700 p-3 rounded cursor-help">
                <p className="text-sm text-gray-200">{inn.renewables}:
                  <span className="font-semibold ml-1">{25 + Math.floor(indicators.biodiversity / 15)}% {t.efficiencyPotential.split(' ')[1] || 'Efficiency'}</span>
                  {`, 10% ${t.costReduction}`}
                </p>
              </div>
            </Tooltip>
            <Tooltip text={t.materialsTip} position="right">
              <div className="bg-gray-700 p-3 rounded cursor-help">
                <p className="text-sm text-gray-200">{inn.materials}:
                  <span className="font-semibold ml-1">{inn.promising}</span>
                  {` (${t.adoption}: ${5 + Math.floor(indicators.socialWellbeing / 10)}%)`}
                </p>
              </div>
            </Tooltip>
          </div>
        </div>

        <div>
          <h4 className="text-lg font-medium text-purple-200 mb-2">{t.pacts(activePactsCount)}</h4>
          {availablePacts.length > 0 ? (
            <div className="space-y-2">
              {availablePacts.map(pact => {
                const displayName = getPactName(pact.id, language) || pact.name;
                return (
                  <div key={pact.id} className={`p-3 rounded transition-colors duration-200 ${pact.isActive ? 'bg-purple-700 hover:bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                    <div className="flex items-center justify-between">
                      <Tooltip text={pact.description} position="top">
                        <span className="text-sm text-gray-100 font-medium">{displayName}</span>
                      </Tooltip>
                      <button
                        onClick={() => togglePact(pact.id)}
                        className={`px-3 py-1 text-xs font-semibold rounded ${pact.isActive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                        disabled={gameState.isSimulating}
                      >
                        {pact.isActive ? t.leave : t.join}
                      </button>
                    </div>
                    {(pact.costToJoin || pact.annualCost) && (
                      <p className="text-xs text-gray-400 mt-1">
                        {pact.costToJoin ? `${t.costJoin} ${pact.costToJoin} ` : ''}
                        {pact.annualCost ? `${t.costAnnual} ${pact.annualCost}` : ''}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400">{t.noPacts}</p>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-4 italic">{t.note}</p>

      {currentLevel === 3 && (
        <div className="mt-6 pt-4 border-t border-gray-700">
          <h4 className="text-lg font-medium text-purple-200 mb-3">{t.fiscalTools}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <Tooltip text={t.loanTip((gameState.stellaSpecificState.PBI_Real * 0.1).toFixed(0), CONTROL_PARAMS.Ano_Activacion_Prestamo)}>
              <div className="cursor-help">
                <label htmlFor="loanAmount" className="block text-sm font-medium text-gray-300 mb-1">{t.loanAmount}</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number" id="loanAmount" value={loanAmount}
                    onChange={(e) => setLoanAmount(Math.max(0, parseInt(e.target.value)))}
                    className="p-2 rounded bg-gray-700 border border-gray-600 text-white w-36"
                    min="0" step="10000"
                    aria-label={t.loanAriaLabel}
                    disabled={gameState.isSimulating || year < CONTROL_PARAMS.Ano_Activacion_Prestamo}
                  />
                  <button
                    onClick={() => requestLoan(loanAmount)}
                    disabled={gameState.isSimulating || year < CONTROL_PARAMS.Ano_Activacion_Prestamo}
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t.requestLoan}
                  </button>
                </div>
                {year < CONTROL_PARAMS.Ano_Activacion_Prestamo && (
                  <span className="text-xs text-gray-400 mt-1 block">{t.loanAvailableFrom(CONTROL_PARAMS.Ano_Activacion_Prestamo)}</span>
                )}
                <p className="text-xs text-gray-500 mt-1">{t.loanNote}</p>
              </div>
            </Tooltip>

            <div>
              <Tooltip text={t.fiscalTip} position="top">
                <label htmlFor="fiscalPressure" className="block text-sm font-medium text-gray-300 mb-1 cursor-help">
                  {t.fiscalPressure(additionalTaxPressurePercentage)}
                </label>
              </Tooltip>
              <input
                type="range" id="fiscalPressure" min="0"
                max={CONTROL_PARAMS.Max_Additional_Tax_Rate_Percentage || 20}
                step="1" value={additionalTaxPressurePercentage}
                onChange={(e) => handleAdditionalTaxPressureChange(parseInt(e.target.value, 10))}
                disabled={gameState.isSimulating}
                className="w-full h-3 rounded-lg appearance-none cursor-pointer accent-purple-500 bg-gray-600"
                aria-label={t.fiscalAriaLabel}
              />
              <p className="text-xs text-gray-500 mt-1">{t.fiscalNote}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InnovationGlobalDashboard;
