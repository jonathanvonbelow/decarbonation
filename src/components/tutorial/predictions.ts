/**
 * Prediction mechanic core logic (18_tutoriales_v3.md §5) — "the pedagogical piece that matters
 * more than any other improvement in this package." Pure functions only; the UI lives in
 * PredictionStrip.tsx, the wiring into a simulated round lives in App.tsx.
 */
import type { Indicators } from '../../types';

export type PredictionDirection = 'down' | 'flat' | 'up';

// Fixed to exactly the three indicators the source spec's own mockup shows (§5), regardless of
// level — economicSecurity is tracked internally from level 1 even though its dashboard card only
// appears from level 2 onward (Dashboard.tsx), so predicting it early is still meaningful.
export const PREDICTED_INDICATORS = ['biodiversity', 'co2EqEmissionsPerCapita', 'economicSecurity'] as const;
export type PredictedIndicatorKey = typeof PREDICTED_INDICATORS[number];

export type PredictionSelections = Partial<Record<PredictedIndicatorKey, PredictionDirection>>;

export interface PredictionResult {
  indicator: PredictedIndicatorKey;
  predicted: PredictionDirection;
  actual: PredictionDirection;
  delta: number;
  correct: boolean;
}

// "Range" used for the 1%-of-range flat threshold (§5: "|Δ| < 1% del rango del indicador").
// biodiversity/economicSecurity are naturally 0-100. co2EqEmissionsPerCapita has no hard cap in
// this simulation, so 15 t/capita is used as a practical range ceiling — observed values across
// the phase-5 calibration harness (reports/routes-calibration.md) top out around 9-14 t/capita
// for the worst strategies tried, so 15 keeps the flat band meaningfully narrow without being so
// tight that ordinary yearly noise never counts as "flat". Documented rather than derived from a
// real theoretical maximum, which the simulation doesn't define.
const RANGE: Record<PredictedIndicatorKey, number> = {
  biodiversity: 100,
  co2EqEmissionsPerCapita: 15,
  economicSecurity: 100,
};
const FLAT_THRESHOLD_FRACTION = 0.01;

export function actualDirection(key: PredictedIndicatorKey, before: number, after: number): PredictionDirection {
  const delta = after - before;
  const threshold = RANGE[key] * FLAT_THRESHOLD_FRACTION;
  if (Math.abs(delta) < threshold) return 'flat';
  return delta > 0 ? 'up' : 'down';
}

/** Only evaluates indicators the player actually predicted — predicting is per-indicator optional. */
export function evaluatePredictions(selections: PredictionSelections, before: Indicators, after: Indicators): PredictionResult[] {
  return PREDICTED_INDICATORS
    .filter((key) => selections[key] !== undefined)
    .map((key) => {
      const predicted = selections[key]!;
      const delta = after[key] - before[key];
      const actual = actualDirection(key, before[key], after[key]);
      return { indicator: key, predicted, actual, delta, correct: predicted === actual };
    });
}

const ENABLED_KEY = 'decarbonation.prediction.enabled';

export function loadPredictionEnabled(): boolean {
  try {
    const raw = localStorage.getItem(ENABLED_KEY);
    return raw === null ? true : raw === 'true'; // opt-out, on by default per §5
  } catch { return true; }
}

export function savePredictionEnabled(enabled: boolean): void {
  try { localStorage.setItem(ENABLED_KEY, String(enabled)); } catch { /* ignore */ }
}
