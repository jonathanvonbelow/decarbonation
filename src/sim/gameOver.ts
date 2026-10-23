import type { GameState } from '../types';
import { isBankrupt } from './v2/finance';

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
 * unchanged from `stepYear`'s step 13: same order, same reason strings. Returns null when the game goes on.
 * Bankruptcy (phase 44): D/Y > 1 and interest burden > 0.20 for 2 years in a row (24 months in Territorio), the clock
 * `model.fiscal.breachYears` that src/sim/v2/finance.ts keeps. The 1.1 rule (reserves < −0.2·Y and debt > 1.5·Y)
 * is gone: reserves never fall below the floor 0.02·Y any more.
 */
export function evaluateGameOver(state: GameState): string | null {
  const { indicators } = state;
  if (indicators.politicalStability <= 5) return GAME_OVER_REASONS.political;
  if (indicators.biodiversity <= 5) return GAME_OVER_REASONS.ecological;
  if (state.currentLevel >= 2 && indicators.foodSecurity <= 10) return GAME_OVER_REASONS.famine;
  if (isBankrupt(state.model?.fiscal)) return GAME_OVER_REASONS.bankruptcy;
  return null;
}

/** Which game-over reason a `gameOverReason` string is, or null for anything else (e.g. abandon). */
export function gameOverKind(reason: string | null): GameOverKind | null {
  const entry = (Object.entries(GAME_OVER_REASONS) as [GameOverKind, string][]).find(([, text]) => text === reason);
  return entry ? entry[0] : null;
}
