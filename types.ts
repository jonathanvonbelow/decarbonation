
export enum Policy {
  Agroecological = "Políticas Agroecológicas (P-AS)",
  NaturalConservation = "Políticas de Conservación de los Bienes Naturales (P-CR)",
  SustainableLivestock = "Políticas de Ganadería Sostenible (P-GS)",
  SustainableWaterManagement = "Políticas de Gestión Sostenible del Recurso Hídrico (P-AGUA)",
  CarbonNeutrality = "Políticas de Carbono Neutralidad (P-C)",
  IntensiveAgriculture = "Políticas Agrícolas Intensivas (P-PAI)",
  AgriculturalExports = "Políticas de Exportaciones Agrícolas (P-PEA)",
  ForeignInvestment = "Políticas de Inversión Extranjera (P-PIE)",
  FlexibleEnvironmentalRegulations = "Políticas de Normativas Ambientales Flexibles (P-FRA)",
  EnergySubsidies = "Políticas de Subsidios Energéticos (P-SE)",
}

export interface PolicyInstrument {
  id: string; // e.g., "AS_Subsidios_Bioinsumos"
  name: string;
  description: string;
  effortPercentage: number; // 0-100, player-set
  baseEffectivenessFactor: number; // How much it *can* contribute (e.g., 0.25 if 4 instruments equally share potential)
}

export interface PolicyState {
  id: Policy;
  name: string;
  isActive: boolean;
  description: string;
  costFactor: number;
  stellaName?: string;
  initialEfficiency?: number;
  efficiencyDecayDuration?: number;
  currentEfficiency?: number;
  instruments?: Record<string, PolicyInstrument>; // Keyed by instrument ID
  totalInstrumentEffortApplied?: number; // Sum of effortPercentages of its instruments (0-100)
  activationYear?: number; // Año en que la política fue activada
  previousEfficiencyForNotification?: number; // Internal tracking for efficiency drop notification
}

export interface LandUse {
  name: string;
  area: number;
  emissionRate: number;
  sequestrationRate: number;
  stellaName: string;
  document?: string;
}

export enum LandUseType {
  UnprotectedNativeForest = "BNNP",
  ProtectedNativeForest = "BNP",
  AgroecologicalCrops = "CA",
  ConventionalCrops = "CC",
  ForestPlantations = "PF",
  GrasslandsPastures = "PRG",
}


export interface StellaStocks {
  Conteo_Agric_Intens: number;
  Conteo_Agroecologica: number;
  Conteo_Agua: number;
  Conteo_Ambiental_Flex: number;
  Conteo_Bienes_Natu: number;
  Conteo_Carbono_Neut: number;
  Conteo_Export_Agric: number;
  Conteo_Ganaderia_Sost: number;
  Conteo_Inver_Extran: number;
  Conteo_Subsidios: number;
  MEAN_colapso: number;

  Poblacion_Total: number;

  PP_AGRICOLA: number;
  PP_AMBIENTALISTA: number;
  PP_SOCIAL: number;

  Colapso_politico: number;
  Deuda: number;
  Flag_Prestamo_Tomado_Stock: number;
  PBI_Real: number;
  Puntaje_General: number;
  Reservas_del_Tesoro: number;

  Cumplimiento_Nivel_1: number;
  Cumplimiento_Nivel_2: number;
  Cumplimiento_Nivel_3: number;
  Nivel_1_Active: boolean;
  Nivel_2_Active: boolean;
  Nivel_3_Active: boolean;
  Desactivar_Nivel_1: number;
  Desactivar_Nivel_2: number;
  Desactivar_Nivel_3: number;

  Tiempo_Activacion_Políticas_Agrícolas_Intensivas: number;
  Tiempo_Activacion_Políticas_Agroecológicas: number;
  Tiempo_Activacion_Políticas_de_Carbono_Neutralidad: number;
  Tiempo_Activacion_Políticas_de_Conservación_de_los_Bienes_Naturales: number;
  Tiempo_Activacion_Políticas_de_Exportaciones_Agrícolas: number;
  Tiempo_Activacion_Políticas_de_Ganadería_Sostenible: number;
  Tiempo_Activacion_Políticas_de_Gestión_Sostenible_del_Recurso_Hídrico: number;
  Tiempo_Activacion_Políticas_de_Inversión_Extranjera: number;
  Tiempo_Activacion_Políticas_de_Normativas_Ambientales_Flexibles: number;
  Tiempo_Activacion_Políticas_de_Subsidios_Energéticos: number;

  Conflicto_social: number;
  Conteo_Chatgpt: number;
}

export interface Pact {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  effects: (currentIndicators: Indicators, currentStellaStocks: StellaStocks) => {
    indicators?: Partial<Indicators>;
    stellaStocks?: Partial<StellaStocks>;
    landUseChangeFactors?: {
        tasa_BNNP_a_BNP?: number; // Multiplier
        tasa_BNNP_a_CC?: number; // Multiplier
        tasa_BNNP_a_CA?: number; // Multiplier
        tasa_CA_a_BNNP?: number; // Multiplier
        tasa_CC_a_CA?: number;   // Multiplier
    };
  };
  costToJoin?: number;
  annualCost?: number;
  unlockYear?: number;
}

// Helper to filter keys of an object to only those that point to a 'number' type value.
type KeysOfNumberType<T> = { [K in keyof T]: T[K] extends number ? K : never }[keyof T];

export type NumericStellaKeys = KeysOfNumberType<StellaStocks>;
// FIX: Changed GameState['indicators'] to Indicators to improve type stability.
export type NumericIndicatorKeys = KeysOfNumberType<Indicators>;

export interface RandomEventEffect {
  indicator?: NumericIndicatorKeys | `stella.${NumericStellaKeys}`;
  changeAbsolute?: number;
  changePercentage?: number; // e.g., 0.1 for +10%, -0.05 for -5%
  landUseChange?: {
    target: LandUseType;
    changeAbsolute_kHa: number;
  };
}

export interface RandomEvent {
  id: string;
  name: string;
  description: string;
  type: 'positive' | 'negative' | 'neutral';
  category: 'environmental' | 'economic' | 'social' | 'political' | 'technological';
  triggerChance: (gameState: GameState) => number; // Chance (0-1) to trigger per year
  effects: (gameState: GameState) => RandomEventEffect[];
  minLevel?: number;
}

// FIX: Extracted Indicators and Finances into their own interfaces to simplify GameState and improve type inference.
export interface Indicators {
  biodiversity: number;
  foodSecurity: number;
  economicSecurity: number;
  socialWellbeing: number;
  co2EqEmissionsPerCapita: number;
  politicalStability: number;
  generalScore: number;
  pbi: number;
  treasuryReserves: number;
  debt: number;
  ppAgricola: number;
  ppAmbientalista: number;
  ppSocial: number;
  cumplimientoNivel1: number;
  cumplimientoNivel2: number;
  cumplimientoNivel3: number;
}

export interface Finances {
  pbi: number;
  treasuryReserves: number;
  debt: number;
}

export interface GameState {
  year: number;
  currentLevel: number;
  policies: Record<Policy, PolicyState>;
  landUses: Record<LandUseType, LandUse>;
  indicators: Indicators;
  finances: Finances;
  stellaSpecificState: StellaStocks;
  gameLog: string[];
  isSimulating: boolean;
  activeLevelConfig?: LevelConfig;
  gameOverReason: string | null;
  loanRequestedThisRound: number;
  pacts: Record<string, Pact>;
  lastConcludedLevelInfo: {
    level: number;
    status: 'won' | 'lost';
    reason: string;
    finalIndicators: Indicators;
    winConditions?: LevelConfig['winConditions'];
  } | null;
  sentLevelReflectionMessage: boolean;
  currentEvent: RandomEvent | null; // For random events
  newsHeadlines: string[]; // For AI-generated news
  level3EventsTriggeredCount: number; // Counter for events in Level 3
  additionalTaxPressurePercentage: number; // 0-20, representing additional tax rate
  decarbonitoProactiveMessageSentInLevel: boolean;
  yearsSimulatedInCurrentLevel: number;
  wonLevels: number[]; // Added to track successfully completed levels
  _pendingLevelIntroTrigger: number | null; // Added for managing level intro display
}

export interface HistoricalDataPoint {
  year: number;
  [key: string]: number;
}

export type ChatMessageEmphasisType = 'standard' | 'level_event' | 'game_event' | 'proactive_bot' | 'system_error' | 'policy_efficiency_warning';

export interface ChatMessage {
  sender: 'user' | 'bot' | 'system';
  text: string;
  timestamp: number;
  emphasisType?: ChatMessageEmphasisType;
}

export interface LevelConfig {
  levelNumber: number;
  name: string;
  headerSuffix: string;
  chatbotSystemInstruction: string;
  targetYear?: number;
  progressionConditionsMet: (gameState: GameState) => boolean;
  description?: string;
  winConditions?: {
    puntajeGeneralMin?: number;
    co2EqEmissionsPerCapitaMax?: number;
    bosqueNativoProtegidoMin?: number; 
    nativeForestTotalMinPercentage?: number; 
    bienestarSocialMin?: number;
    politicalStabilityMin?: number; // Added
    colapsoPoliticoMax?: number;
    deudaPbiMax?: number;
    biodiversityMin?: number;
    foodSecurityMin?: number;
    economicSecurityMin?: number;
    pbiMin?: number;
    ppAgricolaMax?: number;
    ppAmbientalistaMax?: number;
    ppSocialMax?: number;
  };
}

export interface RegionalDemographics {
  population: number;
  growthRate: number; // percentage
}

export interface RegionalEmployment {
  rate: number; // percentage
  mainSectors: string[];
}

export interface RegionalStructure {
  agrarian: string; // descriptive
  commercial: string; // descriptive
  industrial: string; // descriptive
}

export interface RegionalZoneData {
  id: string;
  name: string;
  carbonBalanceTrend: "stable" | "improving" | "worsening" | "excellent";
  basePolicyAdoption: number; // Base percentage
  focus: string;
  idh: number; // Human Development Index (0.0 to 1.0)
  demographics: RegionalDemographics;
  employment: RegionalEmployment;
  structure: RegionalStructure;
  // dynamicPolicyAdoption will be calculated in the component
}

export interface DisplayRegionalZoneData extends RegionalZoneData {
  dynamicPolicyAdoption: number;
}

export interface InitialIndicatorOverrides {
  foodSecurity?: number;
  economicSecurity?: number;
}

// Added for Political Pressure calculation refinements
export interface ControlParams {
  Factor_sensibilidad_Indicador_eficiencia: number;
  Max_Emisiones_Referencia_Anual: number;
  Ano_Activacion_Prestamo: number;
  Monto_del_Prestamo_Unico: number;
  Referencia_Max_CO2_per_Capita_Puntaje: number;
  Umbral_polarizacion: number;
  Tasa_Impositiva_General_Sobre_PBI: number;
  Tasa_Base_Crecimiento_PBI: number;
  Tasa_Crecimiento_Poblacional_Base: number;
  FACTOR_C_A_CO2EQ: number;
  Tasa_Transicion_Emisiones_Base: number;
  Punto_Saturacion_Emisiones: number;

  Pago_deuda_anual_Nivel_1: number;
  Pago_deuda_anual_Nivel_2: number;
  Pago_deuda_anual_Nivel_3: number;

  Amplificacion_mediatica_social_Nivel_1: number;
  Amplificacion_mediatica_social_Nivel_2: number;
  Amplificacion_mediatica_social_Nivel_3: number;

  Duracion_Efecto_Al: number; Duracion_Efecto_CBN: number; Duracion_Efecto_CN: number;
  Duracion_Efecto_EA: number; Duracion_Efecto_GRH: number; Duracion_Efecto_GS: number;
  Duracion_Efecto_IE: number; Duracion_Efecto_NAF: number; Duracion_Efecto_PA: number;
  Duracion_Efecto_SE: number;

  Factor_Impulso_Presion_Agricola: number;
  Factor_Impulso_Presion_Ambientalista: number;
  Factor_Impulso_Presion_Social: number;

  Tasa_disipacion_social: number;
  Tasa_disipacion_agricola_Nivel_1: number; Tasa_disipacion_agricola_Nivel_2: number; Tasa_disipacion_agricola_Nivel_3: number;
  Tasa_disipacion_ambientalista_Nivel_1: number; Tasa_disipacion_ambientalista_Nivel_2: number; Tasa_disipacion_ambientalista_Nivel_3: number;

  Peso_Influencia_Presiones_CP: number;
  Peso_Factor_Polarizacion_CP: number;
  Peso_Agricola_Colapso: number;
  Peso_Ambientalista_Colapso: number;
  Peso_Social_Colapso: number;

  Ponderacion_CO2_Nivel_1: number; Ponderacion_CO2_Nivel_2: number; Ponderacion_CO2_Nivel_3: number;
  Ponderacion_Externalidades_Nivel_1: number; Ponderacion_Externalidades_Nivel_2: number; Ponderacion_Externalidades_Nivel_3: number;
  Ponderacion_Usos_coberturas_Nivel_1: number; Ponderacion_Usos_coberturas_Nivel_2: number; Ponderacion_Usos_coberturas_Nivel_3: number;

  Peso_Biodiversidad_Ext: number;
  Peso_Seguridad_Alimentaria_Ext: number;
  Peso_Seguridad_Economica_Ext: number;
  Peso_Bienestar_Social_Ext: number;

  Peso_BNNP_Nivel_1: number; Peso_BNP_Nivel_1: number; Peso_CA_Nivel_1: number;
  Peso_CC_Nivel_1: number; Peso_PF_Nivel_1: number; Peso_PRG_Nivel_1: number;

  Umbral_Influencia_Agricola_Nivel_1: number; Umbral_Influencia_Agricola_Nivel_2: number; Umbral_Influencia_Agricola_Nivel_3: number;

  Tasa_de_interes_Nivel_1: number;
  Tasa_de_interes_Nivel_2: number;
  Tasa_de_interes_Nivel_3: number;
  Factor_Impacto_Politicas_y_Presiones_en_Biodiversidad_Peso: number;
  Factor_Impacto_Usos_del_Suelo_en_Biodiversidad_Peso: number;
  Factor_Impacto_Politicas_y_Presiones_en_Seguridad_Alimentaria_Peso: number;
  Factor_Impacto_Usos_del_Suelo_en_Seguridad_Alimentaria_Peso: number;
  Impacto_Biodiversidad_en_Seguridad_Alimentaria_Peso: number;
  Factor_Impacto_Politicas_y_Presiones_en_Seguridad_Economica_Peso: number;
  Factor_Impacto_Usos_del_Suelo_en_Seguridad_Economica_Peso: number;
  Impacto_Biodiversidad_en_SE_Peso: number;
  Factor_Impacto_Politicas_y_Presiones_en_Bienestar_Peso: number;
  Factor_Impacto_Usos_en_Bienestar_Peso: number; 
  Impacto_Submodulos_en_Bienestar_Peso: number; 
  Impacto_Sinergias_Antagonismos_Bienestar_Peso: number; 
  Punto_Inflexion_SA_Biodiversidad: number;
  Punto_Inflexion_SE_Biodiversidad: number;
  Punto_Inflexion_BS_Biodiversidad: number;
  Punto_Inflexion_BS_SA: number;
  Punto_Inflexion_BS_SE: number;
  Capacidad_Maxima_SA_Impacto_Biodiversidad: number;
  Capacidad_Maxima_SA_Impacto_SE: number;
  Capacidad_Maxima_BS_Impacto_Biodiversidad: number; 
  Capacidad_Maxima_BS_Impacto_SA: number; 
  Capacidad_Maxima_BS_Impacto_SE: number; 

  Peso_Ant_C_SE_Carbono_Stella: number;
  Peso_Sin_CR_C_Carbono_Stella: number;

  Tasa_de_BNNP_a_BNP_Base: number;
  Tasa_de_BNNP_a_CA_Base: number;
  Tasa_de_BNNP_a_CC_Base: number;
  Tasa_de_CA_a_BNNP_Base: number;
  Tasa_de_CC_a_CA_Base: number;

  // Political Pressure Policy Effects (Negative values decrease pressure, positive values increase pressure)
  Factor_Presion_Agricola_PAS: number; 
  Factor_Presion_Agricola_PGS: number; 
  Factor_Presion_Agricola_PPAI: number;
  Factor_Presion_Agricola_PPEA: number; 

  Factor_Presion_Ambiental_PAS: number;
  Factor_Presion_Ambiental_PCR: number; 
  Factor_Presion_Ambiental_PGS: number;
  Factor_Presion_Ambiental_PAGUA: number;
  Factor_Presion_Ambiental_PCN: number; 
  Factor_Presion_Ambiental_PPAI_Neg: number; // Negative effect on Env Pressure (increases it)
  Factor_Presion_Ambiental_PFRA_Neg: number;
  Factor_Presion_Ambiental_PSE_Neg: number;  

  Factor_Presion_Social_PAS: number;
  Factor_Presion_Social_PAGUA: number;
  Factor_Presion_Social_PCN: number;
  Factor_Presion_Social_PCR: number; 
  Factor_Presion_Social_PPAI_Neg: number; // Negative effect on Social Pressure (increases it)
  Factor_Presion_Social_PPIE_Neg: number;
  Factor_Presion_Social_PFRA_Neg: number;

  // Political Pressure Baseline Indicator Sensitivities & Targets
  Sensibilidad_PP_Agricola_SegEconomica: number;
  Umbral_PP_Agricola_SegEconomica: number;
  Sensibilidad_PP_Agricola_SegAlimentaria: number; 
  Umbral_PP_Agricola_SegAlimentaria: number;
  
  Sensibilidad_PP_Ambiental_Biodiversidad: number;
  Umbral_PP_Ambiental_Biodiversidad: number;
  Sensibilidad_PP_Ambiental_CO2PerCapita: number;
  Umbral_PP_Ambiental_CO2PerCapita: number;
  
  Sensibilidad_PP_Social_BienestarSocial: number;
  Umbral_PP_Social_BienestarSocial: number;


  // Direct Carbon Impact Factors for Specific Policy Instruments
  Factor_Reduccion_Emisiones_Renovables_PCN: number;
  Factor_Aumento_Secuestro_CAC_PCN: number;
  Factor_Aumento_Emisiones_Fosiles_PSE: number;
  Factor_Aumento_Emisiones_AgroIntensivo_PPAI: number;


  // Fiscal Pressure Parameters (Level 3)
  Max_Additional_Tax_Rate_Percentage: number; // e.g., 20 for 20%
  EcoSec_Reduction_Factor_Per_Tax_Point: number; // e.g., 0.25 points of EcoSec reduction per 1% additional tax
  SocialConflict_Increase_Factor_Per_Tax_Point: number; // e.g., 0.3 points of Conflict increase per 1% additional tax
  PBIGrowth_Reduction_Factor_Per_Tax_Point: number; // e.g., 0.0002 (0.02% PBI growth reduction per 1% additional tax)
  PPSocial_Increase_Factor_Per_Tax_Point: number; // e.g., 0.4 points of Social Pressure increase per 1% additional tax
  CO2_EMISSIONS_SCALING_FACTOR: number;
}

export type InstrumentImpactHint = {
  indicator: string;
  direction: 'positive' | 'negative';
  magnitude: 'high' | 'medium' | 'low';
};

export type InstrumentImpactHints = Record<string, InstrumentImpactHint[]>;