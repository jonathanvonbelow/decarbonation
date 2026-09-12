/**
 * Territorio preview session rules (src/territorio/session.ts, 21_fusion_ecosim.md §6).
 */
import { describe, expect, it } from 'vitest';
import { CONTROL_PARAMS, MAX_ACTIVE_POLICIES, POLICY_LOCK_IN_DURATION } from '../../src/constants';
import { getPolicyEfficiency, productiveCount } from '../../src/sim';
import { LandUseType, Policy } from '../../src/types';
import { MAX_OPEN_SITUATIONS, SITUATION_BY_ID, SITUATIONS } from '../../src/territorio/situations';
import {
  advanceMonth, createSession, decideSituation, protectParcel, requestLoan, setInstrumentEffort, setTaxPressure,
  togglePact, togglePolicy, unlocks, INSTRUMENTS_UNLOCK_YEAR, START_YEAR, TOTAL_MONTHS, type Session,
} from '../../src/territorio/session';

function advance(s: Session, months: number): Session {
  let out = s;
  for (let i = 0; i < months; i++) {
    out = advanceMonth(out);
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

  it('situations never stop the clock, and wear the government down while open', () => {
    let s = advance(createSession(21), 36);
    expect(s.monthIndex).toBe(36); // the clock ran through every arrival
    expect(s.open.length + s.resolvedCount + s.expiredCount).toBeGreaterThan(0);
    if (s.open.length > 0) {
      expect(s.wearTotal).toBeGreaterThan(0);
      const before = s.game.stellaSpecificState.Conflicto_social + s.game.stellaSpecificState.PP_AGRICOLA
        + s.game.stellaSpecificState.PP_AMBIENTALISTA + s.game.stellaSpecificState.PP_SOCIAL;
      const after = advance(s, 1);
      const pressureAfter = after.game.stellaSpecificState.Conflicto_social + after.game.stellaSpecificState.PP_AGRICOLA
        + after.game.stellaSpecificState.PP_AMBIENTALISTA + after.game.stellaSpecificState.PP_SOCIAL;
      expect(pressureAfter).not.toBe(before);
    }
  });

  it('an unattended situation resolves itself with the option nobody chose', () => {
    let s = advance(createSession(7), 60);
    expect(s.expiredCount).toBeGreaterThan(0);
    expect(s.news.some((n) => n.key === 'situation.expired')).toBe(true);
  });

  it('deciding a situation applies its effects, pays its cost and takes it off the desk', () => {
    let s = advance(createSession(3), 24);
    const item = s.open[0];
    if (!item) return;
    const def = SITUATION_BY_ID[item.defId];
    const affordable = def.options.find((o) => (o.cost ?? 0) <= s.game.stellaSpecificState.Reservas_del_Tesoro)!;
    const before = s.game.stellaSpecificState.Reservas_del_Tesoro;
    const r = decideSituation(s, item.id, affordable.id);
    expect(r.error).toBeUndefined();
    expect(r.session.open.find((o) => o.id === item.id)).toBeUndefined();
    expect(r.session.resolvedCount).toBe(s.resolvedCount + 1);
    // The option's own effects can move the treasury too (a fine collected, a subsidy paid), so
    // the cost is a floor on what it took, not the whole story.
    expect(r.session.game.stellaSpecificState.Reservas_del_Tesoro).toBeLessThanOrEqual(before - (affordable.cost ?? 0));
    expect(r.session.news[0].key).toBe('situation.resolved');
  });

  it('never has more than the inbox cap open at once', () => {
    const s = advance(createSession(99), 120);
    expect(s.open.length).toBeLessThanOrEqual(MAX_OPEN_SITUATIONS);
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

  it('ships at least 100 distinct situations, each with a fallback option', () => {
    expect(SITUATIONS.length).toBeGreaterThanOrEqual(100);
    expect(new Set(SITUATIONS.map((d) => d.id)).size).toBe(SITUATIONS.length);
    SITUATIONS.forEach((d) => {
      expect(d.options.length).toBeGreaterThanOrEqual(2);
      expect(d.deadline).toBeGreaterThan(0);
      // Every option but the "do nothing" fallback has to actually do something.
      d.options.slice(0, -1).forEach((o) => expect(o.effects.length + (o.cost ? 1 : 0)).toBeGreaterThan(0));
    });
  });
});
