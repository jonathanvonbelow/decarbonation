/**
 * funnelTelemetry — best-effort logging for the adoption funnel (20_landing_shareables.md §7).
 * Same degrade-gracefully pattern as predictionTelemetry.ts/agentTelemetry.ts/tutorialTelemetry.ts
 * (phases 8-10): the `funnel_events` table isn't applied to the live Supabase project yet, so this
 * warns once and no-ops rather than breaking anything. No third-party analytics tool is used, per
 * the source file's own instruction ("sin herramientas de terceros que compliquen el
 * consentimiento") — this is the same Supabase project every other telemetry call already writes
 * to, gated by the same privacy notice (see the landing's FAQ "¿Qué datos guardan?").
 *
 * Deviation from the source table: `landing_view` is the one event this file's own module can't
 * emit from inside a React component (the landing page ships zero React, see index.html's own
 * comment) — it's called directly from src/landing.ts instead, the landing's own tiny Vite-
 * processed module, using this same function.
 */
import { supabase } from './supabaseService';

export type FunnelEvent =
  | 'landing_view'
  | 'play_click'
  | 'game_start'
  | 'first_decision'
  | 'year_simulated'
  | 'level_completed'
  | 'debrief_completed'
  | 'share_clicked';

let warnedOnce = false;

export function logFunnelEvent(event: FunnelEvent, properties: Record<string, string | number | boolean | null | undefined> = {}): void {
  if (!supabase) return;

  void supabase
    .from('funnel_events')
    .insert({ event, properties })
    .then(({ error }: { error: { message: string } | null }) => {
      if (error && !warnedOnce) {
        warnedOnce = true;
        console.warn('[funnelTelemetry] funnel_events insert failed (table likely not migrated yet):', error.message);
      }
    });
}
