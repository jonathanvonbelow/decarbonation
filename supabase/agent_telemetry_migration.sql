-- agent_telemetry_migration.sql
-- Fase 8 (mejora-general/files/15_decarbonito_agent_actions.md §7): "requisito del artículo sobre
-- aprendizaje social" — toda mutación de estado ejecutada por el agente debe registrarse con su
-- procedencia, separada de las decisiones que tomó el jugador con su propio clic.
--
-- Desvío deliberado del archivo fuente: §7 da un `ALTER TABLE game_events ADD COLUMN ...`, pero
-- el esquema real de este proyecto (supabase/schema.sql) NO tiene una tabla `game_events` — solo
-- `game_sessions` (una fila por partida) y `annual_snapshots` (una fila con el estado final).
-- En vez de inventar una forma de tabla y aplicarla a ciegas contra el proyecto de Supabase en
-- producción, esta migración CREA la tabla que realmente falta, siguiendo las mismas convenciones
-- de supabase/schema.sql (UUID + gen_random_uuid(), RLS con políticas "tabla: acción propia").
--
-- NO SE APLICÓ AUTOMÁTICAMENTE. Alguien con acceso al proyecto de Supabase tiene que correr este
-- archivo manualmente (SQL Editor del dashboard, o `supabase db push` si el proyecto usa la CLI).
-- src/services/agentTelemetry.ts funciona sin este paso (falla en silencio, con una advertencia
-- en consola una sola vez por sesión) para que ninguna partida se rompa mientras tanto.

CREATE TABLE IF NOT EXISTS public.game_events (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID        NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  actor          TEXT        NOT NULL DEFAULT 'player' CHECK (actor IN ('player', 'agent', 'tutorial', 'system')),
  agent_mode     TEXT        CHECK (agent_mode IN ('observer', 'assist', 'tutorial')),
  action         TEXT        NOT NULL,
  ok             BOOLEAN     NOT NULL DEFAULT true,
  args           JSONB,
  -- Hash del pedido del jugador (no el texto crudo), sólo si en el futuro se quiere correlacionar
  -- una acción del agente con el pedido que la disparó — no poblado por agentTelemetry.ts en esta
  -- fase (ver docs/DESIGN_DECISIONS_LOG.md, entrada Fase 8: requeriría enhebrar el texto desde
  -- ConversationPanel hasta acá, fuera de alcance de este pase).
  agent_prompt_hash TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_events_session_actor
  ON public.game_events (session_id, actor);

ALTER TABLE public.game_events ENABLE ROW LEVEL SECURITY;

-- Mismo patrón que game_sessions: el usuario solo ve/inserta eventos de sus propias sesiones,
-- resuelto vía el session_id -> game_sessions.user_id.
DROP POLICY IF EXISTS "game_events: select own" ON public.game_events;
CREATE POLICY "game_events: select own"
  ON public.game_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.game_sessions gs
      WHERE gs.id = game_events.session_id AND gs.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "game_events: insert own" ON public.game_events;
CREATE POLICY "game_events: insert own"
  ON public.game_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.game_sessions gs
      WHERE gs.id = game_events.session_id AND gs.user_id = auth.uid()
    )
  );
