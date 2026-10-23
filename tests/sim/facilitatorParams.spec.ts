/**
 * Every parameter the facilitator panel exposes must move something (model 1.1, phase 34 §9.1, N-08).
 * Before 1.1 the panel listed eight keys no engine path read.
 *
 * Deviation from the spec text ("×1.5 changes some number after 5 years of stepYear with `balanced`"),
 * which would fail for real keys (docs/v6-spec-vs-motor.md, phase 34):
 *   - `Pago_deuda_anual_Nivel_k` / `Tasa_de_interes_Nivel_k` are only read on level k and only matter with
 *     debt, which is 0 at the start of every level: the scenario runs on level k with a loan taken in
 *     year 1 (loans open in levels 1–2 from `Ano_Activacion_Prestamo`, App.tsx `requestLoan`);
 *   - the four per-tax-point factors only act with additional tax, which only level 3 has: level 3 with 10 pp;
 *   - `Ano_Activacion_Prestamo` and `Max_Additional_Tax_Rate_Percentage` only gate the UI: they are
 *     checked against the Territorio session actions that read them (UI_ONLY_PARAM_KEYS).
 */
import { describe, expect, it } from 'vitest';
import { stepYear } from '../../src/sim';
import { CONTROL_PARAMS } from '../../src/constants';
import { Policy, type ControlParams, type GameState } from '../../src/types';
import { PARAM_GROUPS_EN, PARAM_GROUPS_ES, UI_ONLY_PARAM_KEYS, type NumericParamKey } from '../../src/components/facilitator/paramGroups';
import { createSession, setTaxPressure, unlocks } from '../../src/territorio/session';
import { freshState, withActivePolicies } from './testHelpers';

const noEventRng = () => 0.999;
/** The harness `balanced` strategy (scripts/harness/strategies.ts): CR, AS, PEA, CN, PIE. */
const BALANCED = [
  Policy.NaturalConservation, Policy.Agroecological, Policy.AgriculturalExports, Policy.CarbonNeutrality, Policy.ForeignInvestment,
];
const FISCAL_KEYS = new Set<NumericParamKey>([
  'PBIGrowth_Reduction_Factor_Per_Tax_Point', 'PPSocial_Increase_Factor_Per_Tax_Point',
]);

function scenario(key: NumericParamKey): { level: number; tax: number; loan: number } {
  const debtLevel = /^(Pago_deuda_anual|Tasa_de_interes)_Nivel_(\d)$/.exec(key);
  if (debtLevel) return { level: Number(debtLevel[2]), tax: 0, loan: 1000 };
  if (FISCAL_KEYS.has(key)) return { level: 3, tax: 10, loan: 0 };
  return { level: 2, tax: 0, loan: 0 };
}

function fiveYears(key: NumericParamKey, CP: ControlParams): string {
  const { level, tax, loan } = scenario(key);
  let s: GameState = withActivePolicies(freshState(level), BALANCED);
  s.additionalTaxPressurePercentage = tax;
  s.loanRequestedThisRound = loan;
  for (let i = 0; i < 5; i++) s = stepYear(s, noEventRng, CP).next;
  return JSON.stringify({ indicators: s.indicators, stella: s.stellaSpecificState, landUses: s.landUses });
}

const panelKeys = [...new Set(PARAM_GROUPS_ES.flatMap((g) => g.keys))];

describe('facilitator panel parameters', () => {
  it('lists the same keys in both languages', () => {
    expect(PARAM_GROUPS_EN.flatMap((g) => g.keys)).toEqual(PARAM_GROUPS_ES.flatMap((g) => g.keys));
  });

  it('exposes no key the 1.1 model deleted', () => {
    panelKeys.forEach((k) => expect(k in CONTROL_PARAMS, k).toBe(true));
  });

  panelKeys.filter((k) => !UI_ONLY_PARAM_KEYS.includes(k)).forEach((key) => {
    it(`${key} × 1.5 changes the state after 5 years`, () => {
      const base = fiveYears(key, CONTROL_PARAMS);
      const changed = fiveYears(key, { ...CONTROL_PARAMS, [key]: (CONTROL_PARAMS[key] as number) * 1.5 });
      expect(changed).not.toEqual(base);
    });
  });

  it('Ano_Activacion_Prestamo moves the year finance unlocks', () => {
    const s = createSession(1);
    const at2035 = { ...s, game: { ...s.game, year: CONTROL_PARAMS.Ano_Activacion_Prestamo } };
    expect(unlocks(at2035, CONTROL_PARAMS).finance).toBe(true);
    const later = { ...CONTROL_PARAMS, Ano_Activacion_Prestamo: CONTROL_PARAMS.Ano_Activacion_Prestamo + 5 };
    expect(unlocks(at2035, later).finance).toBe(false);
  });

  it('Max_Additional_Tax_Rate_Percentage caps the tax slider', () => {
    const s = createSession(1);
    const open = { ...s, game: { ...s.game, year: CONTROL_PARAMS.Ano_Activacion_Prestamo } };
    const max = CONTROL_PARAMS.Max_Additional_Tax_Rate_Percentage;
    expect(setTaxPressure(open, 100, CONTROL_PARAMS).session.game.additionalTaxPressurePercentage).toBe(max);
    const higher = { ...CONTROL_PARAMS, Max_Additional_Tax_Rate_Percentage: max * 1.5 };
    expect(setTaxPressure(open, 100, higher).session.game.additionalTaxPressurePercentage).toBe(max * 1.5);
  });
});
