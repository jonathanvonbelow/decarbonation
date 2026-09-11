import type { GameState } from '../types';

/**
 * The four game-over reasons, deliberately Spanish-only (see the comment at `stepYear`'s call
 * site in index.ts). Exported so UIs can tell which one happened by identity instead of matching
 * on the text — the Territorio preview maps them to its own bilingual copy this way.
 */
export const GAME_OVER_REASONS = {
  political: 'Colapso Político: La nación ha caído en un estado de ingobernabilidad total.',
  ecological: 'Colapso Ecológico: La pérdida de biodiversidad ha provocado una catástrofe irreversible.',
  famine: 'Hambruna: La incapacidad de alimentar a la población ha generado una crisis humanitaria.',
  bankruptcy: 'Bancarrota Nacional: La deuda insostenible y la falta de reservas han llevado a la quiebra.',
} as const;

export type GameOverKind = keyof typeof GAME_OVER_REASONS;

/**
 * Game-over check shared by `stepYear` and the monthly step (src/sim/monthly.ts). Extracted
 * unchanged from `stepYear`'s step 13: same thresholds, same order, same reason strings. Returns
 * null when the game goes on.
 */
export function evaluateGameOver(state: GameState): string | null {
  const { indicators, stellaSpecificState: stella } = state;
  if (indicators.politicalStability <= 5) return GAME_OVER_REASONS.political;
  if (indicators.biodiversity <= 5) return GAME_OVER_REASONS.ecological;
  if (state.currentLevel >= 2 && indicators.foodSecurity <= 10) return GAME_OVER_REASONS.famine;
  if (stella.Reservas_del_Tesoro < -(stella.PBI_Real * 0.2) && stella.Deuda > stella.PBI_Real * 1.5) {
    return GAME_OVER_REASONS.bankruptcy;
  }
  return null;
}

/** Which game-over reason a `gameOverReason` string is, or null for anything else (e.g. abandon). */
export function gameOverKind(reason: string | null): GameOverKind | null {
  const entry = (Object.entries(GAME_OVER_REASONS) as [GameOverKind, string][]).find(([, text]) => text === reason);
  return entry ? entry[0] : null;
}
