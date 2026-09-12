/**
 * Win routes of the preview (src/territorio/routes.ts). These lock in the calibration decisions:
 * the thresholds themselves are set with `npm run sim:territorio`, this only guards the shape.
 */
import { describe, expect, it } from 'vitest';
import { TERRITORIO_FLOORS, TERRITORIO_ROUTES, evaluateTerritorio, publicNaturePct } from '../../src/territorio/routes';
import { createSession } from '../../src/territorio/session';
import { LandUseType } from '../../src/types';

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
