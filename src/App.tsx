

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import { Language } from './hooks/useLanguage';
// Reads current language at call-time (avoids circular context dependency)
const getActiveLanguage = (): Language => {
  try { const s = localStorage.getItem('decarbonationLanguage_v1'); if (s === 'en' || s === 'es') return s; } catch {}
  return 'es';
};
import { useAuth } from './hooks/useAuth';
import { useSessionPersistence } from './hooks/useSessionPersistence';
import LoginScreen from './components/auth/LoginScreen';
import SurveyPre from './components/surveys/SurveyPre';
import SurveyPost from './components/surveys/SurveyPost';
import FacilitatorPanel from './components/facilitator/FacilitatorPanel';
import GameSummaryPanel from './components/game/GameSummaryPanel';
// FIX: Added NumericStellaKeys and NumericIndicatorKeys to imports from types.ts to ensure proper type checking for dynamic property access.
import { GameState, Policy, HistoricalDataPoint, LandUseType, LandUse, StellaStocks, PolicyState, LevelConfig, Pact, ChatMessage, PolicyInstrument, RandomEvent, RandomEventEffect, ControlParams, InitialIndicatorOverrides, ChatMessageEmphasisType, InstrumentImpactHints, NumericStellaKeys, NumericIndicatorKeys, Indicators } from './types';
import {
  INITIAL_YEAR, SIMULATION_YEARS_PER_ROUND,
  YEARS_PER_LEVEL,
  INITIAL_POLICIES, INITIAL_INDICATORS, INITIAL_FINANCES, INITIAL_LAND_USES,
  LEVEL_CONFIGS, MAX_LEVELS, INITIAL_STELLA_STOCKS, CONTROL_PARAMS, INITIAL_PACTS, TOTAL_LAND_AREA,
  INDICATOR_IMPACT_WEIGHTS, API_KEY_ERROR_MESSAGE, GEMINI_MODEL_TEXT, ALL_RANDOM_EVENTS,
  LEVEL_2_INITIAL_LAND_USES, LEVEL_2_INITIAL_STELLA_OVERRIDES, LEVEL_2_INITIAL_INDICATOR_OVERRIDES,
  LEVEL_3_INITIAL_LAND_USES, LEVEL_3_INITIAL_STELLA_OVERRIDES, LEVEL_3_INITIAL_INDICATOR_OVERRIDES,
  POLICY_LOCK_IN_DURATION, MAX_ACTIVE_POLICIES, INSTRUMENT_IMPACT_HINTS
} from './constants';
import { Dashboard } from './components/Dashboard';
import Header from './components/Header';
import ChatbotPanel from './components/ChatbotPanel';
import { askGemini, generateNewsHeadlines } from './services/geminiService';
import { getSuggestedQuestions } from './services/suggestionService';
import LevelUpBanner from './components/common/LevelUpBanner';
import TutorialModal from './components/common/TutorialModal';
import CoverScreen from './components/common/CoverScreen';
import ClosingSynthesisModal from './components/game/ClosingSynthesisModal';
import LevelIntroModal from './components/common/LevelIntroModal';
import FacilitatorManual from './components/facilitator/FacilitatorManual';
import PlayerManual from './components/player/PlayerManual';
import EquationsManual from './components/equations/EquationsManual';
import Toast from './components/common/Toast';
import GameLogPanel from './components/GameLogPanel';
import { stepYear, createInitialState, evaluateLevel } from './sim';
import WinRoutesPanel from './components/game/WinRoutesPanel';
import { useT } from './i18n';


type LevelNumber = 1 | 2 | 3;
type CumplimientoKeyStrings = `Cumplimiento_Nivel_${LevelNumber}`;
type DesactivarKeyStrings = `Desactivar_Nivel_${LevelNumber}`;
type NivelActiveKeyStrings = `Nivel_${LevelNumber}_Active`;


const getPolicyByStellaName = (stellaName: string, policies: Record<Policy, PolicyState>): PolicyState | undefined => {
  return Object.values(policies).find(p => p.stellaName === stellaName);
};
const isPolicyActiveByStellaName = (stellaName: string, policies: Record<Policy, PolicyState>): boolean => {
  const policy = getPolicyByStellaName(stellaName, policies);
  return policy ? policy.isActive : false;
};

const getPolicyEfficiency = (policy: PolicyState | undefined, currentLevel: number): number => {
    if (!policy || !policy.isActive) return 0;
    
    const baseEfficiency = policy.currentEfficiency || 0;
    
    if (currentLevel < 2 || !policy.instruments) {
        return baseEfficiency;
    }
    
    const totalInstrumentEffort = policy.totalInstrumentEffortApplied || 0;
    return baseEfficiency * (totalInstrumentEffort / 100);
};


const calculateBiodiversityChange = (policies: Record<Policy, PolicyState>, landUses: Record<LandUseType, LandUse>, currentBiodiversity: number, currentLevel: number): number => {
    let policyImpact = 0;
    const bioWeights = INDICATOR_IMPACT_WEIGHTS.BIODIVERSITY.POLICIES;

    Object.values(Policy).forEach(pKey => {
        const policy = policies[pKey as Policy];
        if (bioWeights[pKey as Policy] && policy) {
            policyImpact += getPolicyEfficiency(policy, currentLevel) * bioWeights[pKey as Policy];
        }
    });
    
    if (getPolicyEfficiency(policies[Policy.Agroecological], currentLevel) > 0 && 
        getPolicyEfficiency(policies[Policy.NaturalConservation], currentLevel) > 0) {
        policyImpact += bioWeights.Sinergia_AS_CR_Bio_Factor;
    }
    if (getPolicyEfficiency(policies[Policy.IntensiveAgriculture], currentLevel) > 0 && 
        getPolicyEfficiency(policies[Policy.FlexibleEnvironmentalRegulations], currentLevel) > 0) {
        policyImpact += bioWeights.Sinergia_Neg_PAI_FRA_Bio_Factor;
    }

    let landUseImpact = 0;
    const luBioWeights = INDICATOR_IMPACT_WEIGHTS.BIODIVERSITY.LAND_USE;
    // FIX: Explicitly typed 'lu' to LandUse to resolve type inference issues with Object.values.
    const currentTotalLandArea = Object.values(landUses).reduce((sum, lu: LandUse) => sum + lu.area, 0);

    if (currentTotalLandArea > 0) {
        landUseImpact += (landUses[LandUseType.UnprotectedNativeForest].area / currentTotalLandArea) * luBioWeights[LandUseType.UnprotectedNativeForest];
        landUseImpact += (landUses[LandUseType.ProtectedNativeForest].area / currentTotalLandArea) * luBioWeights[LandUseType.ProtectedNativeForest];
        landUseImpact += (landUses[LandUseType.AgroecologicalCrops].area / currentTotalLandArea) * luBioWeights[LandUseType.AgroecologicalCrops];
        landUseImpact += (landUses[LandUseType.ConventionalCrops].area / currentTotalLandArea) * luBioWeights[LandUseType.ConventionalCrops];
        landUseImpact += (landUses[LandUseType.ForestPlantations].area / currentTotalLandArea) * luBioWeights[LandUseType.ForestPlantations];
        landUseImpact += (landUses[LandUseType.GrasslandsPastures].area / currentTotalLandArea) * luBioWeights[LandUseType.GrasslandsPastures];
    }
    
    const change = (policyImpact * CONTROL_PARAMS.Factor_Impacto_Politicas_y_Presiones_en_Biodiversidad_Peso) +
                   (landUseImpact * CONTROL_PARAMS.Factor_Impacto_Usos_del_Suelo_en_Biodiversidad_Peso);
    
    const maxChange = 5; 
    const actualChange = Math.max(-maxChange, Math.min(maxChange, change * 1.5)); 
    return currentBiodiversity + actualChange;
};

const calculateFoodSecurityChange = (policies: Record<Policy, PolicyState>, landUses: Record<LandUseType, LandUse>, indicators: Indicators, currentLevel: number): number => {
    let policyImpact = 0;
    const fsWeights = INDICATOR_IMPACT_WEIGHTS.FOOD_SECURITY.POLICIES;
    Object.values(Policy).forEach(pKey => {
      const policy = policies[pKey as Policy];
      if (fsWeights[pKey as Policy] && policy) {
        policyImpact += getPolicyEfficiency(policy, currentLevel) * fsWeights[pKey as Policy];
      }
    });
    if (getPolicyEfficiency(policies[Policy.SustainableLivestock], currentLevel) > 0 && 
        getPolicyEfficiency(policies[Policy.Agroecological], currentLevel) > 0) {
        policyImpact += fsWeights.Sinergia_GS_AS_SA_Factor;
    }

    let landUseImpact = 0;
    const luFsWeights = INDICATOR_IMPACT_WEIGHTS.FOOD_SECURITY.LAND_USE;
    // FIX: Explicitly typed 'lu' to LandUse to resolve type inference issues with Object.values.
    const currentTotalLandArea = Object.values(landUses).reduce((sum, lu: LandUse) => sum + lu.area, 0);
    if (currentTotalLandArea > 0) {
        Object.values(LandUseType).forEach(luKey => {
         if (luFsWeights[luKey as LandUseType]) {
           landUseImpact += (landUses[luKey as LandUseType].area / currentTotalLandArea) * luFsWeights[luKey as LandUseType];
         }
       });
    }


    const biodiversityEffect = indicators.biodiversity * INDICATOR_IMPACT_WEIGHTS.FOOD_SECURITY.BIODIVERSITY_IMPACT_ON_FOOD_SECURITY;
    const economicSecurityEffect = indicators.economicSecurity * INDICATOR_IMPACT_WEIGHTS.FOOD_SECURITY.ECONOMIC_SECURITY_IMPACT_ON_FOOD_SECURITY;
    
    const change = (policyImpact * CONTROL_PARAMS.Factor_Impacto_Politicas_y_Presiones_en_Seguridad_Alimentaria_Peso) +
                   (landUseImpact * CONTROL_PARAMS.Factor_Impacto_Usos_del_Suelo_en_Seguridad_Alimentaria_Peso) +
                   (biodiversityEffect * CONTROL_PARAMS.Impacto_Biodiversidad_en_Seguridad_Alimentaria_Peso) +
                   economicSecurityEffect;

    const maxChange = 4;
    const actualChange = Math.max(-maxChange, Math.min(maxChange, change * 0.1));
    return indicators.foodSecurity + actualChange;
};

const calculateEconomicSecurityChange = (policies: Record<Policy, PolicyState>, landUses: Record<LandUseType, LandUse>, indicators: Indicators, currentLevel: number, additionalTaxPressurePercentage: number): number => {
    let policyImpact = 0;
    const esWeights = INDICATOR_IMPACT_WEIGHTS.ECONOMIC_SECURITY.POLICIES;
     Object.values(Policy).forEach(pKey => {
      const policy = policies[pKey as Policy];
      if (esWeights[pKey as Policy] && policy) {
        policyImpact += getPolicyEfficiency(policy, currentLevel) * esWeights[pKey as Policy];
      }
    });

    let landUseImpact = 0;
    const luEsWeights = INDICATOR_IMPACT_WEIGHTS.ECONOMIC_SECURITY.LAND_USE;
    // FIX: Explicitly typed 'lu' to LandUse to resolve type inference issues with Object.values.
    const currentTotalLandArea = Object.values(landUses).reduce((sum, lu: LandUse) => sum + lu.area, 0);
    if (currentTotalLandArea > 0) {
        Object.values(LandUseType).forEach(luKey => {
         if (luEsWeights[luKey as LandUseType]) {
           landUseImpact += (landUses[luKey as LandUseType].area / currentTotalLandArea) * luEsWeights[luKey as LandUseType];
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
        fiscalPressureImpact = (additionalTaxPressurePercentage) * CONTROL_PARAMS.EcoSec_Reduction_Factor_Per_Tax_Point;
    }

    const change = (policyImpact * CONTROL_PARAMS.Factor_Impacto_Politicas_y_Presiones_en_Seguridad_Economica_Peso) +
                   (landUseImpact * CONTROL_PARAMS.Factor_Impacto_Usos_del_Suelo_en_Seguridad_Economica_Peso) +
                   (biodiversityEffect * CONTROL_PARAMS.Impacto_Biodiversidad_en_SE_Peso) +
                   volatilityEffect - fiscalPressureImpact; 
    
    const maxChange = 4; 
    const actualChangeNonFiscal = Math.max(-maxChange, Math.min(maxChange, change * 0.1));
    
    return indicators.economicSecurity + actualChangeNonFiscal; 
};


const calculateSocialConflictChange = (policies: Record<Policy, PolicyState>, landUses: Record<LandUseType, LandUse>, stellaState: StellaStocks, indicators: Indicators, currentLevel: number, additionalTaxPressurePercentage: number): number => {
    let incrementoConflicto = 0;
    const conflictFactors = INDICATOR_IMPACT_WEIGHTS.SOCIAL_WELLBEING.CONFLICT_INCREMENT_FACTORS;
    // FIX: Explicitly typed 'lu' to LandUse to resolve type inference issues with Object.values.
    const currentTotalLandArea = Object.values(landUses).reduce((sum, lu: LandUse) => sum + lu.area, 0);


    if (stellaState.PBI_Real > 0 && (stellaState.Deuda / stellaState.PBI_Real) > conflictFactors.DEBT_PBI_THRESHOLD) {
        incrementoConflicto += conflictFactors.DEBT_PBI_IMPACT;
    }
    const flexRegsPolicy = policies[Policy.FlexibleEnvironmentalRegulations];
    if (flexRegsPolicy) {
      incrementoConflicto += getPolicyEfficiency(flexRegsPolicy, currentLevel) * conflictFactors.POLICY_FLEX_REGS_IMPACT;
    }
    
    const energySubPolicy = policies[Policy.EnergySubsidies];
    if (energySubPolicy && stellaState.Reservas_del_Tesoro < (stellaState.PBI_Real * conflictFactors.LOW_RESERVES_THRESHOLD_FACTOR)) {
        incrementoConflicto += getPolicyEfficiency(energySubPolicy, currentLevel) * conflictFactors.POLICY_ENERGY_SUBSIDIES_LOW_RESERVES_IMPACT;
    }

    if(indicators.foodSecurity < conflictFactors.LOW_FOOD_SECURITY_THRESHOLD) {
        incrementoConflicto += conflictFactors.LOW_FOOD_SECURITY_IMPACT;
    }
    if(indicators.economicSecurity < conflictFactors.LOW_ECONOMIC_SECURITY_THRESHOLD) {
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
        incrementoConflicto += (additionalTaxPressurePercentage) * CONTROL_PARAMS.SocialConflict_Increase_Factor_Per_Tax_Point;
    }

    // --- LÓGICA DE "APROBACIÓN VERDE" ---
    let reduccionConflictoVerde = 0;
    const carbonPolicy = policies[Policy.CarbonNeutrality];
    if (carbonPolicy && getPolicyEfficiency(carbonPolicy, currentLevel) > 0.5) { // Umbral reducido
        reduccionConflictoVerde += 0.8; // Efecto aumentado
    }
    const conservationPolicy = policies[Policy.NaturalConservation];
    if (conservationPolicy && getPolicyEfficiency(conservationPolicy, currentLevel) > 0.5) { // Umbral reducido
        reduccionConflictoVerde += 0.8; // Efecto aumentado
    }
    const waterPolicy = policies[Policy.SustainableWaterManagement];
     if (waterPolicy && getPolicyEfficiency(waterPolicy, currentLevel) > 0.4) { // Umbral reducido
        reduccionConflictoVerde += 0.4; // Efecto aumentado
    }
    // --- FIN DE LA NUEVA LÓGICA ---

    const disipacionConflicto = stellaState.Conflicto_social * CONTROL_PARAMS.Tasa_disipacion_social;
    const change = incrementoConflicto - disipacionConflicto - reduccionConflictoVerde;
    return stellaState.Conflicto_social + change;
};


const calculatePoliticalCollapseChange = (stellaState: StellaStocks, indicators: Indicators): number => {
    let incrementoColapso = 0;
    const collapseFactors = INDICATOR_IMPACT_WEIGHTS.POLITICAL_STABILITY.COLLAPSE_INCREMENT_FACTORS;

    if (indicators.socialWellbeing < collapseFactors.LOW_SOCIAL_WELLBEING_THRESHOLD) {
        incrementoColapso += collapseFactors.LOW_SOCIAL_WELLBEING_IMPACT;
    }
    if (indicators.economicSecurity < collapseFactors.LOW_ECONOMIC_SECURITY_THRESHOLD) {
        incrementoColapso += collapseFactors.LOW_ECONOMIC_SECURITY_IMPACT;
    }
    if (stellaState.PBI_Real > 0 && stellaState.Reservas_del_Tesoro < (stellaState.PBI_Real * collapseFactors.NEGATIVE_RESERVES_THRESHOLD_FACTOR)) {
        incrementoColapso += collapseFactors.NEGATIVE_RESERVES_IMPACT;
    }

    const pressures = [stellaState.PP_AGRICOLA, stellaState.PP_AMBIENTALISTA, stellaState.PP_SOCIAL];
    const maxPressure = Math.max(...pressures);
    const minPressure = Math.min(...pressures);
    const polarizationValue = maxPressure - minPressure;

    if (polarizationValue > CONTROL_PARAMS.Umbral_polarizacion) {
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
};

const generateScoreTooltipText = (gs: GameState): string => {
    const { currentLevel, indicators, stellaSpecificState, activeLevelConfig } = gs;
    let text = `El Puntaje General (0-1000) refleja tu desempeño. Para el Nivel ${currentLevel}, se calcula así:\n\n`;

    const carbonScoreComponentRaw = 100 - (indicators.co2EqEmissionsPerCapita / CONTROL_PARAMS.Referencia_Max_CO2_per_Capita_Puntaje) * 100;
    const carbonScoreComponent = Math.max(0, Math.min(100, carbonScoreComponentRaw));

    if (currentLevel === 1) {
        const scoreWeightBiodiversityL1 = 0.40;
        const scoreWeightCarbonL1 = 0.45;
        const scoreWeightEconL1 = 0.15;
        const econScoreComponent = Math.max(0, Math.min(100, indicators.economicSecurity));
        text += `- Biodiversidad: ${indicators.biodiversity.toFixed(1)}% (Peso: ${(scoreWeightBiodiversityL1 * 100).toFixed(0)}%)\n`;
        text += `- Componente de Carbono: ${carbonScoreComponent.toFixed(1)}% (Peso: ${(scoreWeightCarbonL1 * 100).toFixed(0)}%)\n`;
        text += `  (Basado en Emisiones CO2eq/cápita: ${indicators.co2EqEmissionsPerCapita.toFixed(2)} t/hab. Ref. máx. para puntaje: ${CONTROL_PARAMS.Referencia_Max_CO2_per_Capita_Puntaje} t/hab)\n`;
        text += `- Seguridad Económica: ${econScoreComponent.toFixed(1)}% (Peso: ${(scoreWeightEconL1 * 100).toFixed(0)}%)\n`;
        text += `  (Un mínimo de viabilidad fiscal es necesario para sostener la transición ecológica)\n`;
    } else if (currentLevel === 2) {
        const scoreWeightBiodiversityL2 = 0.15;
        const scoreWeightCarbonL2 = 0.20;
        const scoreWeightPolPressureL2 = 0.30;
        const scoreWeightExternalitiesL2 = 0.35;

        const avgPressure = (indicators.ppAgricola + indicators.ppAmbientalista + indicators.ppSocial) / 3;
        const polPressureScore = Math.max(0, 100 - avgPressure);
        const avgExternalities = (indicators.foodSecurity + indicators.economicSecurity + indicators.socialWellbeing + indicators.politicalStability) / 4;

        text += `- Biodiversidad: ${indicators.biodiversity.toFixed(1)}% (Peso: ${(scoreWeightBiodiversityL2 * 100).toFixed(0)}%)\n`;
        text += `- Componente de Carbono: ${carbonScoreComponent.toFixed(1)}% (Peso: ${(scoreWeightCarbonL2 * 100).toFixed(0)}%)\n`;
        text += `  (Basado en Emisiones CO2eq/cápita: ${indicators.co2EqEmissionsPerCapita.toFixed(2)} t/hab)\n`;
        text += `- Desempeño Político (Presiones): ${polPressureScore.toFixed(1)}% (Peso: ${(scoreWeightPolPressureL2 * 100).toFixed(0)}%)\n`;
        text += `  (Mejor puntaje con presiones políticas bajas: Agrícola ${indicators.ppAgricola.toFixed(0)}%, Ambient. ${indicators.ppAmbientalista.toFixed(0)}%, Social ${indicators.ppSocial.toFixed(0)}%)\n`;
        text += `- Indicadores Socio-Económicos (Externalidades): ${avgExternalities.toFixed(1)}% (Peso: ${(scoreWeightExternalitiesL2 * 100).toFixed(0)}%)\n`;
        text += `  (Promedio de Seg. Alimentaria ${indicators.foodSecurity.toFixed(0)}%, Seg. Económica ${indicators.economicSecurity.toFixed(0)}%, Bienestar Social ${indicators.socialWellbeing.toFixed(0)}%, Estab. Política ${indicators.politicalStability.toFixed(0)}%)\n`;

    } else if (currentLevel === 3) {
        const scoreWeightBiodiversityL3 = 0.10;
        const scoreWeightCarbonL3 = 0.15;
        const scoreWeightPolPressureL3 = 0.20;
        const scoreWeightExternalitiesL3 = 0.25;
        const scoreWeightPbiL3 = 0.30;
        
        const avgPressure = (indicators.ppAgricola + indicators.ppAmbientalista + indicators.ppSocial) / 3;
        const polPressureScore = Math.max(0, 100 - avgPressure);
        const avgExternalities = (indicators.foodSecurity + indicators.economicSecurity + indicators.socialWellbeing + indicators.politicalStability) / 4;
        const pbiScoreReferenceMax = 25000; 
        const pbiScore = Math.max(0, Math.min(100, (indicators.pbi / pbiScoreReferenceMax) * 100));

        text += `- Biodiversidad: ${indicators.biodiversity.toFixed(1)}% (Peso: ${(scoreWeightBiodiversityL3 * 100).toFixed(0)}%)\n`;
        text += `- Componente de Carbono: ${carbonScoreComponent.toFixed(1)}% (Peso: ${(scoreWeightCarbonL3 * 100).toFixed(0)}%)\n`;
        text += `  (Basado en Emisiones CO2eq/cápita: ${indicators.co2EqEmissionsPerCapita.toFixed(2)} t/hab)\n`;
        text += `- Desempeño Político (Presiones): ${polPressureScore.toFixed(1)}% (Peso: ${(scoreWeightPolPressureL3 * 100).toFixed(0)}%)\n`;
        text += `  (Mejor puntaje con presiones políticas bajas)\n`;
        text += `- Indicadores Socio-Económicos (Externalidades): ${avgExternalities.toFixed(1)}% (Peso: ${(scoreWeightExternalitiesL3 * 100).toFixed(0)}%)\n`;
        text += `  (Promedio de Seg. Alimentaria ${indicators.foodSecurity.toFixed(0)}%, Seg. Económica ${indicators.economicSecurity.toFixed(0)}%, Bienestar Social ${indicators.socialWellbeing.toFixed(0)}%, Estab. Política ${indicators.politicalStability.toFixed(0)}%)\n`;
        text += `- Desempeño PBI: ${pbiScore.toFixed(1)}% (Peso: ${(scoreWeightPbiL3 * 100).toFixed(0)}%)\n`;
        text += `  (PBI Actual: ${indicators.pbi.toFixed(0)}, Ref. para 100% en este componente: ${pbiScoreReferenceMax})\n`;
    }

    text += `\nLa suma ponderada de estos componentes (0-100) se multiplica por 10 para el puntaje final.`;
    const targetScoreForLevel = activeLevelConfig?.winConditions?.puntajeGeneralMin;
    if (targetScoreForLevel !== undefined) {
        text += `\n\nEl objetivo de puntaje mínimo para superar el Nivel ${currentLevel} es ${targetScoreForLevel}.`;
        text += `\n(Verde: Cumpliendo/Superando objetivo. Amarillo: Cercano. Rojo: Lejos del objetivo).`;
    }
    return text;
};


const getDynamicScoreColorClass = (score: number, activeLevelConfig?: LevelConfig): string => {
    const targetMinScore = activeLevelConfig?.winConditions?.puntajeGeneralMin;

    if (targetMinScore === undefined) {
        if (score > 600) return 'text-green-400';
        if (score > 400) return 'text-yellow-400';
        return 'text-red-400';
    }

    if (score >= targetMinScore) {
        return 'text-green-400'; 
    } else if (score >= targetMinScore * 0.75) {
        return 'text-yellow-400'; 
    } else {
        return 'text-red-400'; 
    }
};

// FIX: Removed React.FC type from component definition to align with modern functional component best practices and avoid potential assignment errors.
export const App = () => {
  const { authStage, user, handleGoogleLogin, handleDemo, handleSignOut } = useAuth();
  const { t } = useT();
  const { startSession, resetSession, saveFinalSnapshot, savePreSurvey, savePostSurvey, endSession } = useSessionPersistence(user?.id ?? null);

  const [gameState, setGameState] = useState<GameState>(() => {
    const { gameStatePatch } = createInitialState(1);
    return {
      ...gameStatePatch,
      finances: { ...INITIAL_FINANCES },
      gameLog: [`Año ${INITIAL_YEAR} (N1): Juego iniciado. Nivel 1: ${gameStatePatch.activeLevelConfig?.name}`],
      isSimulating: false,
      gameOverReason: null,
      loanRequestedThisRound: 0,
      currentEvent: null,
      newsHeadlines: [],
      wonLevels: [],
      _pendingLevelIntroTrigger: null,
    };
  });

  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [controlParams, setControlParams] = useState<ControlParams>(CONTROL_PARAMS);
  const controlParamsRef = useRef<ControlParams>(CONTROL_PARAMS);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isBotLoading, setIsBotLoading] = useState(false);
  const [apiKeyAvailable, setApiKeyAvailable] = useState(!!process.env.API_KEY);
  const [hasSentFinalDecarbonitoMessage, setHasSentFinalDecarbonitoMessage] = useState(false);
  const [currentSuggestedQuestions, setCurrentSuggestedQuestions] = useState<string[]>([]);
  const [levelEndInfo, setLevelEndInfo] = useState<{level: number; status: 'won' | 'lost'; reason: string} | null>(null);
  const [toasts, setToasts] = useState<{id: number, message: string, type: 'info' | 'warning' | 'error'}[]>([]);

  const gameStateRef = useRef(gameState);
  
  const [tutorialSeen, setTutorialSeen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('decarbonationTutorialSeen_v1') === 'true';
    } catch (e) {
      console.error("Could not access localStorage to check for tutorial:", e);
      return false;
    }
  });
  const [showTutorialModal, setShowTutorialModal] = useState<boolean>(false);
  const [showClosingSynthesisModal, setShowClosingSynthesisModal] = useState<boolean>(false);
  const [showLevelIntroModalForLevel, setShowLevelIntroModalForLevel] = useState<number | null>(null);
  const [showFacilitatorManual, setShowFacilitatorManual] = useState(false);
  const [showPlayerManual, setShowPlayerManual] = useState(false);
  const [showEquationsManual, setShowEquationsManual] = useState(false);
  const [showPreSurvey, setShowPreSurvey] = useState(false);
  const [showPostSurvey, setShowPostSurvey] = useState(false);
  const [showFacilitatorPanel, setShowFacilitatorPanel] = useState(false);
  const [showGameSummary, setShowGameSummary] = useState(false);
  const [postSurveyResult, setPostSurveyResult] = useState<'victoria' | 'derrota' | 'abandono'>('derrota');

  // Cover/portada screen: shown before everything else on first entry (see criteria in
  // ultimo-ajuste/02_pantalla_portada_e_identidad.md), and reopenable anytime via Header's
  // "Acerca de" button without losing in-progress game state.
  const [showCoverGate, setShowCoverGate] = useState<boolean>(() => {
    try {
      return localStorage.getItem('decarbonationCoverSeen_v1') !== 'true';
    } catch (e) {
      console.error("Could not access localStorage to check for cover screen:", e);
      return true;
    }
  });
  const [showAboutCover, setShowAboutCover] = useState(false);
  const [coverSeenPreference, setCoverSeenPreference] = useState<boolean>(() => {
    try {
      return localStorage.getItem('decarbonationCoverSeen_v1') === 'true';
    } catch (e) {
      return false;
    }
  });

  const handleDismissCover = (dontShowAgain: boolean) => {
    try {
      if (dontShowAgain) {
        localStorage.setItem('decarbonationCoverSeen_v1', 'true');
      } else {
        localStorage.removeItem('decarbonationCoverSeen_v1');
      }
    } catch (e) {
      console.error("Could not write to localStorage for cover screen:", e);
    }
    setCoverSeenPreference(dontShowAgain);
  };


  const handleToggleFacilitatorManual = () => {
      setShowFacilitatorManual(prev => !prev);
  };
  
  const handleTogglePlayerManual = () => {
      setShowPlayerManual(prev => !prev);
  };
  
  const handleToggleEquationsManual = () => {
      setShowEquationsManual(prev => !prev);
  };

  useEffect(() => {
    gameStateRef.current = gameState;
    if (apiKeyAvailable) {
      setCurrentSuggestedQuestions(getSuggestedQuestions(gameState, getActiveLanguage()));
    }
  }, [gameState, apiKeyAvailable]);

  useEffect(() => { controlParamsRef.current = controlParams; }, [controlParams]);
  
  const removeToast = useCallback((id: number) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: 'info' | 'warning' | 'error' = 'info') => {
      const id = Date.now() + Math.random(); 
      setToasts(prevToasts => [...prevToasts, { id, message, type }]);
  }, []);

  const logEvent = useCallback((message: string) => {
    setGameState(prev => ({
      ...prev,
      gameLog: [`Año ${prev.year} (N${prev.currentLevel}): ${message}`].concat(prev.gameLog).slice(0,100)
    }));
  }, []);

  const addMessageToChat = useCallback((text: string, sender: 'user' | 'bot' | 'system', emphasisType: ChatMessageEmphasisType = 'standard') => {
    setChatMessages(prev => [...prev, { sender, text, timestamp: Date.now(), emphasisType }]);
  }, []);
  
  useEffect(() => {
    let mainTutorialAlreadySeen = false;
    try {
        mainTutorialAlreadySeen = localStorage.getItem('decarbonationTutorialSeen_v1') === 'true';
    } catch(e) {
        console.error("Could not read localStorage for tutorial status:", e);
    }

    let l1IntroAlreadySeenThisSession = false;
    try {
        l1IntroAlreadySeenThisSession = sessionStorage.getItem('decarbonationL1IntroSeen_v1') === 'true';
    } catch(e) {
        console.error("Could not read sessionStorage for intro status:", e);
    }

    if (!mainTutorialAlreadySeen && !gameState.gameOverReason && !showTutorialModal && !showLevelIntroModalForLevel) {
        setShowTutorialModal(true);
    } else if (mainTutorialAlreadySeen && !l1IntroAlreadySeenThisSession && gameState.currentLevel === 1 && !gameState.gameOverReason && !showTutorialModal && !showLevelIntroModalForLevel) {
        setShowLevelIntroModalForLevel(1);
        try {
            sessionStorage.setItem('decarbonationL1IntroSeen_v1', 'true');
        } catch(e) {
            console.error("Could not write to sessionStorage for intro status:", e);
        }
    }

    // Only show pre-survey and start a new session when there is no active game over
    // (avoids spurious session creation when gameOverReason changes trigger this effect)
    if (!gameState.gameOverReason) {
      if (authStage === 'authenticated' && !sessionStorage.getItem('decarbonationPreSurveyDone_v1')) {
        setShowPreSurvey(true);
      }
      startSession(gameState.currentLevel, INITIAL_YEAR);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.currentLevel, gameState.gameOverReason, showTutorialModal, showLevelIntroModalForLevel, authStage]);


  const handleCloseTutorial = () => {
    setShowTutorialModal(false);
    if (!tutorialSeen) { 
        setShowLevelIntroModalForLevel(1);
        try {
            sessionStorage.setItem('decarbonationL1IntroSeen_v1', 'true');
        } catch (e) {
            console.error("Could not write to sessionStorage for L1 intro:", e);
        }
    }
    setTutorialSeen(true);
    try {
      localStorage.setItem('decarbonationTutorialSeen_v1', 'true');
    } catch (e) {
      console.error("Could not write to localStorage for tutorial:", e);
    }
  };

  const handleShowTutorial = () => {
    setShowTutorialModal(true);
  };


  useEffect(() => {
    if (!apiKeyAvailable) {
      addMessageToChat(API_KEY_ERROR_MESSAGE, 'system', 'system_error');
      logEvent(API_KEY_ERROR_MESSAGE);
    } else {
      const initialBotMessage = "¡Hola! Soy DecarboNito, tu asesor. ¿En qué puedo ayudarte con DecarboNation?";
      if (chatMessages.length === 0 || (chatMessages.length > 0 && !chatMessages.some(m => m.text === initialBotMessage && m.sender === 'bot'))) {
         addMessageToChat(initialBotMessage, 'bot', 'standard');
      }
    }
  }, [apiKeyAvailable, addMessageToChat, logEvent, chatMessages.length]);


  const handleUserChatSubmit = useCallback(async (userInput: string) => {
    if (!userInput.trim() || isBotLoading || !apiKeyAvailable) return;

    addMessageToChat(userInput, 'user');
    setIsBotLoading(true);

    try {
      const botResponseText = await askGemini(userInput, gameStateRef.current, 'GENERAL_ASSISTANCE', getActiveLanguage());
      addMessageToChat(botResponseText, 'bot');
    } catch (error) {
      console.error("Error comunicándose con Gemini:", error);
      const errorMessageText = error instanceof Error ? error.message : "Lo siento, tuve problemas para procesar tu solicitud.";
      addMessageToChat(`Error: ${errorMessageText}`, 'system', 'system_error');
      logEvent(`Error del chatbot: ${errorMessageText}`);
    } finally {
      setIsBotLoading(false);
    }
  }, [isBotLoading, apiKeyAvailable, addMessageToChat, logEvent]);
  
  const handleLessonsLearnedStart = useCallback(() => {
    setShowClosingSynthesisModal(true);
  }, []);


  useEffect(() => {
    if (!gameState.gameOverReason) return;
    // Lessons-learned modal (guarded by hasSentFinalDecarbonitoMessage)
    if (!hasSentFinalDecarbonitoMessage) {
      setHasSentFinalDecarbonitoMessage(true);
      handleLessonsLearnedStart();
    }
  }, [gameState.gameOverReason, hasSentFinalDecarbonitoMessage, handleLessonsLearnedStart]);

  // Persistir el estado FINAL de la sesión exactamente una vez al concluir
  // la partida (annual_snapshots: una fila por sesión) y cerrar la sesión
  // (game_sessions.resultado/nivel_alcanzado/año_fin), independientemente
  // de si el jugador completa o no la encuesta post. El disparo de la encuesta
  // post-partida NO vive acá: se encadena desde el onClose de la síntesis de
  // cierre (handleClosingSynthesisDismissed) para garantizar el orden síntesis → encuesta.
  useEffect(() => {
    if (!gameState.gameOverReason) return;

    const resultadoFinal: 'victoria' | 'derrota' | 'abandono' =
      gameState.gameOverReason === 'Partida abandonada por el jugador.'
        ? 'abandono'
        : (gameState.gameOverReason.toLowerCase().includes('victoria') ? 'victoria' : 'derrota');

    const activePolicies = Object.values(gameState.policies).filter((p: any) => p.isActive).map((p: any) => p.id);
    saveFinalSnapshot({
      biodiversidad_final: gameState.indicators.biodiversity,
      co2_final: gameState.indicators.co2EqEmissionsPerCapita,
      seg_alimentaria_final: gameState.indicators.foodSecurity,
      seg_economica_final: gameState.indicators.economicSecurity,
      score_final: gameState.indicators.generalScore,
    }, activePolicies);
    endSession(resultadoFinal, gameState.currentLevel, gameState.year);
    // This effect depends only on gameOverReason so it fires exactly once per game-over
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.gameOverReason]);

  // Triggers the post-session survey once the closing synthesis modal has been dismissed
  // (called from its onClose below). Kept as an imperative handler rather than a second
  // useEffect keyed on gameOverReason: both the synthesis modal and this survey are
  // full-screen z-[1000] overlays, and two effects firing off the same gameOverReason change
  // would both read stale state in the same commit and open simultaneously. Chaining off the
  // modal's onClose instead guarantees a strict survey-after-synthesis sequence, with the
  // synthesis modal always shown first for every ending (won/lost/abandoned) and the survey
  // skipped only for an abandoned session, matching the previous behavior.
  const handleClosingSynthesisDismissed = useCallback(() => {
    setShowClosingSynthesisModal(false);
    const reason = gameStateRef.current.gameOverReason;
    if (reason && reason !== 'Partida abandonada por el jugador.') {
      const resultado = reason.toLowerCase().includes('victoria') ? 'victoria' : 'derrota';
      setPostSurveyResult(resultado);
      setShowPostSurvey(true);
    }
  }, []);


 const progressToNextLevel = useCallback(() => {
    setGameState(prev => {
        if (!prev.lastConcludedLevelInfo || prev.lastConcludedLevelInfo.status !== 'won' || prev.gameOverReason || prev.currentLevel >= MAX_LEVELS) {
            return prev;
        }

        const newLevelNumber = prev.currentLevel + 1;
        const { gameStatePatch, initialHistoricalDataPoint } = createInitialState(newLevelNumber);
        if (!gameStatePatch.activeLevelConfig) return prev;

        setHistoricalData([initialHistoricalDataPoint]);
        setShowLevelIntroModalForLevel(newLevelNumber);

        return {
            ...prev,
            ...gameStatePatch,
            gameLog: [`Año ${INITIAL_YEAR} (N${newLevelNumber}): Nuevo Nivel Iniciado: ${gameStatePatch.activeLevelConfig?.name}`].concat(prev.gameLog).slice(0, 100),
        };
    });
 }, []);

  const handleCloseLevelEndModal = useCallback(() => {
    const lastResult = gameStateRef.current.lastConcludedLevelInfo;
    setLevelEndInfo(null); 

    if (lastResult?.status === 'won') {
        if (lastResult.level < MAX_LEVELS) {
            progressToNextLevel();
        } else {
            setGameState(prev => ({
              ...prev,
              gameOverReason: "¡Victoria! Has completado todos los desafíos de DecarboNation.",
              lastConcludedLevelInfo: null 
            }));
        }
    } else if (lastResult?.status === 'lost') {
        const retryLevelNumber = lastResult.level;
        const { gameStatePatch, initialHistoricalDataPoint } = createInitialState(retryLevelNumber);
        if (!gameStatePatch.activeLevelConfig) {
            setGameState(prev => ({ ...prev, lastConcludedLevelInfo: null }));
            return;
        }

        setHistoricalData([initialHistoricalDataPoint]);

        setGameState(prev => ({
            ...prev,
            ...gameStatePatch,
            gameOverReason: null,
            gameLog: [`Año ${INITIAL_YEAR} (N${retryLevelNumber}): Nivel reiniciado tras no alcanzar los objetivos ("Volver a Intentar").`].concat(prev.gameLog).slice(0, 100),
        }));
    }
  }, [progressToNextLevel]);
  

 useEffect(() => {
    const lastInfo = gameState.lastConcludedLevelInfo;
    
    if (lastInfo && !levelEndInfo) {
        if (lastInfo.status === 'won') {
        } else {
        }
        setLevelEndInfo({
            level: lastInfo.level,
            status: lastInfo.status,
            reason: lastInfo.reason,
        });
    }

    if (lastInfo && !gameState.sentLevelReflectionMessage && apiKeyAvailable && !showClosingSynthesisModal) {
      const { level, status, reason, finalIndicators, winConditions } = lastInfo;
      
      let prompt = `El Nivel ${level} de DecarboNation ha concluido.\n`;
      prompt += `Resultado: ${status === 'won' ? '¡Nivel Superado!' : 'Nivel No Superado.'}\n`;
      prompt += `Razón Detallada: ${reason}\n\n`;
      prompt += `Análisis de Desempeño para el Nivel ${level} (enfócate SÓLO en estos indicadores y objetivos específicos de este nivel):\n`;

      if (winConditions) {
        if (winConditions.puntajeGeneralMin !== undefined) {
            prompt += `  - Puntaje General: Objetivo >= ${winConditions.puntajeGeneralMin}. Logrado: ${finalIndicators.generalScore.toFixed(1)}\n`;
        }
        if (winConditions.biodiversityMin !== undefined) {
            prompt += `  - Biodiversidad: Objetivo >= ${winConditions.biodiversityMin}%. Logrado: ${finalIndicators.biodiversity.toFixed(1)}%\n`;
        }
        if (winConditions.co2EqEmissionsPerCapitaMax !== undefined) {
            prompt += `  - Emisiones CO2eq/cápita: Objetivo <= ${winConditions.co2EqEmissionsPerCapitaMax} t/hab. Logrado: ${finalIndicators.co2EqEmissionsPerCapita.toFixed(2)} t/hab\n`;
        }
         if (winConditions.nativeForestTotalMinPercentage !== undefined && level === 1) {
            const currentTotalLandArea = (Object.values(gameStateRef.current.landUses) as LandUse[]).reduce((sum, lu) => sum + lu.area, 0);
            const nativeForestArea = gameStateRef.current.landUses[LandUseType.ProtectedNativeForest].area + gameStateRef.current.landUses[LandUseType.UnprotectedNativeForest].area;
            const nativeForestPercentage = currentTotalLandArea > 0 ? (nativeForestArea / currentTotalLandArea) * 100 : 0;
            prompt += `  - % Bosque Nativo Total: Objetivo >= ${(winConditions.nativeForestTotalMinPercentage * 100).toFixed(0)}%. Logrado: ${nativeForestPercentage.toFixed(1)}%\n`;
        }
        
        if (level >= 2) {
             if (winConditions.foodSecurityMin !== undefined) {
                prompt += `  - Seguridad Alimentaria: Objetivo >= ${winConditions.foodSecurityMin}%. Logrado: ${finalIndicators.foodSecurity.toFixed(1)}%\n`;
            }
            if (winConditions.economicSecurityMin !== undefined) {
                prompt += `  - Seguridad Económica: Objetivo >= ${winConditions.economicSecurityMin}%. Logrado: ${finalIndicators.economicSecurity.toFixed(1)}%\n`;
            }
            if (winConditions.bienestarSocialMin !== undefined) {
                prompt += `  - Bienestar Social: Objetivo >= ${winConditions.bienestarSocialMin}%. Logrado: ${finalIndicators.socialWellbeing.toFixed(1)}%\n`;
            }
             if (winConditions.politicalStabilityMin !== undefined) {
                prompt += `  - Estabilidad Política: Objetivo >= ${winConditions.politicalStabilityMin}%. Logrado: ${finalIndicators.politicalStability.toFixed(1)}%\n`;
            }
            if (winConditions.ppAgricolaMax !== undefined) {
                prompt += `  - Presión Agrícola: Objetivo < ${winConditions.ppAgricolaMax}%. Logrado: ${finalIndicators.ppAgricola.toFixed(1)}%\n`;
            }
            if (winConditions.ppAmbientalistaMax !== undefined) {
                prompt += `  - Presión Ambientalista: Objetivo < ${winConditions.ppAmbientalistaMax}%. Logrado: ${finalIndicators.ppAmbientalista.toFixed(1)}%\n`;
            }
            if (winConditions.ppSocialMax !== undefined) {
                prompt += `  - Presión Social: Objetivo < ${winConditions.ppSocialMax}%. Logrado: ${finalIndicators.ppSocial.toFixed(1)}%\n`;
            }
        }

        if (level === 3) {
            if (winConditions.deudaPbiMax !== undefined) {
                 const deudaPbiRatio = gameStateRef.current.stellaSpecificState.PBI_Real > 0 ? (gameStateRef.current.stellaSpecificState.Deuda / gameStateRef.current.stellaSpecificState.PBI_Real) : Infinity;
                 prompt += `  - Ratio Deuda/PBI: Objetivo <= ${winConditions.deudaPbiMax}. Logrado: ${deudaPbiRatio.toFixed(2)}\n`;
            }
            if (winConditions.pbiMin !== undefined) {
                prompt += `  - PBI: Objetivo >= ${winConditions.pbiMin}. Logrado: ${finalIndicators.pbi.toFixed(0)}\n`;
            }
            prompt += `  - Presión Fiscal Adicional Aplicada al final: ${gameStateRef.current.additionalTaxPressurePercentage}%\n`;
        }
      }
      prompt += `\nComo DecarboNito, por favor ofrece una breve reflexión sobre el desempeño del jugador EN ESTE NIVEL (${level}), enfocándote en los aspectos mencionados y su relevancia para los objetivos de este nivel en particular. Sé conciso. El juego ahora avanza 1 año por simulación. Responde en ESPAÑOL.`;
      if (level >=2) {
        prompt += `\nSi el jugador utilizó instrumentos de política, puedes comentar brevemente si su estrategia de asignación de esfuerzo parece haber contribuido o no al resultado del nivel, de forma general.`;
      }
      if (level === 3) {
         prompt += `\nSi ocurrieron eventos aleatorios o se generaron noticias, considera mencionarlos si fueron particularmente impactantes.`
      }

      setIsBotLoading(true);
      askGemini(prompt, gameStateRef.current, 'LEVEL_REFLECTION', getActiveLanguage())
        .then(response => {
          addMessageToChat(response, 'bot', 'level_event');
          logEvent(`Reflexión de DecarboNito para Nivel ${level} recibida.`);
          setGameState(prev => ({ ...prev, sentLevelReflectionMessage: true }));
        })
        .catch(error => {
          const errorMsg = `Error obteniendo reflexión de DecarboNito para Nivel ${level}: ${error instanceof Error ? error.message : String(error)}`;
          addMessageToChat(errorMsg, 'system', 'system_error');
          logEvent(errorMsg);
        })
        .finally(() => {
          setIsBotLoading(false);
        });
    }

  }, [gameState.lastConcludedLevelInfo, gameState.sentLevelReflectionMessage, apiKeyAvailable, addMessageToChat, logEvent, gameStateRef, showClosingSynthesisModal, levelEndInfo]);


  const updateHistoricalData = useCallback((currentState: GameState) => {
    const currentYearData: HistoricalDataPoint = {
      year: currentState.year,
      biodiversity: currentState.indicators.biodiversity,
      foodSecurity: currentState.indicators.foodSecurity,
      economicSecurity: currentState.indicators.economicSecurity,
      socialWellbeing: currentState.indicators.socialWellbeing,
      generalScore: currentState.indicators.generalScore,
      co2EqEmissionsPerCapita: currentState.indicators.co2EqEmissionsPerCapita,
      politicalStability: currentState.indicators.politicalStability,
      pbi: currentState.indicators.pbi,
      debt: currentState.indicators.debt,
      ppAgricola: currentState.indicators.ppAgricola,
      ppAmbientalista: currentState.indicators.ppAmbientalista,
      ppSocial: currentState.indicators.ppSocial,
      treasuryReserves: currentState.indicators.treasuryReserves,
    };
     setHistoricalData(prev => {
        if (prev.length > 0 && prev[prev.length - 1].year === currentYearData.year) {
            return prev.map((item, index) => index === prev.length - 1 ? currentYearData : item);
        }
        return [...prev, currentYearData];
     });
    // Nota: la persistencia en Supabase del snapshot ya NO ocurre acá (por año).
    // annual_snapshots se recortó a una sola fila por sesión con el estado
    // FINAL — ver saveFinalSnapshot(), llamado una única vez al concluir la
    // partida (efecto de gameOverReason más abajo).
  }, []);


  const togglePolicy = useCallback((policyId: Policy) => {
    setGameState(prev => {
      const currentYear = prev.year;
      // Deep clone (not `{ ...prev.policies }`): a shallow copy still shares the nested
      // PolicyState/instrument objects with `prev`, and the code below mutates them in place.
      // Under React 18 StrictMode, state updaters run twice; the first (discarded) pass would
      // otherwise corrupt `prev` itself, and the second pass would then toggle right back —
      // reproducible in `npm run dev` (StrictMode is dev-only, so this was invisible in prod).
      const newPolicies = JSON.parse(JSON.stringify(prev.policies)) as Record<Policy, PolicyState>;
      const policyToggled = newPolicies[policyId];

      if (!policyToggled.isActive) { 
        // FIX: Add explicit type annotation to fix potential 'unknown' type error on 'p'.
        const activePoliciesCount = Object.values(newPolicies).filter((p: PolicyState) => p.isActive).length;
        if (activePoliciesCount >= MAX_ACTIVE_POLICIES) {
          const message = `No se puede activar '${policyToggled.name}'. Ya hay ${MAX_ACTIVE_POLICIES} políticas activas (máximo permitido).`;
          logEvent(message);
          addToast(message, 'warning');
          return prev;
        }
        policyToggled.isActive = true;
        policyToggled.currentEfficiency = policyToggled.initialEfficiency || 1;
        policyToggled.previousEfficiencyForNotification = policyToggled.currentEfficiency; 
        logEvent(`Política '${policyToggled.name}' seleccionada. Se activará en la próxima simulación.`);
        
        return { ...prev, policies: newPolicies };

      } else { 
        if (policyToggled.activationYear !== undefined && currentYear < policyToggled.activationYear + POLICY_LOCK_IN_DURATION) {
          const unlockYear = policyToggled.activationYear + POLICY_LOCK_IN_DURATION;
          const message = `No se puede desactivar '${policyToggled.name}'. La política está bloqueada hasta el año ${unlockYear}.`;
          logEvent(message);
          addToast(message, 'warning');
          return prev;
        }

        policyToggled.isActive = false;
        policyToggled.activationYear = undefined; 
        
        if (policyToggled.instruments) {
            // FIX: Add explicit type annotation to fix potential 'unknown' type error on 'inst'.
            Object.values(policyToggled.instruments).forEach((inst: PolicyInstrument) => inst.effortPercentage = 0);
            policyToggled.totalInstrumentEffortApplied = 0;
        }
        logEvent(`Política '${policyToggled.name}' desactivada.`);
        
        return { ...prev, policies: newPolicies };
      }
    });
  }, [logEvent, addToast]);

  const handleInstrumentEffortChange = useCallback((policyId: Policy, instrumentId: string, newEffort: number) => {
    setGameState(prev => {
        const policyToUpdate = prev.policies[policyId];
        if (!policyToUpdate || !policyToUpdate.instruments || !policyToUpdate.instruments[instrumentId]) {
            logEvent(`Error: Instrumento ${instrumentId} no encontrado para la política ${policyId}`);
            return prev;
        }

        const newPolicies = JSON.parse(JSON.stringify(prev.policies)) as Record<Policy, PolicyState>;
        const targetPolicy = newPolicies[policyId];
        const targetInstrument = targetPolicy.instruments![instrumentId];

        const parsedEffort = Math.max(0, Math.min(100, Number(newEffort) || 0));
        targetInstrument.effortPercentage = parsedEffort;

        let currentTotalEffort = 0;
// FIX: Explicitly typed 'inst' as PolicyInstrument to resolve type inference issues where Object.values().forEach() was inferring 'inst' as 'unknown', causing property access errors.
        Object.values(targetPolicy.instruments!).forEach((inst: PolicyInstrument) => {
            currentTotalEffort += inst.effortPercentage;
        });
        
        if (currentTotalEffort > 100) {
            const excess = currentTotalEffort - 100;
            targetInstrument.effortPercentage = Math.max(0, targetInstrument.effortPercentage - excess);
// FIX: Explicitly typed 'inst' as PolicyInstrument to resolve type inference issues where Object.values().reduce() was inferring 'inst' as 'unknown', causing property access errors.
            currentTotalEffort = Object.values(targetPolicy.instruments!).reduce((sum: number, inst: PolicyInstrument) => sum + inst.effortPercentage, 0);
        }
        targetPolicy.totalInstrumentEffortApplied = Math.min(100, currentTotalEffort);

        logEvent(`Esfuerzo para instrumento '${targetInstrument.name}' (Política: ${targetPolicy.name}) establecido a ${targetInstrument.effortPercentage}%. Esfuerzo total de política: ${targetPolicy.totalInstrumentEffortApplied}%.`);
        return { ...prev, policies: newPolicies };
    });
  }, [logEvent]);

  const handleAdditionalTaxPressureChange = useCallback((newPressure: number) => {
    setGameState(prev => {
        if (prev.currentLevel !== 3) {
            logEvent("La presión fiscal adicional solo está disponible en el Nivel 3.");
            return prev;
        }
        const validatedPressure = Math.max(0, Math.min(CONTROL_PARAMS.Max_Additional_Tax_Rate_Percentage, newPressure));
        logEvent(`Presión Fiscal Adicional ajustada a ${validatedPressure}%.`);
        return { ...prev, additionalTaxPressurePercentage: validatedPressure };
    });
  }, [logEvent]);


  const requestLoan = useCallback((amount: number) => {
    setGameState(prev => {
      if (prev.currentLevel < 3 && prev.year < CONTROL_PARAMS.Ano_Activacion_Prestamo) {
        const message = `Los préstamos no están disponibles hasta el Nivel 3 o el año ${CONTROL_PARAMS.Ano_Activacion_Prestamo}.`;
        logEvent(message);
        addToast(message, 'info');
        return prev;
      }
      if (amount <= 0) {
        const message = "Monto de préstamo inválido solicitado. Debe ser mayor a cero.";
        logEvent(message);
        addToast(message, 'warning');
        return prev;
      }
      const maxLoanable = prev.stellaSpecificState.PBI_Real * 0.1; 
      const actualLoanAmount = Math.min(amount, maxLoanable);
      
      if (amount > maxLoanable) {
        const message = `El monto solicitado (${amount.toFixed(0)}) excede el máximo (${maxLoanable.toFixed(0)}). Préstamo ajustado al máximo.`;
        logEvent(message);
        addToast(message, 'warning');
      }

      logEvent(`Préstamo de ${actualLoanAmount.toFixed(0)} solicitado para la próxima simulación.`);
      addToast(`Préstamo de ${actualLoanAmount.toFixed(0)} solicitado.`, 'info');
      return { ...prev, loanRequestedThisRound: prev.loanRequestedThisRound + actualLoanAmount };
    });
  }, [logEvent, addToast]);

  const togglePact = useCallback((pactId: string) => {
    setGameState(prev => {
      const newPacts = { ...prev.pacts };
      if (!newPacts[pactId]) return prev;
      // Clone just this pact (not JSON deep-clone: `effects` is a function and would be
      // stripped) before mutating it below — same shared-reference/StrictMode issue as
      // togglePolicy above.
      const pactToggled = { ...newPacts[pactId] };
      newPacts[pactId] = pactToggled;

      if (prev.year < (pactToggled.unlockYear || 0)) {
        const message = `El pacto '${pactToggled.name}' aún no está disponible (disponible en ${pactToggled.unlockYear}).`;
        logEvent(message);
        addToast(message, 'info');
        return prev;
      }

      const wasActive = pactToggled.isActive;
      pactToggled.isActive = !pactToggled.isActive;

      let newTreasuryReserves = prev.stellaSpecificState.Reservas_del_Tesoro;
      let logMsg = "";
      let toastMsg = "";
      let toastType: 'info' | 'warning' | 'error' = 'info';

      if (pactToggled.isActive && !wasActive && pactToggled.costToJoin) {
        if (newTreasuryReserves >= pactToggled.costToJoin) {
          newTreasuryReserves -= pactToggled.costToJoin;
          logMsg = `Se unió al pacto '${pactToggled.name}'. Costo: ${pactToggled.costToJoin}.`;
          toastMsg = logMsg;
        } else {
          pactToggled.isActive = false; 
          logMsg = `Fondos insuficientes para unirse a '${pactToggled.name}'. Se necesitan ${pactToggled.costToJoin} y solo tienes ${prev.stellaSpecificState.Reservas_del_Tesoro.toFixed(0)}.`;
          toastMsg = logMsg;
          toastType = 'error';
        }
      } else if (!pactToggled.isActive && wasActive) {
        logMsg = `Abandonó el pacto '${pactToggled.name}'.`;
        toastMsg = logMsg;
      } else {
         logMsg = `Pacto '${pactToggled.name}' ahora está ${pactToggled.isActive ? 'activo' : 'inactivo'}.`;
      }
      
      logEvent(logMsg);
      if (toastMsg) {
        addToast(toastMsg, toastType);
      }
      return {
        ...prev,
        pacts: newPacts,
        stellaSpecificState: {
          ...prev.stellaSpecificState,
          Reservas_del_Tesoro: newTreasuryReserves
        },
        indicators: { 
          ...prev.indicators,
          treasuryReserves: newTreasuryReserves
        }
      };
    });
  }, [logEvent, addToast]);


  const handleAbandonGame = useCallback(() => {
    if (gameStateRef.current.gameOverReason) return;
    setPostSurveyResult('abandono');
    setGameState(s => ({ ...s, gameOverReason: 'Partida abandonada por el jugador.' }));
    setShowPostSurvey(true);
  }, []);

  // Phase 5 (mejora-general/files/17_multiples_vias_victoria.md): replaces the old
  // level-3-only, flat-checklist reason generator with a route-aware one that works for every
  // level. Module-level pure function (not a hook) so it does not need to join runSimulationRound
  // useCallback's dependency array -- t() is passed in explicitly by the caller.
  const generateRouteOutcomeReason = (
    outcome: ReturnType<typeof evaluateLevel>,
    t: (key: any, values?: Record<string, string | number>) => string,
  ): string => {
    const fmtVal = (n: number) => (Math.abs(n) >= 1000 ? n.toFixed(0) : n.toFixed(1));

    if (outcome.achieved) {
      const rp = outcome.routes.find((r) => r.route.id === outcome.achieved!.id)!;
      const lines = rp.conditions.map((c) => {
        const arrow = c.condition.dir === 'min' ? '>=' : '<=';
        return `${c.met ? '✅' : '➖'} ${t(c.condition.labelKey)} ${arrow} ${fmtVal(c.condition.target)} (logrado: ${fmtVal(c.value)})`;
      });
      return `${t('routes.achieved', { route: t(outcome.achieved.nameKey) })}\n\n${lines.join('\n')}`;
    }

    const closest = outcome.closest;
    const lines = closest.conditions.map((c) => {
      const arrow = c.condition.dir === 'min' ? '>=' : '<=';
      return `${c.met ? '✅' : '❌'} ${t(c.condition.labelKey)} ${arrow} ${fmtVal(c.condition.target)} (${fmtVal(c.value)})`;
    });
    const bottleneckText = closest.bottleneck ? t(closest.bottleneck.labelKey) : '';
    const header = outcome.floorsMet
      ? t('routes.closest', { route: t(closest.route.nameKey), condition: bottleneckText })
      : `${t('routes.floorsBroken')}: ${outcome.failedFloors.map((f) => t(f.labelKey)).join(', ')}`;
    return `${header}\n\n${lines.join('\n')}`;
  };

  const runSimulationRound = useCallback(async () => {
    const CP = controlParamsRef.current;
    if (gameStateRef.current.gameOverReason) {
        const message = "Juego terminado. No se puede ejecutar la simulación.";
        logEvent(message);
        addToast(message, 'info');
        return;
    }
    // FIX: Add explicit type annotation to fix potential 'unknown' type error on 'p'.
    const anyPolicyActive = Object.values(gameStateRef.current.policies).some((p: PolicyState) => p.isActive);
    if (!anyPolicyActive) {
        const message = "No hay políticas activas. Por favor, active al menos una política para ejecutar la simulación.";
        logEvent(message);
        addToast(message, 'warning');
        return;
    }
    
    if (gameStateRef.current.currentLevel >= 2) {
        const policyNeedsEffort = (Object.values(gameStateRef.current.policies) as PolicyState[]).find((p) =>
            p.isActive && 
            p.instruments && 
            Object.keys(p.instruments).length > 0 &&
            (p.totalInstrumentEffortApplied || 0) === 0
        );
        if (policyNeedsEffort) {
            const message = `La política '${policyNeedsEffort.name}' está activa pero no tiene esfuerzo asignado a sus instrumentos. Asigna esfuerzo para continuar.`;
            logEvent(message);
            addToast(message, 'warning');
            return; 
        }
    }
    
    setGameState(prev => ({ ...prev, isSimulating: true }));

    // Give React a moment to render the "isSimulating" state before blocking the thread
    await new Promise(resolve => setTimeout(resolve, 50));

    let tempGameState = JSON.parse(JSON.stringify(gameStateRef.current)) as GameState;
    
    tempGameState.currentEvent = null;
    tempGameState.newsHeadlines = [];
    
    if (tempGameState.activeLevelConfig) {
        tempGameState.activeLevelConfig = LEVEL_CONFIGS.find(lc => lc.levelNumber === tempGameState.currentLevel);
    }
    // FIX: Restore pact functions lost during JSON serialization to prevent runtime crashes.
    if (tempGameState.pacts) {
        Object.keys(tempGameState.pacts).forEach(pactId => {
            if (INITIAL_PACTS[pactId] && typeof INITIAL_PACTS[pactId].effects === 'function') {
                tempGameState.pacts[pactId].effects = INITIAL_PACTS[pactId].effects;
            }
        });
    }


    let concludedLevelInfoForUpdate: GameState['lastConcludedLevelInfo'] = null;

    for (let i = 0; i < SIMULATION_YEARS_PER_ROUND; i++) {
        if (tempGameState.gameOverReason) break;

        const levelTargetYear = tempGameState.activeLevelConfig?.targetYear || (INITIAL_YEAR + YEARS_PER_LEVEL * tempGameState.currentLevel);

        if (tempGameState.year >= levelTargetYear) {
            const outcome = evaluateLevel(tempGameState, { ...tempGameState, indicators: tempGameState.levelBaseline });
            const conditionsMet = outcome.won;
            const winReason = generateRouteOutcomeReason(outcome, t);

            concludedLevelInfoForUpdate = {
                level: tempGameState.currentLevel,
                status: conditionsMet ? 'won' : 'lost',
                reason: winReason,
                finalIndicators: JSON.parse(JSON.stringify(tempGameState.indicators)),
                winConditions: tempGameState.activeLevelConfig?.winConditions
            };

            if(conditionsMet) {
              tempGameState.wonLevels = [...new Set([...tempGameState.wonLevels, tempGameState.currentLevel])];
            }

            break;
        }
        
        if (tempGameState.gameOverReason) {
             setGameState(prev => ({ ...prev, ...tempGameState, isSimulating: false }));
             return;
        }

        // Advances exactly one simulated year through the pure engine (src/sim). CP comes from
        // controlParamsRef so a live FacilitatorPanel override still applies; Math.random is
        // passed through as-is to keep the same unpredictability players always had (a seeded
        // RNG is available in src/sim/rng.ts for tests and the future balance harness, see
        // mejora-general/files/16_auditoria_ecuaciones.md).
        const stepResult = stepYear(tempGameState, Math.random, CP);
        tempGameState = stepResult.next;
        stepResult.logs.forEach(msg => logEvent(msg));
        stepResult.chatMessages.forEach(msg => addMessageToChat(msg.text, 'system', msg.emphasisType));

    } // end for loop

    if (concludedLevelInfoForUpdate) {
        tempGameState.lastConcludedLevelInfo = concludedLevelInfoForUpdate;
    }
    
    // Final state update
    setGameState({ ...tempGameState, isSimulating: false });
    updateHistoricalData(tempGameState);

  }, [logEvent, addToast, addMessageToChat, updateHistoricalData, t]);
  
  const setCurrentLevelManually = useCallback((level: number) => {
    if (level < 1 || level > MAX_LEVELS) {
      logEvent(`Intento de cambiar a un nivel inválido: ${level}`);
      return;
    }
    
    setGameState(prev => {
        if (prev.currentLevel === level) return prev;

        const { gameStatePatch, initialHistoricalDataPoint } = createInitialState(level);
        if (!gameStatePatch.activeLevelConfig) return prev;

        setHistoricalData([initialHistoricalDataPoint]);

        logEvent(`Cambiado manualmente a Nivel ${level}. El estado del juego se ha reiniciado a los valores por defecto de este nivel.`);

        return {
            ...prev,
            ...gameStatePatch,
            gameOverReason: null,
        };
    });

  }, [logEvent]);

  // Cover/portada gate: shown before everything else — even before the auth loading/login
  // screens — on first entry only (decarbonationCoverSeen_v1 absent/false in localStorage).
  // Wrapped in its own LanguageProvider since this render path sits outside the main app's
  // provider below, so language is still read correctly from localStorage here.
  if (showCoverGate) {
    return (
      <LanguageProvider>
        <CoverScreen
          mode="gate"
          initialDontShowAgain={coverSeenPreference}
          onStart={(dontShowAgain) => {
            handleDismissCover(dontShowAgain);
            setShowCoverGate(false);
          }}
        />
      </LanguageProvider>
    );
  }

  // Auth gate
  if (authStage === 'loading') {
    return <div className="bg-custom-gray min-h-screen flex items-center justify-center text-gray-400 text-lg">Cargando...</div>;
  }
  if (authStage === 'unauthenticated') {
    return <LoginScreen onGoogleLogin={handleGoogleLogin} onDemo={handleDemo} />;
  }

  // FIX: Added return statement to App component to render the UI and fix the error in index.tsx
  return (
    <LanguageProvider>
    <div className="bg-custom-gray min-h-screen text-gray-200 font-sans">
      <Header
        year={gameState.year}
        targetYear={gameState.activeLevelConfig?.targetYear}
        score={gameState.indicators.generalScore}
        level={gameState.currentLevel}
        levelName={gameState.activeLevelConfig?.name}
        headerSuffix={gameState.activeLevelConfig?.headerSuffix}
        gameOver={!!gameState.gameOverReason}
        setCurrentLevelManually={setCurrentLevelManually}
        scoreTooltipText={generateScoreTooltipText(gameState)}
        scoreColorClass={getDynamicScoreColorClass(gameState.indicators.generalScore, gameState.activeLevelConfig)}
        onShowTutorial={handleShowTutorial}
        onShowFacilitatorManual={handleToggleFacilitatorManual}
        onShowPlayerManual={handleTogglePlayerManual}
        onShowEquationsManual={handleToggleEquationsManual}
        onShowAbout={() => setShowAboutCover(true)}
        wonLevels={gameState.wonLevels}
        onToggleFacilitatorPanel={() => setShowFacilitatorPanel(p => !p)}
        onAbandon={handleAbandonGame}
      />

      {authStage === 'demo' && (
        <div className="bg-yellow-900 bg-opacity-80 text-yellow-200 text-xs text-center py-1 px-4">
          Modo demo — tus datos no se guardan.{' '}
          <button onClick={() => { handleSignOut(); }} className="underline hover:text-yellow-100 ml-1">Iniciar sesion</button>
        </div>
      )}

      <main className="container mx-auto p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Dashboard
              gameState={gameState}
              historicalData={historicalData}
              togglePolicy={togglePolicy}
              runSimulationRound={runSimulationRound}
              gameOver={!!gameState.gameOverReason}
              levelConfig={gameState.activeLevelConfig}
              requestLoan={requestLoan}
              togglePact={togglePact}
              handleInstrumentEffortChange={handleInstrumentEffortChange}
              handleAdditionalTaxPressureChange={handleAdditionalTaxPressureChange}
              instrumentImpactHints={INSTRUMENT_IMPACT_HINTS}
            />
          </div>
          <div className="flex flex-col gap-6 h-full">
            <WinRoutesPanel gameState={gameState} />
            <ChatbotPanel
              messages={chatMessages}
              onUserSubmit={handleUserChatSubmit}
              isLoading={isBotLoading}
              apiKeyAvailable={apiKeyAvailable}
              currentLevelName={gameState.activeLevelConfig?.name || ''}
              suggestedQuestions={currentSuggestedQuestions}
            />
            <GameLogPanel logs={gameState.gameLog} />
          </div>
        </div>
      </main>

      {levelEndInfo && (
        <LevelUpBanner
          result={levelEndInfo}
          onClose={handleCloseLevelEndModal}
        />
      )}

      {showTutorialModal && <TutorialModal onClose={handleCloseTutorial} />}

      {showAboutCover && (
        <CoverScreen
          mode="about"
          initialDontShowAgain={coverSeenPreference}
          onClose={() => setShowAboutCover(false)}
          onStart={(dontShowAgain) => {
            handleDismissCover(dontShowAgain);
            setShowAboutCover(false);
          }}
        />
      )}

      {showClosingSynthesisModal && (
        <ClosingSynthesisModal
          gameState={gameState}
          historicalData={historicalData}
          onClose={handleClosingSynthesisDismissed}
        />
      )}

      {showLevelIntroModalForLevel && LEVEL_CONFIGS.find(lc => lc.levelNumber === showLevelIntroModalForLevel) && (
        <LevelIntroModal
          levelConfig={LEVEL_CONFIGS.find(lc => lc.levelNumber === showLevelIntroModalForLevel)!}
          onClose={() => setShowLevelIntroModalForLevel(null)}
        />
      )}

      {showFacilitatorManual && <FacilitatorManual onClose={handleToggleFacilitatorManual} />}
      {showPlayerManual && <PlayerManual onClose={handleTogglePlayerManual} />}
      {showEquationsManual && <EquationsManual gameState={gameState} onClose={handleToggleEquationsManual} />}

      {showPreSurvey && (
        <SurveyPre
          onComplete={(data) => {
            setShowPreSurvey(false);
            sessionStorage.setItem('decarbonationPreSurveyDone_v1', '1');
            savePreSurvey(data);
          }}
          onSkip={() => {
            setShowPreSurvey(false);
            sessionStorage.setItem('decarbonationPreSurveyDone_v1', '1');
          }}
        />
      )}
      {showPostSurvey && (
        <SurveyPost
          resultado={postSurveyResult}
          nivelAlcanzado={gameState.currentLevel}
          onComplete={(data) => {
            setShowPostSurvey(false);
            savePostSurvey(data);
            setShowGameSummary(true);
          }}
          onSkip={() => { setShowPostSurvey(false); setShowGameSummary(true); }}
        />
      )}
      {showGameSummary && (
        <GameSummaryPanel
          resultado={postSurveyResult}
          nivelAlcanzado={gameState.currentLevel}
          historicalData={historicalData}
          onPlayAgain={() => {
            setShowGameSummary(false);
            setHasSentFinalDecarbonitoMessage(false);
            // New playthrough — a fresh game_sessions row should be created,
            // not reused/overwritten (see useSessionPersistence.resetSession).
            resetSession();
            setCurrentLevelManually(1);
            sessionStorage.removeItem('decarbonationPreSurveyDone_v1');
          }}
        />
      )}
      {showFacilitatorPanel && (
        <FacilitatorPanel
          controlParams={controlParams}
          onChange={setControlParams}
          onClose={() => setShowFacilitatorPanel(false)}
        />
      )}

      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </div>
    </LanguageProvider>
  );
};