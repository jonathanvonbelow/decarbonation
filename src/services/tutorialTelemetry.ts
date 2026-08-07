/**
 * tutorialTelemetry — best-effort chapter-completion logging (18_tutoriales_v3.md §8). Same
 * pattern as src/services/agentTelemetry.ts (phase 8): the target table doesn't exist in this
 * project's real Supabase schema yet, so this fails silently (one console warning per session)
 * until supabase/tutorial_telemetry_migration.sql is applied by someone with project access.
 */
import { supabase } from './supabaseService';
import type { ChapterId } from '../components/tutorial/types';

export interface TutorialEventLogEntry {
  chapter: ChapterId;
  step?: string;
  action: 'offered' | 'started' | 'step_completed' | 'skipped' | 'abandoned' | 'completed';
  elapsedMs?: number;
}

let warnedOnce = false;

export function logTutorialEvent(entry: TutorialEventLogEntry, sessionId?: string | null): void {
  if (!supabase || !sessionId) return;

  void supabase
    .from('tutorial_events')
    .insert({
      session_id: sessionId,
      chapter: entry.chapter,
      step: entry.step ?? null,
      action: entry.action,
      elapsed_ms: entry.elapsedMs ?? null,
    })
    .then(({ error }: { error: { message: string } | null }) => {
      if (error && !warnedOnce) {
        warnedOnce = true;
        console.warn('[tutorialTelemetry] tutorial_events insert failed (table likely not migrated yet):', error.message);
      }
    });
}
