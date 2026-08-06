/**
 * Land use transition matrix. Ported verbatim from src/App.tsx (`runSimulationRound`,
 * "2. Land Use Transitions" block) as part of the phase-2 extraction
 * (mejora-general/files/16_auditoria_ecuaciones.md). No formula changed.
 */
import type { ControlParams, LandUse, PolicyState } from '../types';
import { LandUseType, Policy } from '../types';
import { getPolicyEfficiency } from './policies';

export interface LandUseChangeFactors {
  tasa_BNNP_a_BNP: number;
  tasa_BNNP_a_CC: number;
  tasa_BNNP_a_CA: number;
  tasa_CA_a_BNNP: number;
  tasa_CC_a_CA: number;
}

export const DEFAULT_LAND_USE_CHANGE_FACTORS: LandUseChangeFactors = {
  tasa_BNNP_a_BNP: 1, tasa_BNNP_a_CC: 1, tasa_BNNP_a_CA: 1, tasa_CA_a_BNNP: 1, tasa_CC_a_CA: 1,
};

/**
 * Applies one year of land-use transitions. Returns a brand-new `Record<LandUseType, LandUse>`
 * (never mutates the input), with every area clamped to >= 0.
 */
export function updateLandUse(
  landUses: Record<LandUseType, LandUse>,
  policies: Record<Policy, PolicyState>,
  currentLevel: number,
  changeFactors: LandUseChangeFactors,
  CP: ControlParams,
): Record<LandUseType, LandUse> {
  const effCR = getPolicyEfficiency(policies[Policy.NaturalConservation], currentLevel);
  const effAS = getPolicyEfficiency(policies[Policy.Agroecological], currentLevel);
  const effPAI = getPolicyEfficiency(policies[Policy.IntensiveAgriculture], currentLevel);
  const effFRA = getPolicyEfficiency(policies[Policy.FlexibleEnvironmentalRegulations], currentLevel);

  const tasa_BNNP_a_BNP_final = (CP.Tasa_de_BNNP_a_BNP_Base + effCR * 0.05) * changeFactors.tasa_BNNP_a_BNP;
  const cambio_BNNP_a_BNP = landUses[LandUseType.UnprotectedNativeForest].area * tasa_BNNP_a_BNP_final;
  const tasa_BNNP_a_CC_final = (CP.Tasa_de_BNNP_a_CC_Base + effPAI * 0.04 + effFRA * 0.01) * (1 - effCR) * changeFactors.tasa_BNNP_a_CC;
  const cambio_BNNP_a_CC = landUses[LandUseType.UnprotectedNativeForest].area * tasa_BNNP_a_CC_final;
  const tasa_BNNP_a_CA_final = (CP.Tasa_de_BNNP_a_CA_Base + effAS * 0.02) * (1 - effCR) * changeFactors.tasa_BNNP_a_CA;
  const cambio_BNNP_a_CA = landUses[LandUseType.UnprotectedNativeForest].area * tasa_BNNP_a_CA_final;
  const tasa_CA_a_BNNP_final = (CP.Tasa_de_CA_a_BNNP_Base + effAS * 0.01) * changeFactors.tasa_CA_a_BNNP;
  const cambio_CA_a_BNNP = landUses[LandUseType.AgroecologicalCrops].area * tasa_CA_a_BNNP_final;
  const tasa_CC_a_CA_final = (CP.Tasa_de_CC_a_CA_Base + effAS * 0.03) * (1 - effPAI * 0.5) * changeFactors.tasa_CC_a_CA;
  const cambio_CC_a_CA = landUses[LandUseType.ConventionalCrops].area * tasa_CC_a_CA_final;

  const newLandUses = JSON.parse(JSON.stringify(landUses)) as Record<LandUseType, LandUse>;
  newLandUses[LandUseType.ProtectedNativeForest].area += cambio_BNNP_a_BNP;
  newLandUses[LandUseType.ConventionalCrops].area += cambio_BNNP_a_CC - cambio_CC_a_CA;
  newLandUses[LandUseType.AgroecologicalCrops].area += cambio_BNNP_a_CA + cambio_CC_a_CA - cambio_CA_a_BNNP;
  newLandUses[LandUseType.UnprotectedNativeForest].area -= cambio_BNNP_a_BNP + cambio_BNNP_a_CC + cambio_BNNP_a_CA - cambio_CA_a_BNNP;
  (Object.keys(newLandUses) as LandUseType[]).forEach((key) => {
    newLandUses[key].area = Math.max(0, newLandUses[key].area);
  });
  return newLandUses;
}
