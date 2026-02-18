import React, { useState } from 'react';
import { GameState, LevelConfig, Pact } from '../../types';
import Tooltip from '../common/Tooltip';
import { CONTROL_PARAMS } from '../../constants';


// Nombres de tecnología ilustrativos (se mantienen en inglés en código, pero se muestran traducidos si es necesario en UI)
const mockInnovationData = {
  carbonCaptureTech: { name: "Tecnología de Captura de Carbono", readiness: "Media", efficiencyGain: 15 }, 
  renewableEnergyAdv: { name: "Renovables Avanzadas", efficiency: 25, costReduction: 10 }, 
  sustainableMaterials: { name: "I+D Materiales Sostenibles", progress: "Prometedor", adoptionRate: 5 }, 
};

interface InnovationGlobalDashboardProps {
  levelConfig: LevelConfig;
  gameState: GameState;
  togglePact: (pactId: string) => void;
  handleAdditionalTaxPressureChange: (newPressure: number) => void;
  requestLoan: (amount: number) => void;
}

const InnovationGlobalDashboard: React.FC<InnovationGlobalDashboardProps> = ({ 
    levelConfig, 
    gameState, 
    togglePact,
    handleAdditionalTaxPressureChange,
    requestLoan
}) => {
  const { indicators, year, pacts, additionalTaxPressurePercentage, currentLevel } = gameState;
  const [loanAmount, setLoanAmount] = useState(100000); // Local state for loan input

  const dynamicCarbonCaptureReadiness = () => {
    if (indicators.economicSecurity > 70 && indicators.generalScore > 750) return "Alta";
    if (indicators.economicSecurity > 50 && indicators.generalScore > 650) return "Media";
    return "Baja";
  };
  
  const availablePacts = Object.values(pacts).filter(pact => year >= (pact.unlockYear || 0));
  const activePactsCount = availablePacts.filter(pact => pact.isActive).length;

  const onFiscalPressureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleAdditionalTaxPressureChange(parseInt(event.target.value, 10));
  };

  return (
    <div className="p-6 bg-gray-800 bg-opacity-80 rounded-lg shadow-xl border border-gray-600">
      <h3 className="text-xl font-semibold text-purple-300 mb-3">Innovación e Integración Global</h3>
       <p className="text-sm text-gray-400 mb-4">
        Impulse el desarrollo sostenible mediante avances tecnológicos y cooperación internacional.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-lg font-medium text-purple-200 mb-2">Avance Tecnológico</h4>
          <div className="space-y-3">
            <Tooltip 
              text="El desarrollo de la Captura de Carbono (CAC) se acelera con una economía robusta (Seguridad Económica alta) y un buen desempeño nacional (Puntaje General alto). Activar la política de 'Neutralidad de Carbono' e invertir en su instrumento de 'I+D en CAC' es crucial para su avance."
              position="right"
            >
              <div className="bg-gray-700 p-3 rounded cursor-help">
                <p className="text-sm text-gray-200">{mockInnovationData.carbonCaptureTech.name}: 
                  <span className="font-semibold ml-1">{dynamicCarbonCaptureReadiness()} Preparación</span>
                  {` (+${mockInnovationData.carbonCaptureTech.efficiencyGain + Math.floor(indicators.generalScore/200)}% Eficiencia Potencial)`}
                </p>
              </div>
            </Tooltip>
            <Tooltip 
              text="La eficiencia de las Energías Renovables Avanzadas mejora con un ecosistema saludable (Biodiversidad alta) y políticas proactivas. La política de 'Neutralidad de Carbono', con su instrumento de 'Fomento a Energías Renovables', impulsa directamente este sector."
              position="right"
            >
              <div className="bg-gray-700 p-3 rounded cursor-help">
                <p className="text-sm text-gray-200">{mockInnovationData.renewableEnergyAdv.name}: 
                  <span className="font-semibold ml-1">{mockInnovationData.renewableEnergyAdv.efficiency + Math.floor(indicators.biodiversity/15)}% Eficiencia</span>
                  {`, ${mockInnovationData.renewableEnergyAdv.costReduction}% Reducción Costo Potencial`}
                </p>
              </div>
            </Tooltip>
            <Tooltip 
              text="La investigación y adopción de Materiales Sostenibles progresan más rápido en una sociedad con alto Bienestar Social. Decisiones que fomenten la economía circular y la innovación verde pueden tener un impacto positivo."
              position="right"
            >
              <div className="bg-gray-700 p-3 rounded cursor-help">
                <p className="text-sm text-gray-200">{mockInnovationData.sustainableMaterials.name}: 
                  <span className="font-semibold ml-1">{mockInnovationData.sustainableMaterials.progress}</span>
                  {` (Adopción: ${mockInnovationData.sustainableMaterials.adoptionRate + Math.floor(indicators.socialWellbeing/10)}%)`}
                </p>
              </div>
            </Tooltip>
          </div>
        </div>
        <div>
          <h4 className="text-lg font-medium text-purple-200 mb-2">Pactos Internacionales ({activePactsCount} Activos)</h4>
          {availablePacts.length > 0 ? (
            <div className="space-y-2">
              {availablePacts.map(pact => (
                <div key={pact.id} className={`p-3 rounded transition-colors duration-200 ${pact.isActive ? 'bg-purple-700 hover:bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                  <div className="flex items-center justify-between">
                    <Tooltip text={pact.description} position="top">
                       <span className="text-sm text-gray-100 font-medium">{pact.name}</span>
                    </Tooltip>
                    <button
                      onClick={() => togglePact(pact.id)}
                      className={`px-3 py-1 text-xs font-semibold rounded
                        ${pact.isActive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                        disabled={gameState.isSimulating}
                    >
                      {pact.isActive ? 'Salir' : 'Unirse'}
                    </button>
                  </div>
                  {(pact.costToJoin || pact.annualCost) && (
                    <p className="text-xs text-gray-400 mt-1">
                      {pact.costToJoin ? `Costo Adhesión: ${pact.costToJoin} ` : ''}
                      {pact.annualCost ? `Anual: ${pact.annualCost}` : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No hay pactos internacionales disponibles o aplicables actualmente.</p>
          )}
        </div>
      </div>
       <p className="text-xs text-gray-500 mt-4 italic">
        Nota: Los datos de innovación y pactos globales son ilustrativos. Sus políticas en I+D, diplomacia y fortaleza económica influyen en estos resultados. Unirse/salir de pactos puede tener costos e impactar varios indicadores.
      </p>

      {/* Sección de Finanzas Nacionales con Presión Fiscal Adicional */}
      {currentLevel === 3 && (
        <div className="mt-6 pt-4 border-t border-gray-700">
          <h4 className="text-lg font-medium text-purple-200 mb-3">Herramientas Fiscales Avanzadas</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <Tooltip text={`Puedes solicitar un préstamo de hasta el 10% de tu PBI Real actual (${(gameState.stellaSpecificState.PBI_Real * 0.1).toFixed(0)}). Disponible desde el año ${CONTROL_PARAMS.Ano_Activacion_Prestamo}. El monto solicitado se sumará a tu Deuda total pero ingresará inmediatamente a las Reservas del Tesoro, dándote liquidez para financiar políticas.`}>
              <div className="cursor-help">
                <label htmlFor="loanAmount" className="block text-sm font-medium text-gray-300 mb-1">Monto del Préstamo</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    id="loanAmount"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Math.max(0, parseInt(e.target.value)))}
                    className="p-2 rounded bg-gray-700 border border-gray-600 text-white w-36"
                    min="0"
                    step="10000"
                    aria-label="Monto del préstamo"
                    disabled={gameState.isSimulating || year < CONTROL_PARAMS.Ano_Activacion_Prestamo}
                  />
                  <button
                    onClick={() => requestLoan(loanAmount)}
                    disabled={gameState.isSimulating || year < CONTROL_PARAMS.Ano_Activacion_Prestamo}
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded disabled:opacity-50 disabled:cursor-not-allowed h-full"
                  >
                    Solicitar
                  </button>
                </div>
                {year < CONTROL_PARAMS.Ano_Activacion_Prestamo && <span className="text-xs text-gray-400 mt-1 block">(Disponible desde {CONTROL_PARAMS.Ano_Activacion_Prestamo})</span>}
                <p className="text-xs text-gray-500 mt-1">Aumenta la deuda pero provee fondos a Reservas.</p>
              </div>
            </Tooltip>
            
            <div>
              <Tooltip 
                text="Aumentar la presión fiscal incrementa la recaudación del Tesoro (ingresos por PBI), pero puede impactar negativamente la seguridad económica, el bienestar social (aumentando conflicto), el crecimiento del PBI y la presión política social. Usar con precaución."
                position="top"
              >
                <label htmlFor="fiscalPressure" className="block text-sm font-medium text-gray-300 mb-1 cursor-help">
                  Presión Fiscal Adicional: <span className="text-blue-300 font-bold">{additionalTaxPressurePercentage}%</span>
                </label>
              </Tooltip>
              <input
                type="range"
                id="fiscalPressure"
                min="0"
                max={CONTROL_PARAMS.Max_Additional_Tax_Rate_Percentage || 20}
                step="1"
                value={additionalTaxPressurePercentage}
                onChange={onFiscalPressureChange}
                disabled={gameState.isSimulating}
                className={`w-full h-3 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400
                            ${gameState.isSimulating ? 'bg-gray-600' : 'bg-gray-600'}`}
                aria-label="Presión Fiscal Adicional"
              />
               <p className="text-xs text-gray-500 mt-1">Ajuste la tasa impositiva adicional sobre el PBI.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InnovationGlobalDashboard;