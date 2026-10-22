/**
 * Shared math of model 2.0 (mejora-general/files/35_motor_v2_estructura.md §3). Mirrors the helpers at
 * the top of scripts/reference/modelo_v2.py one for one. Pure functions, no state, no parameters: every
 * number the model uses lives in params.ts or ControlParams.
 */

/** Logistic function. */
export const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

/** Inverse logistic on a 0-1 probability, clamped away from 0 and 1 (same clamp as the prototype). */
export const logit = (p: number): number => {
  const q = Math.min(Math.max(p, 1e-4), 1 - 1e-4);
  return Math.log(q / (1 - q));
};

/** Logistic target on the 0-100 scale: 100 * sigmoid(l0 + drive). */
export const target100 = (l0: number, drive: number): number => 100 * sigmoid(l0 + drive);

/**
 * Exact discretisation of dx/dt = -r (x - xs) with annual step fraction k = 1 - e^{-r}.
 * dt = 1 gives x + k (xs - x); dt = 1/12 keeps the same fixed point and annual time constant.
 */
export const relax = (x: number, xs: number, k: number, dt: number): number => xs + (x - xs) * Math.pow(1 - k, dt);

/** Smooth step: ~1 well below x0, ~0 well above (width w). Replaces hard thresholds `x < x0`. */
export const sLow = (x: number, x0: number, w: number): number => 1 / (1 + Math.exp((x - x0) / w));
/** Smooth step: ~0 well below x0, ~1 well above (width w). */
export const sHigh = (x: number, x0: number, w: number): number => 1 / (1 + Math.exp(-(x - x0) / w));

/** Diminishing returns of instrument effort (0-100). */
export const phiEffort = (effort: number, e0: number): number => 1 - Math.exp(-effort / e0);

/** Converts a change in points of a 0-100 indicator at its current value into a change in logit units. */
export const toLogitDelta = (points: number, current: number): number => {
  const p = Math.min(0.99, Math.max(0.01, current / 100));
  return points / (100 * p * (1 - p));
};
