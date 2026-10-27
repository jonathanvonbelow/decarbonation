/**
 * Territorio situations as decaying target impulses, wear on the targets, neglect and public uses 2.0
 * (mejora-general/files/47_territorio_situaciones_usos_publicos.md §2, §3, §5, §7).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { CONTROL_PARAMS } from '../../src/constants';
import { investmentScale, publicUseCost } from '../../src/sim';
import { capImpulses, impulseSum } from '../../src/sim/v2/indicators';
import { PARAMS_V2 } from '../../src/sim/v2/params';
import type { GameState, RandomEventEffect } from '../../src/types';
import {
  neglectShift, neglectTally, pruneImpulses, resolveSituation, SITUATION_BY_ID, SITUATIONS, situationCost, tauOfHalfLife, wearShift,
  type SituationDef,
} from '../../src/territorio/situations';
import { advanceMonth, createSession, decideSituation, TOTAL_MONTHS, type Session } from '../../src/territorio/session';

const TEST_ID = 'test_phase47';

function define(effects: RandomEventEffect[], extra: Partial<SituationDef> = {}): void {
  SITUATION_BY_ID[TEST_ID] = {
    id: TEST_ID, actor: 'government', category: 'economy', tone: 'neutral', deadline: 6, weight: 0, wear: {},
    es: { title: 't', body: 'b' }, en: { title: 't', body: 'b' },
    options: [{ id: 'a', es: 'a', en: 'a', effects }, { id: 'z', es: 'z', en: 'z', effects: [] }],
    ...extra,
  };
}

const clone = (g: GameState): GameState => JSON.parse(JSON.stringify(g));

function gameWith(patch: (g: GameState) => void): GameState {
  const g = clone(createSession(4).game);
  patch(g);
  return g;
}

afterEach(() => { delete SITUATION_BY_ID[TEST_ID]; });

describe('situation effects as impulses (47 §2)', () => {
  it('foodSecurity +3 at F = 40 is an impulse of 3/24 = 0.125 logit that is worth half after 18 months', () => {
    define([{ indicator: 'foodSecurity', changeAbsolute: 3 }]);
    const g = gameWith((x) => { x.indicators.foodSecurity = 40; });
    const r = resolveSituation(g, TEST_ID, 'a', CONTROL_PARAMS);
    expect(r.ok).toBe(true);
    expect(r.state.indicators.foodSecurity).toBe(40); // no jump
    const imp = r.state.model!.impulses.at(-1)!;
    expect(imp.indicator).toBe('F');
    expect(imp.logit).toBeCloseTo(0.125, 12);
    expect(imp.tau).toBeCloseTo(18 / 12 / Math.LN2, 12);
    const m = r.state.model!;
    expect(impulseSum({ t: m.t, impulses: [imp] }, 'F')).toBeCloseTo(0.125, 12);
    expect(impulseSum({ t: m.t + 1.5, impulses: [imp] }, 'F')).toBeCloseTo(0.0625, 12);
  });

  it('a percentage effect is of the current value, and p is clamped to [1, 99] in the conversion', () => {
    define([{ indicator: 'foodSecurity', changePercentage: -0.05 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 2 }]);
    const g = gameWith((x) => { x.indicators.foodSecurity = 40; x.stellaSpecificState.PP_AGRICOLA = 0.2; });
    const imps = resolveSituation(g, TEST_ID, 'a', CONTROL_PARAMS).state.model!.impulses.slice(-2);
    expect(imps[0].logit).toBeCloseTo(-2 / 24, 12);
    expect(imps[1].indicator).toBe('pa');
    expect(imps[1].logit).toBeCloseTo(2 / (100 * 0.01 * 0.99), 9);
  });

  it('respects the ±0.6 cap with 20 options of the same sign in a row', () => {
    define([{ indicator: 'biodiversity', changeAbsolute: 3 }]);
    let g = createSession(4).game;
    for (let i = 0; i < 20; i++) g = resolveSituation(g, TEST_ID, 'a', CONTROL_PARAMS).state;
    const raw = impulseSum(g.model!, 'B');
    expect(raw).toBeGreaterThan(PARAMS_V2.relaxation.impulseCap);
    expect(capImpulses(raw)).toBe(PARAMS_V2.relaxation.impulseCap);
    expect(capImpulses(-raw)).toBe(-PARAMS_V2.relaxation.impulseCap);
  });

  it('an impulse moves the target and the indicator relaxes back once it fades', () => {
    define([{ indicator: 'economicSecurity', changeAbsolute: 3 }]);
    const s0 = createSession(4);
    const withImpulse: Session = { ...s0, game: resolveSituation(s0.game, TEST_ID, 'a', CONTROL_PARAMS).state };
    const a1 = advanceMonth({ ...s0, open: [] });
    const b1 = advanceMonth({ ...withImpulse, open: [] });
    expect(b1.game.model!.targets.E!).toBeGreaterThan(a1.game.model!.targets.E! + 1);
    // ten years later (≈ 6.7 half-lives) the push is gone: < 1 % of the initial shift
    const imp = withImpulse.game.model!.impulses.at(-1)!;
    expect(impulseSum({ t: imp.t + 10, impulses: [imp] }, 'E') / imp.logit).toBeLessThan(0.01);
  });

  it('a situation can declare its own half-life (structural effects)', () => {
    define([{ indicator: 'foodSecurity', changeAbsolute: 3 }], { halfLifeMonths: 60 });
    const imp = resolveSituation(createSession(4).game, TEST_ID, 'a', CONTROL_PARAMS).state.model!.impulses.at(-1)!;
    expect(imp.tau).toBeCloseTo(tauOfHalfLife(60), 12);
    const custom = SITUATIONS.filter((d) => d.halfLifeMonths !== undefined);
    expect(custom.length).toBeLessThanOrEqual(10);
  });

  it('impulses older than 6τ are dropped', () => {
    const g = createSession(4).game;
    const tau = tauOfHalfLife(18);
    const model = { ...g.model!, t: 10, impulses: [
      { indicator: 'B' as const, logit: 0.1, t: 10 - 6 * tau - 1e-6, tau },
      { indicator: 'B' as const, logit: 0.1, t: 10 - 6 * tau + 1e-3, tau },
    ] };
    expect(pruneImpulses(model).impulses).toHaveLength(1);
    const fresh = { ...model, impulses: model.impulses.slice(1) };
    expect(pruneImpulses(fresh)).toBe(fresh);
  });

  it('money is immediate: incomes scale with √(Y/Y0), charges do not; debt and GDP percentages are level shocks', () => {
    define([
      { indicator: 'stella.Reservas_del_Tesoro', changeAbsolute: 100 },
      { indicator: 'stella.Deuda', changePercentage: 0.03 },
      { indicator: 'stella.PBI_Real', changePercentage: -0.01 },
    ]);
    const g = gameWith((x) => { x.stellaSpecificState.PBI_Real = 4 * x.model!.anchors.gdp0; x.stellaSpecificState.Deuda = 1000; });
    const scale = investmentScale(g);
    expect(scale).toBeCloseTo(2, 12);
    const r = resolveSituation(g, TEST_ID, 'a', CONTROL_PARAMS).state;
    expect(r.stellaSpecificState.Reservas_del_Tesoro).toBeCloseTo(g.stellaSpecificState.Reservas_del_Tesoro + 200, 9);
    expect(r.stellaSpecificState.Deuda).toBeCloseTo(1030, 9);
    expect(r.stellaSpecificState.PBI_Real).toBeCloseTo(g.stellaSpecificState.PBI_Real * 0.99, 6);
    expect(r.indicators.pbi).toBe(r.stellaSpecificState.PBI_Real);
    expect(r.indicators.debt).toBe(r.stellaSpecificState.Deuda);

    define([{ indicator: 'stella.Reservas_del_Tesoro', changeAbsolute: -100 }]);
    const c = resolveSituation(g, TEST_ID, 'a', CONTROL_PARAMS).state;
    expect(c.stellaSpecificState.Reservas_del_Tesoro).toBeCloseTo(g.stellaSpecificState.Reservas_del_Tesoro - 100, 9);
  });

  it('costs follow √(Y/Y0), capped at 2.5, for situations and public-use lots alike', () => {
    const g = createSession(4).game;
    expect(situationCost(100, g)).toBe(100);
    expect(publicUseCost('energy', CONTROL_PARAMS, undefined, g)).toBe(publicUseCost('energy', CONTROL_PARAMS));
    const rich = gameWith((x) => { x.stellaSpecificState.PBI_Real = 100 * x.model!.anchors.gdp0; });
    expect(situationCost(100, rich)).toBeCloseTo(250, 9);
    expect(publicUseCost('protected', CONTROL_PARAMS, undefined, rich)).toBeCloseTo(2.5 * publicUseCost('protected', CONTROL_PARAMS), 9);
    const poor = gameWith((x) => { x.stellaSpecificState.PBI_Real = 0.5 * x.model!.anchors.gdp0; });
    expect(situationCost(100, poor)).toBe(100);
  });

  it('land effects are transfers (phase 37): total area is conserved', () => {
    define([
      { landUseChange: { target: 'HUM' as never, changeAbsolute_kHa: 5 } } as RandomEventEffect,
      { landUseChange: { target: 'CC' as never, changeAbsolute_kHa: -5 } } as RandomEventEffect,
    ]);
    const g = createSession(4).game;
    const area = (x: GameState) => (Object.values(x.landUses) as { area: number }[]).reduce((s, l) => s + l.area, 0);
    const r = resolveSituation(g, TEST_ID, 'a', CONTROL_PARAMS);
    expect(area(r.state)).toBeCloseTo(area(g), 9);
    expect(r.flows.length).toBeGreaterThan(0);
  });
});

describe('wear on the targets (47 §3)', () => {
  it('a situation open 6 months with wear.conflict = 1 pushes C*; once settled, the push is 0', () => {
    define([], { wear: { conflict: 1 } });
    const open = [{ id: 'w', defId: TEST_ID, openedAt: 0, expiresAt: 12, worn: 0 }];
    expect(wearShift(open, 6).C).toBeCloseTo(0.04 * 1 * 1.5, 12);
    expect(wearShift([], 6).C).toBe(0);
    let a = createSession(4);
    let b: Session = { ...a, open };
    for (let i = 0; i < 6; i++) {
      a = advanceMonth({ ...a, open: [] });
      b = advanceMonth({ ...b, open: b.open.filter((o) => o.id === 'w') });
    }
    expect(b.game.model!.targets.C!).toBeGreaterThan(a.game.model!.targets.C!);
    expect(b.wearTotal).toBeGreaterThan(0);
    // settle it: from the next month on, the targets coincide again (same seed, same state otherwise)
    const settled = decideSituation(b, 'w', 'a').session;
    expect(settled.open.some((o) => o.id === 'w')).toBe(false);
    const m = settled.monthIndex + 1;
    // what is left on the desk pushes exactly what the other situations push: w's own push is gone
    const others = b.open.filter((o) => o.id !== 'w');
    expect(wearShift(settled.open, m)).toEqual(wearShift(others, m));
    expect(wearShift(b.open, m).C - wearShift(others, m).C).toBeCloseTo(0.04 * 1 * (1 + Math.min(1, m / 12)), 12);
  });
});

describe('neglect of the desk (decisión del usuario 2026-09-19)', () => {
  it('a few expiries cost nothing; a pile of them shifts Pc*', () => {
    const P = PARAMS_V2.situations;
    expect(neglectShift([10, 20, 30], 31)).toBe(0);
    const many = Array.from({ length: 10 }, (_, i) => 100 + i);
    const n = neglectTally(many, 110);
    expect(n).toBeGreaterThan(P.neglectTolerance);
    expect(neglectShift(many, 110)).toBeCloseTo(P.neglectLogit * (n - P.neglectTolerance), 12);
    // half-life: one expiry is worth 1/2 after neglectHalfLifeMonths
    expect(neglectTally([0], P.neglectHalfLifeMonths)).toBeCloseTo(0.5, 12);
  });

  it('expiries are recorded for the tally, except lapsed opportunities (tone good)', () => {
    let s = createSession(7);
    let good = 0;
    for (let i = 0; i < 60; i++) {
      const next = advanceMonth(s);
      good += s.open.filter((o) => !next.open.some((n) => n.id === o.id) && SITUATION_BY_ID[o.defId].tone === 'good').length;
      s = next;
    }
    expect(s.expiredCount).toBeGreaterThan(0);
    expect(s.expiredAt!.length).toBe(s.expiredCount - good);
  });
});

describe('the strategy decides, not the seed (47 §7)', () => {
  it('with the same strategy, two seeds end with wellbeing less than 25 points apart', () => {
    const play = (seed: number): number => {
      let s = createSession(seed);
      for (let m = 0; m < TOTAL_MONTHS && !s.outcome; m++) {
        for (const item of [...s.open]) {
          const def = SITUATION_BY_ID[item.defId];
          for (const o of def.options) {
            const r = decideSituation(s, item.id, o.id);
            if (!r.error) { s = r.session; break; }
          }
        }
        s = advanceMonth(s);
      }
      return s.game.indicators.socialWellbeing;
    };
    expect(Math.abs(play(1) - play(2))).toBeLessThan(25);
  });
});
