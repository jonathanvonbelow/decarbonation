/**
 * Tables of model 2.0 (mejora-general/files/35_motor_v2_estructura.md §4): a faithful copy of `P` in
 * scripts/reference/modelo_v2.py. These tables are not editable live; the scalars a facilitator may
 * move (adjustment speeds, efficiency floor, recovery, base public spending, initial population) are in
 * CONTROL_PARAMS (src/constants.ts). Every later phase reads its numbers from here; no phase writes
 * model numbers inside a function.
 *
 * Mapping to the prototype's `P` (name here ← name there):
 *   rampYears ← lam, fatigueYears ← delta, costShare ← kappa, costFixedShare ← cost_fixed_share,
 *   effortE0 ← e0, land.* ← mu_ag / beta_rent / fallow_* + the inline coefficients of land_step (deforest → CP Tasa_de_*_Base), flux / stock, energy.* ← el_share,
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
 * Land-use keys are the values of the LandUseType enum (BNNP, BNP, CA, CC, PF, PRG, HUM, RES, ENR, FAL);
 * FAL (fallow) arrived with the transition matrix of phase 37.
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

/** Land-use codes of the 2.0 tables (the LandUseType values; FAL since phase 37). */
export type LandCode = 'BNNP' | 'BNP' | 'CA' | 'CC' | 'PF' | 'PRG' | 'HUM' | 'RES' | 'ENR' | 'FAL';
/** Agricultural reallocation pool of the transition matrix (37). */
export const AGRI_CODES = ['CC', 'CA', 'PRG', 'PF'] as const;
export type AgriCode = typeof AGRI_CODES[number];

/** 36 — label of an instrument for the just-transition index (phase 45). */
export type InstrumentTag = 'support' | 'restriction' | 'neutral';

/**
 * 36 — relevance μ (1 high, 0.6 medium, 0.3 low) of each instrument on each channel, in the order of
 * INITIAL_POLICY_INSTRUMENTS (`ids` repeats those keys; tests/sim/policies.v2.spec.ts fails if they drift).
 * Channels: `land` (land-use flows, habitat, soil carbon), `prod` (yields, exports, economic security,
 * agricultural rents), `social` (conflict, just transition, pressures); Carbon Neutrality also has
 * `elec` / `other` / `tax` (renewable share, non-electric efficiency, carbon-tax revenue), which are the
 * prototype's CN_RELEVANCE. Source: mejora-general/files/36 §2, criterio experto.
 *
 * Carbon Neutrality's `land` / `prod` are blank in the spec ("—"): they are uniform here, which is the
 * prototype's generic channel (`channel(effort)` with relevance [1, 1, 1, 1]) — the value its `eta["CN"]`
 * takes, so the 1.1 submodels that still read CN through `prod` match the prototype.
 * Note: the prototype computes every policy's `eta` with that uniform relevance; the per-channel rows are
 * the spec's. With an even split both give χ = 1 (docs/v6-spec-vs-motor.md, phase 36).
 */
export const INSTRUMENT_CHANNELS: Record<Pid, {
  ids: string[]; land: number[]; prod: number[]; social: number[]; tag: InstrumentTag[];
  elec?: number[]; other?: number[]; tax?: number[];
}> = {
  AS: {
    ids: ['AS_Subsidios_Bioinsumos', 'AS_Capacitacion_Tecnicas', 'AS_Corredores_Biologicos', 'AS_Certificacion_Marketing'],
    land: [0.3, 0.6, 1, 0.3], prod: [1, 0.6, 0.3, 0.6], social: [0.6, 1, 0.3, 1],
    tag: ['support', 'support', 'support', 'support'],
  },
  CR: {
    ids: ['CR_Expansion_Areas_Protegidas', 'CR_PSA_Bosques', 'CR_Control_Especies_Invasoras', 'CR_Fortalecimiento_Guardaparques'],
    land: [1, 0.6, 0.6, 1], prod: [0.3, 0.3, 0.3, 0.3], social: [0.3, 1, 0.3, 0.3],
    tag: ['restriction', 'support', 'neutral', 'restriction'],
  },
  GS: {
    ids: ['GS_Sistemas_Silvopastoriles', 'GS_Manejo_Pasturas_Nativas', 'GS_Bancos_Forraje_Sequia', 'GS_Genetica_Eficiente_Bajas_Emisiones'],
    land: [1, 0.6, 0.3, 0.3], prod: [0.6, 1, 0.6, 0.6], social: [0.6, 0.6, 1, 0.3],
    tag: ['support', 'support', 'support', 'support'],
  },
  AGUA: {
    ids: ['AGUA_Riego_Tecnificado_Eficiente', 'AGUA_Proteccion_Fuentes_Recarga', 'AGUA_Cosecha_Almacenamiento_Lluvia', 'AGUA_Tratamiento_Reuso_Aguas_Servidas'],
    land: [0.3, 1, 0.3, 0.3], prod: [1, 0.3, 0.6, 0.6], social: [0.6, 0.3, 1, 0.6],
    tag: ['support', 'restriction', 'support', 'support'],
  },
  CN: {
    ids: ['C_Impuesto_Carbono_Sectorial', 'C_Fomento_Energias_Renovables_No_Convencionales', 'C_Eficiencia_Energetica_Industrial_Residencial', 'C_Investigacion_Desarrollo_Captura_Carbono'],
    land: [1, 1, 1, 1], prod: [1, 1, 1, 1], social: [1, 0.3, 0.3, 0.3],
    tag: ['restriction', 'support', 'support', 'neutral'],
    elec: [0.6, 1, 0.3, 0], other: [0.6, 0.15, 1, 0.5], tax: [1, 0, 0, 0],
  },
  PAI: {
    ids: ['PAI_Subsidios_Fertilizantes_Quimicos_Pesticidas', 'PAI_Infraestructura_Logistica_Agroindustrial', 'PAI_Creditos_Blandos_Maquinaria_Agricola', 'PAI_Desarrollo_Variedades_Alto_Rendimento_Transgenicos'],
    land: [0.6, 1, 0.6, 0.3], prod: [1, 0.6, 0.6, 1], social: [0.3, 0.6, 0.3, 0.3],
    tag: ['neutral', 'neutral', 'neutral', 'neutral'],
  },
  PEA: {
    ids: ['PEA_Acuerdos_Comerciales_Apertura_Mercados', 'PEA_Subsidios_Logistica_Exportacion', 'PEA_Promocion_Marca_Pais_Productos_Agricolas', 'PEA_Flexibilizacion_Normas_Calidad_Exportacion'],
    land: [0.6, 0.6, 0.3, 0.3], prod: [1, 0.6, 0.6, 0.6], social: [0.3, 0.3, 0.3, 0.6],
    tag: ['neutral', 'neutral', 'neutral', 'neutral'],
  },
  PIE: {
    ids: ['PIE_Incentivos_Fiscales_Zonas_Francas', 'PIE_Simplificacion_Tramites_Apertura_Empresas_Extranjeras', 'PIE_Garantias_Proteccion_Inversiones_Extranjeras', 'PIE_Promocion_Sectores_Estrategicos_Roadshows_Internacionales'],
    land: [0.6, 0.3, 0.3, 0.3], prod: [1, 0.6, 0.6, 0.6], social: [0.3, 0.3, 0.3, 0.3],
    tag: ['neutral', 'neutral', 'neutral', 'neutral'],
  },
  FRA: {
    ids: ['FRA_Reduccion_Tiempos_Evaluacion_Impacto_Ambiental', 'FRA_Moratorias_Sanciones_Incumplimiento_Ambiental', 'FRA_Permisos_Rapidos_Uso_Recursos_Naturales', 'FRA_Consulta_Publica_Ambiental_No_Vinculante'],
    land: [1, 0.6, 1, 0.3], prod: [0.6, 0.3, 0.6, 0.3], social: [0.6, 0.6, 0.3, 1],
    tag: ['neutral', 'neutral', 'neutral', 'neutral'],
  },
  /** For Energy Subsidies the `land` channel carries fossil emissions (spec 36 §2). */
  SE: {
    ids: ['SE_Subsidios_Directos_Combustibles_Fosiles_Transporte', 'SE_Tarifas_Electricas_Subsidiadas_Industria_Pesada', 'SE_Incentivos_Exploracion_Explotacion_Hidrocarburos', 'SE_Congelamiento_Precios_Gas_GLP_Residencial'],
    land: [1, 0.6, 1, 0.3], prod: [0.3, 1, 0.6, 0.3], social: [0.6, 0.3, 0.3, 1],
    tag: ['neutral', 'neutral', 'neutral', 'neutral'],
  },
};

/** Scales a list of weights so their mean is exactly 1 (phase 46: seasonal weights keep the annual frequency). */
function normaliseMean(w: number[]): number[] {
  const mean = w.reduce((sum, x) => sum + x, 0) / w.length;
  return w.map((x) => x / mean);
}

export const PARAMS_V2 = {
  /** 36 — years to reach 63 % of full effect after activation. Criterio experto. */
  rampYears:   { AS: 1.5, CR: 2.5, GS: 1.5, AGUA: 2.0, CN: 2.5, PAI: 1.0, PEA: 0.5, PIE: 1.5, FRA: 0.5, SE: 0.5 },
  /** 36 — fatigue time constant (years of accumulated activity). Replaces efficiencyDecayDuration. Criterio experto. */
  fatigueYears: { AS: 15, CR: 25, GS: 12, AGUA: 20, CN: 25, PAI: 8, PEA: 10, PIE: 10, FRA: 6, SE: 5 },
  /**
   * 36/44 — annual cost at full effort, fraction of GDP (prototype κ), calibrated against base public spending
   * (CP.Gasto_Publico_Base_Nivel_*, phase 44). Since phase 44 the engine charges these (the 1.1-scale bridge
   * `costShareBridge` of phase 36 was deleted). Criterio experto.
   */
  costShare:   { AS: 0.008, CR: 0.010, GS: 0.006, AGUA: 0.008, CN: 0.012, PAI: 0.006, PEA: 0.003, PIE: 0.005, FRA: 0.002, SE: 0.012 },
  /** 36 — share of the cost paid regardless of effort (dimensionless). Criterio experto. */
  costFixedShare: 0.3,
  /** 36 — effort scale of the diminishing returns (phiEffort), effort points 0-100. Criterio experto. */
  effortE0: 40,
  /** 36 — instrument channels (alias of INSTRUMENT_CHANNELS, the spec's `PARAMS_V2.instruments`). */
  instruments: INSTRUMENT_CHANNELS,

  /**
   * 37 — land-use transition matrix (mejora-general/files/37 §2; prototype `land_step`). The base rates of
   * the frontier flows are the facilitator's CONTROL_PARAMS (`Tasa_de_BNNP_a_BNP_Base` … `Tasa_de_RES_a_BNP_Base`,
   * the prototype's `deforest`, same values); everything else of the matrix is here. Criterio experto (v1 values).
   */
  land: {
    /** Policy terms of the frontier flows: fraction of the source area per year per unit of η^land. */
    frontier: {
      BNNP_BNP: { CR: 0.05 }, BNNP_CC: { PAI: 0.04, FRA: 0.01 }, BNNP_CA: { AS: 0.02 }, CA_BNNP: { AS: 0.01 },
    } as Record<'BNNP_BNP' | 'BNNP_CC' | 'BNNP_CA' | 'CA_BNNP', Partial<Record<'CR' | 'PAI' | 'FRA' | 'AS', number>>>,
    /** Share of each agricultural use that re-enters the reallocation pool each year (μ, prototype mu_ag). */
    poolShare: 0.02,
    /** Sensitivity of the allocation to rents (β, logit units per unit of log-rent). */
    rentBeta: 1.0,
    /** Share of fallow that re-enters the agricultural pool / regenerates to BNNP each year. */
    fallowReentry: 0.25, fallowRegen: 0.05,
    /** Rent shifts Δr_k of each agricultural use, log-rent units per unit of η^prod. */
    rent: {
      CC: { PAI: 0.6, PEA: 0.3, AS: -0.25 }, CA: { AS: 0.8, PAI: -0.2 }, PRG: { GS: 0.4, PEA: 0.1 }, PF: { PIE: 0.2, FRA: 0.15 },
    } as Record<'CC' | 'CA' | 'PRG' | 'PF', Partial<Record<'AS' | 'PAI' | 'PEA' | 'GS' | 'PIE' | 'FRA', number>>>,
    /** Rent shift of CC per unit of Carbon Neutrality's carbon-tax channel (η_CN^tax). */
    rentCarbonTaxCC: -0.2,
    /** Area (kHa) used for an agricultural anchor that starts at 0, so its log-rent is finite (§4). */
    zeroAnchor: 1e-6,
  },

  /**
   * 38 — carbon (mejora-general/files/38 §2; prototype `carbon`). Flux in tCO2e/ha/yr (+ emission), stock in
   * Mg C/ha (biomass + soil relevant to conversion). Stocks after the Atlantic Forest review (125 ± 40 Mg C/ha
   * of above-ground biomass in mature forest, 83 ± 38 in secondary, 46 / 41 in pasture / cropland; Anais da ABC
   * 2024) plus below-ground and soil; fluxes criterio experto. FAL (fallow, regrowing) −2.0 / 55 since phase 38
   * (replaces the 1.1 bridge rates of phase 37).
   */
  flux:  { BNP: -1.0, BNNP: 0.5, CA: 0.8, CC: 2.5, PF: -4.0, PRG: 3.0, HUM: -3.0, RES: -9.0, ENR: 0.1, FAL: -2.0 },
  stock: { BNP: 200, BNNP: 170, CA: 60, CC: 45, PF: 90, PRG: 50, HUM: 250, RES: 70, ENR: 40, FAL: 55 },
  /**
   * 38 — policy multipliers of the land flux: f_i ×= Π (1 + coef·η_p^channel) (spec 38 §2: CC ×(1 + 0.3·η_PAI^prod),
   * PRG ×(1 − 0.35·η_GS^land), CA ×(1 − 0.4·η_AS^land), BNNP ×(1 + 1.0·η_FRA^land)(1 − 0.6·η_CR^land)).
   * Dimensionless per unit of effective efficiency. Criterio experto (prototype inline coefficients).
   */
  fluxPolicy: {
    CC: [{ pid: 'PAI', coef: 0.3, channel: 'prod' }],
    PRG: [{ pid: 'GS', coef: -0.35, channel: 'land' }],
    CA: [{ pid: 'AS', coef: -0.4, channel: 'land' }],
    BNNP: [{ pid: 'FRA', coef: 1.0, channel: 'land' }, { pid: 'CR', coef: -0.6, channel: 'land' }],
  } as Partial<Record<LandCode, { pid: Pid; coef: number; channel: 'land' | 'prod' }[]>>,
  energy: {
    /** Energy tCO2/cap/yr at start, per level (calibrated so c0 = 5.947 / 7.135 / 5.733 with the land flux). */
    eps0: { 1: 4.0, 2: 5.0, 3: 4.6 } as Record<number, number>,
    /** Electric share of energy emissions (dimensionless). Criterio experto. */
    electricShare: 0.35,
    /** Annual adjustment fraction k of the renewable share and the efficiency gain (infrastructure inertia, relax). */
    adjust: 0.15,
    /** Share of the territory under energy parks that fully decarbonises electricity (a_full; a lot is a portfolio). */
    parksFullShare: 0.04,
    /** Income elasticity of energy emissions per capita (dimensionless). Criterio experto. */
    incomeElasticity: 0.3,
    /** Maximum renewables share / efficiency gain that Carbon Neutrality reaches at full effect (elec / other channels). */
    renewablesMaxCN: 0.60, efficiencyMaxCN: 0.35,
    /**
     * Caps of the targets s* (renewable share of electricity) and u* (non-electric efficiency gain), 0-1. The
     * prototype also clamps s* at 0.95 inside `relax`: redundant after the 0.9 cap, not ported (log, phase 38).
     */
    renewablesCap: 0.9, efficiencyCap: 0.6,
    /** Energy emissions × (1 + boost·η_SE^land): Energy Subsidies (fossil). Criterio experto. */
    subsidyBoost: 0.15,
    /** Carbon budget: cut by 2054 of the linear reference path, relative to the starting emissions. 🟧 editable. */
    budgetCut2054: 0.30,
    /** Years of the budget's reference path (2024 → 2054). */
    budgetYears: 30,
  },

  /** 40 — habitat affinity (countryside species-area, 0-1 per land use) and z exponent. Criterio experto. */
  habitat: { BNP: 1.0, HUM: 1.0, BNNP: 0.8, RES: 0.55, CA: 0.35, PF: 0.15, PRG: 0.15, FAL: 0.3, CC: 0.05, ENR: 0.05 },
  zSAR: 0.35,
  /** 40 — direct policy effect on biodiversity, logit units per unit of effective efficiency. */
  qB: { CR: 0.55, AS: 0.20, GS: 0.12, AGUA: 0.08, CN: 0.05, PAI: -0.25, PEA: -0.06, PIE: -0.03, FRA: -0.45, SE: -0.10 },
  /**
   * 40 — the rest of D_B (mejora-general/files/40 §1, §3; prototype inline coefficients). Synergies in logit units per
   * unit of min(η, η) on the land channel: +0.10·min(η_AS, η_CR), −0.12·min(η_PAI, η_FRA) (criterio experto; in 1.1
   * a fixed +0.10 / −0.15 bonus). Connectivity (Territorio only): γ_K = 0.25 logit units per unit of ln(K/K0), with K
   * floored at 0.001·K0 so a map with no forest stays finite (same floor as ρ in phase 41). Criterio experto.
   * gammaMaxB0: B0 (points) used in γ_H = z/(1 − B0/100) is capped at 95 so a state anchored near B = 100 (an old 1.1
   * save re-anchored by advance) cannot give γ_H = ∞ (NaN at H = H0). Every level starts at B0 = 40: no effect there.
   */
  biodiversity: { synergyAgroConservation: 0.10, synergyIntensiveFlexible: 0.12, connectivityGamma: 0.25, connectivityFloor: 1e-3, gammaMaxB0: 95 },

  /**
   * 41 — food balance (mejora-general/files/41 §1; prototype `food_production` and the F block of `indicators_step`).
   * yield: production units per kHa per year relative to CC (CA 0.7, PRG 0.25). yieldPolicy: yield multipliers per
   * unit of η^prod (CC ×(1 + 0.25·η_PAI), CA ×(1 + 0.15·η_AS), PRG ×(1 + 0.20·η_GS), all ×(1 + 0.06·η_AGUA)).
   * yieldTrend: technological yield growth, fraction per year. export0 + exportPEA·η_PEA: exported share of the
   * production (fraction). kappa1: logit units per unit of ln(ρ/ρ0) (+20 % of ρ lifts F ≈ 11 points near 40);
   * kappa2 / econScale: access by income, logit units per (E − E0)/50. rhoFloor: ρ ≥ 0.001·ρ0 (a territory with no
   * farmland still imports a little; avoids ln 0). Criterio experto (prototype values).
   */
  food: {
    yield: { CC: 1.0, CA: 0.7, PRG: 0.25 },
    yieldPolicy: { PAI: 0.25, AS: 0.15, GS: 0.20, AGUA: 0.06 },
    yieldTrend: 0.006, export0: 0.30, exportPEA: 0.20, kappa1: 2.5, kappa2: 0.6, econScale: 50, rhoFloor: 1e-3,
  },

  /** 39 — economic security coefficients (logit units per unit of effective efficiency). */
  bE: { PIE: 0.55, PEA: 0.45, PAI: 0.35, FRA: 0.20, SE: 0.15, AS: 0.10, GS: 0.10, AGUA: 0.05, CN: -0.10, CR: -0.05 },
  /** 39 — relative productive value per kHa of each productive use. */
  productiveValue: { CC: 1.0, CA: 0.8, PRG: 0.6, PF: 0.9, ENR: 1.2 },

  /** 39/45 — social conflict: policy drivers and green relief (logit units per unit of efficiency), weights. */
  conflict: { FRA: 0.60, PAI: 0.30, PIE: 0.20, SE: -0.10 },
  greenRelief: { CN: 0.25, CR: 0.25, AGUA: 0.15 },
  conflictWeights: { food: 0.6, econ: 0.5, envPressure: 0.4, gini: 3.0, just: 0.6 },
  /**
   * 45 — weights of the just-transition index (src/sim/v2/social.ts), dimensionless per unit of efficiency: each multiplies
   * η_j·χ_j over the instruments of policy j tagged `restriction` / `support` in INSTRUMENT_CHANNELS (even split ⇒ χ = 1,
   * so R_load = η_CR + 0.5·η_CN^tax + 0.3·η_AGUA and Support = 0.5·(η_AS + η_GS), the prototype's constants). The support
   * instruments of CR (PSA), AGUA and CN carry no support weight, as in the prototype. Criterio experto.
   */
  justTransition: {
    restriction: { CR: 1.0, CN: 0.5, AGUA: 0.3 } as Partial<Record<Pid, number>>,
    support: { AS: 0.5, GS: 0.5 } as Partial<Record<Pid, number>>,
  },

  /**
   * 39 — the remaining drivers of the logistic targets of E, C and Pc (mejora-general/files/39 §2–4; the
   * inline coefficients of `indicators_step` in scripts/reference/modelo_v2.py). Every weight is logit units
   * per unit of its driver; every `scale` divides a deviation in points (0-100) or in GDP growth. Criterio
   * experto (prototype values).
   */
  relaxation: {
    /** Cap of |Σ situation impulses| on one indicator's target, logit units (spec 39 §1). */
    impulseCap: 0.6,
    /**
     * 42 — logit units of target shift per point of a situation's catalogue wear (× age factor 1–2) while it is open,
     * on C and on the three pressures. Prototype `play_territorio` (0.04). Criterio experto.
     */
    wearLogit: 0.04,
    E: {
      /** −w·η_CN^tax: the carbon tax weighs on business. */
      carbonTax: 0.15,
      /** w·(g − g0)/scale: GDP growth over the base rate (scale = 1 pp of growth, fraction per year). */
      growth: 0.25, growthScale: 0.01,
      /** w·(V/V0 − 1): productive value of the land. */
      landValue: 1.5,
      /** w·(B − B0)/scale: ecosystem services. */
      biodiversity: 0.15, biodiversityScale: 20,
      /** −w·φ_fiscal (phase 44; φ = 0 until then) and −w·τ (additional tax, pp). */
      fiscalStress: 0.8, tax: 0.04,
      /** −w·sLow(F; mid, width): volatility of a food crisis (points). */
      foodCrisis: 0.6, foodCrisisMid: 20, foodCrisisWidth: 4,
    },
    C: {
      /** Scales of the deviations of F, E and of the environmentalist pressure (points); weights in conflictWeights. */
      foodScale: 15, econScale: 15, envPressureScale: 20,
      /** w·φ_fiscal·η_SE^social: subsidies the treasury can no longer pay. */
      subsidyStress: 0.3,
      /** w·(a_CC − a_CC0) + w·(a_PF − a_PF0): expansion of intensive uses (shares 0-1). */
      shareCC: 2.0, sharePF: 1.0,
      /** w·τ (pp) and w·φ_fiscal. */
      tax: 0.03, fiscalStress: 0.6,
    },
    Pc: {
      /** w·(W0 − W)/scale and w·(E0 − E)/scale (points). */
      wellbeing: 0.9, wellbeingScale: 20, econ: 0.5, econScale: 20,
      /** w·φ_fiscal. */
      fiscalStress: 0.8,
      /** w·(polarisation − pol0)/scale, polarisation = max π − min π (points). */
      polarisation: 0.5, polarisationScale: 30,
      /** w·(π̄ − π̄0)/scale, π̄ = mean of the three pressures (points). */
      pressureMean: 0.6, pressureMeanScale: 20,
    },
  },

  /**
   * 42 — sectoral pressures (mejora-general/files/42 §1; the pressure block of `indicators_step` in the prototype).
   * a / e / s: the v1 impulse factors (points per unit of η^social; the old CP.Factor_Presion_*, same values) plus
   * CR +3.0 on the agricultural pressure (conserving without compensation annoys the sector), divided by phiScale
   * into logit units (CR −12.5/15 lowers π_e from 25 to ≈ 12.6 at full efficiency). Criterio experto.
   * drivers: logit units per unit of each deviation from the start (points 0-100, shares 0-1, c relative to c0, τ in pp):
   *   D_πa += econ·(E0 − E) + food·(F0 − F) + prodShare·(a_prod,0 − a_prod)    (a_prod = (CC + CA + PRG)/ΣA, PF out)
   *   D_πe += biodiversity·(B0 − B) + co2·(c − c0)/c0
   *   D_πs += wellbeing·(W0 − W) + tax·τ
   * The policy sum of π_a is multiplied by the size of the productive sector σ_prod = a_prod/a_prod,0. Criterio experto
   * (prototype inline coefficients; prodShare replaces the 1.1 impulse of 0.4 points per declared lot).
   */
  pressure: {
    a: { AS: -2.0, GS: -1.5, PAI: -10.0, PEA: -6.0, CR: 3.0 },
    e: { AS: -5.0, CR: -12.5, GS: -4.0, AGUA: -4.0, CN: -9.0, PAI: 7.5, FRA: 12.5, SE: 10.0 },
    s: { AS: -5.0, AGUA: -3.5, CN: -3.5, CR: -2.5, PAI: 5.0, PIE: 3.5, FRA: 7.5 },
    phiScale: 15,
    /** Points: a pressure is anchored within [anchorFloor, 100 − anchorFloor] (only an old 1.1 save pinned at 0/100 hits it). */
    anchorFloor: 2,
    drivers: {
      a: { econ: 0.03, food: 0.02, prodShare: 4.0 },
      e: { biodiversity: 0.035, co2: 1.5 },
      s: { wellbeing: 0.04, tax: 0.04 },
    },
  },

  /**
   * 43 — pacts as shifts while active: B / E / Pc in logit units of the targets, renewables / efficiency added to s* / u*,
   * protectFactor / deforestFactor multiplying BNNP → BNP / BNNP → CC (the prototype's m_protect / m_deforest); entry
   * (one-off) and annual costs as fractions of GDP (prototype; 1.1 charged 300 / 500 / 1000 and 30 / 50 / 100, i.e. 0.03 /
   * 0.05 / 0.10 and 0.003 / 0.005 / 0.010 of the starting GDP of 10 000: the annual cost falls to 0.002 / 0.004 / 0.008).
   * Ids of the code (prototype treaty / accord / tech). Criterio experto. No pact beats the strongest policy on the same
   * indicator (INV-16).
   */
  pacts: {
    biodiversityTreaty:     { entry: 0.03, annual: 0.002, B: 0.25, E: -0.05, protectFactor: 1.5, deforestFactor: 0.5 },
    globalCarbonAccord:     { entry: 0.05, annual: 0.004, E: -0.10, Pc: -0.15, renewables: 0.05, efficiency: 0.05 },
    techTransferInitiative: { entry: 0.10, annual: 0.008, E: 0.15, renewables: 0.10, efficiency: 0.05 },
  },

  /**
   * 44 — public finance (mejora-general/files/44 §1; prototype `economy_step`, `pay`, bankruptcy rule of `step()`).
   * reserveFloor: reserves never below this fraction of GDP (the deficit below it is financed with debt automatically).
   * riskPremium / debtThreshold: i(d) = i_N + riskPremium·max(0, d − debtThreshold), d = D/Y; debtThreshold is also the
   * ceiling of D/Y after a public investment paid with debt (`payPublicInvestment`). Bankruptcy: D/Y > bankruptcyDebtRatio
   * and interest/revenue > bankruptcyInterestBurden for bankruptcyYears in a row. Fiscal stress φ = sHigh(CI; stressMid,
   * stressWidth). Growth g = g0 + growthPIE·η_PIE^prod + growthPEA·η_PEA^prod − growthTaxDrag·τ − growthStress·φ (fraction
   * of GDP per year per unit of efficiency / per pp of extra tax / per unit of φ; growthTaxDrag was the facilitator's
   * PBIGrowth_Reduction_Factor_Per_Tax_Point until phase 44). carbonTaxRevenue: revenue of the carbon tax, fraction of GDP
   * per unit of η_CN^tax. Base rates i_N, α_N and γ_N are the facilitator's (CP). Criterio experto (prototype values).
   */
  finance: {
    reserveFloor: 0.02, riskPremium: 0.05, debtThreshold: 0.6,
    bankruptcyDebtRatio: 1.0, bankruptcyInterestBurden: 0.20, bankruptcyYears: 2,
    /** Tolerance of the bankruptcy clock (years): with dt = 1/12, 24 months add up to 1.9999… (fase 32, BREACH_EPS). */
    breachEps: 1e-9,
    stressMid: 0.20, stressWidth: 0.04,
    growthPIE: 0.01, growthPEA: 0.005, growthTaxDrag: 0.0002, growthStress: 0.01,
    carbonTaxRevenue: 0.005,
    /**
     * 47 — price/income scale of public investments with the economy: min(cap, max(1, √(Y/Y0))) multiplies the
     * catalogue prices of situations and public-use lots and the positive treasury incomes of situations (prototype
     * `cost_scale`; the cap 2.5 is the one `situationCost` had since v4/F8). Dimensionless. Criterio experto.
     */
    investmentScaleCap: 2.5,
  },

  /**
   * 47 — Territorio situations as decaying target impulses (mejora-general/files/47 §2; prototype `add_situation_effect`,
   * `IMPULSE_TAU`). An option's effect on a bounded indicator X becomes Δℓ = Δpoints / (100·p·(1 − p)), p = X/100 clamped
   * to [0.01, 0.99], that fades as e^(−Δt/τ), τ = halfLifeMonths/12/ln 2 years (🟧 18 months; a situation may declare its
   * own `halfLifeMonths`). An impulse older than `discardTaus`·τ is dropped (prototype: 6τ, e^−6 ≈ 0.25 % left). The
   * sum per indicator is capped at ±relaxation.impulseCap. Criterio experto.
   */
  situations: {
    halfLifeMonths: 18,
    discardTaus: 6,
    /**
     * 47 — an inbox nobody answers (decisión del usuario 2026-09-19: a neglected desk must be able to topple the
     * government). Each situation that expires unanswered counts 1 in a neglect tally N that fades with half-life
     * `neglectHalfLifeMonths`; the target of political collapse shifts by neglectLogit·max(0, N − neglectTolerance)
     * logit units (uncapped, like the wear: it is not an option's effect). A government that lets a few matters lapse
     * (N ≤ tolerance) pays nothing beyond their default options, and lapsed opportunities (tone good) do not count; one
     * that ignores the desk (≈ 2–2.5 expiries a year)
     * is toppled. Criterio experto, calibrated with the harness (tests/territorio/session.spec "neglected desk").
     */
    neglectLogit: 1.2,
    neglectTolerance: 3,
    neglectHalfLifeMonths: 36,
  },

  /**
   * 46 — random events 2.0 (mejora-general/files/46 §1–4; prototype `EVENTS` and `events_step`).
   * drought: p = base·(1 + trend·t/trendYears)·(1 + forestLoss·max(0, 1 − forest/forest0)) + noWater (no water policy) +
   *   ccShare (CC above ccThreshold of the area in force) — the climate trend and the forest dependence are new in 2.0
   *   (base / noWater / ccShare / ccThreshold were already the 1.1 numbers in ALL_RANDOM_EVENTS). Annual probabilities.
   * scrutinyCO2Ratio: the international scrutiny adds its CO2 chance when c > ratio·c0 (prototype; 1.1 had c > 12 t,
   *   unreachable with physical carbon). justiceAfterYears: years since level start after which the climate-justice
   *   movement can appear (prototype `t > 5`).
   * droughtSeasonality: monthly weights w_m of the drought hazard in Territorio (January … December), 🟧 criterio experto
   *   (drier summers in La Niña years in the northeast), normalised below so their mean is exactly 1; they multiply the
   *   hazard: p_month = 1 − (1 − p)^(w_m/12), so the 12 months keep the annual p exactly.
   * yieldShock: persistent AR(1) yield shock ε ← persistence^dt·ε + N(0, σ²·dt), σ = sigma·(1 − waterDamping·η_AGUA^prod);
   *   fraction of production (food.ts). Criterio experto (prototype values).
   */
  events: {
    drought: { base: 0.03, trend: 0.5, trendYears: 30, forestLoss: 0.6, noWater: 0.04, ccShare: 0.02, ccThreshold: 0.25 },
    scrutinyCO2Ratio: 1.5,
    justiceAfterYears: 5,
    droughtSeasonality: normaliseMean([1.6, 1.4, 1.0, 0.7, 0.6, 0.6, 0.6, 0.7, 0.8, 1.0, 1.2, 1.4]),
    yieldShock: { persistence: 0.5, sigma: 0.04, waterDamping: 0.5 },
  },

  /**
   * 48 — research indices (mejora-general/files/48 §3; src/sim/v2/research.ts). Not in the prototype.
   * safeJust: social floors F ≥ 40, E ≥ 35, W ≥ 55 and ecological ceilings B ≥ 45, c ≤ cRatio·c0 (points 0–100; cRatio
   *   dimensionless) — 🟧 spec defaults, kept (criterio experto). The forest ceiling is the level's start (anchors).
   * shockMinDrop: points of F or E a step with a random event must lose to open a shock episode (criterio experto: a
   *   fall below 0.5 points is within the yearly noise of the relaxation). recovery: fraction of the fall that closes
   *   the episode (spec: 90 %).
   */
  research: {
    safeJust: { F: 40, E: 35, W: 55, B: 45, cRatio: 0.8 },
    shockMinDrop: 0.5,
    recovery: 0.9,
  },
} as const;

export type ParamsV2 = typeof PARAMS_V2;
