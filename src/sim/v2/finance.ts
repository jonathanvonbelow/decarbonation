/**
 * Public finance of model 2.0 (mejora-general/files/44_finanzas_publicas.md §1): base public spending proportional to
 * GDP, deficits financed with debt at a rate that rises with indebtedness, fiscal stress that weighs on growth, economic
 * security, conflict and stability, and a bankruptcy that can be reached. Port of `economy_step`, `pay` and the
 * bankruptcy clock of `step()` in scripts/reference/modelo_v2.py. Replaces the 1.1 `updateEconomy` (src/sim/economy.ts,
 * deleted in phase 44).
 *
 *   g      = g0 + 0.01·η_PIE^prod + 0.005·η_PEA^prod − 0.0002·τ − 0.01·φ          (φ of the previous step)
 *   Y'     = Y·(1 + g·dt)
 *   T      = Y'·(tax0 + τ/100) + 0.005·Y'·η_CN^tax                               revenue (+ carbon tax)
 *   G0     = γ_N·Y'                                                              base public spending
 *   K      = Σ policy costs (on Y) + Σ pact annual·Y' + upkeep of public uses (Territorio)
 *   SP     = T − G0 − K                                                          primary balance
 *   i(d)   = i_N + 0.05·max(0, d − 0.6),  d = D/Y;   Int = i·D;   Am = α_N·D
 *   R'     = R + (SP − Int − Am)·dt + L;   D' = D − Am·dt + L                    L = voluntary loan of this step
 *   R' < 0.02·Y'  ⇒  D' += 0.02·Y' − R',  R' = 0.02·Y'                           automatic financing of the deficit
 *   CI     = Int / T;   φ = sHigh(CI; 0.20, 0.04)
 *   bankruptcy: D'/Y' > 1 and CI > 0.20 for 2 years in a row (24 months in Territorio)
 *
 * Which GDP each term reads follows the prototype exactly (the spec does not say): d and the policy cost read the GDP
 * before this step's growth (`policy_cost(s)` uses `s["Y"]` before `s["Y"] = Y`), revenue, base spending, pact fees and
 * the reserve floor the GDP after it (docs/DESIGN_DECISIONS_LOG.md, phase 44).
 *
 * The voluntary loan L (App.tsx `requestLoan`, Territorio `requestLoan`; capped at 10 % of GDP per year by the callers)
 * is credited whole in the step after it is requested, to both reserves and debt, before the floor test: it prefinances
 * spending the floor would otherwise turn into automatic debt, and it lifts the reserves above the floor so a later
 * public investment can be paid from them (spec §1 "Préstamo voluntario").
 *
 * Pure: no React, no randomness. `stepFinance` mutates the stocks of the state it is given (advance() owns the copy).
 */
import type { ControlParams, GameState, Policy, PolicyState, StellaStocks } from '../../types';
import type { Language } from '../../hooks/useLanguage';
import { sHigh } from './math';
import { PARAMS_V2, type Pid } from './params';
import { policyCost, type PolicyEfficiency } from './policies';
import { pactAnnualCost } from './pacts';

const F = PARAMS_V2.finance;

type Eff = Partial<Record<Pid, PolicyEfficiency>>;

const levelParam = (CP: ControlParams, prefix: string, level: number, fallback: number): number => {
  const v = CP[`${prefix}${level}` as keyof ControlParams];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
};

/** Base interest rate i_N (CP.Tasa_de_interes_Nivel_N). Territorio runs on level 2. */
export const baseInterestRate = (level: number, CP: ControlParams): number => levelParam(CP, 'Tasa_de_interes_Nivel_', level, 0.035);
/** Annual amortisation share α_N of the debt (CP.Pago_deuda_anual_Nivel_N). */
export const amortisationRate = (level: number, CP: ControlParams): number => levelParam(CP, 'Pago_deuda_anual_Nivel_', level, 0.12);
/** Base public spending γ_N, fraction of GDP per year (CP.Gasto_Publico_Base_Nivel_N). */
export const baseSpendingShare = (level: number, CP: ControlParams): number => levelParam(CP, 'Gasto_Publico_Base_Nivel_', level, 0.125);

/** i(d) = i_N + riskPremium·max(0, d − 0.6): the rate rises with the debt-to-GDP ratio d. */
export function interestRate(d: number, level: number, CP: ControlParams): number {
  return baseInterestRate(level, CP) + F.riskPremium * Math.max(0, d - F.debtThreshold);
}

/**
 * φ_fiscal = sHigh(CI; 0.20, 0.04), as in the prototype also without debt (sHigh(0) = 0.0067: a level without debt
 * carries that small constant stress from the end of its first step, −0.005 logit on E*). The stored φ starts at 0
 * (`createModelState`, like the prototype's `s.get("fiscal_stress", 0.0)`), so the growth of the first step has no
 * stress term. Phase 39's bridge set φ = 0 without debt; following the prototype makes E match the golden table to 1e-3
 * in N1/N2 (it was 0.16 points off).
 */
export const fiscalStressOf = (burden: number): number => sHigh(Math.max(0, burden), F.stressMid, F.stressWidth);

export interface FinanceStep {
  /** Annual GDP growth rate g of this step. */
  growth: number;
  /** Tax revenue T (annual, u.m./yr). */
  revenue: number;
  /** Base public spending γ_N·Y' (annual). */
  baseSpending: number;
  /** Policy costs, pact fees and upkeep of this step (annual; K = their sum). */
  policyCost: number;
  pactCost: number;
  upkeep: number;
  /** Primary balance SP = T − G0 − K (annual). */
  primaryBalance: number;
  /** Interest and amortisation (annual). */
  interest: number;
  amortisation: number;
  /** Debt taken automatically to keep reserves at the floor this step (u.m.). */
  autoDebt: number;
  /** Voluntary loan credited this step (u.m.). */
  loan: number;
  /** Interest burden CI = Int / T and fiscal stress φ. */
  interestBurden: number;
  stress: number;
}

/** Sub-state the finance step reads and writes. */
export type FinanceState = Pick<GameState, 'currentLevel' | 'policies' | 'pacts' | 'stellaSpecificState' | 'additionalTaxPressurePercentage' | 'loanRequestedThisRound'>
  & { model: NonNullable<GameState['model']> };

/** Length of the primary-balance window (years) Territorio's productive route reads (phase 49). */
export const PRIMARY_WINDOW_YEARS = 5;

/** The most recent entries of `history` that cover the 5-year window (the oldest one may straddle its start). */
export function primaryWindow(history: [number, number][]): [number, number][] {
  let kept = 0;
  let from = history.length;
  while (from > 0 && kept < PRIMARY_WINDOW_YEARS - 1e-9) { from--; kept += history[from][0]; }
  return history.slice(from);
}

/** Mean primary balance / GDP over the last 5 years of `primaryHistory` (dt-weighted; 0 when empty). */
export function primaryBalanceAverage(history: [number, number][]): number {
  let acc = 0;
  let tot = 0;
  primaryWindow(history).forEach(([d, v]) => { acc += v * d; tot += d; });
  return tot > 0 ? acc / tot : 0;
}

/**
 * Step 6 of model 2.0: the public finances of one step of length dt (years). `upkeep` is the ANNUAL upkeep of the land
 * under public use (Territorio; 0 in the 3-level game): it enters K and is paid × dt like every flow. Mutates
 * `state.stellaSpecificState` (PBI_Real, Reservas_del_Tesoro, Deuda), `state.model.fiscal` and resets
 * `state.loanRequestedThisRound`; returns the flows for logs and the trace.
 */
export function stepFinance(state: FinanceState, eff: Eff, dt: number, CP: ControlParams, upkeep = 0): FinanceStep {
  const st = state.stellaSpecificState;
  const fiscal = state.model.fiscal;
  const level = state.currentLevel;
  const tau = state.additionalTaxPressurePercentage ?? 0;
  const Y = st.PBI_Real;
  const D = Math.max(0, st.Deuda);

  const g = CP.Tasa_Base_Crecimiento_PBI
    + F.growthPIE * (eff.PIE?.prod ?? 0) + F.growthPEA * (eff.PEA?.prod ?? 0)
    - F.growthTaxDrag * tau - F.growthStress * (fiscal.stress ?? 0);
  const Y1 = Y * (1 + g * dt);
  const revenue = Y1 * (CP.Tasa_Impositiva_General_Sobre_PBI + tau / 100) + F.carbonTaxRevenue * Y1 * (eff.CN?.tax ?? 0);
  const baseSpending = baseSpendingShare(level, CP) * Y1;
  const polCost = policyCost(state.policies as Record<Policy, PolicyState>, Y);
  const pactCost = pactAnnualCost(state.pacts, Y1);
  const primary = revenue - baseSpending - polCost - pactCost - upkeep;

  const d = Y > 0 ? D / Y : 0;
  const interest = interestRate(d, level, CP) * D;
  const amortisation = amortisationRate(level, CP) * D;
  const loan = Math.max(0, state.loanRequestedThisRound ?? 0);

  let R = st.Reservas_del_Tesoro + (primary - interest - amortisation) * dt + loan;
  let D1 = D - amortisation * dt + loan;
  const floor = F.reserveFloor * Y1;
  let autoDebt = 0;
  if (R < floor) {
    autoDebt = floor - R;
    D1 += autoDebt;
    R = floor;
  }
  D1 = Math.max(0, D1);

  st.PBI_Real = Y1;
  st.Reservas_del_Tesoro = R;
  st.Deuda = D1;
  state.loanRequestedThisRound = 0;

  const interestBurden = interest / Math.max(revenue, 1e-9);
  const stress = fiscalStressOf(interestBurden);
  fiscal.growth = g;
  fiscal.primaryBalance = primary;
  fiscal.interestBurden = interestBurden;
  fiscal.stress = stress;
  // Bankruptcy clock (prototype step(): breach += dt while D/Y > 1 and CI > 0.2, reset otherwise).
  const breach = Y1 > 0 && D1 / Y1 > F.bankruptcyDebtRatio && interestBurden > F.bankruptcyInterestBurden;
  fiscal.breachYears = breach ? (fiscal.breachYears ?? 0) + dt : 0;
  // Primary balance / GDP of this step, kept for the last 5 years (Territorio's productive route, phase 49).
  fiscal.primaryHistory = primaryWindow([...(fiscal.primaryHistory ?? []), [dt, Y1 > 0 ? primary / Y1 : 0]]);

  return {
    growth: g, revenue, baseSpending, policyCost: polCost, pactCost, upkeep, primaryBalance: primary,
    interest, amortisation, autoDebt, loan, interestBurden, stress,
  };
}

/** True once the bankruptcy rule has held for `bankruptcyYears` (2) in a row; the tolerance makes 24 months count. */
export const isBankrupt = (fiscal: { breachYears: number } | undefined): boolean =>
  !!fiscal && fiscal.breachYears >= F.bankruptcyYears - F.breachEps;

export type PublicInvestmentResult =
  | { ok: true; state: GameState; fromReserves: number; fromDebt: number }
  | { ok: false; reason: 'no-fiscal-space'; state: GameState };

/**
 * Public investment (declaring a public use, joining a pact, the paid option of a situation; spec §1): paid from the
 * reserves above the floor 0.02·Y and, for the rest, with debt as long as D/Y ≤ 0.6 after the operation. Otherwise it is
 * refused with 'no-fiscal-space' and nothing changes. Prototype `pay()`. Pure: returns a new state (stocks and the
 * mirrored indicators) on success.
 */
export function payPublicInvestment(state: GameState, cost: number): PublicInvestmentResult {
  if (!canPayPublicInvestment(state, cost)) return { ok: false, reason: 'no-fiscal-space', state };
  const st: StellaStocks = state.stellaSpecificState;
  const c = Math.max(0, cost);
  const fromDebt = Math.max(0, c - Math.max(0, st.Reservas_del_Tesoro - F.reserveFloor * st.PBI_Real));
  const reserves = st.Reservas_del_Tesoro - (c - fromDebt);
  const debt = st.Deuda + fromDebt;
  return {
    ok: true,
    fromReserves: c - fromDebt,
    fromDebt,
    state: {
      ...state,
      stellaSpecificState: { ...st, Reservas_del_Tesoro: reserves, Deuda: debt },
      indicators: { ...state.indicators, treasuryReserves: reserves, debt },
    },
  };
}

/**
 * Price/income scale of public investments with the economy (phase 47; prototype `cost_scale`): min(cap, max(1, √(Y/Y0))),
 * Y0 the GDP at level start (model anchors; the level baseline for a state without them). Multiplies the catalogue prices
 * of Territorio's situations and public-use lots, and the positive treasury incomes of situations.
 */
export function investmentScale(
  state: Pick<GameState, 'stellaSpecificState'> & Partial<Pick<GameState, 'model' | 'levelBaseline' | 'indicators'>>,
): number {
  const y0 = state.model?.anchors?.gdp0 || state.levelBaseline?.pbi || state.indicators?.pbi || 1;
  const ratio = state.stellaSpecificState.PBI_Real / y0;
  return Math.min(F.investmentScaleCap, Math.max(1, Math.sqrt(Number.isFinite(ratio) && ratio > 0 ? ratio : 1)));
}

/** Whether `payPublicInvestment(state, cost)` would succeed (for UI hints and DecarboNito's validation); no allocation. */
export function canPayPublicInvestment(state: Pick<GameState, 'stellaSpecificState'>, cost: number): boolean {
  const st = state.stellaSpecificState;
  const fromDebt = Math.max(0, Math.max(0, cost) - Math.max(0, st.Reservas_del_Tesoro - F.reserveFloor * st.PBI_Real));
  return fromDebt <= 0 || (st.PBI_Real > 0 && (st.Deuda + fromDebt) / st.PBI_Real <= F.debtThreshold);
}

/** Log line of a voluntary loan credited this step. */
export const loanLog = (loan: number, language: Language = 'es'): string => (language === 'en'
  ? `Loan of ${loan.toFixed(0)} processed. Debt and Reserves updated.`
  : `Préstamo de ${loan.toFixed(0)} procesado. Deuda y Reservas actualizadas.`);
