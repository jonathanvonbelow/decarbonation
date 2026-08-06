/**
 * General score (0-1000), per level. Ported verbatim from src/App.tsx (`runSimulationRound`,
 * "8. Recalculate Score" block) as part of the phase-2 extraction
 * (mejora-general/files/16_auditoria_ecuaciones.md). No formula changed.
 *
 * Precondition: `indicators.pbi`, `.debt`, `.treasuryReserves`, `.ppAgricola`,
 * `.ppAmbientalista` and `.ppSocial` must already be synced from `StellaStocks` for the current
 * year (matches the original's step 7, "Update final indicators from stella state", which
 * always runs immediately before step 8).
 *
 * docs/audit-equations.md item S-1: verify the per-level weights below sum to 1.0 and that the
 * PBI score reference ceiling (25000, level 3 only) is still a defensible number — tracked as
 * part of the equations audit, not changed here.
 */
import type { ControlParams, Indicators } from '../types';

export function computeScore(indicators: Indicators, currentLevel: number, CP: ControlParams): number {
  const carbonScoreRaw = 100 - (indicators.co2EqEmissionsPerCapita / CP.Referencia_Max_CO2_per_Capita_Puntaje) * 100;
  const carbonScore = Math.max(0, carbonScoreRaw);

  let finalScore = 0;
  if (currentLevel === 1) {
    const econScore = Math.min(100, Math.max(0, indicators.economicSecurity));
    finalScore = indicators.biodiversity * 0.4 + carbonScore * 0.45 + econScore * 0.15;
  } else if (currentLevel === 2) {
    const avgPressure = (indicators.ppAgricola + indicators.ppAmbientalista + indicators.ppSocial) / 3;
    const polPressureScore = Math.max(0, 100 - avgPressure);
    const avgExternalities =
      (indicators.foodSecurity + indicators.economicSecurity + indicators.socialWellbeing + indicators.politicalStability) / 4;
    finalScore = indicators.biodiversity * 0.15 + carbonScore * 0.2 + polPressureScore * 0.3 + avgExternalities * 0.35;
  } else {
    const avgPressure = (indicators.ppAgricola + indicators.ppAmbientalista + indicators.ppSocial) / 3;
    const polPressureScore = Math.max(0, 100 - avgPressure);
    const avgExternalities =
      (indicators.foodSecurity + indicators.economicSecurity + indicators.socialWellbeing + indicators.politicalStability) / 4;
    const pbiScore = Math.min(100, (indicators.pbi / 25000) * 100);
    finalScore =
      indicators.biodiversity * 0.1 + carbonScore * 0.15 + polPressureScore * 0.2 + avgExternalities * 0.25 + pbiScore * 0.3;
  }
  return finalScore * 10;
}
