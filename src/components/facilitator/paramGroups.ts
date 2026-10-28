/**
 * Parameters the facilitator panel exposes, by group. Kept apart from the component so
 * tests/sim/facilitatorParams.spec.ts can check that every key really moves the model.
 *
 * Model 1.1 (phase 34, N-08): removed the keys no engine path read — the per-level agricultural and
 * environmentalist dissipation rates (both pressures dissipate at a fixed 0,10), the annual emissions
 * reference and the one-off loan amount.
 * Phase 39: the per-tax-point factors of E and conflict and the social dissipation left with the 1.1
 * functions; the adjustment speeds of E, C and Pc (model 2.0) joined. Phase 40/41: the speeds of B and F joined.
 * Phase 42: the social dissipation and the tax factor of the social pressure left with the 1.1 pressures; the
 * pressures' adjustment speed joined.
 * Phase 44: base public spending per level (Gasto_Publico_Base_Nivel_*, the model's most sensitive parameter) joined
 * "Budget & Debt"; PBIGrowth_Reduction_Factor_Per_Tax_Point left for PARAMS_V2.finance.growthTaxDrag (spec 44 §2).
 * Phase 50: groups of spec 50 §3 — growth and population (+ Poblacion_Inicial, read at level start), adjustment speeds,
 * policies (efficiency floor and recovery of model 2.0) and finance.
 */
import type { ControlParams } from '../../types';

export type NumericParamKey = {
  [K in keyof ControlParams]: ControlParams[K] extends number ? K : never;
}[keyof ControlParams];

export interface ParamGroup { label: string; keys: NumericParamKey[] }

const GROWTH: NumericParamKey[] = ['Tasa_Base_Crecimiento_PBI', 'Tasa_Crecimiento_Poblacional_Base', 'Poblacion_Inicial'];
const SPEEDS: NumericParamKey[] = ['Velocidad_Ajuste_Biodiversidad', 'Velocidad_Ajuste_Seg_Alimentaria', 'Velocidad_Ajuste_Seg_Economica', 'Velocidad_Ajuste_Conflicto', 'Velocidad_Ajuste_Colapso', 'Velocidad_Ajuste_Presiones'];
const POLICIES: NumericParamKey[] = ['Eficiencia_Minima_Politicas', 'Recuperacion_Politicas_Anios'];
const FINANCE: NumericParamKey[] = [
  'Tasa_Impositiva_General_Sobre_PBI', 'Gasto_Publico_Base_Nivel_1', 'Gasto_Publico_Base_Nivel_2', 'Gasto_Publico_Base_Nivel_3',
  'Tasa_de_interes_Nivel_1', 'Tasa_de_interes_Nivel_2', 'Tasa_de_interes_Nivel_3',
  'Pago_deuda_anual_Nivel_1', 'Pago_deuda_anual_Nivel_2', 'Pago_deuda_anual_Nivel_3',
  'Max_Additional_Tax_Rate_Percentage', 'Ano_Activacion_Prestamo',
];

/** Phase 50 (mejora-general/files/50 §3): the four groups of the 2.0 panel. */
export const PARAM_GROUPS_ES: ParamGroup[] = [
  { label: 'Crecimiento y población', keys: GROWTH },
  { label: 'Velocidades de ajuste', keys: SPEEDS },
  { label: 'Políticas', keys: POLICIES },
  { label: 'Finanzas', keys: FINANCE },
];

export const PARAM_GROUPS_EN: ParamGroup[] = [
  { label: 'Growth & Population', keys: GROWTH },
  { label: 'Adjustment speeds', keys: SPEEDS },
  { label: 'Policies', keys: POLICIES },
  { label: 'Finance', keys: FINANCE },
];

/**
 * Keys read only when a level starts (createInitialState): changing them applies on the next level start or restart,
 * not to the running level. The panel says so next to them; the facilitator test builds the state with the changed CP.
 */
export const RESTART_PARAM_KEYS: NumericParamKey[] = ['Poblacion_Inicial'];

/** Keys whose change the panel flags as sensitive (phase 44: the model's most sensitive parameter). */
export const SENSITIVE_PARAM_KEYS: NumericParamKey[] = ['Gasto_Publico_Base_Nivel_1', 'Gasto_Publico_Base_Nivel_2', 'Gasto_Publico_Base_Nivel_3'];

/**
 * Keys the engine never reads because they only gate the UI: the loan unlock year
 * (App.tsx `requestLoan`, Territorio `unlocks`) and the cap of the additional-tax slider. The
 * facilitator test checks them against those callers instead of against `stepYear`.
 */
export const UI_ONLY_PARAM_KEYS: NumericParamKey[] = ['Ano_Activacion_Prestamo', 'Max_Additional_Tax_Rate_Percentage'];
