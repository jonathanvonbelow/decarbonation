/**
 * Territorio preview session rules (src/territorio/session.ts, 21_fusion_ecosim.md §6).
 */
import { describe, expect, it } from 'vitest';
import { CONTROL_PARAMS, MAX_ACTIVE_POLICIES, POLICY_LOCK_IN_DURATION } from '../../src/constants';
import { getPolicyEfficiency, productiveCount } from '../../src/sim';
import { LandUseType, Policy } from '../../src/types';
import {
  advanceMonth, createSession, dismissEvent, protectParcel, requestLoan, setInstrumentEffort, setTaxPressure,
  togglePact, togglePolicy, unlocks, INSTRUMENTS_UNLOCK_YEAR, START_YEAR, TOTAL_MONTHS, type Session,
} from '../../src/territorio/session';

function advance(s: Session, months: number): Session {
  let out = s;
  for (let i = 0; i < months; i++) {
    out = dismissEvent(advanceMonth(out));
    if (out.outcome) break;
  }
  return out;
}

describe('Territorio session', () => {
  it('starts in January of the first year with the map matching the model', () => {
    const s = createSession(11);
    expect(s.game.year).toBe(START_YEAR);
    expect(s.month).toBe(0);
    expect(s.game.currentLevel).toBe(2);
    expect(productiveCount(s.territory)).toBe(120);
    expect(s.outcome).toBeNull();
  });

  it('twelve months make a year, with one yearly summary headline', () => {
    const s = advance(createSession(11), 12);
    expect(s.game.year).toBe(START_YEAR + 1);
    expect(s.month).toBe(0);
    expect(s.history).toHaveLength(13);
    expect(s.news.filter((n) => n.key === 'summary')).toHaveLength(1);
  });

  it('activating a policy pre-splits its instrument effort so it actually works under level-2 formulas', () => {
    const r = togglePolicy(createSession(1), Policy.NaturalConservation);
    const p = r.session.game.policies[Policy.NaturalConservation];
    expect(p.isActive).toBe(true);
    expect(p.totalInstrumentEffortApplied).toBe(100);
    expect(Object.values(p.instruments!).reduce((sum, i) => sum + i.effortPercentage, 0)).toBe(100);
    expect(getPolicyEfficiency(p, 2)).toBeGreaterThan(0);
  });

  it('keeps the 3-level game rules: at most 5 active policies, 5-year lock-in', () => {
    let s = createSession(1);
    const ids = Object.values(Policy);
    for (let i = 0; i < MAX_ACTIVE_POLICIES; i++) s = togglePolicy(s, ids[i]).session;
    expect(togglePolicy(s, ids[MAX_ACTIVE_POLICIES]).error).toBe('max-active');

    s = advance(s, 12); // activationYear is now confirmed as the first year
    const locked = togglePolicy(s, ids[0]);
    expect(locked.error).toBe('locked');
    expect(locked.detail?.year).toBe(START_YEAR + POLICY_LOCK_IN_DURATION);
    s = advance(s, 12 * (POLICY_LOCK_IN_DURATION - 1));
    const released = togglePolicy(s, ids[0]);
    expect(released.error).toBeUndefined();
    expect(released.session.game.policies[ids[0]].isActive).toBe(false);
  });

  it('instrument effort unlocks after five years, with the same 100% cap', () => {
    let s = togglePolicy(createSession(1), Policy.Agroecological).session;
    const [first, second] = Object.keys(s.game.policies[Policy.Agroecological].instruments!);
    expect(setInstrumentEffort(s, Policy.Agroecological, first, 80).error).toBe('not-unlocked');
    s = advance(s, (INSTRUMENTS_UNLOCK_YEAR - START_YEAR) * 12);
    expect(unlocks(s).instruments).toBe(true);
    s = setInstrumentEffort(s, Policy.Agroecological, first, 100).session;
    s = setInstrumentEffort(s, Policy.Agroecological, second, 100).session;
    const p = s.game.policies[Policy.Agroecological];
    expect(Object.values(p.instruments!).reduce((sum, i) => sum + i.effortPercentage, 0)).toBeLessThanOrEqual(100);
    expect(p.totalInstrumentEffortApplied).toBeLessThanOrEqual(100);
  });

  it('pacts open at their own unlock year; loan and tax pressure at the model loan year', () => {
    let s = createSession(1);
    expect(togglePact(s, 'biodiversityTreaty').error).toBe('not-unlocked');
    expect(setTaxPressure(s, 10).error).toBe('not-unlocked');
    expect(requestLoan(s, 500).error).toBe('not-unlocked');
    s = advance(s, (CONTROL_PARAMS.Ano_Activacion_Prestamo - START_YEAR) * 12);
    expect(s.outcome).toBeNull();
    expect(unlocks(s).finance).toBe(true);
    const taxed = setTaxPressure(s, 999).session;
    expect(taxed.game.additionalTaxPressurePercentage).toBe(CONTROL_PARAMS.Max_Additional_Tax_Rate_Percentage);
    const loan = requestLoan(s, 1e12);
    expect(loan.session.game.loanRequestedThisRound).toBeCloseTo(s.game.stellaSpecificState.PBI_Real * 0.1, 6);
  });

  it('declaring a protected area moves area in the model, pays, and is logged', () => {
    const s = createSession(3);
    const forest = s.territory.parcels.find((p) => p.kind === LandUseType.UnprotectedNativeForest)!;
    const r = protectParcel(s, forest.x, forest.y);
    expect(r.error).toBeUndefined();
    expect(r.session.declaredCount).toBe(1);
    expect(r.session.game.landUses[LandUseType.ProtectedNativeForest].area).toBe(s.game.landUses[LandUseType.ProtectedNativeForest].area + 5);
    expect(r.session.game.stellaSpecificState.Reservas_del_Tesoro).toBeLessThan(s.game.stellaSpecificState.Reservas_del_Tesoro);
    expect(r.session.news[0].key).toBe('declared');
    const crop = s.territory.parcels.find((p) => p.kind === LandUseType.ConventionalCrops)!;
    expect(protectParcel(s, crop.x, crop.y).error).toBe('not-convertible');
  });

  it('an unread event pauses the clock until dismissed', () => {
    const s = { ...createSession(1), pendingEvent: { id: 'x' } as never };
    expect(advanceMonth(s)).toBe(s);
    expect(dismissEvent(s).pendingEvent).toBeNull();
  });

  it('announces each unlock once', () => {
    const s = advance(createSession(1), (INSTRUMENTS_UNLOCK_YEAR - START_YEAR) * 12 + 1);
    expect(s.news.filter((n) => n.key === 'unlock.instruments')).toHaveLength(1);
  });

  it('a full 30-year game ends with an outcome, and nothing advances after it', () => {
    let s = createSession(5);
    s = togglePolicy(s, Policy.NaturalConservation).session;
    s = togglePolicy(s, Policy.Agroecological).session;
    s = advance(s, TOTAL_MONTHS);
    expect(s.outcome).not.toBeNull();
    if (s.outcome!.kind !== 'collapse') expect(s.monthIndex).toBe(TOTAL_MONTHS);
    expect(advanceMonth(s)).toBe(s);
  });
});
