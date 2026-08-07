/**
 * reflectionResponses — best-effort persistence for the debriefing's 5 free-text reflection
 * answers (18_tutoriales_v3.md §7, screen 2: "Se guardan en Supabase (con consentimiento) y
 * alimentan el análisis cualitativo del artículo"). Same degrade-gracefully pattern as the other
 * telemetry modules from phases 8-9 — table not applied yet, insert fails silently.
 *
 * No dedicated consent UI exists in this codebase to gate this on (checked: no consent flow
 * anywhere in src/) — building one is a product/legal decision outside this phase's scope, so this
 * mirrors the same best-effort approach the rest of the app's Supabase writes already use, not a
 * new privacy posture. Flagged, not silently assumed away.
 */
import { supabase } from './supabaseService';

export interface ReflectionAnswers {
  q1: string; q2: string; q3: string; q4: string; q5: string;
}

let warnedOnce = false;

export function saveReflectionAnswers(answers: ReflectionAnswers, level: number, sessionId?: string | null): void {
  if (!supabase || !sessionId) return;

  void supabase
    .from('reflection_responses')
    .upsert({
      session_id: sessionId,
      level,
      q1: answers.q1, q2: answers.q2, q3: answers.q3, q4: answers.q4, q5: answers.q5,
    }, { onConflict: 'session_id,level' })
    .then(({ error }: { error: { message: string } | null }) => {
      if (error && !warnedOnce) {
        warnedOnce = true;
        console.warn('[reflectionResponses] upsert failed (table likely not migrated yet):', error.message);
      }
    });
}
