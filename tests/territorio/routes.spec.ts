/**
 * Win routes of the preview (src/territorio/routes.ts). These lock in the calibration decisions:
 * the thresholds themselves are set with `npm run sim:territorio`, this only guards the shape.
 */
import { describe, expect, it } from 'vitest';
import { TERRITORIO_FLOORS, TERRITORIO_ROUTES, evaluateTerritorio, publicNaturePct } from '../../src/territorio/routes';
import { advanceMonth, createSession, togglePolicy } from '../../src/territorio/session';
import { LandUseType, Policy } from '../../src/types';

describe('Territorio win routes', () => {
  it('offers three distinct routes plus governance floors', () => {
    expect(TERRITORIO_ROUTES.map((r) => r.id)).toEqual(['conservation', 'production', 'innovation']);
    TERRITORIO_ROUTES.forEach((r) => expect(r.conditions.length).toBeGreaterThanOrEqual(3));
    expect(TERRITORIO_FLOORS.length).toBeGreaterThanOrEqual(3);
  });

  it('nobody wins at the starting position, and no floor is broken there either', () => {
    const s = createSession(5);
    const outcome = evaluateTerritorio(s.game, { ...s.game, indicators: s.game.levelBaseline });
    expect(outcome.won).toBe(false);
    expect(outcome.floorsMet).toBe(true);
  });

  it('counts every public conservation use, not just protected forest', () => {
    const s = createSession(5);
    const before = publicNaturePct(s.game);
    const game = {
      ...s.game,
      landUses: {
        ...s.game.landUses,
        [LandUseType.PublicWetland]: { ...s.game.landUses[LandUseType.PublicWetland], area: 30 },
        [LandUseType.RestorationForest]: { ...s.game.landUses[LandUseType.RestorationForest], area: 30 },
      },
    };
    expect(publicNaturePct(game)).toBeGreaterThan(before + 8);
  });

  it('each route asks for something the others do not', () => {
    const keys = TERRITORIO_ROUTES.map((r) => r.conditions.map((c) => c.labelKey));
    const unique = keys.map((own, i) => own.filter((k) => !keys.some((other, j) => j !== i && other.includes(k))));
    unique.forEach((own) => expect(own.length).toBeGreaterThan(0));
  });
});

// Model 1.1 (phase 34, T-07): the protected forest the model creates on its own is not a public decision.
describe('declared protected area', () => {
  const totalOf = (g: { landUses: Record<string, { area: number }> }) =>
    (Object.values(g.landUses) as { area: number }[]).reduce((sum, lu) => sum + lu.area, 0);

  it('the initial protected forest does not count as public nature; declaring it does', () => {
    const s = createSession(5);
    expect(s.game.landUses[LandUseType.ProtectedNativeForest].area).toBeGreaterThan(0);
    expect(publicNaturePct(s.game)).toBe(0);
    expect(publicNaturePct({ ...s.game, declaredProtectedArea: 10 })).toBeCloseTo((10 / totalOf(s.game)) * 100, 6);
  });

  it('never counts more declared forest than the protected forest that exists', () => {
    const s = createSession(5);
    const bnp = s.game.landUses[LandUseType.ProtectedNativeForest].area;
    expect(publicNaturePct({ ...s.game, declaredProtectedArea: bnp + 500 })).toBeCloseTo((bnp / totalOf(s.game)) * 100, 6);
  });
});

// Phase 49 (49 §3, T-05): the productive route asks for governed production over time, not a full treasury.
describe('production route (phase 49)', () => {
  const production = TERRITORIO_ROUTES.find((r) => r.id === 'production')!;
  const healthy = (g: ReturnType<typeof createSession>['game'], years: number) => ({
    ...g,
    indicators: { ...g.indicators, foodSecurity: 60, economicSecurity: 60, socialWellbeing: 80 },
    stellaSpecificState: { ...g.stellaSpecificState, Reservas_del_Tesoro: g.stellaSpecificState.PBI_Real * 0.5, Deuda: 0 },
    model: { ...g.model!, productiveYears: years, fiscal: { ...g.model!.fiscal, primaryHistory: [[5, 0.02]] as [number, number][] } },
  });

  it('is not met with a single productive policy, however full the treasury', () => {
    let s = createSession(5);
    s = togglePolicy(s, Policy.AgriculturalExports).session;
    for (let m = 0; m < 24; m++) s = advanceMonth(s);
    expect(s.game.model!.productiveYears).toBe(0);
    const game = healthy(s.game, s.game.model!.productiveYears);
    const rp = evaluateTerritorio(game, { ...game, indicators: game.levelBaseline }).routes.find((r) => r.route.id === 'production')!;
    expect(rp.met).toBe(false);
    expect(rp.bottleneck?.labelKey).toBe('cond.productiveYears');
  });

  it('counts the years with two productive policies at once, and is met after 15 of them', () => {
    let s = createSession(5);
    s = togglePolicy(s, Policy.AgriculturalExports).session;
    s = togglePolicy(s, Policy.SustainableLivestock).session;
    for (let m = 0; m < 24; m++) s = advanceMonth(s);
    expect(s.game.model!.productiveYears).toBeCloseTo(2, 9);
    const game = healthy(s.game, 15);
    const rp = evaluateTerritorio(game, { ...game, indicators: game.levelBaseline }).routes.find((r) => r.route.id === 'production')!;
    expect(rp.met).toBe(true);
    expect(production.conditions.map((c) => c.labelKey)).toContain('cond.primaryAvg');
  });
});
