import { describe, expect, it, vi } from 'vitest';
import { REGISTRY, type ActionContext, type GameHandlers } from '../../src/game/uiActionRegistry';
import { buildTools } from '../../src/services/decarbonitoAgent';
import { freshState, withActivePolicies } from '../sim/testHelpers';
import { Policy } from '../../src/types';
import { MAX_ACTIVE_POLICIES, POLICY_UI_ORDER } from '../../src/constants';
import type { DnApi } from '../../src/components/decarbonito/DecarboNitoProvider';

function fakeDn(): DnApi {
  return {
    say: vi.fn(() => 'id'),
    notify: vi.fn(() => 'id'),
    play: vi.fn(),
    moveTo: vi.fn(async () => {}),
    focusOn: vi.fn(async () => {}),
    release: vi.fn(),
    openConversation: vi.fn(),
    closeConversation: vi.fn(),
    dismiss: vi.fn(),
    setBusy: vi.fn(),
    resetProactiveBudget: vi.fn(),
    setNotifyMode: vi.fn(),
    setHidden: vi.fn(),
    setCorner: vi.fn(),
    confirm: vi.fn(async () => true),
  };
}

function fakeHandlers(): GameHandlers {
  return {
    togglePolicy: vi.fn(),
    handleInstrumentEffortChange: vi.fn(),
    togglePact: vi.fn(),
    handleAdditionalTaxPressureChange: vi.fn(),
    requestLoan: vi.fn(),
    runSimulationRound: vi.fn(async () => {}),
  };
}

function ctxFor(state = freshState(1), handlers = fakeHandlers(), dn = fakeDn()): ActionContext {
  return { state, locale: 'es', handlers, dn, sessionId: null };
}

describe('uiActionRegistry', () => {
  it('every action has a unique name and a zod schema', () => {
    const actions = Object.values(REGISTRY);
    const names = actions.map((a) => a.name);
    expect(new Set(names).size).toBe(names.length);
    actions.forEach((a) => expect(a.schema).toBeDefined());
    // 15 of the source catalog's 16 (start_tutorial_chapter deferred to phase 9; set_level/
    // reset_game excluded on purpose, per docs/DESIGN_DECISIONS_LOG.md phase 8 entry).
    expect(names).toHaveLength(15);
  });

  it('set_level and reset_game are not in the registry (metagame, excluded on purpose)', () => {
    expect(REGISTRY.set_level).toBeUndefined();
    expect(REGISTRY.reset_game).toBeUndefined();
  });

  it('observer mode exposes zero mutate/advance tools', () => {
    const tools = buildTools(ctxFor(), 'observer');
    const names = tools[0].functionDeclarations!.map((d) => d.name);
    expect(names).not.toContain('activate_policy');
    expect(names).not.toContain('deactivate_policy');
    expect(names).not.toContain('simulate_year');
    expect(names).not.toContain('request_loan');
    expect(names).toContain('list_policies');
    expect(names).toContain('highlight_element');
  });

  it('assist mode exposes mutate/advance tools too', () => {
    const tools = buildTools(ctxFor(), 'assist');
    const names = tools[0].functionDeclarations!.map((d) => d.name);
    expect(names).toContain('activate_policy');
    expect(names).toContain('simulate_year');
  });

  it('level-gated actions (L2 instruments, L3 pacts/tax/loan) are hidden below their minLevel', () => {
    const level1Tools = buildTools(ctxFor(freshState(1)), 'assist')[0].functionDeclarations!.map((d) => d.name);
    expect(level1Tools).not.toContain('set_instrument_effort');
    expect(level1Tools).not.toContain('toggle_pact');
    expect(level1Tools).not.toContain('request_loan');

    const level3Tools = buildTools(ctxFor(freshState(3)), 'assist')[0].functionDeclarations!.map((d) => d.name);
    expect(level3Tools).toContain('set_instrument_effort');
    expect(level3Tools).toContain('toggle_pact');
    expect(level3Tools).toContain('request_loan');
  });

  it('activate_policy respects MAX_ACTIVE_POLICIES', () => {
    const active = POLICY_UI_ORDER.slice(0, MAX_ACTIVE_POLICIES);
    const state = withActivePolicies(freshState(1), active);
    const untouched = POLICY_UI_ORDER.find((id) => !active.includes(id))!;
    const msg = REGISTRY.activate_policy.validate!({ policyId: untouched }, ctxFor(state));
    expect(msg).toBeTruthy();
  });

  it('activate_policy validate() passes for a valid, inactive policy under the cap', () => {
    const state = freshState(1);
    const msg = REGISTRY.activate_policy.validate!({ policyId: Policy.Agroecological }, ctxFor(state));
    expect(msg).toBeNull();
  });

  it('activate_policy validate() rejects an unknown policy id', () => {
    const msg = REGISTRY.activate_policy.validate!({ policyId: 'not-a-real-policy' }, ctxFor());
    expect(msg).toBeTruthy();
  });

  it('deactivate_policy validate() rejects while locked-in (POLICY_LOCK_IN_DURATION)', () => {
    let state = withActivePolicies(freshState(1), [Policy.Agroecological]);
    state = { ...state, policies: { ...state.policies, [Policy.Agroecological]: { ...state.policies[Policy.Agroecological], activationYear: state.year } } };
    const msg = REGISTRY.deactivate_policy.validate!({ policyId: Policy.Agroecological }, ctxFor(state));
    expect(msg).toBeTruthy();
  });

  it('set_instrument_effort validate() rejects below level 2 even if the policy is active', () => {
    const state = withActivePolicies(freshState(1), [Policy.Agroecological]);
    const instrumentId = Object.keys(state.policies[Policy.Agroecological].instruments ?? {})[0];
    const msg = REGISTRY.set_instrument_effort.validate!({ policyId: Policy.Agroecological, instrumentId, effort: 50 }, ctxFor(state));
    expect(msg).toBeTruthy();
  });

  it('set_instrument_effort execute() delegates to handleInstrumentEffortChange (the same clamp-to-100 logic the UI uses)', () => {
    const state = withActivePolicies(freshState(2), [Policy.Agroecological]);
    const instrumentId = Object.keys(state.policies[Policy.Agroecological].instruments ?? {})[0];
    const handlers = fakeHandlers();
    const ctx = ctxFor(state, handlers);
    const msg = REGISTRY.set_instrument_effort.validate!({ policyId: Policy.Agroecological, instrumentId, effort: 150 }, ctx);
    // schema itself caps at 100 via z.number().max(100); validate() only checks policy/instrument existence
    expect(msg).toBeNull();
    REGISTRY.set_instrument_effort.execute({ policyId: Policy.Agroecological, instrumentId, effort: 60 }, ctx);
    expect(handlers.handleInstrumentEffortChange).toHaveBeenCalledWith(Policy.Agroecological, instrumentId, 60);
  });

  it('anchorFor returns a non-null anchor for every mutate action that defines one', () => {
    const state = withActivePolicies(freshState(3), [Policy.Agroecological]);
    const ctx = ctxFor(state);
    const mutateActions = Object.values(REGISTRY).filter((a) => a.kind === 'mutate' && a.anchorFor);
    expect(mutateActions.length).toBeGreaterThan(0);
    mutateActions.forEach((a) => {
      const args = a.name === 'activate_policy' || a.name === 'deactivate_policy' || a.name === 'set_instrument_effort' || a.name === 'distribute_effort'
        ? { policyId: Policy.Agroecological, instrumentId: 'x', effort: 50, strategy: 'even' }
        : {};
      const anchor = a.anchorFor!(args, ctx);
      expect(anchor).toBeTruthy();
    });
  });

  it('simulate_year and request_loan always require confirmation, regardless of mode', () => {
    expect(REGISTRY.simulate_year.alwaysConfirm).toBe(true);
    expect(REGISTRY.request_loan.alwaysConfirm).toBe(true);
  });

  it('simulate_year execute() calls runSimulationRound()', async () => {
    const handlers = fakeHandlers();
    const ctx = ctxFor(freshState(1), handlers);
    await REGISTRY.simulate_year.execute({}, ctx);
    expect(handlers.runSimulationRound).toHaveBeenCalledTimes(1);
  });
});
