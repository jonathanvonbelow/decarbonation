/**
 * Effects that must be applied AFTER the year's own recomputation, or they are silently lost.
 *
 * The bug this fixes (found in v4, see docs/DESIGN_DECISIONS_LOG.md): `stepYear` applies pact and
 * random-event effects early (steps 2 and 5), but four indicators are *derived* later in the same
 * year — `co2EqEmissionsPerCapita` from the carbon balance (step 9), `socialWellbeing` and
 * `politicalStability` from their Stella stocks (step 8), and the money/pressure indicators synced
 * from Stella (step 11). Anything written to those before then is overwritten. In practice that
 * meant the Global Carbon Accord's −5% CO2 and +3 political stability, the Technology Transfer
 * Initiative's −10% CO2 and the "green tech boom" event's −5% CO2 never reached the player.
 *
 * The fix keeps each effect's own meaning:
 *   - pacts:  their `effects(...)` function is pure, so it is re-evaluated once the year's values
 *             exist and only the derived keys are taken from that second call. "5% less than what
 *             this year produced" is exactly what the pact says it does.
 *   - events: a `changePercentage` is remembered as a factor and a `changeAbsolute` as a delta,
 *             then re-applied to the recomputed value. No re-evaluation, no double counting.
 */
import type { Indicators, Pact, StellaStocks } from '../types';

/** Indicator keys recomputed after pact/event effects run, and therefore applied again at the end. */
export const DERIVED_INDICATORS = [
  'co2EqEmissionsPerCapita', 'socialWellbeing', 'politicalStability',
  'pbi', 'treasuryReserves', 'debt', 'ppAgricola', 'ppAmbientalista', 'ppSocial',
] as const;

export type DerivedIndicator = (typeof DERIVED_INDICATORS)[number];

const DERIVED_SET = new Set<string>(DERIVED_INDICATORS);

export const isDerivedIndicator = (key: string): key is DerivedIndicator => DERIVED_SET.has(key);

/** 0-100 keys among the derived ones (the rest are unbounded magnitudes). */
const BOUNDED: Set<string> = new Set(['socialWellbeing', 'politicalStability', 'ppAgricola', 'ppAmbientalista', 'ppSocial']);

/** A pending change to a derived indicator: multiply by `factor`, then add `delta`. */
export interface DeferredAdjustment {
  indicator: DerivedIndicator;
  factor?: number;
  delta?: number;
}

export function applyDeferredAdjustments(indicators: Indicators, adjustments: DeferredAdjustment[]): void {
  adjustments.forEach(({ indicator, factor, delta }) => {
    let value = indicators[indicator];
    if (factor !== undefined) value *= factor;
    if (delta !== undefined) value += delta;
    indicators[indicator] = BOUNDED.has(indicator) ? Math.max(0, Math.min(100, value)) : value;
  });
}

/**
 * Re-evaluates each active pact against the year's recomputed values and applies only what the
 * pact says about derived indicators. Everything else the pact does was already applied earlier.
 */
export function applyPactEffectsOnDerived(pacts: Record<string, Pact>, indicators: Indicators, stella: StellaStocks): void {
  (Object.values(pacts) as Pact[]).forEach((pact) => {
    if (!pact.isActive || typeof pact.effects !== 'function') return;
    const effects = pact.effects(indicators, stella);
    if (!effects.indicators) return;
    (Object.keys(effects.indicators) as (keyof Indicators)[]).forEach((key) => {
      const value = effects.indicators![key];
      if (typeof value !== 'number' || !isDerivedIndicator(key as string)) return;
      indicators[key] = BOUNDED.has(key as string) ? Math.max(0, Math.min(100, value)) : value;
    });
  });
}
