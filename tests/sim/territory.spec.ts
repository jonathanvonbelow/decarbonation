/**
 * Territory map <-> land-use areas (src/sim/territory.ts, src/sim/geography.ts,
 * mejora-general/files/21_fusion_ecosim.md §4-5, 22_arte_territorio_expansion.md).
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  canDeclare, createTerritory, declareProtectedArea, declarePublicUse, developTerritory, developmentOf, GRID_SIZE,
  isProductive, lotFor, LOT_KHA, makeRng, parcelAt, parcelCounts, parcelTargets, PRODUCTIVE_PARCELS, productiveCount,
  protectedAreaCost, publicUseCost, regionAt, stepMonth, syncTerritory,
  type ParcelChange, type Parcel, type PublicUseResult, type Territory,
} from '../../src/sim';
import { CONTROL_PARAMS } from '../../src/constants';
import { LandUseType, Policy, type GameState } from '../../src/types';
import { freshState, withActivePolicies } from './testHelpers';

const LU = LandUseType;
const noEventRng = () => 0.999;
/** This project compiles without `strict`, so `if (!r.ok)` does not narrow the union: unwrap explicitly. */
function expectOk(r: PublicUseResult) {
  if (!r.ok) throw new Error(`declaration failed: ${(r as { reason: string }).reason}`);
  return r as Extract<PublicUseResult, { ok: true }>;
}

const kindsCount = (t: Territory, kind: string) => t.parcels.filter((p) => p.kind === kind).length;
/** Parcels one declaration moves: 5 kHa of lot at 0.1 kHa per parcel. */
const lotSize = (t: Territory) => Math.round(LOT_KHA / t.kHaPerParcel);

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
  `${LU.RestorationForest}>${LU.ProtectedNativeForest}`,
]);

describe('territory layout', () => {
  const state = freshState(2);
  const t = createTerritory(state.landUses, 7);
  const modelArea = (Object.values(state.landUses) as { area: number }[]).reduce((sum, lu) => sum + lu.area, 0);

  it('is a 100×100 irregular region with exactly 6000 productive parcels holding the model area', () => {
    expect(t.parcels).toHaveLength(GRID_SIZE * GRID_SIZE);
    expect(productiveCount(t)).toBe(PRODUCTIVE_PARCELS);
    // One parcel is the model's area divided by the productive parcels: 0.1 kHa = 1 km².
    expect(t.kHaPerParcel).toBeCloseTo(modelArea / PRODUCTIVE_PARCELS, 12);
    expect(productiveCount(t) * t.kHaPerParcel).toBeCloseTo(modelArea, 6);
    // The territory is irregular: land, sea on the south-east and void outside the borders.
    expect(kindsCount(t, 'void')).toBeGreaterThan(300);
    expect(kindsCount(t, 'sea')).toBeGreaterThan(300);
    expect(kindsCount(t, 'water')).toBeGreaterThan(50);
  });

  it('matches the model areas exactly at the start (level 2, in parcels)', () => {
    (Object.values(LU) as LandUseType[]).forEach((k) => {
      expect(kindsCount(t, k)).toBe(Math.round(state.landUses[k].area / t.kHaPerParcel));
    });
    expect(kindsCount(t, 'fallow')).toBe(0);
  });

  it('has the four regions, each with its own character', () => {
    const byRegion = (kind: string, region: string) =>
      t.parcels.filter((p) => p.kind === kind && regionAt(t, p.x, p.y) === region).length;
    // Forest belongs to the south, extensive crops to the north (REGION_AFFINITY).
    expect(byRegion(LU.UnprotectedNativeForest, 'sur')).toBeGreaterThan(byRegion(LU.UnprotectedNativeForest, 'norte'));
    expect(byRegion(LU.ConventionalCrops, 'norte')).toBeGreaterThan(byRegion(LU.ConventionalCrops, 'sur'));
    // Only the metropolitan centre has towers, and only the coast has a fishing port.
    const towers = t.parcels.filter((p) => p.kind === 'housing_4');
    expect(towers.length).toBeGreaterThan(0);
    towers.forEach((p) => expect(regionAt(t, p.x, p.y)).toBe('centro'));
    expect(kindsCount(t, 'fishing_port')).toBeGreaterThan(0);
  });

  it('land uses form patches, not noise', () => {
    // Every productive parcel of a use should mostly sit next to parcels of the same use.
    const neighbours = (p: Parcel) => [-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => (dx || dy ? parcelAt(t, p.x + dx, p.y + dy) : null)));
    const productive = t.parcels.filter((p) => isProductive(p.kind));
    const alone = productive.filter((p) => neighbours(p).filter((n) => n && n.kind === p.kind).length <= 1).length;
    expect(alone / productive.length).toBeLessThan(0.05);
  });

  it('is deterministic per seed and varies between seeds', () => {
    expect(createTerritory(state.landUses, 7).parcels).toEqual(t.parcels);
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
  it('keeps every use within a few parcels of the model over a full game with events', () => {
    // One parcel is 0.1 kHa: the map lags the model by less than a parcel per flow still
    // accumulating, plus the hysteresis band. Every indicator reads the model's exact areas.
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.array(fc.constantFrom(...Object.values(Policy)), { minLength: 0, maxLength: 5 }),
        (seed, policies) => {
          const start = withActivePolicies(freshState(2), policies);
          const t0 = createTerritory(start.landUses, seed);
          const { state, territory } = runMonthsWithMap(start, t0, 360, (i) => makeRng(seed, i));
          expect(productiveCount(territory)).toBe(PRODUCTIVE_PARCELS);
          const target = parcelTargets(state.landUses, PRODUCTIVE_PARCELS, territory.kHaPerParcel);
          (Object.keys(target) as (keyof typeof target)[]).forEach((k) => {
            expect(Math.abs(kindsCount(territory, k) - target[k])).toBeLessThanOrEqual(3);
          });
          // Context parcels never change.
          t0.parcels.forEach((p, i) => { if (!isProductive(p.kind)) expect(territory.parcels[i].kind).toBe(p.kind); });
        },
      ),
      { numRuns: 3 },
    );
  }, 60_000);

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
      { numRuns: 3 },
    );
  }, 60_000);

  it('does not flicker: re-syncing, or a wobble under the hysteresis band, changes nothing', () => {
    const state = freshState(2);
    const t = createTerritory(state.landUses, 3);
    expect(syncTerritory(t, state.landUses).changes).toHaveLength(0);
    const wobble = JSON.parse(JSON.stringify(state.landUses));
    wobble[LU.ConventionalCrops].area += t.kHaPerParcel * 0.5;
    wobble[LU.UnprotectedNativeForest].area -= t.kHaPerParcel * 0.5;
    expect(syncTerritory(t, wobble).changes).toHaveLength(0);
  });

  it('deforestation advances from the crop frontier', () => {
    const state = freshState(2);
    const t = createTerritory(state.landUses, 5);
    const before = kindsCount(t, LU.ConventionalCrops);
    const moved = JSON.parse(JSON.stringify(state.landUses));
    moved[LU.UnprotectedNativeForest].area -= t.kHaPerParcel * 20;
    moved[LU.ConventionalCrops].area += t.kHaPerParcel * 20;
    const { territory, changes } = syncTerritory(t, moved);
    expect(changes.length).toBeGreaterThan(0);
    changes.forEach((c) => {
      expect(c.from).toBe(LU.UnprotectedNativeForest);
      expect(c.to).toBe(LU.ConventionalCrops);
      // Every parcel cleared touches land that was already farmed or cleared.
      const touching = [-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => parcelAt(territory, c.x + dx, c.y + dy)))
        .filter((n) => n && n.kind === LU.ConventionalCrops).length;
      expect(touching).toBeGreaterThan(0);
    });
    expect(kindsCount(territory, LU.ConventionalCrops)).toBe(before + 20);
    // The input territory was not mutated.
    expect(kindsCount(t, LU.ConventionalCrops)).toBe(before);
  });
});

describe('public uses (map → model)', () => {
  const findForest = (t: Territory) => t.parcels.find((p) => p.kind === LU.UnprotectedNativeForest)!;

  it('declares a lot of 5 kHa around the parcel picked and pays its cost from the treasury', () => {
    const state = freshState(2);
    const t = createTerritory(state.landUses, 2);
    const p = findForest(t);
    const r = expectOk(declareProtectedArea(state, t, p.x, p.y, CONTROL_PARAMS));
    expect(r.cells).toHaveLength(lotSize(t));
    expect(r.cost).toBe(protectedAreaCost(CONTROL_PARAMS));
    expect(r.state.landUses[LU.UnprotectedNativeForest].area).toBeCloseTo(state.landUses[LU.UnprotectedNativeForest].area - LOT_KHA, 9);
    expect(r.state.landUses[LU.ProtectedNativeForest].area).toBeCloseTo(state.landUses[LU.ProtectedNativeForest].area + LOT_KHA, 9);
    expect(r.state.stellaSpecificState.Reservas_del_Tesoro).toBe(state.stellaSpecificState.Reservas_del_Tesoro - r.cost);
    expect(r.state.indicators.treasuryReserves).toBe(r.state.stellaSpecificState.Reservas_del_Tesoro);
    expect(parcelAt(r.territory, p.x, p.y)).toMatchObject({ kind: LU.ProtectedNativeForest, declared: true });
    // The lot is compact and all of it changed.
    r.cells.forEach((i) => expect(r.territory.parcels[i].kind).toBe(LU.ProtectedNativeForest));
    // Pure.
    expect(parcelAt(t, p.x, p.y)!.kind).toBe(LU.UnprotectedNativeForest);
  });

  it('never creates land: a lot is limited by the area the model actually holds', () => {
    const state = freshState(2);
    const t = createTerritory(state.landUses, 2);
    const p = findForest(t);
    // The model holds 2 kHa of unprotected forest: only 20 parcels can be declared.
    const scarce = JSON.parse(JSON.stringify(state)) as GameState;
    scarce.landUses[LU.UnprotectedNativeForest].area = 2;
    const r = expectOk(declareProtectedArea(scarce, t, p.x, p.y, CONTROL_PARAMS));
    expect(r.cells).toHaveLength(20);
    expect(r.state.landUses[LU.UnprotectedNativeForest].area).toBeCloseTo(0, 9);
    expect(r.cost).toBeCloseTo(protectedAreaCost(CONTROL_PARAMS) * (2 / LOT_KHA), 6);
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

  it('declared lots survive later syncs', () => {
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
    for (let n = 0; n < 6; n++) {
      const p = protectedMap.parcels.find((q) => q.kind === LU.UnprotectedNativeForest && !q.declared);
      if (!p) break;
      const r = expectOk(declareProtectedArea(protectedState, protectedMap, p.x, p.y, CONTROL_PARAMS));
      protectedState = r.state;
      protectedMap = r.territory;
    }
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
    expect(restored.state.landUses[LU.RestorationForest].area).toBeCloseTo(LOT_KHA, 9);
    expect(restored.state.landUses[LU.ConventionalCrops].area).toBeLessThan(state.landUses[LU.ConventionalCrops].area);
    // Taking productive land out of production pushes agricultural pressure up.
    expect(restored.state.stellaSpecificState.PP_AGRICOLA).toBeGreaterThan(state.stellaSpecificState.PP_AGRICOLA);

    const energy = expectOk(declarePublicUse(state, t, crop.x, crop.y, 'energy', CONTROL_PARAMS));
    expect(energy.cost).toBe(publicUseCost('energy', CONTROL_PARAMS));
    expect(energy.state.landUses[LU.EnergyPark].area).toBeCloseTo(LOT_KHA, 9);
  });

  it('a wetland can only be declared next to water, and wetlands can chain', () => {
    const state = freshState(2);
    const t = createTerritory(state.landUses, 12);
    const isNextToWater = (p: { x: number; y: number }) => canDeclare(t, p.x, p.y, 'wetland');
    const dry = t.parcels.find((p) => p.kind === LU.ConventionalCrops && !isNextToWater(p))!;
    const wet = t.parcels.find((p) => p.kind === LU.ConventionalCrops && isNextToWater(p))!;
    expect(declarePublicUse(state, t, dry.x, dry.y, 'wetland', CONTROL_PARAMS)).toEqual({ ok: false, reason: 'needs-water' });
    const first = expectOk(declarePublicUse(state, t, wet.x, wet.y, 'wetland', CONTROL_PARAMS));
    expect(first.state.landUses[LU.PublicWetland].area).toBeCloseTo(LOT_KHA, 9);
    // A declared wetland counts as water for the next one.
    const next = first.territory.parcels.find((p) => p.kind === LU.ConventionalCrops
      && [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => parcelAt(first.territory, p.x + dx, p.y + dy)?.kind === LU.PublicWetland)));
    if (next) expect(canDeclare(first.territory, next.x, next.y, 'wetland')).toBe(true);
  });

  it('a lot stays inside one use and does not spill into parcels it cannot take', () => {
    const state = freshState(2);
    const t = createTerritory(state.landUses, 15);
    const p = t.parcels.find((q) => q.kind === LU.UnprotectedNativeForest)!;
    lotFor(t, p.x, p.y, 'protected').forEach((i) => expect(t.parcels[i].kind).toBe(LU.UnprotectedNativeForest));
  });

  it('restoration matures into protected native forest, and an energy park displaces emissions', () => {
    const state = freshState(2);
    const t = createTerritory(state.landUses, 12);
    let restored = state;
    let restoredMap = t;
    for (let n = 0; n < 4; n++) {
      const p = restoredMap.parcels.find((q) => q.kind === LU.ConventionalCrops && !q.declared)!;
      const r = declarePublicUse(restored, restoredMap, p.x, p.y, 'restoration', CONTROL_PARAMS);
      if (!r.ok) break;
      restored = (r as Extract<typeof r, { ok: true }>).state;
      restoredMap = (r as Extract<typeof r, { ok: true }>).territory;
    }
    const after = runMonthsWithMap(restored, restoredMap, 120).state;
    expect(after.landUses[LU.RestorationForest].area).toBeLessThan(restored.landUses[LU.RestorationForest].area);
    // What the state restored matures into *protected* forest, so it cannot be cleared later.
    expect(after.landUses[LU.ProtectedNativeForest].area).toBeGreaterThan(restored.landUses[LU.ProtectedNativeForest].area);

    let parks = state;
    let parksMap = t;
    for (let n = 0; n < 4; n++) {
      const p = parksMap.parcels.find((q) => q.kind === LU.GrasslandsPastures && !q.declared)!;
      const r = declarePublicUse(parks, parksMap, p.x, p.y, 'energy', CONTROL_PARAMS);
      if (!r.ok) break;
      parks = (r as Extract<typeof r, { ok: true }>).state;
      parksMap = (r as Extract<typeof r, { ok: true }>).territory;
    }
    const withParks = stepMonth(parks, 0, noEventRng).next;
    const withoutParks = stepMonth(state, 0, noEventRng).next;
    expect(withParks.indicators.co2EqEmissionsPerCapita).toBeLessThan(withoutParks.indicators.co2EqEmissionsPerCapita);
  });
});

describe('developTerritory (towns follow the model)', () => {
  const state = freshState(2);
  const t = createTerritory(state.landUses, 21);

  it('densifies housing as real GDP grows, without touching productive land', () => {
    const grown = developTerritory(t, { growth: 1.2, hardship: 0, dirty: 1 });
    expect(grown.changes.length).toBeGreaterThan(0);
    grown.changes.forEach((c) => {
      expect(isProductive(c.from)).toBe(false);
      expect(isProductive(c.to)).toBe(false);
    });
    expect(productiveCount(grown.territory)).toBe(PRODUCTIVE_PARCELS);
    const housing = (x: Territory) => x.parcels.filter((p) => p.kind === 'housing_3' || p.kind === 'housing_4').length;
    expect(housing(grown.territory)).toBeGreaterThan(housing(t));
  });

  it('shows informal settlements when social wellbeing collapses, and clean industry when emissions fall', () => {
    const hardship = developTerritory(t, { growth: 0, hardship: 1, dirty: 1 }).territory;
    expect(hardship.parcels.filter((p) => p.kind === 'housing_informal').length)
      .toBeGreaterThan(t.parcels.filter((p) => p.kind === 'housing_informal').length);
    const clean = developTerritory(t, { growth: 0, hardship: 0, dirty: 0 }).territory;
    const heavy = (x: Territory) => x.parcels.filter((p) => p.kind === 'industry_3').length;
    // Hysteresis keeps a couple of plants heavy until the trend is clear; most turn cleaner.
    expect(heavy(clean)).toBeLessThan(heavy(t) / 2);
    expect(clean.parcels.filter((p) => p.kind === 'industry_2').length).toBeGreaterThan(0);
  });

  it('reads development from the model: growth, hardship and emissions', () => {
    const dev = developmentOf(state);
    expect(dev.growth).toBeCloseTo(0, 6);
    expect(dev.hardship).toBeGreaterThanOrEqual(0);
    expect(dev.dirty).toBeLessThanOrEqual(1);
    const richer = { ...state, indicators: { ...state.indicators, pbi: state.indicators.pbi * 1.5 } };
    expect(developmentOf(richer).growth).toBeCloseTo(0.5, 6);
  });
});
