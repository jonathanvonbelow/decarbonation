
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
  /**
   * Model 2.0 policy clocks (phase 35 declares them, phase 36 uses them; they replace the
   * Tiempo_Activacion_* stocks and efficiencyDecayDuration). Years since the last activation (0 when
   * inactive) and accumulated active years, which decay while the policy rests.
   */
  rampTime?: number;
  fatigueTime?: number;
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
  // Public uses a player can declare in the Territorio preview (21_fusion_ecosim.md §5). They start
  // at 0 kHa in every level of the 3-level game, where nothing creates them, so every share-weighted
  // term of the model reads exactly as before.
  PublicWetland = "HUM",
  RestorationForest = "RES",
  EnergyPark = "ENR",
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

/**
 * Model 1.1 (phase 34, N-03/T-03): what a pact adds to the policy-impact sum of each indicator
 * function, like one more policy at efficiency 1. Replaces effects() writing `B + 5` every year.
 */
export interface PactImpulses {
  biodiversity?: number;
  foodSecurity?: number;
  economicSecurity?: number;
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
  /** Effects on B, F, E, summed into the indicator functions' policy impact (see PactImpulses). */
  impulses?: PactImpulses;
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
  // Indicators snapshot taken when the current level started (see src/sim/index.ts
  // createInitialState). Win-route progress bars (src/sim/winRoutes.ts) measure "how far the
  // player moved" from this baseline, not distance from zero — added in phase 5
  // (mejora-general/files/17_multiples_vias_victoria.md).
  levelBaseline: Indicators;
  /**
   * kHa of protected native forest the player declared (or that matured from public restoration).
   * Territorio only (phase 34, T-07): the protected forest the model creates on its own does not count
   * as a public decision.
   */
  declaredProtectedArea?: number;
  /**
   * Sub-state of model 2.0 (phase 35, mejora-general/files/35_motor_v2_estructura.md §6): anchors of the
   * level's starting state and the 2.0 stocks. Set by `createInitialState`; undefined only for states
   * created before 2.0 (saved games, hand-built test states).
   */
  model?: ModelState;
  _pendingLevelIntroTrigger: number | null; // Added for managing level intro display
}

/** Bounded indicators of model 2.0 (0-100) that relax toward a logistic target. */
export type ModelIndicatorKey = 'B' | 'F' | 'E' | 'C' | 'Pc' | 'pa' | 'pe' | 'ps';

/**
 * Reference values of the level's starting state (phase 35, `computeAnchors`). Every 2.0 driver is a
 * deviation from these, so with no policies each target equals the starting value (00_INDICE_v6 decision 6).
 */
export interface ModelAnchors {
  /** Logit of each bounded indicator at level start (B, F, E, conflict C, collapse Pc, pressures pa/pe/ps). */
  l: Record<ModelIndicatorKey, number>;
  /** Starting biodiversity, food security, economic security (0-100) and wellbeing W0 = 100 - C. */
  B0: number; F0: number; E0: number; W0: number;
  /** Area-weighted habitat affinity (0-1). */
  habitat0: number;
  /** Food available per capita (production units per person per year). */
  foodPerCapita0: number;
  /** Area-weighted productive value per unit of total area. */
  productiveValue0: number;
  /** Land concentration: (CC + PF) / (CC + CA + PRG + PF). */
  concentration0: number;
  /** (CC + CA + PRG) / total, CC / total, PF / total, (BNNP + BNP) / total. */
  productiveShare0: number; shareCC0: number; sharePF0: number; forestShare0: number;
  /** CO2e per capita at start (t/person/yr) and total emissions (tCO2e/yr), dry run of the first year's land flows. */
  c0: number; emissions0: number;
  /** Mean, spread (max - min) and environmental value of the three sectoral pressures at start. */
  pressureMean0: number; pressureSpread0: number; pressureEnv0: number;
  /** GDP at start (u.m.). */
  gdp0: number;
  /** Starting area of each use of the agricultural pool (kHa, floored at 1e-6), for the anchored rents (37). */
  agriAreas0: Record<'CC' | 'CA' | 'PRG' | 'PF', number>;
}

/** A transient shift of an indicator's logistic target that fades with time constant `tau` (years). */
export interface TargetImpulse { indicator: ModelIndicatorKey; logit: number; t: number; tau: number; }

export interface ModelState {
  /** MODEL_VERSION that created this sub-state. */
  version: string;
  /** Years since level start. */
  t: number;
  anchors: ModelAnchors;
  /** Last computed target X* of each bounded indicator, for the UI and debugging. */
  targets: Partial<Record<ModelIndicatorKey, number>>;
  /** Renewable share of electricity and efficiency gain of the rest of energy (0-1). */
  energy: { renewableShare: number; efficiency: number };
  /** tCO2e/yr by source. */
  emissions: { energy: number; afolu: number; luc: number; total: number };
  /** tCO2e since level start. */
  cumulativeEmissions: number;
  fiscal: {
    growth: number; primaryBalance: number; interestBurden: number; stress: number;
    /** Years in breach of the bankruptcy rule. */
    breachYears: number;
    /** [dt, primary balance / GDP] of recent steps (5-year window, 44). */
    primaryHistory: [number, number][];
  };
  impulses: TargetImpulse[];
  /** Years with at least two production policies active (49). */
  productiveYears: number;
  /** Current yield shock (fraction, AR(1) in 46). */
  yieldShock: number;
}

export interface HistoricalDataPoint {
  year: number;
  [key: string]: number;
}

// Personalized end-of-session synthesis ("Guía de Reflexión" / closing debrief).
// Produced either by Gemini (services/geminiService.ts#generateClosingSynthesis)
// or by the pure local fallback (services/geminiService.ts#buildFallbackSynthesis)
// when no API key is configured or the AI call fails.
export interface ClosingSynthesis {
  decisionsTaken: string; // Section 1: policies activated + effort distribution
  tradeOffs: string; // Section 2: which indicators improved at the cost of others
  crossSectoralEffects: string; // Section 3: causal relationships observed during the session
  reflectionQuestions: string[]; // Section 4: 2-4 open, non-evaluative reflection questions
  isFallback?: boolean; // true when generated locally instead of via Gemini
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
  // Model 1.1 (phase 34, N-08): the 70 keys no engine path read (Duracion_Efecto_*, Ponderacion_*,
  // Peso_*_Ext, Punto_Inflexion_*, Capacidad_Maxima_*, per-level dissipation rates, Monto_del_Prestamo_Unico, …)
  // were deleted. Real policy durations live in INITIAL_POLICIES (efficiencyDecayDuration).
  Ano_Activacion_Prestamo: number;
  Referencia_Max_CO2_per_Capita_Puntaje: number;
  Umbral_polarizacion: number;
  Tasa_Impositiva_General_Sobre_PBI: number;
  Tasa_Base_Crecimiento_PBI: number;
  Tasa_Crecimiento_Poblacional_Base: number;
  FACTOR_C_A_CO2EQ: number;

  Pago_deuda_anual_Nivel_1: number;
  Pago_deuda_anual_Nivel_2: number;
  Pago_deuda_anual_Nivel_3: number;

  Tasa_disipacion_social: number;

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

  // Territorio preview (mejora-general/files/21_fusion_ecosim.md §5): one-time costs, paid from
  // Reservas_del_Tesoro, of declaring each public use, per kHa.
  Costo_Declaracion_Area_Protegida_por_kHa: number;
  Costo_Restauracion_Publica_por_kHa: number;
  Costo_Humedal_Publico_por_kHa: number;
  Costo_Parque_Energetico_por_kHa: number;
  Costo_Mantenimiento_Uso_Publico_por_kHa_Anual: number;
  /** Agricultural-pressure impulse per kHa of *productive* land taken into a public use. */
  Impulso_PP_Agricola_por_kHa_Convertida: number;
  /** Share of total emissions displaced if the whole territory were a public energy park. */
  Factor_Desplazamiento_Emisiones_Parque_Energetico: number;
  /** Annual share of restoration area that matures into unprotected native forest. */
  Tasa_de_RES_a_BNNP_Base: number;

  // Model 2.0 scalars (phase 35, 35_motor_v2_estructura.md §5). Declared now; each one starts acting in the
  // phase that ports its equation (the facilitator panel exposes them in phase 50).
  /** Initial population of the territory (inhabitants), every level and Territorio. Phase 38 makes Poblacion_Total start here. */
  Poblacion_Inicial: number;
  /** Annual fraction of the way to the logistic target: biodiversity, food, economic security, conflict, collapse, pressures. */
  Velocidad_Ajuste_Biodiversidad: number;
  Velocidad_Ajuste_Seg_Alimentaria: number;
  Velocidad_Ajuste_Seg_Economica: number;
  Velocidad_Ajuste_Conflicto: number;
  Velocidad_Ajuste_Colapso: number;
  Velocidad_Ajuste_Presiones: number;
  /** Institutional floor of a policy's efficiency under fatigue (0-1). */
  Eficiencia_Minima_Politicas: number;
  /** Time constant (years) of the fatigue recovery of a resting policy. */
  Recuperacion_Politicas_Anios: number;
  /** Base public spending, fraction of GDP per year, per level. The model's most sensitive parameter. */
  Gasto_Publico_Base_Nivel_1: number;
  Gasto_Publico_Base_Nivel_2: number;
  Gasto_Publico_Base_Nivel_3: number;
}

export type InstrumentImpactHint = {
  indicator: string;
  direction: 'positive' | 'negative';
  magnitude: 'high' | 'medium' | 'low';
};

export type InstrumentImpactHints = Record<string, InstrumentImpactHint[]>;