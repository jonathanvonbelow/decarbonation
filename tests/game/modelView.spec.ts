/**
 * Phase 50: what the interfaces read of the 2.0 sub-state (src/game/modelView.ts).
 */
import { describe, expect, it } from 'vitest';
import { stepYear } from '../../src/sim';
import { Policy } from '../../src/types';
import {
  carbonView, emissionsTargets, fiscalView, floorLines, indicatorTarget, instrumentHint, justTransitionLow, policyView, routeIndicators,
  routesContextLines, scoreTarget, socialView,
} from '../../src/game/modelView';
import { freshState, withActivePolicies } from '../sim/testHelpers';
import { tFor, type TranslationKey } from '../../src/i18n';

const noEvents = () => 0.999;

describe('modelView', () => {
  it('reads targets, W and St as complements of the conflict and collapse targets', () => {
    let s = withActivePolicies(freshState(2), [Policy.NaturalConservation, Policy.Agroecological]);
    s = stepYear(s, noEvents).next;
    const m = s.model!;
    expect(indicatorTarget(s, 'biodiversity')).toBeCloseTo(m.targets.B!, 9);
    expect(indicatorTarget(s, 'socialWellbeing')).toBeCloseTo(100 - m.targets.C!, 9);
    expect(indicatorTarget(s, 'politicalStability')).toBeCloseTo(100 - m.targets.Pc!, 9);
    expect(indicatorTarget(s, 'co2EqEmissionsPerCapita')).toBeNull();
  });

  it('splits CO2 per inhabitant by source and adds up to the indicator', () => {
    const s = stepYear(freshState(1), noEvents).next;
    const v = carbonView(s)!;
    expect(v.energy + v.afolu + v.luc).toBeCloseTo(v.perCapita, 6);
    expect(v.budget).not.toBeNull();
  });

  it('reports fiscal space and the distributive indices', () => {
    const s = freshState(3);
    const f = fiscalView(s)!;
    expect(f.noFiscalSpace).toBe(false);
    const broke = { ...s, stellaSpecificState: { ...s.stellaSpecificState, Reservas_del_Tesoro: 0.02 * s.stellaSpecificState.PBI_Real, Deuda: 0.7 * s.stellaSpecificState.PBI_Real } };
    expect(fiscalView(broke)!.noFiscalSpace).toBe(true);
    const after = stepYear(withActivePolicies(s, [Policy.NaturalConservation]), noEvents).next;
    const sv = socialView(after)!;
    expect(sv.justTransition).toBeGreaterThanOrEqual(0);
    expect(sv.justTransition).toBeLessThanOrEqual(1);
  });

  it('tags instruments from INSTRUMENT_CHANNELS (channels >= 0.6, restriction / support)', () => {
    const h = instrumentHint(Policy.NaturalConservation, 'CR_Expansion_Areas_Protegidas')!;
    expect(h.tag).toBe('restriction');
    expect(h.channels[0]).toEqual({ channel: 'land', level: 'high' });
    expect(h.channels.some((c) => c.channel === 'prod')).toBe(false);
    expect(instrumentHint(Policy.Agroecological, 'AS_Subsidios_Bioinsumos')!.tag).toBe('support');
    expect(instrumentHint(Policy.Agroecological, 'nope')).toBeNull();
  });

  it('policy view: off / starting / full and the cost grows with effort', () => {
    const s = withActivePolicies(freshState(2), [Policy.CarbonNeutrality]);
    const p = s.policies[Policy.CarbonNeutrality];
    const Y = s.stellaSpecificState.PBI_Real;
    expect(policyView({ ...p, isActive: false }, Y).phase).toBe('off');
    expect(policyView({ ...p, rampTime: 0 }, Y).phase).toBe('starting');
    expect(policyView({ ...p, rampTime: 20, fatigueTime: 0 }, Y).phase).toBe('full');
    expect(policyView({ ...p, rampTime: 20, fatigueTime: 100 }, Y).phase).toBe('worn');
    // Full effort (100): no marginal room.
    expect(policyView(p, Y).marginalCost10).toBe(0);
  });

  it('stars, floor lines and score target come from LEVEL_ROUTES', () => {
    expect([...routeIndicators(1)]).toEqual(expect.arrayContaining(['biodiversity', 'economicSecurity', 'co2EqEmissionsPerCapita']));
    expect(routeIndicators(1).has('foodSecurity')).toBe(true); // the production route of level 1 asks for F
    expect(floorLines(2).map((f) => f.indicator)).toEqual(expect.arrayContaining(['biodiversity', 'foodSecurity', 'politicalStability', 'ppSocial']));
    expect(scoreTarget(3)).toBe(720);
    expect(scoreTarget(1)).toBeUndefined();
  });

  it('stepYear lists every event of the year for the level-3 panel', () => {
    const s = stepYear(freshState(3), () => 0).next; // rng 0: every eligible event fires
    expect(s.eventsThisYear!.length).toBeGreaterThan(1);
    expect(s.currentEvent?.id).toBe(s.eventsThisYear![s.eventsThisYear!.length - 1]);
  });

  it('route lines for the prompts are translated and carry values; emissions caps and the J predicate', () => {
    const lines = routesContextLines(freshState(2), (k) => tFor('es', k as TranslationKey));
    expect(lines.join(' ')).not.toMatch(/cond\.|routes\./);
    expect(lines.some((l) => l.includes('Vía de la Integridad Ecológica'))).toBe(true);
    expect(emissionsTargets(1)).toEqual([4.6, 5.2, 6.5]);
    expect(justTransitionLow({ concentration: 0.5, concentration0: 0.5, justTransition: 0.2, restrictionLoad: 0.5 })).toBe(true);
    expect(justTransitionLow({ concentration: 0.5, concentration0: 0.5, justTransition: 0.2, restrictionLoad: 0 })).toBe(false);
  });
});
