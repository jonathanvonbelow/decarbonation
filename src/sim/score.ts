/**
 * General score (0-1000), per level.
 *
 * Phase 49 (mejora-general/files/49_recalibracion_rutas_puntaje.md §1; prototype `score()` in
 * scripts/reference/modelo_v2.py; closes N-11/T-10):
 *
 *   C_sc = 100 · clip((1.25·c₀ − c) / c₀, 0, 1)      c₀ = CO₂e per capita at level start (model 2.0 anchors)
 *   P_sc = 100 − π̄;   X = (F + E + W + St) / 4;   Y_sc = min(100, 100·Y / (2·Y₀))
 *   S = 10 × { N1: 0.40·B + 0.45·C_sc + 0.15·E
 *              N2: 0.15·B + 0.20·C_sc + 0.30·P_sc + 0.35·X
 *              N3: 0.10·B + 0.15·C_sc + 0.20·P_sc + 0.25·X + 0.30·Y_sc }
 *
 * The carbon component is anchored to each level's own starting CO₂ (it is worth 25 at t = 0: room to improve and to
 * get worse; before, `100 − c/12·100` left level 2 at 0 from the start) and the GDP component rewards doubling the
 * starting GDP (before, a fixed 25 000 ceiling). `Referencia_Max_CO2_per_Capita_Puntaje` is gone.
 *
 * Precondition: `indicators.pbi` and the three pressures are already synced from `StellaStocks` for the current step.
 */
import type { Indicators } from '../types';

/** Level-start references of the score (the model 2.0 anchors: `model.anchors.c0` / `.gdp0`). */
export interface ScoreAnchors { c0: number; gdp0: number }

/** Weights of each component per level (INV-14: each row sums to 1). */
export const SCORE_WEIGHTS = {
  1: { biodiversity: 0.40, carbon: 0.45, economic: 0.15 },
  2: { biodiversity: 0.15, carbon: 0.20, pressure: 0.30, externalities: 0.35 },
  3: { biodiversity: 0.10, carbon: 0.15, pressure: 0.20, externalities: 0.25, gdp: 0.30 },
} as const;

/** Carbon margin of the score: C_sc is 0 at 1.25·c₀ and 100 at 0.25·c₀ (prototype `score()`; criterio experto, 49). */
export const CARBON_CEILING_FACTOR = 1.25;
/** GDP multiple of Y₀ that fills the level-3 GDP component (prototype: 2·Y₀; criterio experto, 49). */
export const GDP_FULL_MULTIPLE = 2;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export interface ScoreComponents {
  /** C_sc, 0-100. */
  carbon: number;
  /** P_sc = 100 − mean pressure, 0-100. */
  pressure: number;
  /** X = mean of F, E, W, St. */
  externalities: number;
  /** Y_sc, 0-100 (level 3). */
  gdp: number;
  /** E clipped to 0-100 (level 1). */
  economic: number;
}

export function scoreComponents(indicators: Indicators, anchors: ScoreAnchors): ScoreComponents {
  const c0 = anchors.c0 > 0 ? anchors.c0 : 1;
  const carbon = 100 * clamp((CARBON_CEILING_FACTOR * c0 - indicators.co2EqEmissionsPerCapita) / c0, 0, 1);
  const avgPressure = (indicators.ppAgricola + indicators.ppAmbientalista + indicators.ppSocial) / 3;
  const pressure = Math.max(0, 100 - avgPressure);
  const externalities =
    (indicators.foodSecurity + indicators.economicSecurity + indicators.socialWellbeing + indicators.politicalStability) / 4;
  const gdp = anchors.gdp0 > 0 ? clamp((100 * indicators.pbi) / (GDP_FULL_MULTIPLE * anchors.gdp0), 0, 100) : 0;
  const economic = clamp(indicators.economicSecurity, 0, 100);
  return { carbon, pressure, externalities, gdp, economic };
}

export function computeScore(indicators: Indicators, currentLevel: number, anchors: ScoreAnchors): number {
  const k = scoreComponents(indicators, anchors);
  const B = indicators.biodiversity;
  if (currentLevel === 1) {
    const w = SCORE_WEIGHTS[1];
    return 10 * (w.biodiversity * B + w.carbon * k.carbon + w.economic * k.economic);
  }
  if (currentLevel === 2) {
    const w = SCORE_WEIGHTS[2];
    return 10 * (w.biodiversity * B + w.carbon * k.carbon + w.pressure * k.pressure + w.externalities * k.externalities);
  }
  const w = SCORE_WEIGHTS[3];
  return 10 * (w.biodiversity * B + w.carbon * k.carbon + w.pressure * k.pressure + w.externalities * k.externalities + w.gdp * k.gdp);
}
