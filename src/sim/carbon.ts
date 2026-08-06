/**
 * CO2eq emissions per capita. Ported verbatim from src/App.tsx (`runSimulationRound`,
 * "5. CO2 Emissions calculation" block) as part of the phase-2 extraction
 * (mejora-general/files/16_auditoria_ecuaciones.md). No formula changed.
 *
 * See docs/audit-equations.md item C-1: the 44/12 CO2-from-carbon conversion factor lives
 * inside `CP.FACTOR_C_A_CO2EQ` (a control param, not a literal here) — verifying its value is
 * part of the equations audit, not this extraction.
 */
import type { ControlParams, LandUse, PolicyState, StellaStocks } from '../types';
import { LandUseType, Policy } from '../types';
import { getPolicyEfficiency } from './policies';

export function computeCarbonBalance(
  landUses: Record<LandUseType, LandUse>,
  policies: Record<Policy, PolicyState>,
  currentLevel: number,
  population: StellaStocks['Poblacion_Total'],
  CP: ControlParams,
): number {
  let totalEmissions = 0;
  let totalSequestration = 0;
  (Object.values(landUses) as LandUse[]).forEach((lu) => {
    totalEmissions += lu.area * lu.emissionRate;
    totalSequestration += lu.area * lu.sequestrationRate;
  });

  const effCN = getPolicyEfficiency(policies[Policy.CarbonNeutrality], currentLevel);
  const effPSE = getPolicyEfficiency(policies[Policy.EnergySubsidies], currentLevel);
  const effPAI_emissions = getPolicyEfficiency(policies[Policy.IntensiveAgriculture], currentLevel);

  if (effCN > 0) {
    const renInst = policies[Policy.CarbonNeutrality].instruments?.['C_Fomento_Energias_Renovables_No_Convencionales'];
    const ccsInst = policies[Policy.CarbonNeutrality].instruments?.['C_Investigacion_Desarrollo_Captura_Carbono'];
    if (renInst?.effortPercentage > 0) {
      totalEmissions *= 1 - CP.Factor_Reduccion_Emisiones_Renovables_PCN * (renInst.effortPercentage / 100);
    }
    if (ccsInst?.effortPercentage > 0) {
      totalSequestration += CP.Factor_Aumento_Secuestro_CAC_PCN * (ccsInst.effortPercentage / 100);
    }
  }
  if (effPSE > 0) totalEmissions *= 1 + CP.Factor_Aumento_Emisiones_Fosiles_PSE * effPSE;
  if (effPAI_emissions > 0) totalEmissions *= 1 + CP.Factor_Aumento_Emisiones_AgroIntensivo_PPAI * effPAI_emissions;

  return Math.max(0, ((totalEmissions - totalSequestration) * CP.FACTOR_C_A_CO2EQ * CP.CO2_EMISSIONS_SCALING_FACTOR) / population);
}
