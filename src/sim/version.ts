/**
 * Version of the simulation model (equations + parameters), independent of the app version.
 *
 * Bump rules (docs/audit-equations.md):
 *   - patch (1.0 -> 1.0.1): text or UI only, no number in any trajectory changes;
 *   - minor (1.0 -> 1.1): bug fixes that change trajectories but keep the model's structure;
 *   - major (1.x -> 2.0): new state variables or equation forms.
 * Every research row (game_sessions, predictions, territorio_feedback) stores this string, so
 * analyses can stratify by model. Never reuse a version string for different equations.
 * (v6 / phase 32, mejora-general/files/32_versionado_del_modelo.md)
 */
export const MODEL_VERSION = '1.0' as const;

/**
 * Per-game override, only used if the team decides to keep the 3-level game on an older model
 * while Territorio moves ahead (00_INDICE_v6.md, decision 3). Both point at MODEL_VERSION by default.
 */
export const MODEL_VERSION_BY_GAME: Record<'niveles' | 'territorio', string> = {
  niveles: MODEL_VERSION,
  territorio: MODEL_VERSION,
};
