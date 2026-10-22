/**
 * Tables of model 2.0 (mejora-general/files/35_motor_v2_estructura.md §4): a faithful copy of `P` in
 * scripts/reference/modelo_v2.py. These tables are not editable live; the scalars a facilitator may
 * move (adjustment speeds, efficiency floor, recovery, base public spending, initial population) are in
 * CONTROL_PARAMS (src/constants.ts). Every later phase reads its numbers from here; no phase writes
 * model numbers inside a function.
 *
 * Mapping to the prototype's `P` (name here ← name there):
 *   rampYears ← lam, fatigueYears ← delta, costShare ← kappa, costFixedShare ← cost_fixed_share,
 *   effortE0 ← e0, land.* ← deforest / mu_ag / beta_rent / fallow_*, flux / stock, energy.* ← el_share,
 *   k_energy, a_full_parks, elasticity_income, ren_max_cn, eff_max_cn, budget_cut (+ eps0 of LEVELS),
 *   habitat ← h, zSAR ← z_sar, qB, food.* ← yield / yield_trend / export0 / kappa1 / kappa2, bE,
 *   productiveValue ← value, conflict ← cC, greenRelief ← greenC, conflictWeights ← wF_C / wE_C / wPe_C /
 *   nu_gini / nu_just, pressure ← phi + phi_scale, pacts ← pacts (ids of the code, see below),
 *   finance ← reserve_floor / risk_premium / d0 + the bankruptcy rule of step().
 * In CONTROL_PARAMS instead: pop0 (Poblacion_Inicial), pop_growth (Tasa_Crecimiento_Poblacional_Base),
 *   eta_min, rho_recovery, k.*, g0 (Tasa_Base_Crecimiento_PBI), tax0 (Tasa_Impositiva_General_Sobre_PBI),
 *   gamma (Gasto_Publico_Base_Nivel_*), i (Tasa_de_interes_Nivel_*), alpha (Pago_deuda_anual_Nivel_*).
 * Coefficients the prototype writes inline in its functions (e.g. `0.05 * e["CR"]` in land_step,
 * CN_RELEVANCE) move here in the phase that ports each function (36–47).
 *
 * Pacts use the ids of the code (biodiversityTreaty / globalCarbonAccord / techTransferInitiative), not
 * the prototype's treaty / accord / tech (docs/v6-spec-vs-motor.md, phase 43 row); the prototype's
 * `s` / `u` keys are `renewables` / `efficiency` and `m_protect` / `m_deforest` are protectFactor /
 * deforestFactor. Unlock years stay in INITIAL_PACTS (2030 / 2035 / 2038, same as the prototype).
 *
 * Land-use keys are the values of the LandUseType enum (BNNP, BNP, CA, CC, PF, PRG, HUM, RES, ENR) plus
 * FAL (fallow), which the code does not have yet: it arrives with the transition matrix of phase 37.
 */
import { Policy } from '../../types';

/** Short ids used in the tables; map to the Policy enum once, here. */
export const PID = {
  AS: Policy.Agroecological, CR: Policy.NaturalConservation, GS: Policy.SustainableLivestock,
  AGUA: Policy.SustainableWaterManagement, CN: Policy.CarbonNeutrality, PAI: Policy.IntensiveAgriculture,
  PEA: Policy.AgriculturalExports, PIE: Policy.ForeignInvestment, FRA: Policy.FlexibleEnvironmentalRegulations,
  SE: Policy.EnergySubsidies,
} as const;
export type Pid = keyof typeof PID;
export const PIDS = Object.keys(PID) as Pid[];

/** Land-use codes of the 2.0 tables (LandUseType values + FAL, phase 37). */
export type LandCode = 'BNNP' | 'BNP' | 'CA' | 'CC' | 'PF' | 'PRG' | 'HUM' | 'RES' | 'ENR' | 'FAL';
/** Agricultural reallocation pool of the transition matrix (37). */
export const AGRI_CODES = ['CC', 'CA', 'PRG', 'PF'] as const;
export type AgriCode = typeof AGRI_CODES[number];

export const PARAMS_V2 = {
  /** 36 — years to reach 63 % of full effect after activation. Criterio experto. */
  rampYears:   { AS: 1.5, CR: 2.5, GS: 1.5, AGUA: 2.0, CN: 2.5, PAI: 1.0, PEA: 0.5, PIE: 1.5, FRA: 0.5, SE: 0.5 },
  /** 36 — fatigue time constant (years of accumulated activity). Replaces efficiencyDecayDuration. Criterio experto. */
  fatigueYears: { AS: 15, CR: 25, GS: 12, AGUA: 20, CN: 25, PAI: 8, PEA: 10, PIE: 10, FRA: 6, SE: 5 },
  /** 36/44 — annual cost at full effort, fraction of GDP. Rescaled from v1 costFactor once base spending exists. */
  costShare:   { AS: 0.008, CR: 0.010, GS: 0.006, AGUA: 0.008, CN: 0.012, PAI: 0.006, PEA: 0.003, PIE: 0.005, FRA: 0.002, SE: 0.012 },
  /** 36 — share of the cost paid regardless of effort (dimensionless). Criterio experto. */
  costFixedShare: 0.3,
  /** 36 — effort scale of the diminishing returns (phiEffort), effort points 0-100. Criterio experto. */
  effortE0: 40,

  /** 37 — land: base annual rates (fraction of the source area per year, v1 values) and the agricultural pool. */
  land: {
    BNNP_BNP: 0.008, BNNP_CC: 0.010, BNNP_CA: 0.002, CA_BNNP: 0.001, RES_BNP: 0.04,
    /** Share of each agricultural use that re-enters the reallocation pool each year. */
    poolShare: 0.02,
    /** Sensitivity of the allocation to rents (logit units per unit of log-rent). */
    rentBeta: 1.0,
    /** Share of fallow that re-enters the agricultural pool / regenerates to BNNP each year. */
    fallowReentry: 0.25, fallowRegen: 0.05,
  },

  /** 38 — carbon. Flux in tCO2e/ha/yr (+ emission), stock in Mg C/ha (biomass + soil relevant to conversion). Criterio experto. */
  flux:  { BNP: -1.0, BNNP: 0.5, CA: 0.8, CC: 2.5, PF: -4.0, PRG: 3.0, HUM: -3.0, RES: -9.0, ENR: 0.1, FAL: -2.0 },
  stock: { BNP: 200, BNNP: 170, CA: 60, CC: 45, PF: 90, PRG: 50, HUM: 250, RES: 70, ENR: 40, FAL: 55 },
  energy: {
    /** Energy tCO2/cap/yr at start, per level (calibrated so c0 ≈ 5.9 / 7.1 / 5.7 with the land flux). */
    eps0: { 1: 4.0, 2: 5.0, 3: 4.6 } as Record<number, number>,
    /** Electric share of energy emissions; annual adjustment fraction of renewables/efficiency. */
    electricShare: 0.35, adjust: 0.15,
    /** Share of the territory under energy parks that fully decarbonises electricity. */
    parksFullShare: 0.04,
    /** Income elasticity of energy emissions per capita. */
    incomeElasticity: 0.3,
    /** Maximum renewables share / efficiency gain that Carbon Neutrality reaches at full effect. */
    renewablesMaxCN: 0.60, efficiencyMaxCN: 0.35,
    /** Carbon budget: cut by 2054 relative to the starting emissions path. */
    budgetCut2054: 0.30,
  },

  /** 40 — habitat affinity (countryside species-area, 0-1 per land use) and z exponent. Criterio experto. */
  habitat: { BNP: 1.0, HUM: 1.0, BNNP: 0.8, RES: 0.55, CA: 0.35, PF: 0.15, PRG: 0.15, FAL: 0.3, CC: 0.05, ENR: 0.05 },
  zSAR: 0.35,
  /** 40 — direct policy effect on biodiversity, logit units per unit of effective efficiency. */
  qB: { CR: 0.55, AS: 0.20, GS: 0.12, AGUA: 0.08, CN: 0.05, PAI: -0.25, PEA: -0.06, PIE: -0.03, FRA: -0.45, SE: -0.10 },

  /** 41 — food balance: yields (production units per kHa), annual yield trend, export share, logit slopes. */
  food: { yield: { CC: 1.0, CA: 0.7, PRG: 0.25 }, yieldTrend: 0.006, export0: 0.30, kappa1: 2.5, kappa2: 0.6 },

  /** 39 — economic security coefficients (logit units per unit of effective efficiency). */
  bE: { PIE: 0.55, PEA: 0.45, PAI: 0.35, FRA: 0.20, SE: 0.15, AS: 0.10, GS: 0.10, AGUA: 0.05, CN: -0.10, CR: -0.05 },
  /** 39 — relative productive value per kHa of each productive use. */
  productiveValue: { CC: 1.0, CA: 0.8, PRG: 0.6, PF: 0.9, ENR: 1.2 },

  /** 39/45 — social conflict: policy drivers and green relief (logit units per unit of efficiency), weights. */
  conflict: { FRA: 0.60, PAI: 0.30, PIE: 0.20, SE: -0.10 },
  greenRelief: { CN: 0.25, CR: 0.25, AGUA: 0.15 },
  conflictWeights: { food: 0.6, econ: 0.5, envPressure: 0.4, gini: 3.0, just: 0.6 },

  /** 42 — pressures: v1 impulse factors (points per unit of efficiency), divided by phiScale in logit space. */
  pressure: {
    a: { AS: -2.0, GS: -1.5, PAI: -10.0, PEA: -6.0, CR: 3.0 },
    e: { AS: -5.0, CR: -12.5, GS: -4.0, AGUA: -4.0, CN: -9.0, PAI: 7.5, FRA: 12.5, SE: 10.0 },
    s: { AS: -5.0, AGUA: -3.5, CN: -3.5, CR: -2.5, PAI: 5.0, PIE: 3.5, FRA: 7.5 },
    phiScale: 15,
  },

  /** 43 — pacts as target shifts while active (logit units); entry and annual costs as fractions of GDP. */
  pacts: {
    biodiversityTreaty:     { entry: 0.03, annual: 0.002, B: 0.25, E: -0.05, protectFactor: 1.5, deforestFactor: 0.5 },
    globalCarbonAccord:     { entry: 0.05, annual: 0.004, E: -0.10, Pc: -0.15, renewables: 0.05, efficiency: 0.05 },
    techTransferInitiative: { entry: 0.10, annual: 0.008, E: 0.15, renewables: 0.10, efficiency: 0.05 },
  },

  /** 44 — public finance (fractions of GDP or of tax revenue; years). */
  finance: {
    reserveFloor: 0.02, riskPremium: 0.05, debtThreshold: 0.6,
    bankruptcyDebtRatio: 1.0, bankruptcyInterestBurden: 0.20, bankruptcyYears: 2,
    /** Tolerance of the bankruptcy clock: with dt = 1/12, 24 months add up to 1.9999… (fase 32, BREACH_EPS). */
    breachEps: 1e-9,
    stressMid: 0.20, stressWidth: 0.04,
  },
} as const;

export type ParamsV2 = typeof PARAMS_V2;
