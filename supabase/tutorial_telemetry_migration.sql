-- tutorial_telemetry_migration.sql
-- Fase 9 (mejora-general/files/18_tutoriales_v3.md §8): tasa de finalizacion por capitulo, paso
-- donde mas gente abandona, correlacion entre capitulos completados y desempeno.
--
-- Mismo patron que supabase/agent_telemetry_migration.sql (Fase 8): NO SE APLICO
-- AUTOMATICAMENTE. src/services/tutorialTelemetry.ts funciona sin este paso (falla en silencio,
-- con una advertencia en consola una sola vez por sesion).

CREATE TABLE IF NOT EXISTS public.tutorial_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID        NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  chapter      TEXT        NOT NULL,
  step         TEXT,
  action       TEXT        NOT NULL CHECK (action IN ('offered', 'started', 'step_completed', 'skipped', 'abandoned', 'completed')),
  elapsed_ms   INT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tutorial_events_session_chapter
  ON public.tutorial_events (session_id, chapter);

ALTER TABLE public.tutorial_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tutorial_events: select own" ON public.tutorial_events;
CREATE POLICY "tutorial_events: select own"
  ON public.tutorial_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.game_sessions gs
      WHERE gs.id = tutorial_events.session_id AND gs.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tutorial_events: insert own" ON public.tutorial_events;
CREATE POLICY "tutorial_events: insert own"
  ON public.tutorial_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.game_sessions gs
      WHERE gs.id = tutorial_events.session_id AND gs.user_id = auth.uid()
    )
  );
