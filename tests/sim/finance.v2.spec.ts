/**
 * Public finance of model 2.0 (mejora-general/files/44_finanzas_publicas.md §3; src/sim/v2/finance.ts).
 * Reference cases: scripts/reference/finance44_cases.json, from the prototype's `economy_step` and `pay`
 * (python scripts/reference/finance44_cases.py > scripts/reference/finance44_cases.json).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONTROL_PARAMS as CP } from '../../src/constants';
import {
  advance, GAME_OVER_REASONS, interestRate, isBankrupt, MONTHLY_DT, payPublicInvestment, primaryBalanceAverage, stepFinance,
} from '../../src/sim';
import { canPayPublicInvestment, fiscalStressOf } from '../../src/sim/v2/finance';
import { INSTRUMENT_CHANNELS, PARAMS_V2, PID, type Pid } from '../../src/sim/v2/params';
import type { PolicyEfficiency } from '../../src/sim/v2/policies';
import type { GameState } from '../../src/types';
import { freshState, withActivePolicies } from './testHelpers';

type Model = NonNullable<GameState['model']>;
type WithModel = GameState & { model: Model };

const PACT_ID: Record<string, string> = { treaty: 'biodiversityTreaty', accord: 'globalCarbonAccord', tech: 'techTransferInitiative' };

const withStocks = (level: number, Y: number, D: number, R: number): WithModel => {
  const s = freshState(level) as WithModel;
  s.stellaSpecificState.PBI_Real = Y;
  s.stellaSpecificState.Deuda = D;
  s.stellaSpecificState.Reservas_del_Tesoro = R;
  return s;
};

const eff = (o: Partial<Record<Pid, Partial<PolicyEfficiency>>>) => o as Partial<Record<Pid, PolicyEfficiency>>;

interface StepCase {
  in: {
    level: number; dt: number; Y: number; D: number; R: number; tax: number; stress: number;
    PIE: number; PEA: number; cnTax: number; policies: Record<string, number[]>; pacts: string[]; upkeep: number;
  };
  out: { Y: number; R: number; D: number; primary: number; g: number; burden: number; stress: number };
}
interface PayCase { in: { Y: number; D: number; R: number; cost: number }; out: { ok: boolean; R: number; D: number } }

const CASES = JSON.parse(readFileSync('scripts/reference/finance44_cases.json', 'utf8')) as { step: StepCase[]; pay: PayCase[] };

describe('stepFinance matches the prototype economy_step (36 cases, ±1e-9 relative)', () => {
  it.each(CASES.step.map((c, i) => [i, c] as const))('case %i', (_i, c) => {
    const s = withStocks(c.in.level, c.in.Y, c.in.D, c.in.R);
    s.additionalTaxPressurePercentage = c.in.tax;
    s.model.fiscal.stress = c.in.stress;
    Object.entries(c.in.policies).forEach(([code, effort]) => {
      const p = s.policies[PID[code as Pid]];
      p.isActive = true;
      INSTRUMENT_CHANNELS[code as Pid].ids.forEach((id, k) => { p.instruments![id].effortPercentage = effort[k]; });
    });
    c.in.pacts.forEach((k) => { s.pacts[PACT_ID[k]].isActive = true; });
    const r = stepFinance(s, eff({ PIE: { prod: c.in.PIE }, PEA: { prod: c.in.PEA }, CN: { tax: c.in.cnTax } }), c.in.dt, CP, c.in.upkeep);
    const close = (a: number, b: number, label: string) => expect(Math.abs(a - b), label).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(b)));
    close(s.stellaSpecificState.PBI_Real, c.out.Y, 'Y');
    close(s.stellaSpecificState.Reservas_del_Tesoro, c.out.R, 'R');
    close(s.stellaSpecificState.Deuda, c.out.D, 'D');
    close(r.primaryBalance, c.out.primary, 'primary');
    close(r.growth, c.out.g, 'g');
    close(r.interestBurden, c.out.burden, 'burden');
    close(r.stress, c.out.stress, 'stress');
  });
});

describe('payPublicInvestment matches the prototype pay() (24 cases)', () => {
  it.each(CASES.pay.map((c, i) => [i, c] as const))('case %i', (_i, c) => {
    const s = withStocks(2, c.in.Y, c.in.D, c.in.R);
    const r = payPublicInvestment(s, c.in.cost);
    expect(r.ok).toBe(c.out.ok);
    expect(r.state.stellaSpecificState.Reservas_del_Tesoro).toBeCloseTo(c.out.R, 8);
    expect(r.state.stellaSpecificState.Deuda).toBeCloseTo(c.out.D, 8);
    if (r.ok) expect(r.state.indicators.debt).toBeCloseTo(c.out.D, 8);
  });
});

describe('spec 44 §3', () => {
  it('without policies the primary balance is (0.15 − γ)·Y (on the grown GDP Y\')', () => {
    [1, 2, 3].forEach((level) => {
      const s = freshState(level) as WithModel;
      const r = stepFinance(s, {}, 1, CP);
      const gamma = CP[`Gasto_Publico_Base_Nivel_${level}` as keyof typeof CP] as number;
      expect(r.primaryBalance).toBeCloseTo((CP.Tasa_Impositiva_General_Sobre_PBI - gamma) * s.stellaSpecificState.PBI_Real, 9);
    });
    // N2: 2.5 % of GDP (prototype); N1: 2 %.
    const s2 = freshState(2) as WithModel;
    expect(stepFinance(s2, {}, 1, CP).primaryBalance / s2.stellaSpecificState.PBI_Real).toBeCloseTo(0.025, 12);
  });

  it('a sustained deficit keeps R on the floor and D grows exactly by the shortfall', () => {
    let s = withActivePolicies(freshState(2), [PID.CR, PID.AS, PID.AGUA, PID.CN, PID.SE]) as WithModel;
    s.stellaSpecificState.Reservas_del_Tesoro = 0.02 * s.stellaSpecificState.PBI_Real; // already at the floor
    for (let y = 0; y < 5; y++) {
      const before = { ...s.stellaSpecificState };
      const r = stepFinance(s, {}, 1, CP);
      const shortfall = -(before.Reservas_del_Tesoro + r.primaryBalance - r.interest - r.amortisation - 0.02 * s.stellaSpecificState.PBI_Real);
      expect(r.primaryBalance).toBeLessThan(0);
      expect(s.stellaSpecificState.Reservas_del_Tesoro).toBeCloseTo(0.02 * s.stellaSpecificState.PBI_Real, 9);
      expect(r.autoDebt).toBeCloseTo(shortfall, 9);
      expect(s.stellaSpecificState.Deuda).toBeCloseTo(before.Deuda - r.amortisation + shortfall, 9);
      s = { ...s, stellaSpecificState: { ...s.stellaSpecificState } };
    }
  });

  it('interestRate(0.8, 2) = 0.035 + 0.05·0.2 = 0.045; no premium up to D/Y = 0.6', () => {
    expect(interestRate(0.8, 2, CP)).toBeCloseTo(0.045, 12);
    expect(interestRate(0.6, 3, CP)).toBeCloseTo(0.045, 12);
    expect(interestRate(0, 1, CP)).toBeCloseTo(0.025, 12);
  });

  it('φ = sHigh(CI; 0.20, 0.04); sHigh(0) like the prototype', () => {
    expect(fiscalStressOf(0.2)).toBeCloseTo(0.5, 12);
    expect(fiscalStressOf(0)).toBeCloseTo(1 / (1 + Math.exp(5)), 12);
    expect(fiscalStressOf(0.4)).toBeGreaterThan(0.99);
  });

  it('bankruptcy: D/Y = 1.05 with CI > 0.20 for 23 months does not bankrupt; month 24 does (Territorio, dt = 1/12)', () => {
    let s = withStocks(2, 10_000, 10_500, 200);
    let month = 0;
    for (let m = 1; m <= 24; m++) {
      const r = advance(s, MONTHLY_DT, null, CP, { month });
      s = r.next as WithModel;
      month = r.month;
      const st = s.stellaSpecificState;
      expect(st.Deuda / st.PBI_Real, `month ${m}`).toBeGreaterThan(1);
      expect(s.model.fiscal.interestBurden, `month ${m}`).toBeGreaterThan(0.2);
      if (m < 24) expect(s.gameOverReason, `month ${m}`).toBeFalsy();
    }
    expect(s.model.fiscal.breachYears).toBeCloseTo(2, 9);
    expect(s.gameOverReason).toBe(GAME_OVER_REASONS.bankruptcy);
  });

  it('bankruptcy: two annual steps in breach (3-level game); one step out of breach resets the clock', () => {
    let s = withStocks(3, 10_000, 10_500, 200);
    s = advance(s, 1, null, CP).next as WithModel;
    expect(s.gameOverReason).toBeFalsy();
    expect(s.model.fiscal.breachYears).toBe(1);
    const clean = { ...s, stellaSpecificState: { ...s.stellaSpecificState, Deuda: 1000 } };
    expect((advance(clean, 1, null, CP).next as WithModel).model.fiscal.breachYears).toBe(0);
    s = advance(s, 1, null, CP).next as WithModel;
    expect(s.gameOverReason).toBe(GAME_OVER_REASONS.bankruptcy);
    expect(isBankrupt({ breachYears: 2 - 1e-12 })).toBe(true);
    expect(isBankrupt({ breachYears: 23 / 12 })).toBe(false);
  });

  it('the 1.1 rule is gone: negative reserves with debt > 1.5·Y no longer bankrupt by themselves', () => {
    const s = withStocks(2, 10_000, 1000, -5000);
    const next = advance(s, 1, null, CP).next;
    expect(next.gameOverReason).toBeFalsy();
    expect(next.stellaSpecificState.Reservas_del_Tesoro).toBeCloseTo(0.02 * next.stellaSpecificState.PBI_Real, 9);
  });

  it('payPublicInvestment: reserves above the floor first, then debt while D/Y ≤ 0.6; else no-fiscal-space', () => {
    const s = withStocks(2, 10_000, 5000, 1200); // free reserves 1000
    const a = payPublicInvestment(s, 800);
    expect(a.ok && a.fromDebt).toBe(0);
    const b = payPublicInvestment(s, 1500);
    expect(b.ok).toBe(true);
    if (b.ok) {
      expect(b.fromReserves).toBeCloseTo(1000, 9);
      expect(b.state.stellaSpecificState.Deuda).toBeCloseTo(5500, 9);
    }
    expect(payPublicInvestment(s, 2000).ok).toBe(true); // D/Y = 0.6 exactly
    const c = payPublicInvestment(s, 2001);
    expect(c.ok).toBe(false);
    expect('reason' in c && c.reason).toBe('no-fiscal-space');
    expect(c.state).toBe(s);
    expect(s.stellaSpecificState.Deuda).toBe(5000); // pure
  });

  it('a voluntary loan goes to both reserves and debt in the next step, for every dt, and is logged once', () => {
    const base = freshState(2);
    const loan = { ...base, loanRequestedThisRound: 500 };
    [1, MONTHLY_DT].forEach((dt) => {
      const a = advance(base, dt, null, CP).next.stellaSpecificState;
      const r = advance(loan, dt, null, CP);
      expect(r.next.stellaSpecificState.Deuda - a.Deuda).toBeCloseTo(500, 9);
      expect(r.next.stellaSpecificState.Reservas_del_Tesoro - a.Reservas_del_Tesoro).toBeCloseTo(500, 9);
      expect(r.next.loanRequestedThisRound).toBe(0);
      expect(r.logs.filter((l) => l.includes('500')).length).toBe(1);
    });
  });

  it('twelve monthly steps track one annual step on a balanced portfolio (no events)', () => {
    const start = withActivePolicies(freshState(2), [PID.CR, PID.AS, PID.AGUA, PID.CN]);
    const annual = advance(start, 1, null, CP).next.stellaSpecificState;
    let m = start;
    let month = 0;
    for (let k = 0; k < 12; k++) { const r = advance(m, MONTHLY_DT, null, CP, { month }); m = r.next; month = r.month; }
    expect(m.stellaSpecificState.PBI_Real / annual.PBI_Real - 1).toBeLessThan(1e-3);
    expect(Math.abs(m.stellaSpecificState.Deuda - annual.Deuda)).toBeLessThan(0.01 * annual.PBI_Real);
  });

  it('keeps 5 years of primary balance / GDP and averages them by dt', () => {
    let s = freshState(2) as WithModel;
    let month = 0;
    for (let k = 0; k < 7 * 12; k++) { const r = advance(s, MONTHLY_DT, null, CP, { month }); s = r.next as WithModel; month = r.month; }
    const h = s.model.fiscal.primaryHistory;
    expect(h.reduce((t, [d]) => t + d, 0)).toBeCloseTo(5, 9);
    expect(primaryBalanceAverage(h)).toBeCloseTo(0.025, 6);
    expect(primaryBalanceAverage([])).toBe(0);
    expect(PARAMS_V2.finance.reserveFloor).toBe(0.02);
  });
});

describe('canPayPublicInvestment agrees with payPublicInvestment', () => {
  it('on a grid of reserves, debt and costs', () => {
    [0, 150, 200, 900, 3000].forEach((R) => [0, 3000, 5900, 6000, 7000].forEach((D) => [0, 50, 400, 2500].forEach((cost) => {
      const s = withStocks(2, 10_000, D, R);
      expect(canPayPublicInvestment(s, cost), `R ${R} D ${D} cost ${cost}`).toBe(payPublicInvestment(s, cost).ok);
    })));
  });
});
