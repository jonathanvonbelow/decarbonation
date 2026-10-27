/**
 * predictionTelemetry — best-effort logging for the prediction mechanic (18_tutoriales_v3.md §5).
 * Same degrade-gracefully pattern as agentTelemetry.ts/tutorialTelemetry.ts (phases 8-9): the
 * `predictions` table isn't applied to the live Supabase project yet.
 *
 * v6 / phase 32: every row carries `model_version`. v6 / phase 48: also the "no change" `band` used and the
 * persistence baseline `persistence_pred` (mejora-general/files/48 §4). Each optional column a project has not
 * migrated yet (supabase/model_version_migration.sql, supabase/research_indices_migration.sql) is dropped and the
 * row resent (sendWithOptionalColumns).
 */
import { supabase } from './supabaseService';
import { sendWithOptionalColumns } from './modelVersionColumn';
import { MODEL_VERSION_BY_GAME } from '../sim/version';
import type { PredictionResult } from '../components/tutorial/predictions';

let warnedOnce = false;

/** The row inserted into `predictions` (without the optional columns). Exported for tests. */
export function predictionRow(result: PredictionResult, year: number, level: number, sessionId: string): Record<string, unknown> {
  return {
    session_id: sessionId,
    year,
    level,
    indicator: result.indicator,
    predicted: result.predicted,
    actual: result.actual,
    delta: result.delta,
  };
}

/** Optional columns of a prediction row, each dropped if the table lacks it. */
export function predictionOptionalColumns(result: PredictionResult): Record<string, unknown> {
  return {
    model_version: MODEL_VERSION_BY_GAME.niveles,
    band: result.band,
    persistence_pred: result.persistencePred,
  };
}

export function logPrediction(result: PredictionResult, year: number, level: number, sessionId?: string | null): void {
  if (!supabase || !sessionId) return;
  const client = supabase;

  void sendWithOptionalColumns(
    'predictions',
    predictionRow(result, year, level, sessionId),
    predictionOptionalColumns(result),
    (row) => client.from('predictions').insert(row),
  ).then(({ error }: { error: { message: string } | null }) => {
    if (error && !warnedOnce) {
      warnedOnce = true;
      console.warn('[predictionTelemetry] predictions insert failed (table likely not migrated yet):', error.message);
    }
  });
}
