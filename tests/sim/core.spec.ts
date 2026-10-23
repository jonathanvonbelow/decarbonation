/**
 * Model 2.0 skeleton (mejora-general/files/35_motor_v2_estructura.md §11): the shared math, the single
 * integrator `advance` behind stepYear/stepMonth, the 2.0 tables and the anchors of each level.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CONTROL_PARAMS, INITIAL_PACTS } from '../../src/constants';
import { advance, createInitialState, makeRng, MONTHLY_DT, MODEL_VERSION, stepMonth, stepYear } from '../../src/sim';
import { logit, phiEffort, relax, sHigh, sigmoid, sLow, target100, toLogitDelta } from '../../src/sim/v2/math';
import { PARAMS_V2, PID, PIDS } from '../../src/sim/v2/params';
import { areasByCode, computeAnchors, dryRunLandFlows } from '../../src/sim/v2/anchors';
import { Policy, type ModelIndicatorKey } from '../../src/types';
import { POLICY_BY_CODE } from '../../scripts/harness/strategies';
import { freshState, withActivePolicies } from './testHelpers';

const noEvents = () => 0.999;
const BALANCED = [Policy.NaturalConservation, Policy.Agroecological, Policy.AgriculturalExports, Policy.CarbonNeutrality, Policy.ForeignInvestment];

describe('v2 math', () => {
  it('relax with dt = 1 is x + k (xs − x)', () => {
    fc.assert(fc.property(
      fc.double({ min: -100, max: 200, noNaN: true }), fc.double({ min: -100, max: 200, noNaN: true }), fc.double({ min: 0, max: 0.99, noNaN: true }),
      (x, xs, k) => Math.abs(relax(x, xs, k, 1) - (x + k * (xs - x))) < 1e-9,
    ));
  });

  it('twelve monthly relax steps equal one annual step', () => {
    fc.assert(fc.property(
      fc.double({ min: 0, max: 100, noNaN: true }), fc.double({ min: 0, max: 100, noNaN: true }), fc.double({ min: 0, max: 0.99, noNaN: true }),
      (x, xs, k) => {
        let m = x;
        for (let i = 0; i < 12; i++) m = relax(m, xs, k, 1 / 12);
        return Math.abs(m - relax(x, xs, k, 1)) < 1e-9;
      },
    ));
  });

  it('logit inverts sigmoid inside the clamp, and target100 is 100·sigmoid', () => {
    [0.01, 0.05, 0.3, 0.5, 0.95].forEach((p) => expect(sigmoid(logit(p))).toBeCloseTo(p, 12));
    expect(Number.isFinite(logit(0))).toBe(true);
    expect(Number.isFinite(logit(1))).toBe(true);
    expect(target100(logit(0.4), 0)).toBeCloseTo(40, 10);
  });

  it('smooth steps, effort returns and logit deltas behave as documented', () => {
    expect(sLow(0, 10, 1)).toBeGreaterThan(0.99);
    expect(sLow(20, 10, 1)).toBeLessThan(0.01);
    expect(sLow(10, 10, 1)).toBeCloseTo(0.5, 12);
    expect(sHigh(10, 10, 1) + sLow(10, 10, 1)).toBeCloseTo(1, 12);
    expect(phiEffort(0, 40)).toBe(0);
    expect(phiEffort(100, 40)).toBeLessThan(1);
    expect(phiEffort(50, 40)).toBeGreaterThan(phiEffort(25, 40));
    // At 50 points one logit unit is 25 points.
    expect(toLogitDelta(25, 50)).toBeCloseTo(1, 12);
    expect(Number.isFinite(toLogitDelta(5, 0))).toBe(true);
  });
});

describe('PARAMS_V2', () => {
  it('maps every short policy id to the enum value the harness uses', () => {
    PIDS.forEach((pid) => expect(PID[pid]).toBe(POLICY_BY_CODE[pid]));
    expect(new Set(Object.values(PID)).size).toBe(Object.values(Policy).length);
  });

  it('uses the pact ids of the code', () => {
    Object.keys(PARAMS_V2.pacts).forEach((id) => expect(id in INITIAL_PACTS, id).toBe(true));
  });

  it('has an entry per policy in every per-policy table', () => {
    [PARAMS_V2.rampYears, PARAMS_V2.fatigueYears, PARAMS_V2.costShare, PARAMS_V2.qB, PARAMS_V2.bE].forEach((table) => {
      expect(Object.keys(table).sort()).toEqual([...PIDS].sort());
    });
  });

  it('adds the 2.0 scalars to CONTROL_PARAMS', () => {
    expect(CONTROL_PARAMS.Poblacion_Inicial).toBe(400_000);
    expect(CONTROL_PARAMS.Gasto_Publico_Base_Nivel_1).toBe(0.13);
    expect(CONTROL_PARAMS.Velocidad_Ajuste_Biodiversidad).toBe(0.12);
  });
});

describe('advance', () => {
  const state = () => withActivePolicies(freshState(2), BALANCED);

  it('does not mutate its input (annual and monthly)', () => {
    const s = state();
    const before = JSON.stringify(s);
    advance(s, 1, makeRng(7, 2025), CONTROL_PARAMS);
    advance(s, MONTHLY_DT, makeRng(7, 0), CONTROL_PARAMS, { month: 3 });
    expect(JSON.stringify(s)).toBe(before);
  });

  /**
   * Reference trajectories: N2 and N3 with `balanced` + the biodiversity treaty, events (makeRng), a loan
   * in year 2 and, on N3, 4 pp of extra tax; and 40 months of N2 with a loan in month 6.
   * Phase 35 pinned these to the model-1.1 bodies of stepYear/stepMonth at caa9275 (bit-identical port).
   * Phase 36 changes the policy equations on purpose (ramp, fatigue with floor, channels, cost by effort;
   * docs/audit-equations.md), so the numbers were regenerated with `advance` at phase 36: this is now a
   * regression pin of the 2.0-dev engine. Each later phase that changes an equation regenerates it and says
   * so in docs/DESIGN_DECISIONS_LOG.md. Phase 37 regenerated them (land matrix 2.0: the 1.1 CC→CA flow is
   * replaced by the agricultural pool, so CC keeps more area and the 1.1 carbon balance reads more CO2).
   * Phase 38 regenerated them: carbon in physical units (CO2 ~5 t instead of ~14 t per person, so the score
   * and the CO2-driven pressures change; F and E move through the pressures) and exact population growth.
   * Phase 39 regenerated them: E, conflict and collapse relax toward anchored logistic targets (W and St no
   * longer sink under the 45-point thresholds; E follows growth and land value; the tax enters on every level;
   * the interest burden of N3's debt weighs through the fiscal stress φ),
   * and F / the agricultural pressure move with the new E; event chances that read E or St change N3's GDP.
   * B, debt and CC are unchanged.
   * Phase 40 regenerated them: B relaxes toward its species-area target (the balanced portfolio with the treaty
   * reaches B ≈ 57 in 12 years instead of ≈ 43 under the 1.1 weights); E (ecosystem services), W, St, the
   * agricultural pressure, F (through E) and the score follow B. Debt, GDP, CO2 and CC are unchanged.
   * Phase 41 regenerated them: F relaxes toward its supply/demand target (balanced exports part of a shrinking
   * farm area: F falls instead of drifting with the 1.1 weights); E, W, St, the pressures and the score follow F.
   * Debt, GDP, CO2, B and CC are unchanged.
   * Phase 42 regenerated them: the three pressures relax toward anchored logistic targets instead of the 1.1
   * impulse/dissipation (the balanced portfolio no longer pins π_e and π_s at 0: N2 ends at 15 / 3 / 6 instead of
   * 8 / 0 / 0), so W (through π_e) and St (polarisation and mean pressure) and the score follow. B, F, E, debt,
   * GDP, CO2 and CC are unchanged.
   * Phase 43 regenerated them: pacts are data and cost a fraction of GDP; the treaty's yearly fee falls from 30 to
   * 0.002·GDP (≈ 20–29), so only the treasury reserves change (everything else is identical: the treaty's shifts and
   * land factors were already PARAMS_V2 values).
   * Phase 44 regenerated them: public finance 2.0 (base spending γ_N·Y', policy cost at κ instead of the 1.1 bridge,
   * automatic debt below the reserve floor, fiscal stress in g). The balanced portfolio with the treaty no longer drives
   * the reserves to −4354 (N2) / −3574 (N3): they stay on the floor (287 = 0.02·Y) and the deficit becomes debt (N2 139 →
   * 971; N3 1586 → 1649); GDP grows a little less (fiscal stress), and E, W, St, F, the pressures and the score follow
   * by < 0.2 points. B, CC and the monthly debt (no deficit there) are unchanged.
   */
  it('reproduces the phase-44 reference trajectories (annual and monthly)', () => {
    type Ref = [Record<string, number>, number, number];
    const REF: Record<string, Ref> = {"annual2":[{"biodiversity":56.782650702129544,"foodSecurity":30.993687925488246,"economicSecurity":44.22595443348783,"socialWellbeing":76.50952991679588,"co2EqEmissionsPerCapita":4.780762158681803,"politicalStability":89.12909276843361,"generalScore":691.9451732348371,"pbi":14351.02572562926,"treasuryReserves":287.02051451258524,"debt":971.0697258446528,"ppAgricola":14.99940363543518,"ppAmbientalista":3.1713936608639544,"ppSocial":6.129618124374581,"cumplimientoNivel1":0,"cumplimientoNivel2":0,"cumplimientoNivel3":0},971.0697258446528,141.4522622638243],"annual3":[{"biodiversity":56.713818266670835,"foodSecurity":32.88769405681349,"economicSecurity":41.576855292178124,"socialWellbeing":73.46500446473723,"co2EqEmissionsPerCapita":3.8928855498125263,"politicalStability":84.75894493930222,"generalScore":689.631198403724,"pbi":17277.257832951218,"treasuryReserves":1081.4159781362496,"debt":1649.1342946645157,"ppAgricola":18.707206655300773,"ppAmbientalista":2.1230850388971,"ppSocial":10.93814261532613,"cumplimientoNivel1":0,"cumplimientoNivel2":0,"cumplimientoNivel3":0},1649.1342946645157,95.36683584161274],"monthly":[{"biodiversity":45.351135608783686,"foodSecurity":32.945450141911756,"economicSecurity":41.01430222728577,"socialWellbeing":66.13669009833336,"co2EqEmissionsPerCapita":5.823223432968098,"politicalStability":74.92727981652507,"generalScore":621.9182099344412,"pbi":10961.671908143933,"treasuryReserves":745.4930026705119,"debt":213.1659681816877,"ppAgricola":12.195296555514856,"ppAmbientalista":13.058596127931045,"ppSocial":11.946633911035882,"cumplimientoNivel1":0,"cumplimientoNivel2":0,"cumplimientoNivel3":0},213.1659681816877,149.5913851147525]};
    const fresh = (level: number) => {
      const s = withActivePolicies(freshState(level), BALANCED);
      s.pacts.biodiversityTreaty.isActive = true;
      return s;
    };
    const check = (s: ReturnType<typeof fresh>, ref: Ref) => {
      Object.entries(ref[0]).forEach(([k, v]) => expect((s.indicators as unknown as Record<string, number>)[k], k).toBeCloseTo(v, 9));
      expect(s.stellaSpecificState.Deuda).toBeCloseTo(ref[1], 9);
      expect(s.landUses.CC.area).toBeCloseTo(ref[2], 9);
    };
    [2, 3].forEach((level) => {
      let s = fresh(level);
      s.additionalTaxPressurePercentage = level === 3 ? 4 : 0;
      for (let y = 0; y < 12; y++) {
        if (y === 1) s.loanRequestedThisRound = 500;
        s = advance(s, 1, makeRng(11, s.year + 1), CONTROL_PARAMS).next;
      }
      check(s, REF[`annual${level}`]);
    });
    let m = fresh(2);
    let month = 0;
    for (let i = 0; i < 40; i++) {
      if (i === 5) m.loanRequestedThisRound = 300;
      const r = advance(m, MONTHLY_DT, makeRng(5, i), CONTROL_PARAMS, { month });
      m = r.next;
      month = r.month;
    }
    check(m, REF.monthly);
  });

  it('dt = 1 is stepYear and dt = 1/12 is stepMonth, step for step', () => {
    let a = state();
    let m = state();
    let month = 0;
    for (let i = 0; i < 24; i++) {
      const rng = makeRng(3, i);
      expect(JSON.stringify(advance(a, 1, rng, CONTROL_PARAMS).next)).toBe(JSON.stringify(stepYear(a, makeRng(3, i)).next));
      a = stepYear(a, makeRng(3, i)).next;
      const r = advance(m, MONTHLY_DT, makeRng(3, i), CONTROL_PARAMS, { month });
      const s = stepMonth(m, month, makeRng(3, i));
      expect(JSON.stringify(r.next)).toBe(JSON.stringify(s.next));
      expect(r.month).toBe(s.month);
      m = s.next;
      month = s.month;
    }
  });

  it('keeps the calendar of each game', () => {
    const s = state();
    const y = advance(s, 1, null, CONTROL_PARAMS);
    expect(y.next.year).toBe(s.year + 1);
    expect(y.yearRolled).toBe(true);
    const nov = advance(s, MONTHLY_DT, null, CONTROL_PARAMS, { month: 10 });
    expect(nov.next.year).toBe(s.year);
    expect(nov.month).toBe(11);
    const dec = advance(s, MONTHLY_DT, null, CONTROL_PARAMS, { month: 11 });
    expect(dec.next.year).toBe(s.year + 1);
    expect(dec.month).toBe(0);
    expect(dec.yearRolled).toBe(true);
  });

  it('advances the 2.0 clock by dt and runs without events when rng is null', () => {
    const s = state();
    expect(advance(s, 1, null, CONTROL_PARAMS).next.model?.t).toBe(1);
    expect(advance(s, MONTHLY_DT, null, CONTROL_PARAMS).next.model?.t).toBeCloseTo(1 / 12, 12);
    expect(JSON.stringify(advance(s, 1, null, CONTROL_PARAMS).next)).toBe(JSON.stringify(stepYear(s, noEvents).next));
  });

  it('rejects a step outside (0, 1]', () => {
    expect(() => advance(state(), 0, null, CONTROL_PARAMS)).toThrow(RangeError);
    expect(() => advance(state(), 2, null, CONTROL_PARAMS)).toThrow(RangeError);
  });
});

/**
 * Reference values: `new_state(level)["anchor"]` and `["emis"]` of scripts/reference/modelo_v2.py
 * (`python -c "import modelo_v2 as m; print(m.new_state(1)['anchor'])"`), same areas and indicators.
 */
const PROTOTYPE: Record<number, { habitat0: number; productiveValue0: number; concentration0: number; productiveShare0: number; shareCC0: number; sharePF0: number; forestShare0: number; foodPerCapita0: number; c0: number; energy: number; afolu: number; luc: number }> = {
  1: { habitat0: 0.3, productiveValue0: 0.66, concentration0: 0.5, productiveShare0: 0.6, shareCC0: 0.2, sharePF0: 0.2, forestShare0: 0.2, foodPerCapita0: 0.00034125, c0: 5.946666667, energy: 1_600_000, afolu: 280_000, luc: 498_666.6666666666 },
  2: { habitat0: 0.263333333, productiveValue0: 0.683333333, concentration0: 0.54, productiveShare0: 0.633333333, shareCC0: 0.25, sharePF0: 0.2, forestShare0: 0.166666667, foodPerCapita0: 0.00041825, c0: 7.134916667, energy: 2_000_000, afolu: 451_000, luc: 402_966.6666666667 },
  3: { habitat0: 0.288333333, productiveValue0: 0.675, concentration0: 0.5, productiveShare0: 0.583333333, shareCC0: 0.166666667, sharePF0: 0.25, forestShare0: 0.166666667, foodPerCapita0: 0.000363125, c0: 5.732666667, energy: 1_840_000, afolu: 170_000, luc: 283_066.6666666668 },
};

describe('anchors', () => {
  [1, 2, 3].forEach((level) => {
    it(`level ${level}: exist, reproduce the starting indicators and match the prototype`, () => {
      const patch = createInitialState(level).gameStatePatch;
      const model = patch.model!;
      expect(model.version).toBe(MODEL_VERSION);
      expect(model.t).toBe(0);
      const a = model.anchors;
      const st = patch.stellaSpecificState;
      const start: Record<ModelIndicatorKey, number> = {
        B: patch.indicators.biodiversity, F: patch.indicators.foodSecurity, E: patch.indicators.economicSecurity,
        C: st.Conflicto_social, Pc: st.Colapso_politico, pa: st.PP_AGRICOLA, pe: st.PP_AMBIENTALISTA, ps: st.PP_SOCIAL,
      };
      (Object.keys(start) as ModelIndicatorKey[]).forEach((k) => {
        expect(Number.isFinite(a.l[k]), k).toBe(true);
        expect(100 * sigmoid(a.l[k]), k).toBeCloseTo(start[k], 9);
      });
      expect(a.W0).toBe(patch.indicators.socialWellbeing);
      expect(a.gdp0).toBe(st.PBI_Real);

      const p = PROTOTYPE[level];
      (['habitat0', 'productiveValue0', 'concentration0', 'productiveShare0', 'shareCC0', 'sharePF0', 'forestShare0', 'c0'] as const)
        .forEach((k) => expect(a[k], k).toBeCloseTo(p[k], 8));
      expect(a.foodPerCapita0).toBeCloseTo(p.foodPerCapita0, 12);
      expect(model.emissions.energy).toBeCloseTo(p.energy, 4);
      expect(model.emissions.afolu).toBeCloseTo(p.afolu, 4);
      expect(model.emissions.luc).toBeCloseTo(p.luc, 4);
      expect(a.emissions0).toBeCloseTo(a.c0 * CONTROL_PARAMS.Poblacion_Inicial, 4);
    });
  });

  it('level 1 starts with political collapse 5, like the prototype (phase 35 §8)', () => {
    const patch = createInitialState(1).gameStatePatch;
    expect(patch.stellaSpecificState.Colapso_politico).toBe(5);
    expect(patch.indicators.politicalStability).toBe(95);
  });

  it('the dry run of the land matrix conserves area and never sends a use below zero', () => {
    const landUses = createInitialState(2).gameStatePatch.landUses;
    const A = areasByCode(landUses);
    const out: Record<string, number> = {};
    const inn: Record<string, number> = {};
    dryRunLandFlows(landUses, CONTROL_PARAMS).forEach(({ from: i, to: j, ha }) => {
      expect(ha).toBeGreaterThanOrEqual(0);
      out[i] = (out[i] ?? 0) + ha / 1000;
      inn[j] = (inn[j] ?? 0) + ha / 1000;
    });
    Object.entries(out).forEach(([i, kHa]) => expect(kHa).toBeLessThanOrEqual(A[i as keyof typeof A] + 1e-9));
    const moved = Object.values(out).reduce((s, x) => s + x, 0);
    expect(Object.values(inn).reduce((s, x) => s + x, 0)).toBeCloseTo(moved, 9);
  });

  // Phase 41: ρ0 is per inhabitant of the state being anchored (prototype s["pop"]); since phase 38 a level starts with
  // Poblacion_Total = CP.Poblacion_Inicial, so doubling the initial population halves ρ0.
  it('anchors food per capita on the starting population (CP.Poblacion_Inicial)', () => {
    const CP2 = { ...CONTROL_PARAMS, Poblacion_Inicial: 800_000 };
    const patch = createInitialState(1).gameStatePatch;
    const twice = createInitialState(1, CP2).gameStatePatch;
    expect(twice.stellaSpecificState.Poblacion_Total).toBe(800_000);
    expect(computeAnchors(twice, CP2).foodPerCapita0).toBeCloseTo(patch.model!.anchors.foodPerCapita0 / 2, 12);
  });
});
