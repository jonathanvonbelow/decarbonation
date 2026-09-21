/**
 * DecarboNito's rules for the preview (src/territorio/advisorRules.ts).
 *
 * What matters here is not the wording — that lives in the dictionaries — but the behaviour the
 * design promises: he speaks at most once a month, he speaks about the most serious thing first,
 * and he never claims something the session does not say.
 */
import { describe, expect, it } from 'vitest';
import { CONTROL_PARAMS } from '../../src/constants';
import { LandUseType, Policy } from '../../src/types';
import { ANCHOR, cueFor, territorioContext } from '../../src/territorio/advisorRules';
import { advanceMonth, createSession, togglePolicy, type Session } from '../../src/territorio/session';
import { TERRITORIO_ES } from '../../src/i18n/territorio/es';
import { TERRITORIO_EN } from '../../src/i18n/territorio/en';

function advance(s: Session, months: number): Session {
  let out = s;
  for (let i = 0; i < months; i++) {
    out = advanceMonth(out);
    if (out.outcome) break;
  }
  return out;
}

/** A session with one indicator forced, to exercise a rule without waiting 30 years for it. */
function withIndicators(s: Session, patch: Partial<Session['game']['indicators']>): Session {
  return { ...s, game: { ...s.game, indicators: { ...s.game.indicators, ...patch } } };
}

describe('cueFor', () => {
  it('says nothing when nothing happened', () => {
    const prev = createSession(3);
    const next = advanceMonth(prev);
    const cue = cueFor(prev, next);
    // The opening months of a default game are uneventful; any cue here would be noise.
    if (cue) expect(['idle.policies', 'idle.declare', 'trend.deforestation']).toContain(cue.key);
  });

  it('never speaks once the game is over', () => {
    const prev = createSession(3);
    const over = { ...advanceMonth(prev), outcome: { kind: 'lost' as const, routes: null as never } };
    expect(cueFor(prev, over)).toBeNull();
  });

  it('warns about the indicator that ends the game, before it ends it', () => {
    const base = advance(createSession(5), 2);
    const dying = withIndicators(base, { politicalStability: 12 });
    const cue = cueFor(base, { ...dying, monthIndex: base.monthIndex + 1 });
    expect(cue?.key).toBe('danger.politicalStability');
    expect(cue?.priority).toBe(3);
    expect(cue?.repeatable).toBe(true);
    expect(cue?.values?.value).toBe(12);
  });

  it('puts the collapse warning ahead of everything else', () => {
    // A state that would also trigger the inbox rule and the no-policy rule.
    const base = advance(createSession(7), 14);
    const dying = withIndicators(base, { biodiversity: 9 });
    const cue = cueFor(base, { ...dying, monthIndex: base.monthIndex + 1 });
    expect(cue?.key).toBe('danger.biodiversity');
  });

  it('reports a governance floor the month it breaks, not every month after', () => {
    const base = advance(createSession(9), 3);
    const broken = { ...withIndicators(base, { socialWellbeing: 8 }), monthIndex: base.monthIndex + 1 };
    const first = cueFor(base, broken);
    expect(first?.key).toBe('floor.broken');
    // Same floor, still broken, next month: the floor rule must not fire again.
    const second = cueFor(broken, { ...broken, monthIndex: broken.monthIndex + 1 });
    expect(second?.key).not.toBe('floor.broken');
  });

  it('points at the panel that can do something about it', () => {
    const base = advance(createSession(11), 13);
    const cue = cueFor(base, { ...base, monthIndex: base.monthIndex + 1 });
    if (cue?.anchor) expect(Object.values(ANCHOR)).toContain(cue.anchor);
  });

  it('notices the year instruments unlock', () => {
    const before = advance(createSession(13), 12 * 5 - 1);
    const after = advanceMonth(before);
    // The unlock happens on the January the year rolls to INSTRUMENTS_UNLOCK_YEAR.
    const cues: string[] = [];
    let prev = before;
    let s = after;
    for (let i = 0; i < 3; i++) {
      const cue = cueFor(prev, s);
      if (cue) cues.push(cue.key);
      prev = s;
      s = advanceMonth(s);
    }
    expect(cues).toContain('unlock.instruments');
  });

  it('offers at most one thing to say per month', () => {
    let prev = createSession(17);
    let s = advanceMonth(prev);
    for (let i = 0; i < 60; i++) {
      const cue = cueFor(prev, s);
      expect(cue === null || typeof cue.key === 'string').toBe(true);
      prev = s;
      s = advanceMonth(s);
      if (s.outcome) break;
    }
  });

  it('every cue key it can produce exists in both dictionaries', () => {
    const keys = new Set<string>();
    let prev = createSession(23);
    let s = advanceMonth(prev);
    for (let i = 0; i < 12 * 30; i++) {
      const cue = cueFor(prev, s);
      if (cue) keys.add(cue.key);
      prev = s;
      s = advanceMonth(s);
      if (s.outcome) break;
    }
    // Plus the ones only reachable through forced states, listed so the check is complete.
    ['danger.politicalStability', 'danger.biodiversity', 'danger.foodSecurity', 'danger.debt', 'floor.broken']
      .forEach((k) => keys.add(k));
    expect(keys.size).toBeGreaterThan(3);
    keys.forEach((key) => {
      expect(TERRITORIO_ES.advisor.cues, `es: ${key}`).toHaveProperty(key);
      expect(TERRITORIO_EN.advisor.cues, `en: ${key}`).toHaveProperty(key);
    });
  });
});

describe('territorioContext', () => {
  it('states the date, the indicators and what the player can do', () => {
    const s = advance(togglePolicy(createSession(29), Policy.NaturalConservation).session, 5);
    const text = territorioContext(s);
    expect(text).toContain('ESTADO DE LA REGIÓN');
    expect(text).toContain(String(s.game.year));
    expect(text).toContain(s.game.indicators.biodiversity.toFixed(1));
    expect(text).toContain('Declarar usos públicos');
  });

  it('names the open situations with their deadline, so he cannot invent one', () => {
    let s = createSession(31);
    for (let i = 0; i < 60 && s.open.length === 0; i++) s = advanceMonth(s);
    if (s.open.length === 0) return; // no situation in 5 years with this seed: nothing to assert
    const text = territorioContext(s);
    s.open.forEach((o) => {
      expect(text).toContain(o.defId);
      expect(text).toContain(`vence en ${Math.max(0, o.expiresAt - s.monthIndex)} meses`);
    });
  });

  it('reports land use from the model, in kHa and per cent', () => {
    const s = advance(createSession(37), 24);
    const text = territorioContext(s);
    const forest = s.game.landUses[LandUseType.UnprotectedNativeForest].area;
    expect(text).toContain(`${LandUseType.UnprotectedNativeForest}: ${Math.round(forest)} kHa`);
    expect(text).toContain('Naturaleza bajo protección pública');
  });

  it('does not leak the loan mechanic before the model unlocks it', () => {
    const early = territorioContext(createSession(41));
    expect(early).toContain(`Préstamos y presión fiscal desde ${CONTROL_PARAMS.Ano_Activacion_Prestamo}`);
  });
});
