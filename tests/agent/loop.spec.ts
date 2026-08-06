import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionContext, GameHandlers } from '../../src/game/uiActionRegistry';
import { freshState } from '../sim/testHelpers';
import type { DnApi } from '../../src/components/decarbonito/DecarboNitoProvider';

// decarbonitoAgent.ts reads process.env.API_KEY (and instantiates GoogleGenAI) at module load
// time, so both the env var and the @google/genai mock must be in place *before* it's imported —
// hence the dynamic import in beforeAll below instead of a static top-level import.
const generateContent = vi.hoisted(() => vi.fn());

vi.mock('@google/genai', () => ({
  // Must be a real `function`, not an arrow function — vitest's mock needs something callable
  // with `new` to stand in for the GoogleGenAI class constructor.
  GoogleGenAI: vi.fn(function GoogleGenAI() { return { models: { generateContent } }; }),
  FunctionCallingConfigMode: { AUTO: 'AUTO' },
}));

process.env.API_KEY = 'test-key-for-vitest';

let agentTurn: typeof import('../../src/services/decarbonitoAgent')['agentTurn'];
let executeCall: typeof import('../../src/services/decarbonitoAgent')['executeCall'];

beforeAll(async () => {
  const mod = await import('../../src/services/decarbonitoAgent');
  agentTurn = mod.agentTurn;
  executeCall = mod.executeCall;
});

// `generateContent` is a module-level mock shared across every test in this file — without
// resetting it, one test's queued mockResolvedValueOnce()s and accumulated `.mock.calls` bleed
// into the next.
beforeEach(() => { generateContent.mockReset(); });

function fakeDn(overrides: Partial<DnApi> = {}): DnApi {
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
    ...overrides,
  };
}

function fakeHandlers(overrides: Partial<GameHandlers> = {}): GameHandlers {
  return {
    togglePolicy: vi.fn(),
    handleInstrumentEffortChange: vi.fn(),
    togglePact: vi.fn(),
    handleAdditionalTaxPressureChange: vi.fn(),
    requestLoan: vi.fn(),
    runSimulationRound: vi.fn(async () => {}),
    ...overrides,
  };
}

function ctxFor(dn = fakeDn(), handlers = fakeHandlers()): ActionContext {
  return { state: freshState(1), locale: 'es', handlers, dn, sessionId: null };
}

describe('agentTurn (mocked model)', () => {
  it('stops after MAX_STEPS and returns a graceful message instead of looping forever', async () => {
    // Every call returns a function call for a harmless read action — the model "never" converges.
    generateContent.mockResolvedValue({
      candidates: [{ content: { parts: [{ text: '' }] } }],
      functionCalls: [{ id: '1', name: 'list_policies', args: {} }],
      text: '',
    });

    const result = await agentTurn('activá todo lo posible', ctxFor(), 'assist', []);
    expect(result.text.length).toBeGreaterThan(0); // the tooManySteps message, not empty
    expect(generateContent).toHaveBeenCalledTimes(5); // MAX_STEPS
  });

  it('feeds validation errors back as a functionResponse instead of throwing', async () => {
    generateContent
      .mockResolvedValueOnce({
        candidates: [{ content: { parts: [{ text: '' }] } }],
        functionCalls: [{ id: '1', name: 'activate_policy', args: { policyId: 'not-a-real-policy' } }],
        text: '',
      })
      .mockResolvedValueOnce({
        candidates: [{ content: { parts: [{ text: 'listo' }] } }],
        functionCalls: [],
        text: 'listo',
      });

    const result = await agentTurn('activá una política inventada', ctxFor(), 'assist', []);
    expect(result.text).toBe('listo');
    // The final history must contain the validation error as a functionResponse part, not a
    // thrown exception — searched by content rather than by array index, since `history` is a
    // single mutable array and generateContent.mock.calls[n][0].contents holds a *reference* to
    // it, not a snapshot (it reflects the array's state after the whole call completes).
    const responseEntry = result.history.find((h) => h.parts?.some((p: any) => 'functionResponse' in p));
    expect(responseEntry).toBeDefined();
    const fr = (responseEntry!.parts!.find((p: any) => 'functionResponse' in p) as any).functionResponse;
    expect(fr.response.error).toBeTruthy();
  });
});

describe('executeCall (direct, no model)', () => {
  it('never calls simulate_year without confirmation, even in tutorial mode', async () => {
    const handlers = fakeHandlers();
    const confirm = vi.fn(async () => true);
    const dn = fakeDn({ confirm });
    const ctx = ctxFor(dn, handlers);

    await executeCall({ id: '1', name: 'simulate_year', args: {} }, ctx, 'tutorial');

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(handlers.runSimulationRound).toHaveBeenCalledTimes(1);
  });

  it('does not execute simulate_year if the player cancels the confirmation', async () => {
    const handlers = fakeHandlers();
    const dn = fakeDn({ confirm: vi.fn(async () => false) });
    const ctx = ctxFor(dn, handlers);

    const result = await executeCall({ id: '1', name: 'simulate_year', args: {} }, ctx, 'assist');

    expect(handlers.runSimulationRound).not.toHaveBeenCalled();
    expect((result.data as { cancelledByUser?: boolean }).cancelledByUser).toBe(true);
  });

  it('read actions never prompt for confirmation', async () => {
    const confirm = vi.fn(async () => true);
    const ctx = ctxFor(fakeDn({ confirm }));

    await executeCall({ id: '1', name: 'list_policies', args: {} }, ctx, 'assist');

    expect(confirm).not.toHaveBeenCalled();
  });
});
