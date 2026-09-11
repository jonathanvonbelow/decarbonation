import type { GameState } from '../types';

/**
 * Game-over check shared by `stepYear` and the monthly step (src/sim/monthly.ts). Extracted
 * unchanged from `stepYear`'s step 13: same thresholds, same order, same Spanish-only reason
 * strings (see the comment at the call site for why they stay Spanish). Returns null when the
 * game goes on.
 */
export function evaluateGameOver(state: GameState): string | null {
  const { indicators, stellaSpecificState: stella } = state;
  if (indicators.politicalStability <= 5) {
    return 'Colapso Político: La nación ha caído en un estado de ingobernabilidad total.';
  }
  if (indicators.biodiversity <= 5) {
    return 'Colapso Ecológico: La pérdida de biodiversidad ha provocado una catástrofe irreversible.';
  }
  if (state.currentLevel >= 2 && indicators.foodSecurity <= 10) {
    return 'Hambruna: La incapacidad de alimentar a la población ha generado una crisis humanitaria.';
  }
  if (stella.Reservas_del_Tesoro < -(stella.PBI_Real * 0.2) && stella.Deuda > stella.PBI_Real * 1.5) {
    return 'Bancarrota Nacional: La deuda insostenible y la falta de reservas han llevado a la quiebra.';
  }
  return null;
}
