/**
 * Parameters the facilitator panel exposes, by group. Kept apart from the component so
 * tests/sim/facilitatorParams.spec.ts can check that every key really moves the model.
 *
 * Model 1.1 (phase 34, N-08): removed the keys no engine path read — the per-level agricultural and
 * environmentalist dissipation rates (both pressures dissipate at a fixed 0,10), the annual emissions
 * reference and the one-off loan amount.
 */
import type { ControlParams } from '../../types';

export type NumericParamKey = {
  [K in keyof ControlParams]: ControlParams[K] extends number ? K : never;
}[keyof ControlParams];

export interface ParamGroup { label: string; keys: NumericParamKey[] }

export const PARAM_GROUPS_ES: ParamGroup[] = [
  { label: 'Crecimiento y población', keys: ['Tasa_Base_Crecimiento_PBI', 'Tasa_Crecimiento_Poblacional_Base', 'Tasa_Impositiva_General_Sobre_PBI'] },
  { label: 'Emisiones y carbono', keys: ['Referencia_Max_CO2_per_Capita_Puntaje'] },
  { label: 'Presiones políticas — disipación', keys: ['Tasa_disipacion_social'] },
  { label: 'Presupuesto y deuda', keys: ['Pago_deuda_anual_Nivel_1', 'Pago_deuda_anual_Nivel_2', 'Pago_deuda_anual_Nivel_3', 'Tasa_de_interes_Nivel_1', 'Tasa_de_interes_Nivel_2', 'Tasa_de_interes_Nivel_3', 'Ano_Activacion_Prestamo'] },
  { label: 'Presión fiscal (Nivel 3)', keys: ['Max_Additional_Tax_Rate_Percentage', 'EcoSec_Reduction_Factor_Per_Tax_Point', 'SocialConflict_Increase_Factor_Per_Tax_Point', 'PBIGrowth_Reduction_Factor_Per_Tax_Point', 'PPSocial_Increase_Factor_Per_Tax_Point'] },
];

export const PARAM_GROUPS_EN: ParamGroup[] = [
  { label: 'Growth & Population', keys: ['Tasa_Base_Crecimiento_PBI', 'Tasa_Crecimiento_Poblacional_Base', 'Tasa_Impositiva_General_Sobre_PBI'] },
  { label: 'Emissions & Carbon', keys: ['Referencia_Max_CO2_per_Capita_Puntaje'] },
  { label: 'Political Pressures — Dissipation', keys: ['Tasa_disipacion_social'] },
  { label: 'Budget & Debt', keys: ['Pago_deuda_anual_Nivel_1', 'Pago_deuda_anual_Nivel_2', 'Pago_deuda_anual_Nivel_3', 'Tasa_de_interes_Nivel_1', 'Tasa_de_interes_Nivel_2', 'Tasa_de_interes_Nivel_3', 'Ano_Activacion_Prestamo'] },
  { label: 'Fiscal Pressure (Level 3)', keys: ['Max_Additional_Tax_Rate_Percentage', 'EcoSec_Reduction_Factor_Per_Tax_Point', 'SocialConflict_Increase_Factor_Per_Tax_Point', 'PBIGrowth_Reduction_Factor_Per_Tax_Point', 'PPSocial_Increase_Factor_Per_Tax_Point'] },
];

/**
 * Keys the engine never reads because they only gate the UI: the loan unlock year
 * (App.tsx `requestLoan`, Territorio `unlocks`) and the cap of the additional-tax slider. The
 * facilitator test checks them against those callers instead of against `stepYear`.
 */
export const UI_ONLY_PARAM_KEYS: NumericParamKey[] = ['Ano_Activacion_Prestamo', 'Max_Additional_Tax_Rate_Percentage'];
