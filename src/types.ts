
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
  /** Base efficiency η (ramp × fatigue, 0-1) the engine computed on the last step; 0 while inactive (phase 36). */
  currentEfficiency?: number;
  instruments?: Record<string, PolicyInstrument>; // Keyed by instrument ID
  totalInstrumentEffortApplied?: number; // Sum of effortPercentages of its instruments (0-100)
  activationYear?: number; // Año en que la política fue activada
  /** Fatigue factor e^(−T/δ) at the last check: the "half of its push" warning fires on the crossing below 0.5 (phase 36). */
  previousFatigueFactor?: number;
  /**
   * Model 2.0 policy clocks (src/sim/v2/policies.ts `tickPolicyClocks`, phase 36; they replace the
   * Tiempo_Activacion_* stocks and efficiencyDecayDuration). Years since the last activation (0 when
   * inactive) and accumulated active years, which decay with Recuperacion_Politicas_Anios while resting.
   */
  rampTime?: number;
  fatigueTime?: number;
}

export interface LandUse {
  name: string;
  area: number;
  // Phase 38: emissionRate / sequestrationRate are gone; the carbon of each use is PARAMS_V2.flux / stock.
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
  // Fallow / degraded land (model 2.0, mejora-general/files/37 §1): land an event or a situation took
  // out of use. It starts at 0 kHa in every level, regenerates to BNNP and re-enters the agricultural
  // pool (src/sim/v2/land.ts). In Territorio it is the `fallow` parcel kind.
  Fallow = "FAL",
}

export interface StellaStocks {
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

  Conflicto_social: number;
  Conteo_Chatgpt: number;
}

export interface Pact {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  unlockYear?: number;
  // Model 1.1 (phase 34) had `impulses` (B, F, E inside the 1.1 indicator functions); phases 39–41 replaced them with
  // shifts of the logistic targets (PARAMS_V2.pacts.*.B / E / Pc) and the field was deleted in phase 41. Phase 43 deleted
  // `effects` (a function, lost on every JSON clone), `costToJoin` and `annualCost`: what a pact does and costs is data in
  // PARAMS_V2.pacts keyed by `id` (src/sim/v2/pacts.ts; costs as fractions of GDP).
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
  /** Population at start (inhabitants, CP.Poblacion_Inicial): reference of income per capita in the energy emissions (38). */
  pop0: number;
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
  // were deleted. Policy time constants live in PARAMS_V2 (rampYears, fatigueYears; phase 36).
  Ano_Activacion_Prestamo: number;
  Referencia_Max_CO2_per_Capita_Puntaje: number;
  Tasa_Impositiva_General_Sobre_PBI: number;
  Tasa_Base_Crecimiento_PBI: number;
  Tasa_Crecimiento_Poblacional_Base: number;

  Pago_deuda_anual_Nivel_1: number;
  Pago_deuda_anual_Nivel_2: number;
  Pago_deuda_anual_Nivel_3: number;

  Tasa_de_interes_Nivel_1: number;
  Tasa_de_interes_Nivel_2: number;
  Tasa_de_interes_Nivel_3: number;

  Tasa_de_BNNP_a_BNP_Base: number;
  Tasa_de_BNNP_a_CA_Base: number;
  Tasa_de_BNNP_a_CC_Base: number;
  Tasa_de_CA_a_BNNP_Base: number;

  // Fiscal Pressure Parameters (Level 3)
  Max_Additional_Tax_Rate_Percentage: number; // e.g., 20 for 20%
  // PBIGrowth_Reduction_Factor_Per_Tax_Point: moved to PARAMS_V2.finance.growthTaxDrag (phase 44).

  // Territorio preview (mejora-general/files/21_fusion_ecosim.md §5): one-time costs, paid from
  // Reservas_del_Tesoro, of declaring each public use, per kHa.
  Costo_Declaracion_Area_Protegida_por_kHa: number;
  Costo_Restauracion_Publica_por_kHa: number;
  Costo_Humedal_Publico_por_kHa: number;
  Costo_Parque_Energetico_por_kHa: number;
  Costo_Mantenimiento_Uso_Publico_por_kHa_Anual: number;
  /** Annual share of restoration area that matures into unprotected native forest. */
  /** Restoration maturing into protected native forest (RES → BNP), fraction of RES per year. */
  Tasa_de_RES_a_BNP_Base: number;

  // Model 2.0 scalars (phase 35, 35_motor_v2_estructura.md §5). Declared now; each one starts acting in the
  // phase that ports its equation (the facilitator panel exposes them in phase 50).
  /** Initial population of the territory (inhabitants), every level and Territorio: Poblacion_Total starts here (phase 38). */
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