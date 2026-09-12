/**
 * Territory map <-> land-use areas (src/sim/territory.ts, mejora-general/files/21_fusion_ecosim.md §4-5).
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  canDeclare, createTerritory, declareProtectedArea, declarePublicUse, isProductive, makeRng, parcelAt, parcelCounts,
  parcelTargets, productiveCount, protectedAreaCost, publicUseCost, stepMonth, syncTerritory, KHA_PER_PARCEL, TERRITORY_SIZE,
  type ParcelChange, type PublicUseResult, type Territory,
} from '../../src/sim';
import { CONTROL_PARAMS } from '../../src/constants';
import { LandUseType, Policy, type GameState } from '../../src/types';
import { freshState, withActivePolicies } from './testHelpers';

const LU = LandUseType;
const noEventRng = () => 0.999;
/** This project compiles without `strict`, so `if (!r.ok)` does not narrow the union: unwrap explicitly. */
function expectOk(r: PublicUseResult) {
  if (!r.ok) throw new Error(`declareProtectedArea failed: ${(r as { reason: string }).reason}`);
  return r as Extract<PublicUseResult, { ok: true }>;
}

const kindsCount = (t: Territory, kind: string) => t.parcels.filter((p) => p.kind === kind).length;

function runMonthsWithMap(state: GameState, territory: Territory, months: number, rngFor: (i: number) => () => number = () => noEventRng) {
  let s = state;
  let t = territory;
  let month = 0;
  const changes: ParcelChange[] = [];
  for (let i = 0; i < months; i++) {
    if (s.gameOverReason) break;
    const r = stepMonth(s, month, rngFor(i));
    s = r.next;
    month = r.month;
    const synced = syncTerritory(t, s.landUses, r.flows);
    t = synced.territory;
    changes.push(...synced.changes);
  }
  return { state: s, territory: t, changes };
}

/** Transitions the model makes (landUse.ts) plus drought losses; nothing else may appear on the map. */
const MODEL_TRANSITIONS = new Set([
  `${LU.UnprotectedNativeForest}>${LU.ProtectedNativeForest}`, `${LU.UnprotectedNativeForest}>${LU.ConventionalCrops}`,
  `${LU.UnprotectedNativeForest}>${LU.AgroecologicalCrops}`, `${LU.AgroecologicalCrops}>${LU.UnprotectedNativeForest}`,
  `${LU.ConventionalCrops}>${LU.AgroecologicalCrops}`, `${LU.ConventionalCrops}>fallow`, `${LU.AgroecologicalCrops}>fallow`,
]);

describe('territory layout', () => {
  const state = freshState(2);
  const t = createTerritory(state.landUses, 7);

  it('has 144 parcels: 120 productive of 5 kHa (the 600 kHa of the model) and 24 of context', () => {
    expect(t.parcels).toHaveLength(TERRITORY_SIZE * TERRITORY_SIZE);
    expect(productiveCount(t)).toBe(120);
    expect(kindsCount(t, 'water')).toBe(TERRITORY_SIZE);
    expect(kindsCount(t, 'wetland')).toBe(4);
    expect(kindsCount(t, 'urban') + kindsCount(t, 'market') + kindsCount(t, 'industry')).toBe(8);
  });

  it('matches the model areas exactly at the start (level 2: 16/4/14/30/24/32 parcels)', () => {
    expect(kindsCount(t, LU.UnprotectedNativeForest)).toBe(16);
    expect(kindsCount(t, LU.ProtectedNativeForest)).toBe(4);
    expect(kindsCount(t, LU.AgroecologicalCrops)).toBe(14);
    expect(kindsCount(t, LU.ConventionalCrops)).toBe(30);
    expect(kindsCount(t, LU.ForestPlantations)).toBe(24);
    expect(kindsCount(t, LU.GrasslandsPastures)).toBe(32);
    expect(kindsCount(t, 'fallow')).toBe(0);
  });

  it('is deterministic per seed and varies between seeds', () => {
    expect(createTerritory(state.landUses, 7)).toEqual(t);
    expect(createTerritory(state.landUses, 8).parcels.map((p) => p.kind)).not.toEqual(t.parcels.map((p) => p.kind));
  });
});

describe('parcel quantisation', () => {
  it('largest-remainder counts sum to the map and stay within one parcel of each area', () => {
    fc.assert(
      fc.property(fc.array(fc.float({ min: 0, max: 200, noNaN: true }), { minLength: 9, maxLength: 9 }), (areas) => {
        const landUses = freshState(2).landUses;
        (Object.values(LU) as LandUseType[]).forEach((k, i) => { landUses[k] = { ...landUses[k], area: areas[i] }; });
        const counts = parcelCounts(landUses, 120);
        const target = parcelTargets(landUses, 120);
        expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(120);
        (Object.keys(counts) as (keyof typeof counts)[]).forEach((k) => expect(Math.abs(counts[k] - target[k])).toBeLessThan(1));
      }),
      { numRuns: 100 },
    );
  });
});

describe('syncTerritory (model → map)', () => {
  it('keeps every use within 3 parcels of the model over a full game with events', () => {
    // Measured, not guessed: over 100 games (25 seeds × 4 strategies) the largest gap was 2.45
    // parcels. The map lags the model by up to one parcel per flow still accumulating; every
    // indicator reads the model's exact areas, never the parcel count.
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.array(fc.constantFrom(...Object.values(Policy)), { minLength: 0, maxLength: 5 }),
        (seed, policies) => {
          const start = withActivePolicies(freshState(2), policies);
          const t0 = createTerritory(start.landUses, seed);
          const { state, territory } = runMonthsWithMap(start, t0, 360, (i) => makeRng(seed, i));
          expect(productiveCount(territory)).toBe(120);
          const target = parcelTargets(state.landUses, 120);
          (Object.keys(target) as (keyof typeof target)[]).forEach((k) => {
            expect(Math.abs(kindsCount(territory, k) - target[k])).toBeLessThanOrEqual(3);
          });
          // Context parcels never change.
          t0.parcels.forEach((p, i) => { if (!isProductive(p.kind)) expect(territory.parcels[i].kind).toBe(p.kind); });
        },
      ),
      { numRuns: 8 },
    );
  });

  it('only draws transitions the model actually makes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.array(fc.constantFrom(...Object.values(Policy)), { minLength: 0, maxLength: 5 }),
        (seed, policies) => {
          const start = withActivePolicies(freshState(2), policies);
          const { changes } = runMonthsWithMap(start, createTerritory(start.landUses, seed), 360, (i) => makeRng(seed, i));
          changes.forEach((c) => expect(MODEL_TRANSITIONS.has(`${c.from}>${c.to}`)).toBe(true));
        },
      ),
      { numRuns: 12 },
    );
  });

  it('does not flicker: re-syncing, or small wobbles in an area, change nothing', () => {
    const state = freshState(2);
    const t = createTerritory(state.landUses, 3);
    expect(syncTerritory(t, state.landUses).changes).toHaveLength(0);
    const wobble = JSON.parse(JSON.stringify(state.landUses));
    wobble[LU.ConventionalCrops].area += 2.5;
    wobble[LU.UnprotectedNativeForest].area -= 2.5;
    expect(syncTerritory(t, wobble).changes).toHaveLength(0);
  });

  it('deforestation advances from the crop frontier', () => {
    const state = freshState(2);
    const t = createTerritory(state.landUses, 5);
    const moved = JSON.parse(JSON.stringify(state.landUses));
    moved[LU.UnprotectedNativeForest].area -= KHA_PER_PARCEL * 2;
    moved[LU.ConventionalCrops].area += KHA_PER_PARCEL * 2;
    const { territory, changes } = syncTerritory(t, moved);
    expect(changes.length).toBeGreaterThan(0);
    changes.forEach((c) => {
      expect(c.from).toBe(LU.UnprotectedNativeForest);
      expect(c.to).toBe(LU.ConventionalCrops);
    });
    expect(kindsCount(territory, LU.ConventionalCrops)).toBe(32);
    // The input territory was not mutated.
    expect(kindsCount(t, LU.ConventionalCrops)).toBe(30);
  });
});

describe('declareProtectedArea (map → model)', () => {
  const findForest = (t: Territory) => t.parcels.find((p) => p.kind === LU.UnprotectedNativeForest)!;

  it('moves one parcel of area from BNNP to BNP and pays its cost from the treasury', () => {
    const state = freshState(2);
    const t = createTerritory(state.landUses, 2);
    const p = findForest(t);
    const r = expectOk(declareProtectedArea(state, t, p.x, p.y, CONTROL_PARAMS));
    const cost = protectedAreaCost(CONTROL_PARAMS);
    expect(r.cost).toBe(cost);
    expect(r.state.landUses[LU.UnprotectedNativeForest].area).toBe(state.landUses[LU.UnprotectedNativeForest].area - KHA_PER_PARCEL);
    expect(r.state.landUses[LU.ProtectedNativeForest].area).toBe(state.landUses[LU.ProtectedNativeForest].area + KHA_PER_PARCEL);
    expect(r.state.stellaSpecificState.Reservas_del_Tesoro).toBe(state.stellaSpecificState.Reservas_del_Tesoro - cost);
    expect(r.state.indicators.treasuryReserves).toBe(r.state.stellaSpecificState.Reservas_del_Tesoro);
    expect(parcelAt(r.territory, p.x, p.y)).toMatchObject({ kind: LU.ProtectedNativeForest, declared: true });
    // Pure.
    expect(parcelAt(t, p.x, p.y)!.kind).toBe(LU.UnprotectedNativeForest);
  });

  it('refuses parcels that do not take the use, and when the treasury cannot pay', () => {
    const state = freshState(2);
    const t = createTerritory(state.landUses, 2);
    const crop = t.parcels.find((p) => p.kind === LU.ConventionalCrops)!;
    expect(declareProtectedArea(state, t, crop.x, crop.y, CONTROL_PARAMS)).toEqual({ ok: false, reason: 'not-convertible' });
    expect(declareProtectedArea(state, t, -1, 0, CONTROL_PARAMS)).toEqual({ ok: false, reason: 'out-of-bounds' });
    const broke = { ...state, stellaSpecificState: { ...state.stellaSpecificState, Reservas_del_Tesoro: 10 } };
    const p = findForest(t);
    expect(declareProtectedArea(broke, t, p.x, p.y, CONTROL_PARAMS)).toEqual({ ok: false, reason: 'insufficient-funds' });
  });

  it('declared reserves survive later syncs', () => {
    const state = freshState(2);
    const t0 = createTerritory(state.landUses, 4);
    const p = findForest(t0);
    const r = expectOk(declareProtectedArea(state, t0, p.x, p.y, CONTROL_PARAMS));
    const { territory } = runMonthsWithMap(r.state, r.territory, 120);
    expect(parcelAt(territory, p.x, p.y)).toMatchObject({ kind: LU.ProtectedNativeForest, declared: true });
  });

  it('reaches the model equations: more protection → less deforestation and more biodiversity', () => {
    const base = freshState(2);
    const t0 = createTerritory(base.landUses, 9);
    let protectedState = base;
    let protectedMap = t0;
    t0.parcels.filter((p) => p.kind === LU.UnprotectedNativeForest).slice(0, 6).forEach((p) => {
      const r = expectOk(declareProtectedArea(protectedState, protectedMap, p.x, p.y, CONTROL_PARAMS));
      protectedState = r.state;
      protectedMap = r.territory;
    });
    const without = runMonthsWithMap(base, t0, 120).state;
    const withReserves = runMonthsWithMap(protectedState, protectedMap, 120).state;
    // Less unprotected forest exposed to the BNNP→CC flow ⇒ conventional crops grow less.
    expect(withReserves.landUses[LU.ConventionalCrops].area).toBeLessThan(without.landUses[LU.ConventionalCrops].area);
    // BNP weighs more than BNNP in the biodiversity equation.
    expect(withReserves.indicators.biodiversity).toBeGreaterThan(without.indicators.biodiversity);
  });
  it('every public use lands in the model with its own rates and cost', () => {
    const state = freshState(2);
    const t = createTerritory(state.landUses, 12);
    const crop = t.parcels.find((p) => p.kind === LU.ConventionalCrops)!;
    const restored = expectOk(declarePublicUse(state, t, crop.x, crop.y, 'restoration', CONTROL_PARAMS));
    expect(restored.state.landUses[LU.RestorationForest].area).toBe(KHA_PER_PARCEL);
    expect(restored.state.landUses[LU.ConventionalCrops].area).toBe(state.landUses[LU.ConventionalCrops].area - KHA_PER_PARCEL);
    // Taking productive land out of production pushes agricultural pressure up.
    expect(restored.state.stellaSpecificState.PP_AGRICOLA).toBeGreaterThan(state.stellaSpecificState.PP_AGRICOLA);

    const energy = expectOk(declarePublicUse(state, t, crop.x, crop.y, 'energy', CONTROL_PARAMS));
    expect(energy.cost).toBe(publicUseCost('energy', CONTROL_PARAMS));
    expect(energy.state.landUses[LU.EnergyPark].area).toBe(KHA_PER_PARCEL);
  });

  it('a wetland can only be declared next to water', () => {
    const state = freshState(2);
    const t = createTerritory(state.landUses, 12);
    const isNextToWater = (p: { x: number; y: number }) => canDeclare(t, p.x, p.y, 'wetland');
    const dry = t.parcels.find((p) => p.kind === LU.ConventionalCrops && !isNextToWater(p))!;
    const wet = t.parcels.find((p) => p.kind === LU.ConventionalCrops && isNextToWater(p));
    expect(declarePublicUse(state, t, dry.x, dry.y, 'wetland', CONTROL_PARAMS)).toEqual({ ok: false, reason: 'needs-water' });
    if (wet) expect(expectOk(declarePublicUse(state, t, wet.x, wet.y, 'wetland', CONTROL_PARAMS)).state.landUses[LU.PublicWetland].area).toBe(KHA_PER_PARCEL);
  });

  it('restoration matures into native forest, and an energy park displaces emissions', () => {
    const state = freshState(2);
    const t = createTerritory(state.landUses, 12);
    let restored = state;
    t.parcels.filter((p) => p.kind === LU.ConventionalCrops).slice(0, 8).forEach((p) => {
      const r = declarePublicUse(restored, t, p.x, p.y, 'restoration', CONTROL_PARAMS);
      if (r.ok) restored = (r as Extract<typeof r, { ok: true }>).state;
    });
    const after = runMonthsWithMap(restored, createTerritory(restored.landUses, 12), 120).state;
    expect(after.landUses[LU.RestorationForest].area).toBeLessThan(restored.landUses[LU.RestorationForest].area);
    expect(after.landUses[LU.UnprotectedNativeForest].area).toBeGreaterThan(0);

    let parks = state;
    t.parcels.filter((p) => p.kind === LU.GrasslandsPastures).slice(0, 8).forEach((p) => {
      const r = declarePublicUse(parks, t, p.x, p.y, 'energy', CONTROL_PARAMS);
      if (r.ok) parks = (r as Extract<typeof r, { ok: true }>).state;
    });
    const withParks = stepMonth(parks, 0, noEventRng).next;
    const withoutParks = stepMonth(state, 0, noEventRng).next;
    expect(withParks.indicators.co2EqEmissionsPerCapita).toBeLessThan(withoutParks.indicators.co2EqEmissionsPerCapita);
  });
});
