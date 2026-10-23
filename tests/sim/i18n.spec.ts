/**
 * Phase 12 (12_i18n_completo.md, Capa B/C): narrative log/warning strings produced by the sim
 * engine now take a `language` param and actually change output — these are the ones that reach
 * the player directly (GameLogDrawer renders `gameLog` raw; policy-efficiency warnings go
 * straight to the chat), unlike `gameOverReason` (deliberately left Spanish-only, see
 * src/sim/index.ts's own comment and docs/DESIGN_DECISIONS_LOG.md).
 */
import { describe, expect, it } from 'vitest';
import { stepYear, checkEfficiencyWarning } from '../../src/sim';
import { loanLog } from '../../src/sim/v2/finance';
import { Policy } from '../../src/types';
import { freshState, withActivePolicies } from './testHelpers';
import { CONTROL_PARAMS } from '../../src/constants';

const noEventRng = () => 0.999; // never triggers a random event, isolates the deterministic path

describe('stepYear language param', () => {
  it('defaults to Spanish when no language is passed (backward-compatible)', () => {
    const state = withActivePolicies(freshState(1), [Policy.Agroecological]);
    const { logs } = stepYear(state, noEventRng);
    expect(logs.some((l) => l.includes('activada y confirmada'))).toBe(true);
  });

  it('produces an English policy-activation log line when language="en"', () => {
    const state = withActivePolicies(freshState(1), [Policy.Agroecological]);
    const { logs } = stepYear(state, noEventRng, CONTROL_PARAMS, 'en');
    expect(logs.some((l) => l.includes('activated and confirmed'))).toBe(true);
    expect(logs.some((l) => l.includes('activada'))).toBe(false);
  });

  it('translates the policy name inside the activation log, not just the sentence shell', () => {
    const state = withActivePolicies(freshState(1), [Policy.Agroecological]);
    const { logs: esLogs } = stepYear(state, noEventRng, CONTROL_PARAMS, 'es');
    const { logs: enLogs } = stepYear(state, noEventRng, CONTROL_PARAMS, 'en');
    expect(esLogs.some((l) => l.includes('Agroecológicas'))).toBe(true);
    expect(enLogs.some((l) => l.includes('Agro-ecological'))).toBe(true);
  });
});

describe('loan log language (phase 44: the finance step of advance)', () => {
  it('translates the loan-processed log line', () => {
    const state = freshState(1);
    state.loanRequestedThisRound = 500;
    const es = stepYear(state, noEventRng, CONTROL_PARAMS, 'es');
    const en = stepYear(state, noEventRng, CONTROL_PARAMS, 'en');
    expect(es.logs.some((l) => l.includes('Préstamo de 500'))).toBe(true);
    expect(en.logs.some((l) => l.includes('Loan of 500'))).toBe(true);
    expect(loanLog(500, 'en')).toBe('Loan of 500 processed. Debt and Reserves updated.');
  });

  it('logs nothing about a loan when none was requested, regardless of language', () => {
    const { logs } = stepYear(freshState(1), noEventRng, CONTROL_PARAMS, 'en');
    expect(logs.some((l) => l.includes('Loan of'))).toBe(false);
  });
});

describe('checkEfficiencyWarning language param', () => {
  it('translates the warning message and includes the localized policy name', () => {
    const state = withActivePolicies(freshState(2), [Policy.Agroecological]);
    const policy = state.policies[Policy.Agroecological];
    // Model 2.0 (phase 36): the warning fires when the fatigue factor e^(-T/δ) crosses below 0.5 (δ = 15 for AS).
    policy.fatigueTime = 15 * Math.log(2) + 0.1;
    policy.currentEfficiency = 0.6;
    policy.previousFatigueFactor = 0.55; // was above it -- crossing detected

    const esWarning = checkEfficiencyWarning({ ...state.policies, [Policy.Agroecological]: { ...policy } }, 'es');
    expect(esWarning).toHaveLength(1);
    expect(esWarning[0]).toContain('¡Atención!');
    expect(esWarning[0]).toContain('Agroecológicas');

    const enWarning = checkEfficiencyWarning({ ...state.policies, [Policy.Agroecological]: { ...policy } }, 'en');
    expect(enWarning[0]).toContain('Warning!');
    expect(enWarning[0]).toContain('Agro-ecological');
  });
});
