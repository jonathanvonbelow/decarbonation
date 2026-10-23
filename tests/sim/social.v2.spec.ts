/**
 * Phase 45 — distributive conflict: land concentration G and just transition J
 * (src/sim/v2/social.ts, mejora-general/files/45_conflicto_distributivo.md §5).
 */
import { describe, expect, it } from 'vitest';
import { CONTROL_PARAMS } from '../../src/constants';
import { stepYear } from '../../src/sim';
import { computeEfficiencies, type PolicyEfficiency } from '../../src/sim/v2/policies';
import { PARAMS_V2, type Pid } from '../../src/sim/v2/params';
import { distributiveDrive, justTransition, landConcentration } from '../../src/sim/v2/social';
import { driveC, targetC, type IndicatorState } from '../../src/sim/v2/indicators';
import { LandUseType, Policy, type GameState } from '../../src/types';
import { freshState, withActivePolicies } from './testHelpers';

const CP = CONTROL_PARAMS;

/** State with the given policies active, ramped to full efficiency (rampTime large, no fatigue). */
function ramped(level: number, ids: Policy[]): { s: GameState; eff: Record<Pid, PolicyEfficiency> } {
  const s = withActivePolicies(freshState(level), ids);
  ids.forEach((id) => { s.policies[id].rampTime = 100; s.policies[id].fatigueTime = 0; });
  return { s, eff: computeEfficiencies(s.policies, level, CP) };
}

function setEfforts(s: GameState, id: Policy, efforts: number[]): void {
  Object.keys(s.policies[id].instruments!).forEach((k, i) => { s.policies[id].instruments![k].effortPercentage = efforts[i]; });
}

describe('land concentration G', () => {
  it('is (CC + PF) / (CC + CA + PRG + PF) and starts at the anchor G0', () => {
    [1, 2, 3].forEach((level) => {
      const s = freshState(level);
      const a = (k: LandUseType) => s.landUses[k].area;
      const G = (a(LandUseType.ConventionalCrops) + a(LandUseType.ForestPlantations))
        / (a(LandUseType.ConventionalCrops) + a(LandUseType.AgroecologicalCrops) + a(LandUseType.GrasslandsPastures) + a(LandUseType.ForestPlantations));
      expect(landConcentration(s.landUses)).toBeCloseTo(G, 12);
      expect(s.model!.anchors.concentration0).toBeCloseTo(G, 12);
      expect(s.model!.social).toEqual({ concentration: G, justTransition: 1, restrictionLoad: 0 });
    });
  });

  it('moving 30 kHa from CA to CC raises G and C*, and the G term is ν_G·ΔG on top of the share term', () => {
    const s = freshState(2) as IndicatorState & GameState;
    const g0 = landConcentration(s.landUses);
    const c0 = targetC(s, {});
    const d0 = driveC(s, {});
    s.landUses[LandUseType.AgroecologicalCrops].area -= 30;
    s.landUses[LandUseType.ConventionalCrops].area += 30;
    const g1 = landConcentration(s.landUses);
    expect(g1).toBeGreaterThan(g0);
    expect(targetC(s, {})).toBeGreaterThan(c0);
    const total = (Object.values(s.landUses) as { area: number }[]).reduce((sum, lu) => sum + lu.area, 0);
    const shareTerm = PARAMS_V2.relaxation.C.shareCC * 30 / total;
    expect(driveC(s, {}) - d0).toBeCloseTo(shareTerm + PARAMS_V2.conflictWeights.gini * (g1 - g0), 12);
  });
});

describe('just transition J', () => {
  it('with no policies J = 1, R_load = 0 and the transition term is 0', () => {
    const s = freshState(2);
    const jt = justTransition(s.policies, computeEfficiencies(s.policies, 2, CP));
    expect(jt).toEqual({ restrictionLoad: 0, support: 0, justTransition: 1 });
    expect(distributiveDrive(0.5, 0.5, jt)).toBe(0);
  });

  it('with an even split reproduces the prototype constants: R = η_CR + 0.5·η_CN^tax + 0.3·η_AGUA, S = 0.5·(η_AS + η_GS)', () => {
    const ids = [Policy.NaturalConservation, Policy.CarbonNeutrality, Policy.SustainableWaterManagement, Policy.Agroecological, Policy.SustainableLivestock];
    const { s, eff } = ramped(2, ids);
    const jt = justTransition(s.policies, eff);
    expect(jt.restrictionLoad).toBeCloseTo(eff.CR.eta + 0.5 * eff.CN.tax! + 0.3 * eff.AGUA.eta, 12);
    expect(jt.support).toBeCloseTo(0.5 * (eff.AS.eta + eff.GS.eta), 12);
    expect(jt.justTransition).toBeCloseTo(jt.support / (jt.support + jt.restrictionLoad), 12);
  });

  it('Natural Conservation with all its effort in PSA loads less than with all of it in park rangers, so C* is lower', () => {
    const run = (efforts: number[]) => {
      const { s } = ramped(2, [Policy.NaturalConservation]);
      setEfforts(s, Policy.NaturalConservation, efforts);
      const eff = computeEfficiencies(s.policies, 2, CP);
      return { R: justTransition(s.policies, eff).restrictionLoad, C: targetC(s as IndicatorState & GameState, eff) };
    };
    const psa = run([0, 100, 0, 0]);
    const rangers = run([0, 0, 0, 100]);
    expect(psa.R).toBe(0);
    expect(rangers.R).toBeGreaterThan(0.9);
    expect(psa.C).toBeLessThan(rangers.C);
  });

  it('restricting without support raises C*: the transition term is ν_J·(1 − J)·R_load', () => {
    const { s, eff } = ramped(2, [Policy.NaturalConservation]);
    const jt = justTransition(s.policies, eff);
    expect(jt.justTransition).toBe(0);
    expect(distributiveDrive(0.4, 0.4, jt)).toBeCloseTo(PARAMS_V2.conflictWeights.just * jt.restrictionLoad, 12);
  });

  it('advance writes model.social each step', () => {
    const s = withActivePolicies(freshState(2), [Policy.NaturalConservation, Policy.Agroecological]);
    const n = stepYear(s, () => 0.999).next;
    expect(n.model!.social!.justTransition).toBeGreaterThan(0);
    expect(n.model!.social!.justTransition).toBeLessThan(1);
    expect(n.model!.social!.restrictionLoad).toBeGreaterThan(0);
  });
});
