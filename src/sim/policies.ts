/**
 * Policy bookkeeping shared by the 1.1 submodels and the UI. Since model 2.0 (phase 36,
 * mejora-general/files/36_politicas_eficiencia_instrumentos.md) the efficiency itself — start-up ramp,
 * fatigue with floor and recovery, instrument channels, cost by effort — lives in src/sim/v2/policies.ts;
 * this file keeps the 1.1 entry points the not-yet-rewritten submodels call.
 */
import type { Policy, PolicyState } from '../types';
import type { Language } from '../hooks/useLanguage';
import { getPolicyName } from '../legacyContent/gameData';
import { FATIGUE_WARNING, fatigueFactor, prodEfficiency } from './v2/policies';

/**
 * Effective efficiency of a policy this step as the 1.1 submodels read it (landUse, economy, carbon,
 * indicators, pressures): `eff[pid].prod` of model 2.0, i.e. the base efficiency stored by
 * `computeEfficiencies` (step 4 of advance) times the strength of its `prod` channel. Each later phase
 * (37–45) switches its submodel to its own channel. Effort counts in every level (level 1 always has the
 * even split of `evenEffort`, χ = 1). `_currentLevel` is kept for the callers' signature.
 */
export function getPolicyEfficiency(policy: PolicyState | undefined, _currentLevel?: number): number {
  if (!policy || !policy.isActive) return 0;
  return prodEfficiency(policy, policy.currentEfficiency || 0);
}

/**
 * Warns once when a policy's fatigue factor (η − η_min)/(1 − η_min) = e^(−T/δ) crosses below 0.5
 * (phase 36 §3.2): it lost half of its push, and resting lets it recover. Updates
 * `previousFatigueFactor` of every policy, so a policy that recovers while resting and wears out again
 * warns again. Returns one message per policy that crossed this step.
 */
export function checkEfficiencyWarning(policies: Record<Policy, PolicyState>, language: Language = 'es'): string[] {
  const out: string[] = [];
  (Object.values(policies) as PolicyState[]).forEach((p) => {
    const factor = fatigueFactor(p);
    const prev = p.previousFatigueFactor;
    p.previousFatigueFactor = factor;
    if (!p.isActive || prev === undefined || !(factor < FATIGUE_WARNING && prev >= FATIGUE_WARNING)) return;
    const pct = ((p.currentEfficiency ?? 0) * 100).toFixed(0);
    // Reaches the player directly as a chat notification (App.tsx routes 'policy_efficiency_warning'
    // messages straight to the chat).
    const name = getPolicyName(p.id, language);
    out.push(language === 'en'
      ? `Warning! Policy "${name}" has lost half of its push to wear (efficiency now ${pct}%). Long-running policies settle at an institutional floor; if you let it rest, it recovers.`
      : `¡Atención! La política "${name}" perdió la mitad de su empuje por desgaste (eficiencia actual ${pct}%). Una política vieja tiende a un piso institucional; si la dejás descansar, se recupera.`);
  });
  return out;
}

/**
 * Even split of 100 % effort across a policy's instruments; the remainder goes to the first one
 * (mutates `policy`). Used on activation by both games (model 1.1, phase 34, N-02): level 1 has no
 * instrument panel, so this split is what level 1 always plays with (χ = 1 on every channel, phase 36).
 * From level 2 the player can redistribute afterwards.
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
