/**
 * Biodiversity, food security, economic security and social-conflict deltas.
 * Ported verbatim from src/App.tsx (module-scope pure functions, unchanged since they were
 * already outside the React component) as part of the phase-2 extraction
 * (mejora-general/files/16_auditoria_ecuaciones.md). No formula changed.
 */
import type { ControlParams, Indicators, LandUse, PolicyState, StellaStocks } from '../types';
import { LandUseType, Policy } from '../types';
import { INDICATOR_IMPACT_WEIGHTS } from '../constants';
import { getPolicyEfficiency } from './policies';

export function calculateBiodiversityChange(
  policies: Record<Policy, PolicyState>,
  landUses: Record<LandUseType, LandUse>,
  currentBiodiversity: number,
  currentLevel: number,
  CP: ControlParams,
): number {
  let policyImpact = 0;
  const bioWeights = INDICATOR_IMPACT_WEIGHTS.BIODIVERSITY.POLICIES;

  (Object.keys(policies) as Policy[]).forEach((pKey) => {
    const policy = policies[pKey];
    if ((bioWeights as any)[pKey] && policy) {
      policyImpact += getPolicyEfficiency(policy, currentLevel) * (bioWeights as any)[pKey];
    }
  });

  if (
    getPolicyEfficiency(policies[Policy.Agroecological], currentLevel) > 0 &&
    getPolicyEfficiency(policies[Policy.NaturalConservation], currentLevel) > 0
  ) {
    policyImpact += bioWeights.Sinergia_AS_CR_Bio_Factor;
  }
  if (
    getPolicyEfficiency(policies[Policy.IntensiveAgriculture], currentLevel) > 0 &&
    getPolicyEfficiency(policies[Policy.FlexibleEnvironmentalRegulations], currentLevel) > 0
  ) {
    policyImpact += bioWeights.Sinergia_Neg_PAI_FRA_Bio_Factor;
  }

  let landUseImpact = 0;
  const luBioWeights = INDICATOR_IMPACT_WEIGHTS.BIODIVERSITY.LAND_USE;
  const currentTotalLandArea = (Object.values(landUses) as LandUse[]).reduce((sum, lu) => sum + lu.area, 0);

  if (currentTotalLandArea > 0) {
    landUseImpact += (landUses[LandUseType.UnprotectedNativeForest].area / currentTotalLandArea) * luBioWeights[LandUseType.UnprotectedNativeForest];
    landUseImpact += (landUses[LandUseType.ProtectedNativeForest].area / currentTotalLandArea) * luBioWeights[LandUseType.ProtectedNativeForest];
    landUseImpact += (landUses[LandUseType.AgroecologicalCrops].area / currentTotalLandArea) * luBioWeights[LandUseType.AgroecologicalCrops];
    landUseImpact += (landUses[LandUseType.ConventionalCrops].area / currentTotalLandArea) * luBioWeights[LandUseType.ConventionalCrops];
    landUseImpact += (landUses[LandUseType.ForestPlantations].area / currentTotalLandArea) * luBioWeights[LandUseType.ForestPlantations];
    landUseImpact += (landUses[LandUseType.GrasslandsPastures].area / currentTotalLandArea) * luBioWeights[LandUseType.GrasslandsPastures];
  }

  const change =
    policyImpact * CP.Factor_Impacto_Politicas_y_Presiones_en_Biodiversidad_Peso +
    landUseImpact * CP.Factor_Impacto_Usos_del_Suelo_en_Biodiversidad_Peso;

  const maxChange = 5;
  const actualChange = Math.max(-maxChange, Math.min(maxChange, change * 1.5));
  return currentBiodiversity + actualChange;
}

export function calculateFoodSecurityChange(
  policies: Record<Policy, PolicyState>,
  landUses: Record<LandUseType, LandUse>,
  indicators: Indicators,
  currentLevel: number,
  CP: ControlParams,
): number {
  let policyImpact = 0;
  const fsWeights = INDICATOR_IMPACT_WEIGHTS.FOOD_SECURITY.POLICIES;
  (Object.keys(policies) as Policy[]).forEach((pKey) => {
    const policy = policies[pKey];
    if ((fsWeights as any)[pKey] && policy) {
      policyImpact += getPolicyEfficiency(policy, currentLevel) * (fsWeights as any)[pKey];
    }
  });
  if (
    getPolicyEfficiency(policies[Policy.SustainableLivestock], currentLevel) > 0 &&
    getPolicyEfficiency(policies[Policy.Agroecological], currentLevel) > 0
  ) {
    policyImpact += fsWeights.Sinergia_GS_AS_SA_Factor;
  }

  let landUseImpact = 0;
  const luFsWeights = INDICATOR_IMPACT_WEIGHTS.FOOD_SECURITY.LAND_USE;
  const currentTotalLandArea = (Object.values(landUses) as LandUse[]).reduce((sum, lu) => sum + lu.area, 0);
  if (currentTotalLandArea > 0) {
    (Object.values(LandUseType) as LandUseType[]).forEach((luKey) => {
      if ((luFsWeights as any)[luKey]) {
        landUseImpact += (landUses[luKey].area / currentTotalLandArea) * (luFsWeights as any)[luKey];
      }
    });
  }

  const biodiversityEffect = indicators.biodiversity * INDICATOR_IMPACT_WEIGHTS.FOOD_SECURITY.BIODIVERSITY_IMPACT_ON_FOOD_SECURITY;
  const economicSecurityEffect = indicators.economicSecurity * INDICATOR_IMPACT_WEIGHTS.FOOD_SECURITY.ECONOMIC_SECURITY_IMPACT_ON_FOOD_SECURITY;

  const change =
    policyImpact * CP.Factor_Impacto_Politicas_y_Presiones_en_Seguridad_Alimentaria_Peso +
    landUseImpact * CP.Factor_Impacto_Usos_del_Suelo_en_Seguridad_Alimentaria_Peso +
    biodiversityEffect * CP.Impacto_Biodiversidad_en_Seguridad_Alimentaria_Peso +
    economicSecurityEffect;

  const maxChange = 4;
  const actualChange = Math.max(-maxChange, Math.min(maxChange, change * 0.1));
  return indicators.foodSecurity + actualChange;
}

export function calculateEconomicSecurityChange(
  policies: Record<Policy, PolicyState>,
  landUses: Record<LandUseType, LandUse>,
  indicators: Indicators,
  currentLevel: number,
  additionalTaxPressurePercentage: number,
  CP: ControlParams,
): number {
  let policyImpact = 0;
  const esWeights = INDICATOR_IMPACT_WEIGHTS.ECONOMIC_SECURITY.POLICIES;
  (Object.keys(policies) as Policy[]).forEach((pKey) => {
    const policy = policies[pKey];
    if ((esWeights as any)[pKey] && policy) {
      policyImpact += getPolicyEfficiency(policy, currentLevel) * (esWeights as any)[pKey];
    }
  });

  let landUseImpact = 0;
  const luEsWeights = INDICATOR_IMPACT_WEIGHTS.ECONOMIC_SECURITY.LAND_USE;
  const currentTotalLandArea = (Object.values(landUses) as LandUse[]).reduce((sum, lu) => sum + lu.area, 0);
  if (currentTotalLandArea > 0) {
    (Object.values(LandUseType) as LandUseType[]).forEach((luKey) => {
      if ((luEsWeights as any)[luKey]) {
        landUseImpact += (landUses[luKey].area / currentTotalLandArea) * (luEsWeights as any)[luKey];
      }
    });
  }

  const biodiversityEffect = indicators.biodiversity * INDICATOR_IMPACT_WEIGHTS.ECONOMIC_SECURITY.BIODIVERSITY_IMPACT_ON_ECONOMIC_SECURITY;
  let volatilityEffect = 0;
  if (indicators.foodSecurity < 20) {
    volatilityEffect = (20 - indicators.foodSecurity) * INDICATOR_IMPACT_WEIGHTS.ECONOMIC_SECURITY.VOLATILITY_FACTOR;
  }

  let fiscalPressureImpact = 0;
  if (currentLevel === 3 && additionalTaxPressurePercentage > 0) {
    fiscalPressureImpact = additionalTaxPressurePercentage * CP.EcoSec_Reduction_Factor_Per_Tax_Point;
  }

  const change =
    policyImpact * CP.Factor_Impacto_Politicas_y_Presiones_en_Seguridad_Economica_Peso +
    landUseImpact * CP.Factor_Impacto_Usos_del_Suelo_en_Seguridad_Economica_Peso +
    biodiversityEffect * CP.Impacto_Biodiversidad_en_SE_Peso +
    volatilityEffect -
    fiscalPressureImpact;

  const maxChange = 4;
  const actualChangeNonFiscal = Math.max(-maxChange, Math.min(maxChange, change * 0.1));

  return indicators.economicSecurity + actualChangeNonFiscal;
}

export function calculateSocialConflictChange(
  policies: Record<Policy, PolicyState>,
  landUses: Record<LandUseType, LandUse>,
  stellaState: StellaStocks,
  indicators: Indicators,
  currentLevel: number,
  additionalTaxPressurePercentage: number,
  CP: ControlParams,
): number {
  let incrementoConflicto = 0;
  const conflictFactors = INDICATOR_IMPACT_WEIGHTS.SOCIAL_WELLBEING.CONFLICT_INCREMENT_FACTORS;
  const currentTotalLandArea = (Object.values(landUses) as LandUse[]).reduce((sum, lu) => sum + lu.area, 0);

  if (stellaState.PBI_Real > 0 && stellaState.Deuda / stellaState.PBI_Real > conflictFactors.DEBT_PBI_THRESHOLD) {
    incrementoConflicto += conflictFactors.DEBT_PBI_IMPACT;
  }
  const flexRegsPolicy = policies[Policy.FlexibleEnvironmentalRegulations];
  if (flexRegsPolicy) {
    incrementoConflicto += getPolicyEfficiency(flexRegsPolicy, currentLevel) * conflictFactors.POLICY_FLEX_REGS_IMPACT;
  }

  const energySubPolicy = policies[Policy.EnergySubsidies];
  if (energySubPolicy && stellaState.Reservas_del_Tesoro < stellaState.PBI_Real * conflictFactors.LOW_RESERVES_THRESHOLD_FACTOR) {
    incrementoConflicto += getPolicyEfficiency(energySubPolicy, currentLevel) * conflictFactors.POLICY_ENERGY_SUBSIDIES_LOW_RESERVES_IMPACT;
  }

  if (indicators.foodSecurity < conflictFactors.LOW_FOOD_SECURITY_THRESHOLD) {
    incrementoConflicto += conflictFactors.LOW_FOOD_SECURITY_IMPACT;
  }
  if (indicators.economicSecurity < conflictFactors.LOW_ECONOMIC_SECURITY_THRESHOLD) {
    incrementoConflicto += conflictFactors.LOW_ECONOMIC_SECURITY_IMPACT;
  }

  const intensiveAgPolicy = policies[Policy.IntensiveAgriculture];
  if (intensiveAgPolicy) {
    incrementoConflicto += getPolicyEfficiency(intensiveAgPolicy, currentLevel) * conflictFactors.POLICY_INTENSIVE_AGRICULTURE_IMPACT;
  }
  const foreignInvPolicy = policies[Policy.ForeignInvestment];
  if (foreignInvPolicy) {
    incrementoConflicto += getPolicyEfficiency(foreignInvPolicy, currentLevel) * conflictFactors.POLICY_FOREIGN_INVESTMENT_IMPACT;
  }
  if (flexRegsPolicy) {
    incrementoConflicto += getPolicyEfficiency(flexRegsPolicy, currentLevel) * conflictFactors.POLICY_ENV_NORMS_FLEX_IMPACT;
  }

  if (currentTotalLandArea > 0) {
    incrementoConflicto += (landUses[LandUseType.ConventionalCrops].area / currentTotalLandArea) * conflictFactors.LAND_USE_CC_IMPACT * 100;
    incrementoConflicto += (landUses[LandUseType.ForestPlantations].area / currentTotalLandArea) * conflictFactors.LAND_USE_PF_IMPACT * 100;
  }

  if (currentLevel === 3 && additionalTaxPressurePercentage > 0) {
    incrementoConflicto += additionalTaxPressurePercentage * CP.SocialConflict_Increase_Factor_Per_Tax_Point;
  }

  // --- "Green approval" logic: active flagship environmental policies dissipate conflict ---
  let reduccionConflictoVerde = 0;
  const carbonPolicy = policies[Policy.CarbonNeutrality];
  if (carbonPolicy && getPolicyEfficiency(carbonPolicy, currentLevel) > 0.5) {
    reduccionConflictoVerde += 0.8;
  }
  const conservationPolicy = policies[Policy.NaturalConservation];
  if (conservationPolicy && getPolicyEfficiency(conservationPolicy, currentLevel) > 0.5) {
    reduccionConflictoVerde += 0.8;
  }
  const waterPolicy = policies[Policy.SustainableWaterManagement];
  if (waterPolicy && getPolicyEfficiency(waterPolicy, currentLevel) > 0.4) {
    reduccionConflictoVerde += 0.4;
  }

  const disipacionConflicto = stellaState.Conflicto_social * CP.Tasa_disipacion_social;
  const change = incrementoConflicto - disipacionConflicto - reduccionConflictoVerde;
  return stellaState.Conflicto_social + change;
}

export function calculatePoliticalCollapseChange(stellaState: StellaStocks, indicators: Indicators, CP: ControlParams): number {
  let incrementoColapso = 0;
  const collapseFactors = INDICATOR_IMPACT_WEIGHTS.POLITICAL_STABILITY.COLLAPSE_INCREMENT_FACTORS;

  if (indicators.socialWellbeing < collapseFactors.LOW_SOCIAL_WELLBEING_THRESHOLD) {
    incrementoColapso += collapseFactors.LOW_SOCIAL_WELLBEING_IMPACT;
  }
  if (indicators.economicSecurity < collapseFactors.LOW_ECONOMIC_SECURITY_THRESHOLD) {
    incrementoColapso += collapseFactors.LOW_ECONOMIC_SECURITY_IMPACT;
  }
  if (stellaState.PBI_Real > 0 && stellaState.Reservas_del_Tesoro < stellaState.PBI_Real * collapseFactors.NEGATIVE_RESERVES_THRESHOLD_FACTOR) {
    incrementoColapso += collapseFactors.NEGATIVE_RESERVES_IMPACT;
  }

  const pressures = [stellaState.PP_AGRICOLA, stellaState.PP_AMBIENTALISTA, stellaState.PP_SOCIAL];
  const maxPressure = Math.max(...pressures);
  const minPressure = Math.min(...pressures);
  const polarizationValue = maxPressure - minPressure;

  if (polarizationValue > CP.Umbral_polarizacion) {
    incrementoColapso += collapseFactors.HIGH_POLARIZATION_IMPACT;
  }

  if (stellaState.PP_AGRICOLA > collapseFactors.PP_AGRICOLA_THRESHOLD) {
    incrementoColapso += (stellaState.PP_AGRICOLA - collapseFactors.PP_AGRICOLA_THRESHOLD) * collapseFactors.PP_AGRICOLA_IMPACT;
  }
  if (stellaState.PP_AMBIENTALISTA > collapseFactors.PP_AMBIENTALISTA_THRESHOLD) {
    incrementoColapso += (stellaState.PP_AMBIENTALISTA - collapseFactors.PP_AMBIENTALISTA_THRESHOLD) * collapseFactors.PP_AMBIENTALISTA_IMPACT;
  }
  if (stellaState.PP_SOCIAL > collapseFactors.PP_SOCIAL_THRESHOLD) {
    incrementoColapso += (stellaState.PP_SOCIAL - collapseFactors.PP_SOCIAL_THRESHOLD) * collapseFactors.PP_SOCIAL_IMPACT;
  }

  const decrementoColapso = INDICATOR_IMPACT_WEIGHTS.POLITICAL_STABILITY.COLLAPSE_DECREMENT_BASE;

  let newColapsoPolitico = stellaState.Colapso_politico;
  newColapsoPolitico += incrementoColapso;
  newColapsoPolitico -= decrementoColapso;

  return Math.max(0, Math.min(100, newColapsoPolitico));
}
