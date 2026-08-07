/**
 * Public finances: GDP growth, tax income, interest, debt amortization and treasury reserves.
 * Ported verbatim from src/App.tsx (`runSimulationRound`, "3. Financial Calculations" block,
 * plus the pact-cost accumulation that precedes it) as part of the phase-2 extraction
 * (mejora-general/files/16_auditoria_ecuaciones.md). No formula changed.
 *
 * Call order matters and must match the original: `computeTotalPactCost` is read using the
 * *pre-growth* `PBI_Real` (same as the original, where policy/pact costs are tallied before the
 * "3. Financial Calculations" block runs), then `updateEconomy` grows PBI and settles the books.
 */
import type { ControlParams, Pact, StellaStocks } from '../types';
import { getPolicyEfficiency } from './policies';
import { Policy } from '../types';
import type { PolicyState } from '../types';
import type { Language } from '../hooks/useLanguage';

export function computeTotalPactCost(pacts: Record<string, Pact>): number {
  let totalPactCost = 0;
  (Object.values(pacts) as Pact[]).forEach((pact) => {
    if (pact.isActive && pact.annualCost) totalPactCost += pact.annualCost;
  });
  return totalPactCost;
}

export interface EconomyResult {
  stella: Pick<StellaStocks, 'PBI_Real' | 'Reservas_del_Tesoro' | 'Deuda'>;
  /** Log line emitted only when a pending loan was processed this year. */
  loanProcessedLog: string | null;
}

export function updateEconomy(
  stellaState: StellaStocks,
  policies: Record<Policy, PolicyState>,
  currentLevel: number,
  additionalTaxPressurePercentage: number,
  totalPolicyCost: number,
  totalPactCost: number,
  loanRequestedThisRound: number,
  CP: ControlParams,
  language: Language = 'es',
): EconomyResult {
  const pbiGrowthRate =
    CP.Tasa_Base_Crecimiento_PBI +
    getPolicyEfficiency(policies[Policy.ForeignInvestment], currentLevel) * 0.01 +
    getPolicyEfficiency(policies[Policy.AgriculturalExports], currentLevel) * 0.005 -
    additionalTaxPressurePercentage * CP.PBIGrowth_Reduction_Factor_Per_Tax_Point;

  let pbiReal = stellaState.PBI_Real * (1 + pbiGrowthRate);
  const taxIncome = pbiReal * (CP.Tasa_Impositiva_General_Sobre_PBI + additionalTaxPressurePercentage / 100);
  const interestRate = (CP[`Tasa_de_interes_Nivel_${currentLevel}` as keyof ControlParams] as number) || 0.03;
  const interestPayment = stellaState.Deuda * interestRate;
  const debtPaymentRate = (CP[`Pago_deuda_anual_Nivel_${currentLevel}` as keyof ControlParams] as number) || 0.1;
  const debtPrincipalPayment = stellaState.Deuda * debtPaymentRate;
  const totalExpenses = totalPolicyCost + totalPactCost + interestPayment + debtPrincipalPayment;

  let reservas = stellaState.Reservas_del_Tesoro + (taxIncome - totalExpenses);
  let deuda = stellaState.Deuda;
  let loanProcessedLog: string | null = null;

  if (loanRequestedThisRound > 0) {
    reservas += loanRequestedThisRound;
    deuda += loanRequestedThisRound;
    loanProcessedLog = language === 'en'
      ? `Loan of ${loanRequestedThisRound.toFixed(0)} processed. Debt and Reserves updated.`
      : `Préstamo de ${loanRequestedThisRound.toFixed(0)} procesado. Deuda y Reservas actualizadas.`;
  }
  deuda = Math.max(0, deuda - debtPrincipalPayment);

  return { stella: { PBI_Real: pbiReal, Reservas_del_Tesoro: reservas, Deuda: deuda }, loanProcessedLog };
}
