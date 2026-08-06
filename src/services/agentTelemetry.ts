/**
 * agentTelemetry — best-effort provenance logging for agent-executed actions
 * (15_decarbonito_agent_actions.md §7, "requisito del artículo sobre aprendizaje social").
 *
 * Deliberate deviation from the source file, documented in docs/DESIGN_DECISIONS_LOG.md (phase 8
 * entry): §7's migration SQL does `alter table game_events add column ...`, but this project's
 * real schema (supabase/schema.sql) has no `game_events` table at all — only session-level
 * `game_sessions` and `annual_snapshots`. Rather than invent a table shape and run a schema change
 * against the live Supabase project without the user's go-ahead, this module ships a real `INSERT`
 * against a NEW `game_events` table defined in supabase/agent_telemetry_migration.sql, which is
 * NOT applied here — someone with access to the Supabase project needs to run it manually. Until
 * then (and in demo mode, where `supabase` is null), every call below fails silently and is logged
 * to the console once, never crashing a session over telemetry.
 */
import { supabase } from './supabaseService';
import type { AgentMode } from '../components/decarbonito/DecarboNitoProvider';

export interface AgentActionLogEntry {
  action: string;
  args: Record<string, unknown>;
  mode: AgentMode;
  ok: boolean;
}

let warnedOnce = false;

/**
 * Fire-and-forget. `sessionId` is optional because not every caller has one at hand (e.g. demo
 * mode never creates a `game_sessions` row) — those calls are simply skipped, not queued.
 */
export function logAgentAction(entry: AgentActionLogEntry, sessionId?: string | null): void {
  if (!supabase || !sessionId) return;

  void supabase
    .from('game_events')
    .insert({
      session_id: sessionId,
      actor: 'agent',
      agent_mode: entry.mode,
      action: entry.action,
      ok: entry.ok,
      // Args are logged for debugging the agent itself, not as free-text transcripts — §7 asks
      // specifically for a *hash* of the player's prompt (not stored here at all; that would need
      // to be threaded in from the ConversationPanel's input, out of scope for this pass) to avoid
      // storing raw text without explicit consent.
      args: entry.args,
    })
    .then(({ error }) => {
      if (error && !warnedOnce) {
        warnedOnce = true;
        // Expected until supabase/agent_telemetry_migration.sql is applied — one console warning
        // per session is enough signal without spamming on every single agent action.
        console.warn('[agentTelemetry] game_events insert failed (table likely not migrated yet):', error.message);
      }
    });
}
