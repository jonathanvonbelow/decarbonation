/**
 * Policy efficiency: applying instrument effort, and the exponential decay curve.
 * Ported verbatim from src/App.tsx (`getPolicyEfficiency`, and the activation-year /
 * decay block inside `runSimulationRound`) as part of the phase-2 extraction
 * (mejora-general/files/16_auditoria_ecuaciones.md). No formula changed.
 */
import type { Policy, PolicyState, NumericStellaKeys, StellaStocks } from '../types';

/**
 * Effective efficiency of a policy this year: its base (decayed) efficiency, scaled down by
 * the share of instrument effort actually assigned to it from level 2 onward. A policy active
 * with zero effort assigned to its instruments contributes nothing — this is deliberate (see
 * P-2 in docs/audit-equations.md) and is explained to the player in the tutorial (file 18).
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
): void {
  (Object.values(policies) as PolicyState[]).forEach((p) => {
    if (!p.stellaName) return;
    const tiempoActivacionKey = `Tiempo_Activacion_${p.stellaName}` as NumericStellaKeys;
    if (p.isActive && tiempoActivacionKey in stellaState) {
      (stellaState as any)[tiempoActivacionKey] = ((stellaState as any)[tiempoActivacionKey] || 0) + 1;
    }

    if (p.isActive && p.efficiencyDecayDuration && p.efficiencyDecayDuration > 0 && p.initialEfficiency) {
      const yearsActive = (stellaState as any)[tiempoActivacionKey] || 0;
      const newEfficiency = p.initialEfficiency * Math.exp(-yearsActive / p.efficiencyDecayDuration);
      p.currentEfficiency = Math.max(0, newEfficiency);
    }
  });
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
export function checkEfficiencyWarning(policies: Record<Policy, PolicyState>): string | null {
  const policyWithEfficiencyWarning = (Object.values(policies) as PolicyState[]).find((p) => {
    if (!p.isActive || p.currentEfficiency === undefined || p.previousEfficiencyForNotification === undefined) return false;
    const threshold = 0.4;
    return p.currentEfficiency < threshold && p.previousEfficiencyForNotification >= threshold;
  });

  if (policyWithEfficiencyWarning && policyWithEfficiencyWarning.currentEfficiency !== undefined) {
    const efficiencyPercentage = (policyWithEfficiencyWarning.currentEfficiency * 100).toFixed(0);
    const warningMessage = `¡Atención! La eficiencia de la política "${policyWithEfficiencyWarning.name}" ha caído por debajo del 40% (actualmente ${efficiencyPercentage}%). Su impacto ahora es significativamente reducido. Considera reevaluar tu estrategia o, si estás en Nivel 2+, modifica el esfuerzo relativo entre sus instrumentos.`;
    policyWithEfficiencyWarning.previousEfficiencyForNotification = policyWithEfficiencyWarning.currentEfficiency;
    return warningMessage;
  }
  return null;
}
