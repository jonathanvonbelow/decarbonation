import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  POLICY_LOCK_IN_DURATION, MAX_ACTIVE_POLICIES, PLAYER_REPORT_GUIDE_QUESTIONS, INSTRUMENT_IMPACT_HINTS
} from './constants';
import { Dashboard } from './components/Dashboard';
import Header from './components/Header';
import ChatbotPanel from './components/ChatbotPanel';
import { askGemini, generateNewsHeadlines } from './services/geminiService';
import { getSuggestedQuestions } from './services/suggestionService';
import LevelUpBanner from './components/common/LevelUpBanner';
import TutorialModal from './components/common/TutorialModal';
import PlayerReportGuideModal from './components/PlayerReportGuideModal';
import LevelIntroModal from './components/common/LevelIntroModal';
import FacilitatorManual from './components/facilitator/FacilitatorManual';
import PlayerManual from './components/player/PlayerManual';
import EquationsManual from './components/equations/EquationsManual';
import Toast from './components/common/Toast';
import GameLogPanel from './components/GameLogPanel';


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
        const scoreWeightBiodiversityL1 = 0.50;
        const scoreWeightCarbonL1 = 0.50;
        text += `- Biodiversidad: ${indicators.biodiversity.toFixed(1)}% (Peso: ${(scoreWeightBiodiversityL1 * 100).toFixed(0)}%)\n`;
        text += `- Componente de Carbono: ${carbonScoreComponent.toFixed(1)}% (Peso: ${(scoreWeightCarbonL1 * 100).toFixed(0)}%)\n`;
        text += `  (Basado en Emisiones CO2eq/cápita: ${indicators.co2EqEmissionsPerCapita.toFixed(2)} t/hab. Ref. máx. para puntaje: ${CONTROL_PARAMS.Referencia_Max_CO2_per_Capita_Puntaje} t/hab)\n`;
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
  const [gameState, setGameState] = useState<GameState>(() => {
    const initialLevelConfig = LEVEL_CONFIGS.find(lc => lc.levelNumber === 1);
    return {
      year: INITIAL_YEAR,
      currentLevel: 1,
      policies: JSON.parse(JSON.stringify(INITIAL_POLICIES)),
      landUses: JSON.parse(JSON.stringify(INITIAL_LAND_USES)),
      indicators: { ...INITIAL_INDICATORS },
      finances: { ...INITIAL_FINANCES },
      stellaSpecificState: JSON.parse(JSON.stringify(INITIAL_STELLA_STOCKS)),
      gameLog: [`Año ${INITIAL_YEAR} (N1): Juego iniciado. Nivel 1: ${initialLevelConfig?.name}`],
      isSimulating: false,
      activeLevelConfig: initialLevelConfig,
      gameOverReason: null,
      loanRequestedThisRound: 0,
      pacts: JSON.parse(JSON.stringify(INITIAL_PACTS)),
      lastConcludedLevelInfo: null,
      sentLevelReflectionMessage: false,
      currentEvent: null,
      newsHeadlines: [],
      level3EventsTriggeredCount: 0,
      additionalTaxPressurePercentage: 0,
      decarbonitoProactiveMessageSentInLevel: false,
      yearsSimulatedInCurrentLevel: 0,
      wonLevels: [], 
      _pendingLevelIntroTrigger: null,
    };
  });

  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
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
  const [showPlayerReportModal, setShowPlayerReportModal] = useState<boolean>(false);
  const [showLevelIntroModalForLevel, setShowLevelIntroModalForLevel] = useState<number | null>(null);
  const [showFacilitatorManual, setShowFacilitatorManual] = useState(false);
  const [showPlayerManual, setShowPlayerManual] = useState(false);
  const [showEquationsManual, setShowEquationsManual] = useState(false);


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
      setCurrentSuggestedQuestions(getSuggestedQuestions(gameState));
    }
  }, [gameState, apiKeyAvailable]);
  
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
  }, [gameState.currentLevel, gameState.gameOverReason, showTutorialModal, showLevelIntroModalForLevel]);


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
      const botResponseText = await askGemini(userInput, gameStateRef.current);
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
  
  const handleStartBotReflection = useCallback(() => {
    const prompt = "He terminado mi sesión. Ayúdame a reflexionar sobre mis lecciones aprendidas.";
    handleUserChatSubmit(prompt);
    setShowPlayerReportModal(false);
  }, [handleUserChatSubmit]);

  const handleLessonsLearnedStart = useCallback(() => {
    setShowPlayerReportModal(true);
  }, []);


  useEffect(() => {
    if (gameState.gameOverReason && !hasSentFinalDecarbonitoMessage) {
      setHasSentFinalDecarbonitoMessage(true); 
      handleLessonsLearnedStart();
    }
  }, [gameState.gameOverReason, hasSentFinalDecarbonitoMessage, handleLessonsLearnedStart]);


 const progressToNextLevel = useCallback(() => {
    setGameState(prev => {
        if (!prev.lastConcludedLevelInfo || prev.lastConcludedLevelInfo.status !== 'won' || prev.gameOverReason || prev.currentLevel >= MAX_LEVELS) {
            return prev;
        }

        const newLevelNumber = prev.currentLevel + 1;
        const newLevelConfig = LEVEL_CONFIGS.find(lc => lc.levelNumber === newLevelNumber);
        if (!newLevelConfig) return prev;

        let newStellaState = JSON.parse(JSON.stringify(INITIAL_STELLA_STOCKS)) as StellaStocks;
        let newLandUses = JSON.parse(JSON.stringify(INITIAL_LAND_USES));
        let newIndicators = { ...INITIAL_INDICATORS };
        let indicatorOverrides: InitialIndicatorOverrides | null = null;
        
        if (newLevelNumber === 2) {
            newLandUses = JSON.parse(JSON.stringify(LEVEL_2_INITIAL_LAND_USES));
            newStellaState = { ...newStellaState, ...LEVEL_2_INITIAL_STELLA_OVERRIDES };
            indicatorOverrides = LEVEL_2_INITIAL_INDICATOR_OVERRIDES;
        } else if (newLevelNumber === 3) {
            newLandUses = JSON.parse(JSON.stringify(LEVEL_3_INITIAL_LAND_USES));
            newStellaState = { ...newStellaState, ...LEVEL_3_INITIAL_STELLA_OVERRIDES };
            indicatorOverrides = LEVEL_3_INITIAL_INDICATOR_OVERRIDES;
        }

        if (indicatorOverrides) {
            if (indicatorOverrides.foodSecurity !== undefined) newIndicators.foodSecurity = indicatorOverrides.foodSecurity;
            if (indicatorOverrides.economicSecurity !== undefined) newIndicators.economicSecurity = indicatorOverrides.economicSecurity;
        }
        newIndicators.socialWellbeing = 100 - (newStellaState.Conflicto_social || INITIAL_STELLA_STOCKS.Conflicto_social);
        newIndicators.politicalStability = 100 - (newStellaState.Colapso_politico || INITIAL_STELLA_STOCKS.Colapso_politico);
        newIndicators.ppAgricola = newStellaState.PP_AGRICOLA || INITIAL_STELLA_STOCKS.PP_AGRICOLA;
        newIndicators.ppAmbientalista = newStellaState.PP_AMBIENTALISTA || INITIAL_STELLA_STOCKS.PP_AMBIENTALISTA;
        newIndicators.ppSocial = newStellaState.PP_SOCIAL || INITIAL_STELLA_STOCKS.PP_SOCIAL;
        newIndicators.pbi = newStellaState.PBI_Real || INITIAL_STELLA_STOCKS.PBI_Real;
        newIndicators.debt = newStellaState.Deuda || INITIAL_STELLA_STOCKS.Deuda;
        
        const initialDataPointForNewLevel: HistoricalDataPoint = {
            year: INITIAL_YEAR,
            biodiversity: newIndicators.biodiversity,
            foodSecurity: newIndicators.foodSecurity,
            economicSecurity: newIndicators.economicSecurity,
            socialWellbeing: newIndicators.socialWellbeing,
            generalScore: newIndicators.generalScore,
            co2EqEmissionsPerCapita: newIndicators.co2EqEmissionsPerCapita,
            politicalStability: newIndicators.politicalStability,
            pbi: newIndicators.pbi,
            debt: newIndicators.debt,
            ppAgricola: newIndicators.ppAgricola,
            ppAmbientalista: newIndicators.ppAmbientalista,
            ppSocial: newIndicators.ppSocial,
            treasuryReserves: newStellaState.Reservas_del_Tesoro,
        };
        setHistoricalData([initialDataPointForNewLevel]);
        setShowLevelIntroModalForLevel(newLevelNumber);

        return {
            ...prev,
            year: INITIAL_YEAR,
            currentLevel: newLevelNumber,
            policies: JSON.parse(JSON.stringify(INITIAL_POLICIES)),
            landUses: newLandUses,
            indicators: newIndicators,
            stellaSpecificState: newStellaState,
            pacts: JSON.parse(JSON.stringify(INITIAL_PACTS)),
            activeLevelConfig: newLevelConfig,
            gameLog: [`Año ${INITIAL_YEAR} (N${newLevelNumber}): Nuevo Nivel Iniciado: ${newLevelConfig?.name}`].concat(prev.gameLog).slice(0, 100),
            yearsSimulatedInCurrentLevel: 0,
            level3EventsTriggeredCount: 0,
            additionalTaxPressurePercentage: 0,
            decarbonitoProactiveMessageSentInLevel: false,
            lastConcludedLevelInfo: null, 
            sentLevelReflectionMessage: false,
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
        setGameState(prev => ({
            ...prev,
            lastConcludedLevelInfo: null
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

    if (lastInfo && !gameState.sentLevelReflectionMessage && apiKeyAvailable && !showPlayerReportModal) {
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
            // FIX: Explicitly typed 'lu' to LandUse to resolve type inference issues with Object.values().reduce(), preventing property access errors on 'unknown'.
            const currentTotalLandArea = Object.values(gameStateRef.current.landUses).reduce((sum, lu: LandUse) => sum + lu.area, 0);
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
      askGemini(prompt, gameStateRef.current, 'LEVEL_REFLECTION')
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

  }, [gameState.lastConcludedLevelInfo, gameState.sentLevelReflectionMessage, apiKeyAvailable, addMessageToChat, logEvent, gameStateRef, showPlayerReportModal, levelEndInfo]);


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
  }, []);


  const togglePolicy = useCallback((policyId: Policy) => {
    setGameState(prev => {
      const currentYear = prev.year;
      const newPolicies = { ...prev.policies };
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
      const pactToggled = newPacts[pactId];
      if (!pactToggled) return prev;

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


  const generateLevel3WinReason = (gameState: GameState): { reason: string, objectivesMetCount: number } => {
    const wc = LEVEL_CONFIGS[2].winConditions;
    if (!wc) return { reason: "Condiciones de victoria no encontradas.", objectivesMetCount: 0 };

    const metObjectives: string[] = [];
    const unmetObjectives: string[] = [];
    let objectivesMetCount = 0;

    const debtPbiRatio = gameState.stellaSpecificState.PBI_Real > 0 ? gameState.stellaSpecificState.Deuda / gameState.stellaSpecificState.PBI_Real : Infinity;
    
    if (wc.puntajeGeneralMin !== undefined) {
        if (gameState.indicators.generalScore >= wc.puntajeGeneralMin) {
            metObjectives.push(`✅ Puntaje General > ${wc.puntajeGeneralMin} (Logrado: ${gameState.indicators.generalScore.toFixed(0)})`);
            objectivesMetCount++;
        } else {
            unmetObjectives.push(`❌ Puntaje General > ${wc.puntajeGeneralMin} (Faltó: ${gameState.indicators.generalScore.toFixed(0)})`);
        }
    }
    if (wc.biodiversityMin !== undefined) {
        if (gameState.indicators.biodiversity >= wc.biodiversityMin) {
            metObjectives.push(`✅ Biodiversidad > ${wc.biodiversityMin}% (Logrado: ${gameState.indicators.biodiversity.toFixed(1)}%)`);
            objectivesMetCount++;
        } else {
            unmetObjectives.push(`❌ Biodiversidad > ${wc.biodiversityMin}% (Faltó: ${gameState.indicators.biodiversity.toFixed(1)}%)`);
        }
    }
    if (wc.co2EqEmissionsPerCapitaMax !== undefined) {
        if (gameState.indicators.co2EqEmissionsPerCapita <= wc.co2EqEmissionsPerCapitaMax) {
            metObjectives.push(`✅ Emisiones CO2eq/cápita < ${wc.co2EqEmissionsPerCapitaMax} (Logrado: ${gameState.indicators.co2EqEmissionsPerCapita.toFixed(2)})`);
            objectivesMetCount++;
        } else {
            unmetObjectives.push(`❌ Emisiones CO2eq/cápita < ${wc.co2EqEmissionsPerCapitaMax} (Faltó: ${gameState.indicators.co2EqEmissionsPerCapita.toFixed(2)})`);
        }
    }
    if (wc.foodSecurityMin !== undefined) {
        if (gameState.indicators.foodSecurity >= wc.foodSecurityMin) {
            metObjectives.push(`✅ Seg. Alimentaria > ${wc.foodSecurityMin}% (Logrado: ${gameState.indicators.foodSecurity.toFixed(1)}%)`);
            objectivesMetCount++;
        } else {
            unmetObjectives.push(`❌ Seg. Alimentaria > ${wc.foodSecurityMin}% (Faltó: ${gameState.indicators.foodSecurity.toFixed(1)}%)`);
        }
    }
    if (wc.economicSecurityMin !== undefined) {
        if (gameState.indicators.economicSecurity >= wc.economicSecurityMin) {
            metObjectives.push(`✅ Seg. Económica > ${wc.economicSecurityMin}% (Logrado: ${gameState.indicators.economicSecurity.toFixed(1)}%)`);
            objectivesMetCount++;
        } else {
            unmetObjectives.push(`❌ Seg. Económica > ${wc.economicSecurityMin}% (Faltó: ${gameState.indicators.economicSecurity.toFixed(1)}%)`);
        }
    }
    if (wc.bienestarSocialMin !== undefined) {
        if (gameState.indicators.socialWellbeing >= wc.bienestarSocialMin) {
            metObjectives.push(`✅ Bienestar Social > ${wc.bienestarSocialMin}% (Logrado: ${gameState.indicators.socialWellbeing.toFixed(1)}%)`);
            objectivesMetCount++;
        } else {
            unmetObjectives.push(`❌ Bienestar Social > ${wc.bienestarSocialMin}% (Faltó: ${gameState.indicators.socialWellbeing.toFixed(1)}%)`);
        }
    }
    if (wc.politicalStabilityMin !== undefined) {
        if (gameState.indicators.politicalStability >= wc.politicalStabilityMin) {
            metObjectives.push(`✅ Estab. Política > ${wc.politicalStabilityMin}% (Logrado: ${gameState.indicators.politicalStability.toFixed(1)}%)`);
            objectivesMetCount++;
        } else {
            unmetObjectives.push(`❌ Estab. Política > ${wc.politicalStabilityMin}% (Faltó: ${gameState.indicators.politicalStability.toFixed(1)}%)`);
        }
    }
    if (wc.pbiMin !== undefined) {
        if (gameState.indicators.pbi >= wc.pbiMin) {
            metObjectives.push(`✅ PBI Real > ${wc.pbiMin} (Logrado: ${gameState.indicators.pbi.toFixed(0)})`);
            objectivesMetCount++;
        } else {
            unmetObjectives.push(`❌ PBI Real > ${wc.pbiMin} (Faltó: ${gameState.indicators.pbi.toFixed(0)})`);
        }
    }
    if (wc.deudaPbiMax !== undefined) {
        if (debtPbiRatio < wc.deudaPbiMax) {
            metObjectives.push(`✅ Ratio Deuda/PBI < ${wc.deudaPbiMax} (Logrado: ${debtPbiRatio.toFixed(2)})`);
            objectivesMetCount++;
        } else {
            unmetObjectives.push(`❌ Ratio Deuda/PBI < ${wc.deudaPbiMax} (Faltó: ${debtPbiRatio.toFixed(2)})`);
        }
    }
    if (wc.colapsoPoliticoMax !== undefined) {
        if (gameState.stellaSpecificState.Colapso_politico < wc.colapsoPoliticoMax) {
            metObjectives.push(`✅ Colapso Político < ${wc.colapsoPoliticoMax}% (Logrado: ${gameState.stellaSpecificState.Colapso_politico.toFixed(1)}%)`);
            objectivesMetCount++;
        } else {
            unmetObjectives.push(`❌ Colapso Político < ${wc.colapsoPoliticoMax}% (Faltó: ${gameState.stellaSpecificState.Colapso_politico.toFixed(1)}%)`);
        }
    }

    let reason = `¡Felicidades! Has alcanzado ${objectivesMetCount} de 10 objetivos clave, superando el umbral de 6 para ganar el Nivel 3.\n\n`;
    if (metObjectives.length > 0) {
        reason += `**Objetivos Cumplidos:**\n${metObjectives.join('\n')}\n\n`;
    }
    if (unmetObjectives.length > 0) {
        reason += `**Áreas de Mejora:**\n${unmetObjectives.join('\n')}`;
    }

    return { reason, objectivesMetCount };
};

  const runSimulationRound = useCallback(async () => {
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
        // FIX: Add explicit type annotation to fix potential 'unknown' type error on 'p'.
        const policyNeedsEffort = Object.values(gameStateRef.current.policies).find((p: PolicyState) => 
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
            const currentLevelConfig = LEVEL_CONFIGS.find(lc => lc.levelNumber === tempGameState.currentLevel);
            const conditionsMet = currentLevelConfig ? currentLevelConfig.progressionConditionsMet(tempGameState) : false;
            let winReason = "";

            if (tempGameState.currentLevel === 3 && conditionsMet) {
                const { reason: detailedReason } = generateLevel3WinReason(tempGameState);
                winReason = detailedReason;
            } else {
                winReason = conditionsMet 
                    ? `¡Objetivos del Nivel ${tempGameState.currentLevel} alcanzados en el año ${tempGameState.year}!`
                    : `Fin del ciclo del Nivel ${tempGameState.currentLevel}. No se cumplieron todos los objetivos.`;
            }

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
        
        if(tempGameState.gameOverReason) {
             setGameState(prev => ({ ...prev, ...tempGameState, isSimulating: false }));
             return;
        }

        tempGameState.year++;
        tempGameState.yearsSimulatedInCurrentLevel++;
        const currentYear = tempGameState.year;
        let policies = tempGameState.policies;
        let landUses = tempGameState.landUses;
        let indicators = tempGameState.indicators;
        let stellaState = tempGameState.stellaSpecificState;
        const currentLevel = tempGameState.currentLevel;
        const additionalTaxPressurePercentage = tempGameState.additionalTaxPressurePercentage;
        
        stellaState.Poblacion_Total *= (1 + CONTROL_PARAMS.Tasa_Crecimiento_Poblacional_Base);

        Object.values(policies).forEach((p: PolicyState) => {
            if (p.isActive && p.activationYear === undefined) {
                p.activationYear = currentYear;
                logEvent(`Política '${p.name}' activada y confirmada para el año ${currentYear}.`);
            }
        });

        let eventOccurredThisYear = false;
        const yearsElapsedInCurrentLevel = tempGameState.yearsSimulatedInCurrentLevel -1; 
        
        const processRandomEventEffects = (effects: RandomEventEffect[]) => {
             effects.forEach(eff => {
                if (eff.landUseChange) {
                    const { target, changeAbsolute_kHa } = eff.landUseChange;
                    if (landUses[target]) {
                        const originalArea = landUses[target].area;
                        landUses[target].area = Math.max(0, originalArea + changeAbsolute_kHa);
                        logEvent(`Efecto de evento: Área de '${landUses[target].name}' cambió en ${changeAbsolute_kHa.toFixed(1)} kHa.`);
                    }
                } else if (eff.indicator) {
                    let currentValue: number | boolean;
                    let targetObject: any;
                    let targetKey: string | number | symbol;

                    if (eff.indicator.startsWith('stella.')) {
                        targetKey = eff.indicator.substring('stella.'.length) as NumericStellaKeys;
                        targetObject = stellaState;
                        currentValue = stellaState[targetKey];
                    } else {
                        targetKey = eff.indicator as keyof Indicators;
                        targetObject = indicators;
                        currentValue = indicators[targetKey as keyof Indicators];
                    }

                    if (typeof currentValue !== 'number') {
                        const warningMsg = `Se intentó aplicar un efecto numérico a la propiedad no numérica '${eff.indicator}'. Efecto omitido.`;
                        console.warn(warningMsg);
                        logEvent(`Advertencia del sistema: ${warningMsg}`);
                        return; // Corresponds to 'continue' in a for loop
                    }

                    let newValue: number = currentValue;
                    if (eff.changeAbsolute !== undefined) {
                        newValue = currentValue + eff.changeAbsolute;
                    } else if (eff.changePercentage !== undefined) {
                        newValue = currentValue * (1 + eff.changePercentage);
                    }
                    
                    if (targetObject === indicators && !['co2EqEmissionsPerCapita', 'pbi', 'treasuryReserves', 'debt', 'generalScore', 'ppAgricola', 'ppAmbientalista', 'ppSocial'].includes(targetKey as string)) {
                        newValue = Math.max(0, Math.min(100, newValue));
                    } else if (targetKey === 'Colapso_politico' || targetKey === 'Conflicto_social' || targetKey === 'PP_AGRICOLA' || targetKey === 'PP_AMBIENTALISTA' || targetKey === 'PP_SOCIAL') {
                            newValue = Math.max(0, Math.min(100, newValue));
                    }
                        
                    if (eff.indicator.startsWith('stella.')) {
                        (targetObject as StellaStocks)[targetKey as NumericStellaKeys] = newValue;
                    } else {
                        (targetObject as Indicators)[targetKey as NumericIndicatorKeys] = newValue;
                    }
                }
            });
            if (effects.some(e => e.indicator === 'stella.Conflicto_social')) indicators.socialWellbeing = Math.max(0, Math.min(100, 100 - stellaState.Conflicto_social));
            if (effects.some(e => e.indicator === 'stella.Colapso_politico')) indicators.politicalStability = Math.max(0, Math.min(100, 100 - stellaState.Colapso_politico));
            if (effects.some(e => e.indicator === 'stella.PBI_Real')) indicators.pbi = stellaState.PBI_Real;
            if (effects.some(e => e.indicator === 'stella.Reservas_del_Tesoro')) indicators.treasuryReserves = stellaState.Reservas_del_Tesoro;
            if (effects.some(e => e.indicator === 'stella.Deuda')) indicators.debt = stellaState.Deuda;
            if (effects.some(e => e.indicator === 'stella.PP_AGRICOLA')) indicators.ppAgricola = stellaState.PP_AGRICOLA;
            if (effects.some(e => e.indicator === 'stella.PP_AMBIENTALISTA')) indicators.ppAmbientalista = stellaState.PP_AMBIENTALISTA;
            if (effects.some(e => e.indicator === 'stella.PP_SOCIAL')) indicators.ppSocial = stellaState.PP_SOCIAL;
        };


        if (tempGameState.currentLevel < 3) { 
            for (const event of ALL_RANDOM_EVENTS) {
                if (event.minLevel && tempGameState.currentLevel < event.minLevel) continue;
                
                const triggerRoll = Math.random();
                if (triggerRoll < event.triggerChance(tempGameState)) {
                    tempGameState.currentEvent = event;
                    logEvent(`EVENTO (Año ${tempGameState.year}): ${event.name} - ${event.description}`);
                    const effects = event.effects(tempGameState);
                    processRandomEventEffects(effects);
                    eventOccurredThisYear = true;
                    break; 
                }
            }
        } else { 
            let eventTriggerProbability = 0.05; 

            const timeStressFactor = (yearsElapsedInCurrentLevel / YEARS_PER_LEVEL) * 0.15; 
            eventTriggerProbability += timeStressFactor;

            if (indicators.socialWellbeing < 50) {
                eventTriggerProbability += 0.10; 
            }

            if (indicators.politicalStability < 50) {
                eventTriggerProbability += 0.10; 
            }

            const avgPressure = (indicators.ppAgricola + indicators.ppAmbientalista + indicators.ppSocial) / 3;
            if (avgPressure > 65) {
                eventTriggerProbability += 0.12; 
            }
            
            const finalEventChance = Math.min(0.60, eventTriggerProbability);

            if (Math.random() < finalEventChance) {
                const eligibleEvents = ALL_RANDOM_EVENTS.filter(e => 
                    (e.minLevel === undefined || e.minLevel <= tempGameState.currentLevel)
                );
                
                if (eligibleEvents.length > 0) {
                    // FIX: Explicitly type reduce accumulator to fix type inference issue.
                    const totalWeight = eligibleEvents.reduce((sum: number, event: RandomEvent) => sum + event.triggerChance(tempGameState), 0);
                    
                    if (totalWeight > 0) {
                        let randomNum = Math.random() * totalWeight;
                        let chosenEvent: RandomEvent | null = null;

                        for (const event of eligibleEvents) {
                            const eventWeight = event.triggerChance(tempGameState);
                            if (randomNum < eventWeight) {
                                chosenEvent = event;
                                break;
                            }
                            randomNum -= eventWeight;
                        }
                        
                        if (!chosenEvent) {
                            chosenEvent = eligibleEvents.find(e => e.triggerChance(tempGameState) > 0) || eligibleEvents[0];
                        }
                        
                        if(chosenEvent) {
                            tempGameState.currentEvent = chosenEvent;
                            logEvent(`EVENTO (N3-Dinámico, Año ${tempGameState.year}): ${chosenEvent.name} - ${chosenEvent.description}`);
                            addMessageToChat(`¡Evento Inesperado! ${chosenEvent.name}: ${chosenEvent.description}`, 'system', 'game_event');
                            const effects = chosenEvent.effects(tempGameState);
                            processRandomEventEffects(effects);
                            eventOccurredThisYear = true;
                        }
                    } else {
                        logEvent(`Nivel 3: Intento de evento dinámico fallido. Ningún evento elegible tenía >0 peso de activación.`);
                    }
                }
            }
        }

        // FIX: Explicitly typed 'p' as PolicyState to resolve type inference issues where Object.values().forEach() was inferring 'p' as 'unknown', causing property access errors.
        Object.values(policies).forEach((p: PolicyState) => {
            if (!p.stellaName) return; 
            const tiempoActivacionKey = `Tiempo_Activacion_${p.stellaName}` as NumericStellaKeys;
            if (p.isActive && tiempoActivacionKey in stellaState) {
                (stellaState as any)[tiempoActivacionKey] = ((stellaState as any)[tiempoActivacionKey] || 0) + 1;
            }

            if (p.isActive && p.efficiencyDecayDuration && p.efficiencyDecayDuration > 0 && p.initialEfficiency) {
                const yearsActive = (stellaState as any)[tiempoActivacionKey] || 0;
                const newEfficiency = p.initialEfficiency * Math.exp(-yearsActive / p.efficiencyDecayDuration);
                p.currentEfficiency = Math.max(0, newEfficiency);
            }
        });
        
        let totalPolicyCost = 0;
        Object.values(policies).forEach((p: PolicyState) => {
            if (p.isActive) {
                totalPolicyCost += p.costFactor * stellaState.PBI_Real;
            }
        });

        let totalPactCost = 0;
        Object.values(tempGameState.pacts).forEach((pact: Pact) => {
            if (pact.isActive && pact.annualCost) {
                totalPactCost += pact.annualCost;
            }
        });
        
        // --- START OF RESTORED SIMULATION LOGIC ---

        // 1. Apply pact effects
        Object.values(tempGameState.pacts).forEach((pact: Pact) => {
            if (pact.isActive) {
                const effects = pact.effects(indicators, stellaState);
                if (effects.indicators) indicators = { ...indicators, ...effects.indicators };
                if (effects.stellaStocks) stellaState = { ...stellaState, ...effects.stellaStocks };
            }
        });

        // 2. Land Use Transitions
        let landUseChangeFactors = { tasa_BNNP_a_BNP: 1, tasa_BNNP_a_CC: 1, tasa_BNNP_a_CA: 1, tasa_CA_a_BNNP: 1, tasa_CC_a_CA: 1 };
        Object.values(tempGameState.pacts).forEach((pact: Pact) => {
            if (pact.isActive) {
                const effects = pact.effects(indicators, stellaState);
                if (effects.landUseChangeFactors) {
                    landUseChangeFactors.tasa_BNNP_a_BNP *= effects.landUseChangeFactors.tasa_BNNP_a_BNP ?? 1;
                    landUseChangeFactors.tasa_BNNP_a_CC *= effects.landUseChangeFactors.tasa_BNNP_a_CC ?? 1;
                    landUseChangeFactors.tasa_BNNP_a_CA *= effects.landUseChangeFactors.tasa_BNNP_a_CA ?? 1;
                    landUseChangeFactors.tasa_CA_a_BNNP *= effects.landUseChangeFactors.tasa_CA_a_BNNP ?? 1;
                    landUseChangeFactors.tasa_CC_a_CA *= effects.landUseChangeFactors.tasa_CC_a_CA ?? 1;
                }
            }
        });

        const effCR = getPolicyEfficiency(policies[Policy.NaturalConservation], currentLevel);
        const effAS = getPolicyEfficiency(policies[Policy.Agroecological], currentLevel);
        const effPAI = getPolicyEfficiency(policies[Policy.IntensiveAgriculture], currentLevel);
        const effFRA = getPolicyEfficiency(policies[Policy.FlexibleEnvironmentalRegulations], currentLevel);

        const tasa_BNNP_a_BNP_final = (CONTROL_PARAMS.Tasa_de_BNNP_a_BNP_Base + (effCR * 0.05)) * landUseChangeFactors.tasa_BNNP_a_BNP;
        const cambio_BNNP_a_BNP = landUses[LandUseType.UnprotectedNativeForest].area * tasa_BNNP_a_BNP_final;
        const tasa_BNNP_a_CC_final = (CONTROL_PARAMS.Tasa_de_BNNP_a_CC_Base + (effPAI * 0.04) + (effFRA * 0.01)) * (1 - effCR) * landUseChangeFactors.tasa_BNNP_a_CC;
        const cambio_BNNP_a_CC = landUses[LandUseType.UnprotectedNativeForest].area * tasa_BNNP_a_CC_final;
        const tasa_BNNP_a_CA_final = (CONTROL_PARAMS.Tasa_de_BNNP_a_CA_Base + (effAS * 0.02)) * (1 - effCR) * landUseChangeFactors.tasa_BNNP_a_CA;
        const cambio_BNNP_a_CA = landUses[LandUseType.UnprotectedNativeForest].area * tasa_BNNP_a_CA_final;
        const tasa_CA_a_BNNP_final = (CONTROL_PARAMS.Tasa_de_CA_a_BNNP_Base + (effAS * 0.01)) * landUseChangeFactors.tasa_CA_a_BNNP;
        const cambio_CA_a_BNNP = landUses[LandUseType.AgroecologicalCrops].area * tasa_CA_a_BNNP_final;
        const tasa_CC_a_CA_final = (CONTROL_PARAMS.Tasa_de_CC_a_CA_Base + (effAS * 0.03)) * (1 - effPAI * 0.5) * landUseChangeFactors.tasa_CC_a_CA;
        const cambio_CC_a_CA = landUses[LandUseType.ConventionalCrops].area * tasa_CC_a_CA_final;

        const newLandUses = JSON.parse(JSON.stringify(landUses)) as Record<LandUseType, LandUse>;
        newLandUses[LandUseType.ProtectedNativeForest].area += cambio_BNNP_a_BNP;
        newLandUses[LandUseType.ConventionalCrops].area += cambio_BNNP_a_CC - cambio_CC_a_CA;
        newLandUses[LandUseType.AgroecologicalCrops].area += cambio_BNNP_a_CA + cambio_CC_a_CA - cambio_CA_a_BNNP;
        newLandUses[LandUseType.UnprotectedNativeForest].area -= (cambio_BNNP_a_BNP + cambio_BNNP_a_CC + cambio_BNNP_a_CA - cambio_CA_a_BNNP);
        Object.keys(newLandUses).forEach(key => { newLandUses[key as LandUseType].area = Math.max(0, newLandUses[key as LandUseType].area); });
        landUses = newLandUses;
        tempGameState.landUses = newLandUses;

        // 3. Financial Calculations
        const pbiGrowthRate = CONTROL_PARAMS.Tasa_Base_Crecimiento_PBI + (getPolicyEfficiency(policies[Policy.ForeignInvestment], currentLevel) * 0.01) + (getPolicyEfficiency(policies[Policy.AgriculturalExports], currentLevel) * 0.005) - (additionalTaxPressurePercentage * CONTROL_PARAMS.PBIGrowth_Reduction_Factor_Per_Tax_Point);
        stellaState.PBI_Real *= (1 + pbiGrowthRate);
        const taxIncome = stellaState.PBI_Real * (CONTROL_PARAMS.Tasa_Impositiva_General_Sobre_PBI + (additionalTaxPressurePercentage / 100));
        const interestRate = (CONTROL_PARAMS[`Tasa_de_interes_Nivel_${currentLevel}` as keyof ControlParams] as number) || 0.03;
        const interestPayment = stellaState.Deuda * interestRate;
        const debtPaymentRate = (CONTROL_PARAMS[`Pago_deuda_anual_Nivel_${currentLevel}` as keyof ControlParams] as number) || 0.1;
        const debtPrincipalPayment = stellaState.Deuda * debtPaymentRate;
        const totalExpenses = totalPolicyCost + totalPactCost + interestPayment + debtPrincipalPayment;

        stellaState.Reservas_del_Tesoro += (taxIncome - totalExpenses);
        if (tempGameState.loanRequestedThisRound > 0) {
            stellaState.Reservas_del_Tesoro += tempGameState.loanRequestedThisRound;
            stellaState.Deuda += tempGameState.loanRequestedThisRound;
            logEvent(`Préstamo de ${tempGameState.loanRequestedThisRound.toFixed(0)} procesado. Deuda y Reservas actualizadas.`);
            tempGameState.loanRequestedThisRound = 0;
        }
        stellaState.Deuda = Math.max(0, stellaState.Deuda - debtPrincipalPayment);

        // 4. Indicator calculations
        indicators.biodiversity = calculateBiodiversityChange(policies, landUses, indicators.biodiversity, currentLevel);
        indicators.foodSecurity = calculateFoodSecurityChange(policies, landUses, indicators, currentLevel);
        indicators.economicSecurity = calculateEconomicSecurityChange(policies, landUses, indicators, currentLevel, additionalTaxPressurePercentage);
        stellaState.Conflicto_social = calculateSocialConflictChange(policies, landUses, stellaState, indicators, currentLevel, additionalTaxPressurePercentage);
        indicators.socialWellbeing = 100 - stellaState.Conflicto_social;
        stellaState.Colapso_politico = calculatePoliticalCollapseChange(stellaState, indicators);
        indicators.politicalStability = 100 - stellaState.Colapso_politico;
        
        // 5. CO2 Emissions calculation
        let totalEmissions = 0, totalSequestration = 0;
        // FIX: Add explicit type annotation to fix potential 'unknown' type error on 'lu'.
        Object.values(landUses).forEach((lu: LandUse) => { totalEmissions += lu.area * lu.emissionRate; totalSequestration += lu.area * lu.sequestrationRate; });
        const effCN = getPolicyEfficiency(policies[Policy.CarbonNeutrality], currentLevel);
        const effPSE = getPolicyEfficiency(policies[Policy.EnergySubsidies], currentLevel);
        const effPAI_emissions = getPolicyEfficiency(policies[Policy.IntensiveAgriculture], currentLevel);
        if (effCN > 0) {
            const renInst = policies[Policy.CarbonNeutrality].instruments?.["C_Fomento_Energias_Renovables_No_Convencionales"];
            const ccsInst = policies[Policy.CarbonNeutrality].instruments?.["C_Investigacion_Desarrollo_Captura_Carbono"];
            if (renInst?.effortPercentage > 0) totalEmissions *= (1 - (CONTROL_PARAMS.Factor_Reduccion_Emisiones_Renovables_PCN * (renInst.effortPercentage / 100)));
            if (ccsInst?.effortPercentage > 0) totalSequestration += CONTROL_PARAMS.Factor_Aumento_Secuestro_CAC_PCN * (ccsInst.effortPercentage / 100);
        }
        if (effPSE > 0) totalEmissions *= (1 + CONTROL_PARAMS.Factor_Aumento_Emisiones_Fosiles_PSE * effPSE);
        if (effPAI_emissions > 0) totalEmissions *= (1 + CONTROL_PARAMS.Factor_Aumento_Emisiones_AgroIntensivo_PPAI * effPAI_emissions);
        indicators.co2EqEmissionsPerCapita = Math.max(0, ((totalEmissions - totalSequestration) * CONTROL_PARAMS.FACTOR_C_A_CO2EQ * CONTROL_PARAMS.CO2_EMISSIONS_SCALING_FACTOR) / stellaState.Poblacion_Total);

        // 6. Political Pressure
        let ppAgricolaImpulse = 0, ppAmbientalistaImpulse = 0, ppSocialImpulse = 0;
        ppAgricolaImpulse += getPolicyEfficiency(policies[Policy.Agroecological], currentLevel) * CONTROL_PARAMS.Factor_Presion_Agricola_PAS;
        ppAgricolaImpulse += getPolicyEfficiency(policies[Policy.SustainableLivestock], currentLevel) * CONTROL_PARAMS.Factor_Presion_Agricola_PGS;
        ppAgricolaImpulse += getPolicyEfficiency(policies[Policy.IntensiveAgriculture], currentLevel) * CONTROL_PARAMS.Factor_Presion_Agricola_PPAI;
        ppAgricolaImpulse += getPolicyEfficiency(policies[Policy.AgriculturalExports], currentLevel) * CONTROL_PARAMS.Factor_Presion_Agricola_PPEA;
        if (indicators.economicSecurity < CONTROL_PARAMS.Umbral_PP_Agricola_SegEconomica) ppAgricolaImpulse += (CONTROL_PARAMS.Umbral_PP_Agricola_SegEconomica - indicators.economicSecurity) * CONTROL_PARAMS.Sensibilidad_PP_Agricola_SegEconomica;
        if (indicators.foodSecurity < CONTROL_PARAMS.Umbral_PP_Agricola_SegAlimentaria) ppAgricolaImpulse += (CONTROL_PARAMS.Umbral_PP_Agricola_SegAlimentaria - indicators.foodSecurity) * CONTROL_PARAMS.Sensibilidad_PP_Agricola_SegAlimentaria;
        stellaState.PP_AGRICOLA += ppAgricolaImpulse - (stellaState.PP_AGRICOLA * 0.1);
        
        ppAmbientalistaImpulse += getPolicyEfficiency(policies[Policy.Agroecological], currentLevel) * CONTROL_PARAMS.Factor_Presion_Ambiental_PAS;
        ppAmbientalistaImpulse += getPolicyEfficiency(policies[Policy.NaturalConservation], currentLevel) * CONTROL_PARAMS.Factor_Presion_Ambiental_PCR;
        ppAmbientalistaImpulse += getPolicyEfficiency(policies[Policy.SustainableLivestock], currentLevel) * CONTROL_PARAMS.Factor_Presion_Ambiental_PGS;
        ppAmbientalistaImpulse += getPolicyEfficiency(policies[Policy.SustainableWaterManagement], currentLevel) * CONTROL_PARAMS.Factor_Presion_Ambiental_PAGUA;
        ppAmbientalistaImpulse += getPolicyEfficiency(policies[Policy.CarbonNeutrality], currentLevel) * CONTROL_PARAMS.Factor_Presion_Ambiental_PCN;
        ppAmbientalistaImpulse += getPolicyEfficiency(policies[Policy.IntensiveAgriculture], currentLevel) * CONTROL_PARAMS.Factor_Presion_Ambiental_PPAI_Neg;
        ppAmbientalistaImpulse += getPolicyEfficiency(policies[Policy.FlexibleEnvironmentalRegulations], currentLevel) * CONTROL_PARAMS.Factor_Presion_Ambiental_PFRA_Neg;
        ppAmbientalistaImpulse += getPolicyEfficiency(policies[Policy.EnergySubsidies], currentLevel) * CONTROL_PARAMS.Factor_Presion_Ambiental_PSE_Neg;
        if (indicators.biodiversity < CONTROL_PARAMS.Umbral_PP_Ambiental_Biodiversidad) ppAmbientalistaImpulse += (CONTROL_PARAMS.Umbral_PP_Ambiental_Biodiversidad - indicators.biodiversity) * CONTROL_PARAMS.Sensibilidad_PP_Ambiental_Biodiversidad;
        if (indicators.co2EqEmissionsPerCapita > CONTROL_PARAMS.Umbral_PP_Ambiental_CO2PerCapita) ppAmbientalistaImpulse += (indicators.co2EqEmissionsPerCapita - CONTROL_PARAMS.Umbral_PP_Ambiental_CO2PerCapita) * CONTROL_PARAMS.Sensibilidad_PP_Ambiental_CO2PerCapita;
        stellaState.PP_AMBIENTALISTA += ppAmbientalistaImpulse - (stellaState.PP_AMBIENTALISTA * 0.1);

        ppSocialImpulse += getPolicyEfficiency(policies[Policy.Agroecological], currentLevel) * CONTROL_PARAMS.Factor_Presion_Social_PAS;
        ppSocialImpulse += getPolicyEfficiency(policies[Policy.SustainableWaterManagement], currentLevel) * CONTROL_PARAMS.Factor_Presion_Social_PAGUA;
        ppSocialImpulse += getPolicyEfficiency(policies[Policy.CarbonNeutrality], currentLevel) * CONTROL_PARAMS.Factor_Presion_Social_PCN;
        ppSocialImpulse += getPolicyEfficiency(policies[Policy.NaturalConservation], currentLevel) * CONTROL_PARAMS.Factor_Presion_Social_PCR;
        ppSocialImpulse += getPolicyEfficiency(policies[Policy.IntensiveAgriculture], currentLevel) * CONTROL_PARAMS.Factor_Presion_Social_PPAI_Neg;
        ppSocialImpulse += getPolicyEfficiency(policies[Policy.ForeignInvestment], currentLevel) * CONTROL_PARAMS.Factor_Presion_Social_PPIE_Neg;
        ppSocialImpulse += getPolicyEfficiency(policies[Policy.FlexibleEnvironmentalRegulations], currentLevel) * CONTROL_PARAMS.Factor_Presion_Social_PFRA_Neg;
        if (indicators.socialWellbeing < CONTROL_PARAMS.Umbral_PP_Social_BienestarSocial) ppSocialImpulse += (CONTROL_PARAMS.Umbral_PP_Social_BienestarSocial - indicators.socialWellbeing) * CONTROL_PARAMS.Sensibilidad_PP_Social_BienestarSocial;
        ppSocialImpulse += additionalTaxPressurePercentage * CONTROL_PARAMS.PPSocial_Increase_Factor_Per_Tax_Point;
        stellaState.PP_SOCIAL += ppSocialImpulse - (stellaState.PP_SOCIAL * CONTROL_PARAMS.Tasa_disipacion_social);
        
        stellaState.PP_AGRICOLA = Math.max(0, Math.min(100, stellaState.PP_AGRICOLA));
        stellaState.PP_AMBIENTALISTA = Math.max(0, Math.min(100, stellaState.PP_AMBIENTALISTA));
        stellaState.PP_SOCIAL = Math.max(0, Math.min(100, stellaState.PP_SOCIAL));

        // 7. Update final indicators from stella state
        indicators.pbi = stellaState.PBI_Real;
        indicators.debt = stellaState.Deuda;
        indicators.treasuryReserves = stellaState.Reservas_del_Tesoro;
        indicators.ppAgricola = stellaState.PP_AGRICOLA;
        indicators.ppAmbientalista = stellaState.PP_AMBIENTALISTA;
        indicators.ppSocial = stellaState.PP_SOCIAL;
        Object.keys(indicators).forEach(keyStr => {
            const key = keyStr as keyof Indicators;
            if (!['co2EqEmissionsPerCapita', 'pbi', 'treasuryReserves', 'debt', 'generalScore'].includes(key as string)) {
                indicators[key] = Math.max(0, Math.min(100, indicators[key]));
            }
        });

        // 8. Recalculate Score
        const carbonScore = Math.max(0, 100 - (indicators.co2EqEmissionsPerCapita / CONTROL_PARAMS.Referencia_Max_CO2_per_Capita_Puntaje) * 100);
        let finalScore = 0;
        if (currentLevel === 1) {
            finalScore = (indicators.biodiversity * 0.5) + (carbonScore * 0.5);
        } else if (currentLevel === 2) {
            const avgPressure = (indicators.ppAgricola + indicators.ppAmbientalista + indicators.ppSocial) / 3;
            const polPressureScore = Math.max(0, 100 - avgPressure);
            const avgExternalities = (indicators.foodSecurity + indicators.economicSecurity + indicators.socialWellbeing + indicators.politicalStability) / 4;
            finalScore = (indicators.biodiversity * 0.15) + (carbonScore * 0.20) + (polPressureScore * 0.30) + (avgExternalities * 0.35);
        } else {
            const avgPressure = (indicators.ppAgricola + indicators.ppAmbientalista + indicators.ppSocial) / 3;
            const polPressureScore = Math.max(0, 100 - avgPressure);
            const avgExternalities = (indicators.foodSecurity + indicators.economicSecurity + indicators.socialWellbeing + indicators.politicalStability) / 4;
            const pbiScore = Math.min(100, (indicators.pbi / 25000) * 100);
            finalScore = (indicators.biodiversity * 0.10) + (carbonScore * 0.15) + (polPressureScore * 0.20) + (avgExternalities * 0.25) + (pbiScore * 0.30);
        }
        indicators.generalScore = finalScore * 10;
        
        // 9. Check Game Over conditions
        if (indicators.politicalStability <= 5) tempGameState.gameOverReason = "Colapso Político: La nación ha caído en un estado de ingobernabilidad total.";
        else if (indicators.biodiversity <= 5) tempGameState.gameOverReason = "Colapso Ecológico: La pérdida de biodiversidad ha provocado una catástrofe irreversible.";
        else if (currentLevel >= 2 && indicators.foodSecurity <= 10) tempGameState.gameOverReason = "Hambruna: La incapacidad de alimentar a la población ha generado una crisis humanitaria.";
        else if (stellaState.Reservas_del_Tesoro < -(stellaState.PBI_Real * 0.2) && stellaState.Deuda > stellaState.PBI_Real * 1.5) tempGameState.gameOverReason = "Bancarrota Nacional: La deuda insostenible y la falta de reservas han llevado a la quiebra.";

        // --- END OF RESTORED SIMULATION LOGIC ---

// FIX: Add explicit type annotation for 'p' in the find method to resolve 'unknown' type errors on property access.
        const policyWithEfficiencyWarning = Object.values(policies).find((p: PolicyState) => {
            if (!p.isActive || p.currentEfficiency === undefined || p.previousEfficiencyForNotification === undefined) return false;
            const threshold = 0.40;
            return p.currentEfficiency < threshold && p.previousEfficiencyForNotification >= threshold;
        });

        if (policyWithEfficiencyWarning && policyWithEfficiencyWarning.currentEfficiency !== undefined) {
             const efficiencyPercentage = (policyWithEfficiencyWarning.currentEfficiency * 100).toFixed(0);
             const warningMessage = `¡Atención! La eficiencia de la política "${policyWithEfficiencyWarning.name}" ha caído por debajo del 40% (actualmente ${efficiencyPercentage}%). Su impacto ahora es significativamente reducido. Considera reevaluar tu estrategia o si estás en Nivel 2+, aumenta el esfuerzo en sus instrumentos.`;
             addMessageToChat(warningMessage, 'system', 'policy_efficiency_warning');
             logEvent(warningMessage);
             policyWithEfficiencyWarning.previousEfficiencyForNotification = policyWithEfficiencyWarning.currentEfficiency;
        }

    } // end for loop

    if (concludedLevelInfoForUpdate) {
        tempGameState.lastConcludedLevelInfo = concludedLevelInfoForUpdate;
    }
    
    // Final state update
    setGameState({ ...tempGameState, isSimulating: false });
    updateHistoricalData(tempGameState);

  }, [logEvent, addToast, addMessageToChat, updateHistoricalData]);
  
  const setCurrentLevelManually = useCallback((level: number) => {
    if (level < 1 || level > MAX_LEVELS) {
      logEvent(`Intento de cambiar a un nivel inválido: ${level}`);
      return;
    }
    
    setGameState(prev => {
        if (prev.currentLevel === level) return prev;
        
        const newLevelConfig = LEVEL_CONFIGS.find(lc => lc.levelNumber === level)!;
        let newStellaState: StellaStocks;
        let newLandUses: Record<LandUseType, LandUse>;
        let indicatorOverrides: InitialIndicatorOverrides | null = null;
        
        switch (level) {
            case 2:
                newStellaState = { ...INITIAL_STELLA_STOCKS, ...LEVEL_2_INITIAL_STELLA_OVERRIDES };
                newLandUses = JSON.parse(JSON.stringify(LEVEL_2_INITIAL_LAND_USES));
                indicatorOverrides = LEVEL_2_INITIAL_INDICATOR_OVERRIDES;
                break;
            case 3:
                newStellaState = { ...INITIAL_STELLA_STOCKS, ...LEVEL_3_INITIAL_STELLA_OVERRIDES };
                newLandUses = JSON.parse(JSON.stringify(LEVEL_3_INITIAL_LAND_USES));
                indicatorOverrides = LEVEL_3_INITIAL_INDICATOR_OVERRIDES;
                break;
            default: // Level 1
                newStellaState = JSON.parse(JSON.stringify(INITIAL_STELLA_STOCKS));
                newLandUses = JSON.parse(JSON.stringify(INITIAL_LAND_USES));
                break;
        }

        const newIndicators = { ...INITIAL_INDICATORS };
        if (indicatorOverrides) {
            if (indicatorOverrides.foodSecurity !== undefined) newIndicators.foodSecurity = indicatorOverrides.foodSecurity;
            if (indicatorOverrides.economicSecurity !== undefined) newIndicators.economicSecurity = indicatorOverrides.economicSecurity;
        }
        newIndicators.socialWellbeing = 100 - (newStellaState.Conflicto_social || INITIAL_STELLA_STOCKS.Conflicto_social);
        newIndicators.politicalStability = 100 - (newStellaState.Colapso_politico || INITIAL_STELLA_STOCKS.Colapso_politico);
        newIndicators.ppAgricola = newStellaState.PP_AGRICOLA || INITIAL_STELLA_STOCKS.PP_AGRICOLA;
        newIndicators.ppAmbientalista = newStellaState.PP_AMBIENTALISTA || INITIAL_STELLA_STOCKS.PP_AMBIENTALISTA;
        newIndicators.ppSocial = newStellaState.PP_SOCIAL || INITIAL_STELLA_STOCKS.PP_SOCIAL;
        newIndicators.pbi = newStellaState.PBI_Real || INITIAL_STELLA_STOCKS.PBI_Real;
        newIndicators.debt = newStellaState.Deuda || INITIAL_STELLA_STOCKS.Deuda;
        newIndicators.treasuryReserves = newStellaState.Reservas_del_Tesoro || INITIAL_STELLA_STOCKS.Reservas_del_Tesoro;

        const initialDataPointForNewLevel: HistoricalDataPoint = {
            year: INITIAL_YEAR,
            biodiversity: newIndicators.biodiversity,
            foodSecurity: newIndicators.foodSecurity,
            economicSecurity: newIndicators.economicSecurity,
            socialWellbeing: newIndicators.socialWellbeing,
            generalScore: newIndicators.generalScore,
            co2EqEmissionsPerCapita: newIndicators.co2EqEmissionsPerCapita,
            politicalStability: newIndicators.politicalStability,
            pbi: newIndicators.pbi,
            debt: newIndicators.debt,
            ppAgricola: newIndicators.ppAgricola,
            ppAmbientalista: newIndicators.ppAmbientalista,
            ppSocial: newIndicators.ppSocial,
            treasuryReserves: newIndicators.treasuryReserves,
        };
        setHistoricalData([initialDataPointForNewLevel]);
        
        logEvent(`Cambiado manualmente a Nivel ${level}. El estado del juego se ha reiniciado a los valores por defecto de este nivel.`);

        return {
            ...prev,
            year: INITIAL_YEAR,
            currentLevel: level,
            policies: JSON.parse(JSON.stringify(INITIAL_POLICIES)),
            landUses: newLandUses,
            indicators: newIndicators,
            stellaSpecificState: newStellaState,
            pacts: JSON.parse(JSON.stringify(INITIAL_PACTS)),
            activeLevelConfig: newLevelConfig,
            yearsSimulatedInCurrentLevel: 0,
            level3EventsTriggeredCount: 0,
            additionalTaxPressurePercentage: 0,
            decarbonitoProactiveMessageSentInLevel: false,
            lastConcludedLevelInfo: null, 
            sentLevelReflectionMessage: false,
            gameOverReason: null,
        };
    });

  }, [logEvent]);

  // FIX: Added return statement to App component to render the UI and fix the error in index.tsx
  return (
    <div className="bg-custom-gray min-h-screen text-gray-200 font-sans">
      <Header
        year={gameState.year}
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
        wonLevels={gameState.wonLevels}
      />

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
          <div className="flex flex-col gap-6">
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

      {showPlayerReportModal && (
        <PlayerReportGuideModal
          onClose={() => setShowPlayerReportModal(false)}
          reportQuestions={PLAYER_REPORT_GUIDE_QUESTIONS}
          onStartBotReflection={handleStartBotReflection}
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

      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </div>
  );
};
