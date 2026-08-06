/**
 * uiActionRegistry — the tool catalog DecarboNito's agent can call (15_decarbonito_agent_actions.md
 * §3). Principle from the source file, kept literally: the agent never touches state directly —
 * every mutate action calls exactly the same handler a human click would (`togglePolicy`,
 * `handleInstrumentEffortChange`, ...), so every validation and side effect that already exists
 * for the UI applies identically here.
 *
 * `set_level` and `reset_game` are excluded on purpose (metagame, per the source file). This pass
 * also excludes `start_tutorial_chapter` — phase 9 (18_tutoriales_v3.md) doesn't exist yet, and
 * exposing a tool that always fails would be worse than not exposing it; add it back when phase 9
 * builds real tutorial chapters. 15 of the source catalog's 16 actions are implemented here.
 */
import { z } from 'zod';
import { Policy, type GameState, type PolicyInstrument, type PolicyState } from '../types';
import { tFor } from '../i18n';
import type { Locale } from '../i18n/types';
import { getPolicyName, getInstrumentName } from '../legacyContent/gameData';
import { ANCHORS, type AnchorId } from '../components/decarbonito/anchors';
import type { DnApi } from '../components/decarbonito/DecarboNitoProvider';
import { MAX_ACTIVE_POLICIES, POLICY_LOCK_IN_DURATION, CONTROL_PARAMS } from '../constants';

export type ActionKind = 'read' | 'navigate' | 'mutate' | 'advance';

/** Same handlers App.tsx passes to the UI — nothing here is agent-specific. */
export interface GameHandlers {
  togglePolicy: (policyId: Policy) => void;
  handleInstrumentEffortChange: (policyId: Policy, instrumentId: string, effort: number) => void;
  togglePact: (pactId: string) => void;
  handleAdditionalTaxPressureChange: (newPressure: number) => void;
  requestLoan: (amount: number) => void;
  runSimulationRound: () => Promise<void>;
}

export interface ActionContext {
  state: GameState;
  locale: Locale;
  handlers: GameHandlers;
  dn: DnApi;
  /** Current Supabase game_sessions id, if any (null in demo mode) — threaded through to
   * agentTelemetry.logAgentAction for provenance (§7). */
  sessionId?: string | null;
}

export interface ActionResult {
  ok: boolean;
  /** Sent back to the model as functionResponse. Keep it factual and compact. */
  data: Record<string, unknown>;
  /** Shown to the player in the bubble. Already translated. */
  message: string;
}

export interface ActionDef<S extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  kind: ActionKind;
  descriptionKey: string;
  schema: S;
  /** True if this action must be confirmed by the player regardless of mode (§1: simulate_year,
   * request_loan always confirm — set_level/resetGame are excluded entirely, not just gated). */
  alwaysConfirm?: boolean;
  minLevel?: number;
  anchorFor?: (args: z.infer<S>, ctx: ActionContext) => AnchorId | null;
  validate?: (args: z.infer<S>, ctx: ActionContext) => string | null;
  preview: (args: z.infer<S>, ctx: ActionContext) => string;
  execute: (args: z.infer<S>, ctx: ActionContext) => Promise<ActionResult> | ActionResult;
}

/* ── Shared helpers ─────────────────────────────────────────────────────────────────────── */

const policyName = (state: GameState, id: string, locale: Locale) =>
  getPolicyName(id, locale) || state.policies[id as Policy]?.name || id;

const countActive = (state: GameState) => Object.values(state.policies).filter((p: PolicyState) => p.isActive).length;

const findPolicy = (state: GameState, id: string): PolicyState | undefined => state.policies[id as Policy];

/* ── 1. list_policies (read) ───────────────────────────────────────────────────────────── */

const listPolicies: ActionDef = {
  name: 'list_policies',
  kind: 'read',
  descriptionKey: 'agent.actions.listPolicies.description',
  schema: z.object({
    onlyActive: z.boolean().optional().describe('If true, return only currently active policies.'),
  }),
  preview: () => '',
  execute: ({ onlyActive }, { state, locale }) => {
    const rows = (Object.values(state.policies) as PolicyState[])
      .filter((p) => !onlyActive || p.isActive)
      .map((p) => ({
        id: p.id,
        name: policyName(state, p.id, locale),
        isActive: p.isActive,
        efficiencyPct: state.currentLevel >= 2 && p.isActive && p.currentEfficiency !== undefined
          ? Math.round(p.currentEfficiency * 100) : undefined,
        instruments: p.instruments ? Object.keys(p.instruments) : undefined,
      }));
    return { ok: true, data: { policies: rows, activeCount: countActive(state), max: MAX_ACTIVE_POLICIES }, message: '' };
  },
};

/* ── 2. explain_indicator (read) ───────────────────────────────────────────────────────── */

const EXPLAINABLE_INDICATORS = [
  'biodiversity', 'co2EqEmissionsPerCapita', 'foodSecurity',
  'economicSecurity', 'socialWellbeing', 'politicalStability',
] as const;

const INDICATOR_ANCHOR: Partial<Record<typeof EXPLAINABLE_INDICATORS[number], AnchorId>> = {
  biodiversity: ANCHORS.indicatorBiodiversity,
  co2EqEmissionsPerCapita: ANCHORS.indicatorEmissions,
  foodSecurity: ANCHORS.indicatorFoodSecurity,
  economicSecurity: ANCHORS.indicatorEconomicSecurity,
  socialWellbeing: ANCHORS.indicatorSocialWellbeing,
  politicalStability: ANCHORS.indicatorPoliticalStability,
};

const explainIndicator: ActionDef = {
  name: 'explain_indicator',
  kind: 'read',
  descriptionKey: 'agent.actions.explainIndicator.description',
  schema: z.object({ indicator: z.enum(EXPLAINABLE_INDICATORS) }),
  anchorFor: ({ indicator }) => INDICATOR_ANCHOR[indicator] ?? null,
  validate: ({ indicator }, { locale }) =>
    EXPLAINABLE_INDICATORS.includes(indicator) ? null : tFor(locale, 'agent.errors.unknownIndicator', { id: indicator }),
  preview: () => '',
  execute: ({ indicator }, { state, locale }) => {
    const value = state.indicators[indicator];
    const explanation = tFor(locale, `agent.indicatorExplain.${indicator}` as any);
    return { ok: true, data: { indicator, value }, message: `${explanation} (${value.toFixed(1)})` };
  },
};

/* ── 3. read_state (read) ──────────────────────────────────────────────────────────────── */

const readState: ActionDef = {
  name: 'read_state',
  kind: 'read',
  descriptionKey: 'agent.actions.readState.description',
  schema: z.object({ fields: z.array(z.string()).optional() }),
  preview: () => '',
  execute: (_args, { state }) => {
    const data: Record<string, unknown> = {
      year: state.year,
      level: state.currentLevel,
      targetYear: state.activeLevelConfig?.targetYear,
      generalScore: state.indicators.generalScore,
      biodiversity: state.indicators.biodiversity,
      co2EqEmissionsPerCapita: state.indicators.co2EqEmissionsPerCapita,
      activePolicyCount: countActive(state),
    };
    if (state.currentLevel >= 2) {
      Object.assign(data, {
        foodSecurity: state.indicators.foodSecurity,
        economicSecurity: state.indicators.economicSecurity,
        socialWellbeing: state.indicators.socialWellbeing,
        politicalStability: state.indicators.politicalStability,
      });
    }
    if (state.currentLevel >= 3) {
      Object.assign(data, {
        pbi: state.stellaSpecificState.PBI_Real,
        debt: state.stellaSpecificState.Deuda,
        treasuryReserves: state.stellaSpecificState.Reservas_del_Tesoro,
      });
    }
    return { ok: true, data, message: '' };
  },
};

/* ── 4. diagnose_trajectory (read) ─────────────────────────────────────────────────────── */
//
// Deliberately NOT a 3-year forward projection, despite the source spec's "→ proyección a 3 años"
// (§3.2 row 4) — that would mean hypothetically re-running stepYear() with an assumed strategy,
// which the model doesn't actually have (the player hasn't committed to one). Doing that honestly
// would need its own dedicated design (which strategy do you project?), not a quick addition here.
// Documented in docs/DESIGN_DECISIONS_LOG.md. What IS implemented: a real read of the *current*
// state against the same risk thresholds Dashboard.tsx already uses (getIndicatorColor's 40/65
// split), so the diagnosis is honest about being present-tense.

const RISK_THRESHOLDS: Partial<Record<typeof EXPLAINABLE_INDICATORS[number], { low: number; mid: number; inverse?: boolean }>> = {
  biodiversity: { low: 40, mid: 65 },
  foodSecurity: { low: 40, mid: 65 },
  economicSecurity: { low: 40, mid: 65 },
  socialWellbeing: { low: 40, mid: 65 },
  politicalStability: { low: 40, mid: 65 },
  co2EqEmissionsPerCapita: { low: 4, mid: 8, inverse: true },
};

const diagnoseTrajectory: ActionDef = {
  name: 'diagnose_trajectory',
  kind: 'read',
  descriptionKey: 'agent.actions.diagnoseTrajectory.description',
  schema: z.object({}),
  preview: () => '',
  execute: (_args, { state, locale }) => {
    const flags: { indicator: string; level: 'high' | 'medium'; value: number }[] = [];
    for (const key of EXPLAINABLE_INDICATORS) {
      if (state.currentLevel < 2 && key !== 'biodiversity' && key !== 'co2EqEmissionsPerCapita') continue;
      const thr = RISK_THRESHOLDS[key];
      if (!thr) continue;
      const v = state.indicators[key];
      const bad = thr.inverse ? v > thr.mid : v < thr.low;
      const caution = thr.inverse ? v > thr.low && v <= thr.mid : v >= thr.low && v < thr.mid;
      if (bad) flags.push({ indicator: key, level: 'high', value: v });
      else if (caution) flags.push({ indicator: key, level: 'medium', value: v });
    }
    const lines = flags.map((f) =>
      tFor(locale, f.level === 'high' ? 'agent.diagnose.riskHigh' : 'agent.diagnose.riskMedium', {
        indicator: tFor(locale, `cond.${f.indicator === 'co2EqEmissionsPerCapita' ? 'emissions' : f.indicator}` as any),
        value: f.value.toFixed(1),
      }));
    const message = `${tFor(locale, 'agent.diagnose.intro')}\n${lines.length ? lines.join('\n') : tFor(locale, 'agent.diagnose.allOk')}`;
    return { ok: true, data: { flags }, message };
  },
};

/* ── 5. highlight_element (navigate) ───────────────────────────────────────────────────── */

const highlightElement: ActionDef = {
  name: 'highlight_element',
  kind: 'navigate',
  descriptionKey: 'agent.actions.highlightElement.description',
  schema: z.object({ anchorId: z.string(), note: z.string().optional() }),
  anchorFor: ({ anchorId }) => anchorId,
  preview: () => '',
  execute: async ({ anchorId, note }, { dn }) => {
    // focusOn already degrades gracefully (facepalm) if the anchor isn't mounted — §4.3/§6.
    await dn.focusOn(anchorId, { text: note });
    return { ok: true, data: { anchorId }, message: '' };
  },
};

/* ── 6. open_panel / 7. show_chart (navigate) ──────────────────────────────────────────── */
//
// This app has no collapsible panels yet (everything on the board is always visible — see
// docs/DESIGN_DECISIONS_LOG.md phase 7 entry on WinRoutesPanel staying outside Dashboard's grid),
// so "opening" a panel here means "travel to it and point", same mechanism as highlight_element,
// just addressed by a friendlier enum instead of a raw anchor id.

const PANEL_ANCHOR: Record<string, AnchorId> = {
  policies: ANCHORS.policyList,
  indicators: ANCHORS.indicatorBiodiversity,
  landUse: ANCHORS.landUseChart,
  history: ANCHORS.historyChart,
  winRoutes: ANCHORS.winRoutesPanel,
  instruments: ANCHORS.instrumentPanel,
};

const openPanel: ActionDef = {
  name: 'open_panel',
  kind: 'navigate',
  descriptionKey: 'agent.actions.openPanel.description',
  schema: z.object({ panel: z.enum(['policies', 'indicators', 'landUse', 'history', 'winRoutes', 'instruments']) }),
  anchorFor: ({ panel }) => PANEL_ANCHOR[panel] ?? null,
  preview: () => '',
  execute: async ({ panel }, { dn }) => {
    await dn.focusOn(PANEL_ANCHOR[panel]);
    return { ok: true, data: { panel }, message: '' };
  },
};

const showChart: ActionDef = {
  name: 'show_chart',
  kind: 'navigate',
  descriptionKey: 'agent.actions.showChart.description',
  schema: z.object({ series: z.enum(['landUse', 'history']) }),
  anchorFor: ({ series }) => (series === 'landUse' ? ANCHORS.landUseChart : ANCHORS.historyChart),
  preview: () => '',
  execute: async ({ series }, { dn }) => {
    await dn.focusOn(series === 'landUse' ? ANCHORS.landUseChart : ANCHORS.historyChart);
    return { ok: true, data: { series }, message: '' };
  },
};

/* ── 8/9. activate_policy / deactivate_policy (mutate) ─────────────────────────────────── */

const activatePolicy: ActionDef = {
  name: 'activate_policy',
  kind: 'mutate',
  descriptionKey: 'agent.actions.activatePolicy.description',
  schema: z.object({ policyId: z.string().describe('Exact policy id, as returned by list_policies') }),
  anchorFor: ({ policyId }) => ANCHORS.policyRow(policyId),
  validate: ({ policyId }, { state, locale }) => {
    const policy = findPolicy(state, policyId);
    if (!policy) return tFor(locale, 'agent.errors.unknownPolicy', { id: policyId });
    if (policy.isActive) return tFor(locale, 'agent.errors.alreadyActive', { name: policyName(state, policyId, locale) });
    if (countActive(state) >= MAX_ACTIVE_POLICIES) return tFor(locale, 'agent.errors.policyLimit', { max: MAX_ACTIVE_POLICIES });
    return null;
  },
  preview: ({ policyId }, { state, locale }) => tFor(locale, 'agent.preview.activatePolicy', { name: policyName(state, policyId, locale) }),
  execute: ({ policyId }, { handlers, state, locale }) => {
    handlers.togglePolicy(policyId as Policy);
    return { ok: true, data: { policyId, activeCount: countActive(state) + 1 }, message: tFor(locale, 'agent.done.activatePolicy', { name: policyName(state, policyId, locale) }) };
  },
};

const deactivatePolicy: ActionDef = {
  name: 'deactivate_policy',
  kind: 'mutate',
  descriptionKey: 'agent.actions.deactivatePolicy.description',
  schema: z.object({ policyId: z.string().describe('Exact policy id, as returned by list_policies') }),
  anchorFor: ({ policyId }) => ANCHORS.policyRow(policyId),
  validate: ({ policyId }, { state, locale }) => {
    const policy = findPolicy(state, policyId);
    if (!policy) return tFor(locale, 'agent.errors.unknownPolicy', { id: policyId });
    if (!policy.isActive) return tFor(locale, 'agent.errors.notActive', { name: policyName(state, policyId, locale) });
    if (policy.activationYear !== undefined && state.year < policy.activationYear + POLICY_LOCK_IN_DURATION) {
      return tFor(locale, 'agent.errors.lockedForDeactivation', {
        name: policyName(state, policyId, locale), year: policy.activationYear + POLICY_LOCK_IN_DURATION,
      });
    }
    return null;
  },
  preview: ({ policyId }, { state, locale }) => tFor(locale, 'agent.preview.deactivatePolicy', { name: policyName(state, policyId, locale) }),
  execute: ({ policyId }, { handlers, state, locale }) => {
    handlers.togglePolicy(policyId as Policy);
    return { ok: true, data: { policyId }, message: tFor(locale, 'agent.done.deactivatePolicy', { name: policyName(state, policyId, locale) }) };
  },
};

/* ── 10. set_instrument_effort (mutate, L2+) ───────────────────────────────────────────── */

const setInstrumentEffort: ActionDef = {
  name: 'set_instrument_effort',
  kind: 'mutate',
  descriptionKey: 'agent.actions.setInstrumentEffort.description',
  minLevel: 2,
  schema: z.object({
    policyId: z.string(),
    instrumentId: z.string(),
    effort: z.number().min(0).max(100),
  }),
  // instrumentSlider anchors aren't instrumented yet (phase 7 log entry) — point at the policy
  // row instead, the closest real anchor.
  anchorFor: ({ policyId }) => ANCHORS.policyRow(policyId),
  validate: ({ policyId, instrumentId }, { state, locale }) => {
    if (state.currentLevel < 2) return tFor(locale, 'agent.errors.instrumentsNotAvailable');
    const policy = findPolicy(state, policyId);
    if (!policy) return tFor(locale, 'agent.errors.unknownPolicy', { id: policyId });
    if (!policy.isActive) return tFor(locale, 'agent.errors.policyNotActive', { name: policyName(state, policyId, locale) });
    if (!policy.instruments?.[instrumentId]) return tFor(locale, 'agent.errors.unknownInstrument', { id: instrumentId, policy: policyName(state, policyId, locale) });
    return null;
  },
  preview: ({ policyId, instrumentId, effort }, { state, locale }) => tFor(locale, 'agent.preview.setInstrumentEffort', {
    instrument: getInstrumentName(instrumentId, locale), policy: policyName(state, policyId, locale), effort,
  }),
  execute: ({ policyId, instrumentId, effort }, { handlers, state, locale }) => {
    handlers.handleInstrumentEffortChange(policyId as Policy, instrumentId, effort);
    return {
      ok: true, data: { policyId, instrumentId, effort },
      message: tFor(locale, 'agent.done.setInstrumentEffort', { instrument: getInstrumentName(instrumentId, locale), effort }),
    };
  },
};

/* ── 11. distribute_effort (mutate, L2+) ───────────────────────────────────────────────── */

const distributeEffort: ActionDef = {
  name: 'distribute_effort',
  kind: 'mutate',
  descriptionKey: 'agent.actions.distributeEffort.description',
  minLevel: 2,
  schema: z.object({
    policyId: z.string(),
    strategy: z.enum(['even', 'focus']),
    focusInstrumentId: z.string().optional(),
  }),
  anchorFor: ({ policyId }) => ANCHORS.policyRow(policyId),
  validate: ({ policyId, strategy, focusInstrumentId }, { state, locale }) => {
    if (state.currentLevel < 2) return tFor(locale, 'agent.errors.instrumentsNotAvailable');
    const policy = findPolicy(state, policyId);
    if (!policy) return tFor(locale, 'agent.errors.unknownPolicy', { id: policyId });
    if (!policy.isActive) return tFor(locale, 'agent.errors.policyNotActive', { name: policyName(state, policyId, locale) });
    if (!policy.instruments || Object.keys(policy.instruments).length === 0) return tFor(locale, 'agent.errors.unknownInstrument', { id: '(none)', policy: policyName(state, policyId, locale) });
    if (strategy === 'focus' && (!focusInstrumentId || !policy.instruments[focusInstrumentId])) {
      return tFor(locale, 'agent.errors.unknownInstrument', { id: focusInstrumentId ?? '(missing)', policy: policyName(state, policyId, locale) });
    }
    return null;
  },
  preview: ({ policyId, strategy }, { state, locale }) => tFor(locale, 'agent.preview.distributeEffort', {
    policy: policyName(state, policyId, locale), strategy: tFor(locale, `agent.distributeStrategy.${strategy}` as any),
  }),
  execute: ({ policyId, strategy, focusInstrumentId }, { handlers, state, locale }) => {
    const policy = findPolicy(state, policyId)!;
    const ids = Object.keys(policy.instruments as Record<string, PolicyInstrument>);
    if (strategy === 'even') {
      const share = 100 / ids.length;
      ids.forEach((id) => handlers.handleInstrumentEffortChange(policyId as Policy, id, share));
    } else {
      ids.forEach((id) => handlers.handleInstrumentEffortChange(policyId as Policy, id, id === focusInstrumentId ? 100 : 0));
    }
    return { ok: true, data: { policyId, strategy }, message: tFor(locale, 'agent.done.distributeEffort', { policy: policyName(state, policyId, locale) }) };
  },
};

/* ── 12. toggle_pact (mutate, L3) ──────────────────────────────────────────────────────── */

const togglePact: ActionDef = {
  name: 'toggle_pact',
  kind: 'mutate',
  descriptionKey: 'agent.actions.togglePact.description',
  minLevel: 3,
  schema: z.object({ pactId: z.string() }),
  anchorFor: () => ANCHORS.pactList, // per-pact anchors not instrumented yet (phase 7 log entry)
  validate: ({ pactId }, { state, locale }) => {
    if (state.currentLevel < 3) return tFor(locale, 'agent.errors.levelTooLow', { level: 3 });
    const pact = state.pacts[pactId];
    if (!pact) return tFor(locale, 'agent.errors.unknownPact', { id: pactId });
    if (!pact.isActive && state.year < (pact.unlockYear || 0)) return tFor(locale, 'agent.errors.pactNotUnlocked', { name: pact.name, year: pact.unlockYear });
    if (!pact.isActive && pact.costToJoin && state.stellaSpecificState.Reservas_del_Tesoro < pact.costToJoin) {
      return tFor(locale, 'agent.errors.insufficientFunds', { name: pact.name });
    }
    return null;
  },
  preview: ({ pactId }, { state, locale }) => {
    const pact = state.pacts[pactId];
    return tFor(locale, 'agent.preview.togglePact', {
      verb: tFor(locale, pact?.isActive ? 'agent.pactVerb.leave' : 'agent.pactVerb.join'), name: pact?.name ?? pactId,
    });
  },
  execute: ({ pactId }, { handlers, state, locale }) => {
    const name = state.pacts[pactId]?.name ?? pactId;
    handlers.togglePact(pactId);
    return { ok: true, data: { pactId }, message: tFor(locale, 'agent.done.togglePact', { name }) };
  },
};

/* ── 13. set_tax_pressure (mutate, L3) ─────────────────────────────────────────────────── */

const setTaxPressure: ActionDef = {
  name: 'set_tax_pressure',
  kind: 'mutate',
  descriptionKey: 'agent.actions.setTaxPressure.description',
  minLevel: 3,
  schema: z.object({ percentage: z.number().min(0).max(20) }),
  anchorFor: () => ANCHORS.taxSlider,
  validate: ({ percentage }, { state, locale }) => {
    if (state.currentLevel < 3) return tFor(locale, 'agent.errors.levelTooLow', { level: 3 });
    if (percentage < 0 || percentage > CONTROL_PARAMS.Max_Additional_Tax_Rate_Percentage) {
      return tFor(locale, 'agent.errors.invalidTaxPressure', { max: CONTROL_PARAMS.Max_Additional_Tax_Rate_Percentage });
    }
    return null;
  },
  preview: ({ percentage }, { locale }) => tFor(locale, 'agent.preview.setTaxPressure', { percentage }),
  execute: ({ percentage }, { handlers, locale }) => {
    handlers.handleAdditionalTaxPressureChange(percentage);
    return { ok: true, data: { percentage }, message: tFor(locale, 'agent.done.setTaxPressure', { percentage }) };
  },
};

/* ── 14. request_loan (mutate, L3, always confirms) ────────────────────────────────────── */

const requestLoan: ActionDef = {
  name: 'request_loan',
  kind: 'mutate',
  descriptionKey: 'agent.actions.requestLoan.description',
  minLevel: 3,
  alwaysConfirm: true, // always confirms per source §1, no exceptions, not even in tutorial mode
  schema: z.object({ amount: z.number().positive() }),
  anchorFor: () => ANCHORS.loanControl,
  validate: ({ amount }, { state, locale }) => {
    if (state.currentLevel < 3 && state.year < CONTROL_PARAMS.Ano_Activacion_Prestamo) return tFor(locale, 'agent.errors.loansNotAvailableYet');
    if (amount <= 0) return tFor(locale, 'agent.errors.invalidLoanAmount');
    return null;
  },
  preview: ({ amount }, { locale }) => tFor(locale, 'agent.preview.requestLoan', { amount: amount.toFixed(0) }),
  execute: ({ amount }, { handlers, locale }) => {
    handlers.requestLoan(amount);
    return { ok: true, data: { amount }, message: tFor(locale, 'agent.done.requestLoan') };
  },
};

/* ── 15. simulate_year (advance, always confirms) ──────────────────────────────────────── */

const simulateYear: ActionDef = {
  name: 'simulate_year',
  kind: 'advance',
  descriptionKey: 'agent.actions.simulateYear.description',
  alwaysConfirm: true, // always confirms per source §1, no exceptions, not even in tutorial mode
  // `years` is accepted for schema forward-compatibility but currently has no effect: this
  // codebase's runSimulationRound() always advances a fixed SIMULATION_YEARS_PER_ROUND with no
  // way to request a different count per call. Documented, not silently pretended otherwise.
  schema: z.object({ years: z.literal(1).optional() }),
  preview: (_args, { locale }) => tFor(locale, 'agent.preview.simulateYear', { years: 1 }),
  execute: async (_args, { handlers, locale }) => {
    await handlers.runSimulationRound();
    return { ok: true, data: {}, message: tFor(locale, 'agent.done.simulateYear') };
  },
};

/* ── Registry ───────────────────────────────────────────────────────────────────────────── */

export const REGISTRY: Record<string, ActionDef> = Object.fromEntries(
  [
    listPolicies, explainIndicator, readState, diagnoseTrajectory,
    highlightElement, openPanel, showChart,
    activatePolicy, deactivatePolicy, setInstrumentEffort, distributeEffort,
    togglePact, setTaxPressure, requestLoan, simulateYear,
  ].map((a) => [a.name, a]),
);
