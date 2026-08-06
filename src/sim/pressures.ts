/**
 * Sectoral political pressures (agricultural, environmentalist, social). Ported verbatim from
 * src/App.tsx (`runSimulationRound`, "6. Political Pressure" block) as part of the phase-2
 * extraction (mejora-general/files/16_auditoria_ecuaciones.md). No formula changed.
 *
 * Must run AFTER the CO2 balance (carbon.ts) and the indicator updates (indicators.ts) for the
 * same year: the environmentalist-pressure term reads `indicators.co2EqEmissionsPerCapita`
 * and `indicators.biodiversity` as already-updated for the current year, matching the original
 * ordering in `runSimulationRound`.
 */
import type { ControlParams, Indicators, Policy, PolicyState } from '../types';
import { Policy as PolicyEnum } from '../types';
import { getPolicyEfficiency } from './policies';

export interface Pressures {
  ppAgricola: number;
  ppAmbientalista: number;
  ppSocial: number;
}

export function updatePressures(
  current: Pressures,
  policies: Record<Policy, PolicyState>,
  indicators: Indicators,
  currentLevel: number,
  additionalTaxPressurePercentage: number,
  CP: ControlParams,
): Pressures {
  let ppAgricolaImpulse = 0;
  let ppAmbientalistaImpulse = 0;
  let ppSocialImpulse = 0;

  ppAgricolaImpulse += getPolicyEfficiency(policies[PolicyEnum.Agroecological], currentLevel) * CP.Factor_Presion_Agricola_PAS;
  ppAgricolaImpulse += getPolicyEfficiency(policies[PolicyEnum.SustainableLivestock], currentLevel) * CP.Factor_Presion_Agricola_PGS;
  ppAgricolaImpulse += getPolicyEfficiency(policies[PolicyEnum.IntensiveAgriculture], currentLevel) * CP.Factor_Presion_Agricola_PPAI;
  ppAgricolaImpulse += getPolicyEfficiency(policies[PolicyEnum.AgriculturalExports], currentLevel) * CP.Factor_Presion_Agricola_PPEA;
  if (indicators.economicSecurity < CP.Umbral_PP_Agricola_SegEconomica) {
    ppAgricolaImpulse += (CP.Umbral_PP_Agricola_SegEconomica - indicators.economicSecurity) * CP.Sensibilidad_PP_Agricola_SegEconomica;
  }
  if (indicators.foodSecurity < CP.Umbral_PP_Agricola_SegAlimentaria) {
    ppAgricolaImpulse += (CP.Umbral_PP_Agricola_SegAlimentaria - indicators.foodSecurity) * CP.Sensibilidad_PP_Agricola_SegAlimentaria;
  }
  let ppAgricola = current.ppAgricola + ppAgricolaImpulse - current.ppAgricola * 0.1;

  ppAmbientalistaImpulse += getPolicyEfficiency(policies[PolicyEnum.Agroecological], currentLevel) * CP.Factor_Presion_Ambiental_PAS;
  ppAmbientalistaImpulse += getPolicyEfficiency(policies[PolicyEnum.NaturalConservation], currentLevel) * CP.Factor_Presion_Ambiental_PCR;
  ppAmbientalistaImpulse += getPolicyEfficiency(policies[PolicyEnum.SustainableLivestock], currentLevel) * CP.Factor_Presion_Ambiental_PGS;
  ppAmbientalistaImpulse += getPolicyEfficiency(policies[PolicyEnum.SustainableWaterManagement], currentLevel) * CP.Factor_Presion_Ambiental_PAGUA;
  ppAmbientalistaImpulse += getPolicyEfficiency(policies[PolicyEnum.CarbonNeutrality], currentLevel) * CP.Factor_Presion_Ambiental_PCN;
  ppAmbientalistaImpulse += getPolicyEfficiency(policies[PolicyEnum.IntensiveAgriculture], currentLevel) * CP.Factor_Presion_Ambiental_PPAI_Neg;
  ppAmbientalistaImpulse += getPolicyEfficiency(policies[PolicyEnum.FlexibleEnvironmentalRegulations], currentLevel) * CP.Factor_Presion_Ambiental_PFRA_Neg;
  ppAmbientalistaImpulse += getPolicyEfficiency(policies[PolicyEnum.EnergySubsidies], currentLevel) * CP.Factor_Presion_Ambiental_PSE_Neg;
  if (indicators.biodiversity < CP.Umbral_PP_Ambiental_Biodiversidad) {
    ppAmbientalistaImpulse += (CP.Umbral_PP_Ambiental_Biodiversidad - indicators.biodiversity) * CP.Sensibilidad_PP_Ambiental_Biodiversidad;
  }
  if (indicators.co2EqEmissionsPerCapita > CP.Umbral_PP_Ambiental_CO2PerCapita) {
    ppAmbientalistaImpulse += (indicators.co2EqEmissionsPerCapita - CP.Umbral_PP_Ambiental_CO2PerCapita) * CP.Sensibilidad_PP_Ambiental_CO2PerCapita;
  }
  let ppAmbientalista = current.ppAmbientalista + ppAmbientalistaImpulse - current.ppAmbientalista * 0.1;

  ppSocialImpulse += getPolicyEfficiency(policies[PolicyEnum.Agroecological], currentLevel) * CP.Factor_Presion_Social_PAS;
  ppSocialImpulse += getPolicyEfficiency(policies[PolicyEnum.SustainableWaterManagement], currentLevel) * CP.Factor_Presion_Social_PAGUA;
  ppSocialImpulse += getPolicyEfficiency(policies[PolicyEnum.CarbonNeutrality], currentLevel) * CP.Factor_Presion_Social_PCN;
  ppSocialImpulse += getPolicyEfficiency(policies[PolicyEnum.NaturalConservation], currentLevel) * CP.Factor_Presion_Social_PCR;
  ppSocialImpulse += getPolicyEfficiency(policies[PolicyEnum.IntensiveAgriculture], currentLevel) * CP.Factor_Presion_Social_PPAI_Neg;
  ppSocialImpulse += getPolicyEfficiency(policies[PolicyEnum.ForeignInvestment], currentLevel) * CP.Factor_Presion_Social_PPIE_Neg;
  ppSocialImpulse += getPolicyEfficiency(policies[PolicyEnum.FlexibleEnvironmentalRegulations], currentLevel) * CP.Factor_Presion_Social_PFRA_Neg;
  if (indicators.socialWellbeing < CP.Umbral_PP_Social_BienestarSocial) {
    ppSocialImpulse += (CP.Umbral_PP_Social_BienestarSocial - indicators.socialWellbeing) * CP.Sensibilidad_PP_Social_BienestarSocial;
  }
  ppSocialImpulse += additionalTaxPressurePercentage * CP.PPSocial_Increase_Factor_Per_Tax_Point;
  let ppSocial = current.ppSocial + ppSocialImpulse - current.ppSocial * CP.Tasa_disipacion_social;

  ppAgricola = Math.max(0, Math.min(100, ppAgricola));
  ppAmbientalista = Math.max(0, Math.min(100, ppAmbientalista));
  ppSocial = Math.max(0, Math.min(100, ppSocial));

  return { ppAgricola, ppAmbientalista, ppSocial };
}
