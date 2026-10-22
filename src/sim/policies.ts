/**
 * Policy efficiency: applying instrument effort, and the exponential decay curve.
 * Ported verbatim from src/App.tsx (`getPolicyEfficiency`, and the activation-year /
 * decay block inside `runSimulationRound`) as part of the phase-2 extraction
 * (mejora-general/files/16_auditoria_ecuaciones.md). No formula changed.
 */
import type { Policy, PolicyState, NumericStellaKeys, StellaStocks } from '../types';
import type { Language } from '../hooks/useLanguage';
import { getPolicyName } from '../legacyContent/gameData';

/**
 * Effective efficiency of a policy this year: its base (decayed) efficiency, scaled down by
 * the share of instrument effort actually assigned to it from level 2 onward. A policy active
 * with zero effort assigned to its instruments contributes nothing — this is deliberate (see
 * P-2 in docs/audit-equations.md) and is explained to the player in the tutorial (file 18). Since
 * model 1.1 (phase 34, N-02) activation pre-splits effort evenly (`evenEffort`), so this only bites
 * when the player moves every slider to 0.
 */
export function getPolicyEfficiency(policy: PolicyState | undefined, currentLevel: number): number {
  if (!policy || !policy.isActive) return 0;

  const baseEfficiency = policy.currentEfficiency || 0;

  if (currentLevel < 2 || !policy.instruments) {
    return baseEfficiency;
  }

  const totalInstrumentEffort = policy.totalInstrumentEffortApplied || 0;
  return baseEfficiency * (totalInstrumentEffort / 100);
}

/**
 * Increments each active policy's "years active" Stella counter and applies the exponential
 * efficiency decay `initialEfficiency * e^(-yearsActive / efficiencyDecayDuration)`.
 * Mutates `policies` and `stellaState` in place (matches the original's mutation style).
 *
 * This is the *second* of the two policy-bookkeeping passes the original `runSimulationRound`
 * did per year — the first (confirming `activationYear` for newly-toggled policies, and its log
 * line) runs earlier, before the random event roll, and lives in `stepYear`'s own step 1
 * (src/sim/index.ts) rather than here, matching the original's exact ordering.
 */
export function updatePolicyEfficiency(
  policies: Record<Policy, PolicyState>,
  stellaState: StellaStocks,
  /**
   * Fraction of a year being simulated: 1 for `stepYear` (default, unchanged behavior), 1/12 for
   * the monthly step of the Territorio preview (src/sim/monthly.ts) — the "years active" counter
   * then grows by 1/12 per month and the same exponential curve is read at that fractional age.
   */
  dt = 1,
): void {
  (Object.values(policies) as PolicyState[]).forEach((p) => {
    if (!p.stellaName) return;
    const tiempoActivacionKey = `Tiempo_Activacion_${p.stellaName}` as NumericStellaKeys;
    if (p.isActive && tiempoActivacionKey in stellaState) {
      (stellaState as any)[tiempoActivacionKey] = ((stellaState as any)[tiempoActivacionKey] || 0) + dt;
    }

    if (p.isActive && p.efficiencyDecayDuration && p.efficiencyDecayDuration > 0 && p.initialEfficiency) {
      p.currentEfficiency = decayedEfficiency(p, (stellaState as any)[tiempoActivacionKey] || 0);
    }
  });
}

/**
 * The decay curve `initialEfficiency * e^(-yearsActive / efficiencyDecayDuration)`, floored at 0. Shared by
 * the engine (`updatePolicyEfficiency`) and the activation handlers (`efficiencyFromCounter`) so the
 * efficiency shown on re-activation is the one the engine computes.
 */
export function decayedEfficiency(policy: PolicyState, yearsActive: number): number {
  if (!policy.efficiencyDecayDuration || policy.efficiencyDecayDuration <= 0 || !policy.initialEfficiency) return policy.initialEfficiency ?? 1;
  return Math.max(0, policy.initialEfficiency * Math.exp(-yearsActive / policy.efficiencyDecayDuration));
}

/** Total annual fiscal cost of every active policy: `costFactor * PBI_Real`, summed. */
export function computeTotalPolicyCost(policies: Record<Policy, PolicyState>, pbiReal: number): number {
  let totalPolicyCost = 0;
  (Object.values(policies) as PolicyState[]).forEach((p) => {
    if (p.isActive) totalPolicyCost += p.costFactor * pbiReal;
  });
  return totalPolicyCost;
}

/**
 * Emits a one-time warning the first time an active policy's efficiency drops below 40%.
 * Mutates `previousEfficiencyForNotification` so the warning fires once per crossing, matching
 * the original behavior. Returns the warning message, or null if nothing crossed the threshold.
 */
export function checkEfficiencyWarning(policies: Record<Policy, PolicyState>, language: Language = 'es'): string | null {
  const policyWithEfficiencyWarning = (Object.values(policies) as PolicyState[]).find((p) => {
    if (!p.isActive || p.currentEfficiency === undefined || p.previousEfficiencyForNotification === undefined) return false;
    const threshold = 0.4;
    return p.currentEfficiency < threshold && p.previousEfficiencyForNotification >= threshold;
  });

  if (policyWithEfficiencyWarning && policyWithEfficiencyWarning.currentEfficiency !== undefined) {
    const efficiencyPercentage = (policyWithEfficiencyWarning.currentEfficiency * 100).toFixed(0);
    // Reaches the player directly as a chat notification (App.tsx routes 'policy_efficiency_warning'
    // messages straight to the chat) -- was raw Spanish regardless of locale before this phase,
    // and read `.name` (PolicyState's own Spanish-only field) instead of the bilingual lookup.
    const policyName = getPolicyName(policyWithEfficiencyWarning.id, language);
    const warningMessage = language === 'en'
      ? `Warning! The efficiency of policy "${policyName}" has dropped below 40% (currently ${efficiencyPercentage}%). Its impact is now significantly reduced. Consider reevaluating your strategy, or if you're in Level 2+, adjust the relative effort across its instruments.`
      : `¡Atención! La eficiencia de la política "${policyName}" ha caído por debajo del 40% (actualmente ${efficiencyPercentage}%). Su impacto ahora es significativamente reducido. Considera reevaluar tu estrategia o, si estás en Nivel 2+, modifica el esfuerzo relativo entre sus instrumentos.`;
    policyWithEfficiencyWarning.previousEfficiencyForNotification = policyWithEfficiencyWarning.currentEfficiency;
    return warningMessage;
  }
  return null;
}

/**
 * Even split of 100 % effort across a policy's instruments; the remainder goes to the first one
 * (mutates `policy`). Used on activation by both games (model 1.1, phase 34, N-02): level 1 has no
 * instrument panel, so Carbon Neutrality's instrument channels (renewables, capture) used to run at
 * effort 0 there. From level 2 the player can redistribute afterwards. Level 1's policy efficiency
 * ignores effort (`getPolicyEfficiency`), so nothing else changes for the other policies.
 */
export function evenEffort(policy: PolicyState): void {
  if (!policy.instruments) return;
  const ids = Object.keys(policy.instruments);
  if (ids.length === 0) return;
  const share = Math.floor(100 / ids.length);
  ids.forEach((id, i) => {
    policy.instruments![id].effortPercentage = i === 0 ? 100 - share * (ids.length - 1) : share;
  });
  policy.totalInstrumentEffortApplied = 100;
}

/**
 * Efficiency a policy has right now given its accumulated active time — the value the engine's own
 * decay curve gives, with no reset on re-activation (model 1.1, phase 34, T-06). The engine always
 * recomputed it from the counter on the next step, so the old reset to `initialEfficiency` only
 * showed the player a full-efficiency policy for one step and re-armed the 40 % warning.
 */
export function efficiencyFromCounter(policy: PolicyState, stella: StellaStocks): number {
  if (!policy.stellaName) return policy.initialEfficiency ?? 1;
  const years = ((stella as unknown as Record<string, number>)[`Tiempo_Activacion_${policy.stellaName}`]) ?? 0;
  return decayedEfficiency(policy, years);
}
