/**
 * Phase 12 (12_i18n_completo.md, Capa B/C): narrative log/warning strings produced by the sim
 * engine now take a `language` param and actually change output — these are the ones that reach
 * the player directly (GameLogDrawer renders `gameLog` raw; policy-efficiency warnings go
 * straight to the chat), unlike `gameOverReason` (deliberately left Spanish-only, see
 * src/sim/index.ts's own comment and docs/DESIGN_DECISIONS_LOG.md).
 */
import { describe, expect, it } from 'vitest';
import { stepYear, updateEconomy, checkEfficiencyWarning } from '../../src/sim';
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

describe('updateEconomy language param', () => {
  it('translates the loan-processed log line', () => {
    const state = freshState(1);
    const es = updateEconomy(state.stellaSpecificState, state.policies, 1, 0, 0, 0, 500, CONTROL_PARAMS, 'es');
    const en = updateEconomy(state.stellaSpecificState, state.policies, 1, 0, 0, 0, 500, CONTROL_PARAMS, 'en');
    expect(es.loanProcessedLog).toContain('Préstamo de 500');
    expect(en.loanProcessedLog).toContain('Loan of 500');
  });

  it('returns null (no log) when no loan was requested, regardless of language', () => {
    const state = freshState(1);
    const en = updateEconomy(state.stellaSpecificState, state.policies, 1, 0, 0, 0, 0, CONTROL_PARAMS, 'en');
    expect(en.loanProcessedLog).toBeNull();
  });
});

describe('checkEfficiencyWarning language param', () => {
  it('translates the warning message and includes the localized policy name', () => {
    const state = withActivePolicies(freshState(2), [Policy.Agroecological]);
    const policy = state.policies[Policy.Agroecological];
    policy.currentEfficiency = 0.35; // below the 40% threshold
    policy.previousEfficiencyForNotification = 0.5; // was above it -- crossing detected

    const esWarning = checkEfficiencyWarning({ ...state.policies, [Policy.Agroecological]: { ...policy } }, 'es');
    expect(esWarning).toContain('¡Atención!');
    expect(esWarning).toContain('Agroecológicas');

    policy.previousEfficiencyForNotification = 0.5; // reset -- checkEfficiencyWarning mutates it
    const enWarning = checkEfficiencyWarning({ ...state.policies, [Policy.Agroecological]: { ...policy } }, 'en');
    expect(enWarning).toContain('Warning!');
    expect(enWarning).toContain('Agro-ecological');
  });
});
