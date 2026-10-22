/**
 * predictionTelemetry — best-effort logging for the prediction mechanic (18_tutoriales_v3.md §5).
 * Same degrade-gracefully pattern as agentTelemetry.ts/tutorialTelemetry.ts (phases 8-9): the
 * `predictions` table isn't applied to the live Supabase project yet.
 *
 * v6 / phase 32: every row carries `model_version` (sendWithModelVersion: if the table has not run
 * supabase/model_version_migration.sql, the row is resent without the column).
 */
import { supabase } from './supabaseService';
import { sendWithModelVersion } from './modelVersionColumn';
import { MODEL_VERSION_BY_GAME } from '../sim/version';
import type { PredictionResult } from '../components/tutorial/predictions';

let warnedOnce = false;

export function logPrediction(result: PredictionResult, year: number, level: number, sessionId?: string | null): void {
  if (!supabase || !sessionId) return;
  const client = supabase;

  void sendWithModelVersion(
    'predictions',
    {
      session_id: sessionId,
      year,
      level,
      indicator: result.indicator,
      predicted: result.predicted,
      actual: result.actual,
      delta: result.delta,
    },
    MODEL_VERSION_BY_GAME.niveles,
    (row) => client.from('predictions').insert(row),
  ).then(({ error }: { error: { message: string } | null }) => {
    if (error && !warnedOnce) {
      warnedOnce = true;
      console.warn('[predictionTelemetry] predictions insert failed (table likely not migrated yet):', error.message);
    }
  });
}
