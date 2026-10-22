/**
 * Model 2.0 policies (mejora-general/files/36_politicas_eficiencia_instrumentos.md): start-up ramp,
 * fatigue with an institutional floor and recovery while resting, instruments acting on channels with
 * diminishing returns, cost by effort. Port of `base_eta`, `channel`, `compute_eta`, `policy_cost` and the
 * clock block of `step()` in scripts/reference/modelo_v2.py.
 *
 *   ramp clock     τ ← τ + dt if active; 0 otherwise
 *   fatigue clock  T ← T + dt if active; T·e^(−dt/ρ) otherwise
 *   base           η = u · (1 − e^(−τ/λ)) · [η_min + (1 − η_min)·e^(−T/δ)]
 *   channel        χ^c = Σ_k μ_k^c·φ(e_k) / Σ_k μ_k^c·φ(25),   φ(e) = 1 − e^(−e/e0)
 *   effective      η^c = η · χ^c
 *   cost           K = κ·Y·(f + (1 − f)·ē),   ē = min(100, Σ_k e_k)/100
 *
 * λ, δ, κ, f, e0 and the channel relevances live in PARAMS_V2 (params.ts); η_min and ρ in ControlParams
 * (Eficiencia_Minima_Politicas, Recuperacion_Politicas_Anios). Pure: no React, no randomness.
 */
import type { ControlParams, Policy, PolicyInstrument, PolicyState } from '../../types';
import { phiEffort } from './math';
import { INSTRUMENT_CHANNELS, PARAMS_V2, PID, PIDS, type Pid } from './params';

export { INSTRUMENT_CHANNELS };

/** Base efficiency and effective efficiency per channel of one policy this step (0-1, χ can exceed 1 slightly). */
export interface PolicyEfficiency {
  /** η: ramp × fatigue, 0 when inactive. What `PolicyState.currentEfficiency` stores. */
  base: number;
  /** The prototype's `eta[j]`: η × χ with uniform relevance (its generic channel). */
  eta: number;
  land: number;
  prod: number;
  social: number;
  /** Carbon Neutrality only (the prototype's `eta_cn`). */
  elec?: number;
  other?: number;
  tax?: number;
}

/** Policy enum value → short id of the tables. */
export const PID_OF = Object.fromEntries(PIDS.map((k) => [PID[k], k])) as Record<Policy, Pid>;

const UNIFORM = [1, 1, 1, 1];

/** Instrument efforts (0-100) of a policy in the order of INSTRUMENT_CHANNELS[pid].ids. */
export function effortsOf(p: PolicyState, pid: Pid = PID_OF[p.id]): number[] {
  return INSTRUMENT_CHANNELS[pid].ids.map((id) => p.instruments?.[id]?.effortPercentage ?? 0);
}

/**
 * Advances the two policy clocks by dt (years). Mutates `policies` (advance() owns the copy).
 * Active: both clocks run. Inactive: the ramp resets and the accumulated fatigue decays with ρ.
 */
export function tickPolicyClocks(policies: Record<Policy, PolicyState>, dt: number, CP: ControlParams): void {
  (Object.values(policies) as PolicyState[]).forEach((p) => {
    if (p.isActive) {
      p.rampTime = (p.rampTime ?? 0) + dt;
      p.fatigueTime = (p.fatigueTime ?? 0) + dt;
    } else {
      p.rampTime = 0;
      // ρ ≤ 0 (a facilitator typo) means instant recovery, never growth.
      const rho = CP.Recuperacion_Politicas_Anios;
      p.fatigueTime = rho > 0 ? (p.fatigueTime ?? 0) * Math.exp(-dt / rho) : 0;
    }
  });
}

/** Start-up factor 1 − e^(−τ/λ) (0 right after activation, → 1). */
export function rampFactor(p: PolicyState, pid: Pid = PID_OF[p.id]): number {
  return 1 - Math.exp(-(p.rampTime ?? 0) / PARAMS_V2.rampYears[pid]);
}

/** Fatigue factor e^(−T/δ) = (η_fatigue − η_min)/(1 − η_min): 1 fresh, → 0 worn out. */
export function fatigueFactor(p: PolicyState, pid: Pid = PID_OF[p.id]): number {
  return Math.exp(-(p.fatigueTime ?? 0) / PARAMS_V2.fatigueYears[pid]);
}

/** η = u · ramp · [η_min + (1 − η_min)·fatigue]. */
export function baseEfficiency(p: PolicyState, CP: ControlParams, pid: Pid = PID_OF[p.id]): number {
  if (!p.isActive) return 0;
  const floor = CP.Eficiencia_Minima_Politicas;
  return rampFactor(p, pid) * (floor + (1 - floor) * fatigueFactor(p, pid));
}

/** χ = Σ μ_k φ(e_k) / Σ μ_k φ(25): 1 for an even 25/25/25/25 split, 0 with no effort. */
export function channelStrength(efforts: number[], relevance: number[]): number {
  const e0 = PARAMS_V2.effortE0;
  const den = relevance.reduce((s, r) => s + r * phiEffort(25, e0), 0) || 1;
  return relevance.reduce((s, r, k) => s + r * phiEffort(efforts[k] ?? 0, e0), 0) / den;
}

/**
 * η·χ^prod: what the 1.1 submodels read through `getPolicyEfficiency` (src/sim/policies.ts) until each
 * phase 37–45 switches to its own channel. Single definition shared with `efficiencyOf`, so the value the
 * submodels read and `eff[pid].prod` returned by advance() cannot drift apart.
 */
export function prodEfficiency(p: PolicyState, base: number): number {
  if (base === 0) return 0;
  const pid = PID_OF[p.id];
  return base * channelStrength(effortsOf(p, pid), INSTRUMENT_CHANNELS[pid].prod);
}

/** Effective efficiency of one policy on every channel, from its stored base (`currentEfficiency`). */
export function efficiencyOf(p: PolicyState, base: number): PolicyEfficiency {
  const pid = PID_OF[p.id];
  const ch = INSTRUMENT_CHANNELS[pid];
  const e = effortsOf(p, pid);
  const out: PolicyEfficiency = {
    base,
    eta: base * channelStrength(e, UNIFORM),
    land: base * channelStrength(e, ch.land),
    prod: prodEfficiency(p, base),
    social: base * channelStrength(e, ch.social),
  };
  if (ch.elec) out.elec = base * channelStrength(e, ch.elec);
  if (ch.other) out.other = base * channelStrength(e, ch.other);
  if (ch.tax) out.tax = base * channelStrength(e, ch.tax);
  return out;
}

/**
 * Step 4 of advance(): base efficiency of every policy (stored in `currentEfficiency` for the UI, Gemini
 * and the 1.1 submodels) and its effective efficiency per channel. Effort rules in every level: level 1
 * has no instrument panel, but activation always splits effort evenly (`evenEffort`), so χ = 1 there —
 * the prototype has no level-1 exception either. `_level` is kept for the callers' signature.
 * Mutates `policies[*].currentEfficiency`.
 */
export function computeEfficiencies(
  policies: Record<Policy, PolicyState>, _level: number, CP: ControlParams,
): Record<Pid, PolicyEfficiency> {
  const out = {} as Record<Pid, PolicyEfficiency>;
  PIDS.forEach((pid) => {
    const p = policies[PID[pid]];
    if (!p) return;
    const base = baseEfficiency(p, CP, pid);
    p.currentEfficiency = base;
    out[pid] = efficiencyOf(p, base);
  });
  return out;
}

/** Total effort of a policy as a share of 100 (ē), capped at 1. */
export function effortShare(p: PolicyState): number {
  const total = (Object.values(p.instruments ?? {}) as PolicyInstrument[]).reduce((s, i) => s + (i.effortPercentage ?? 0), 0);
  return Math.min(100, total) / 100;
}

/**
 * Cost share at full effort the engine charges today. Until phase 44 adds base public spending this is
 * the transitional `costShareBridge` (the 1.1 scale), not the prototype's κ (`costShare`, calibrated
 * against base spending): with κ and no base spending the treasury never binds (sim:check C3/C4 regress,
 * docs/DESIGN_DECISIONS_LOG.md phase 36). Phase 44 switches this to `PARAMS_V2.costShare`.
 */
export function costShareOf(pid: Pid): number {
  return PARAMS_V2.costShareBridge[pid];
}

/** Annual cost of one active policy: κ·Y·(f + (1 − f)·ē). 0 when inactive. */
export function policyCostOf(p: PolicyState, gdp: number): number {
  if (!p.isActive) return 0;
  const f = PARAMS_V2.costFixedShare;
  return costShareOf(PID_OF[p.id]) * gdp * (f + (1 - f) * effortShare(p));
}

/** Total annual cost of every active policy (prototype `policy_cost`). */
export function policyCost(policies: Record<Policy, PolicyState>, gdp: number): number {
  return (Object.values(policies) as PolicyState[]).reduce((s, p) => s + policyCostOf(p, gdp), 0);
}

/** Ramp threshold under which a policy shows as "starting up" (spec 36 §3.2). */
export const RAMP_SHOWN_UNTIL = 0.9;
/** Fatigue factor under which a policy shows as "worn" and the warning fires (spec 36 §3.2). */
export const FATIGUE_WARNING = 0.5;

export interface PolicyStatus {
  /** Active and ramp < 0.9: "starting up (NN %)". */
  starting: boolean;
  /** Ramp factor 0-1 (the NN % of "starting up"). */
  ramp: number;
  /** Active and fatigue factor < 0.5: "worn". */
  worn: boolean;
  /** Fatigue factor 0-1. */
  fatigue: number;
}

/** What the UI shows of a policy's clocks (both games). */
export function policyStatus(p: PolicyState): PolicyStatus {
  const ramp = rampFactor(p);
  const fatigue = fatigueFactor(p);
  return { starting: p.isActive && ramp < RAMP_SHOWN_UNTIL, ramp, worn: p.isActive && fatigue < FATIGUE_WARNING, fatigue };
}
