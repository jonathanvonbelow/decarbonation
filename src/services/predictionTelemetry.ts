/**
 * predictionTelemetry — best-effort logging for the prediction mechanic (18_tutoriales_v3.md §5).
 * Same degrade-gracefully pattern as agentTelemetry.ts/tutorialTelemetry.ts (phases 8-9): the
 * `predictions` table isn't applied to the live Supabase project yet.
 */
import { supabase } from './supabaseService';
import type { PredictionResult } from '../components/tutorial/predictions';

let warnedOnce = false;

export function logPrediction(result: PredictionResult, year: number, level: number, sessionId?: string | null): void {
  if (!supabase || !sessionId) return;

  void supabase
    .from('predictions')
    .insert({
      session_id: sessionId,
      year,
      level,
      indicator: result.indicator,
      predicted: result.predicted,
      actual: result.actual,
      delta: result.delta,
    })
    .then(({ error }: { error: { message: string } | null }) => {
      if (error && !warnedOnce) {
        warnedOnce = true;
        console.warn('[predictionTelemetry] predictions insert failed (table likely not migrated yet):', error.message);
      }
    });
}
