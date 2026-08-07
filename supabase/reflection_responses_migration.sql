-- reflection_responses_migration.sql
-- Fase 9 (mejora-general/files/18_tutoriales_v3.md §7, pantalla 2): las 5 respuestas de reflexion
-- libre del debriefing, para el analisis cualitativo del articulo.
--
-- NO SE APLICO AUTOMATICAMENTE (mismo patron que el resto de las migraciones de este ciclo).
-- src/services/reflectionResponses.ts funciona sin este paso.

CREATE TABLE IF NOT EXISTS public.reflection_responses (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID        NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  level         INT         NOT NULL,
  q1            TEXT,
  q2            TEXT,
  q3            TEXT,
  q4            TEXT,
  q5            TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, level)
);

ALTER TABLE public.reflection_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reflection_responses: select own" ON public.reflection_responses;
CREATE POLICY "reflection_responses: select own"
  ON public.reflection_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.game_sessions gs
      WHERE gs.id = reflection_responses.session_id AND gs.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "reflection_responses: upsert own" ON public.reflection_responses;
CREATE POLICY "reflection_responses: upsert own"
  ON public.reflection_responses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.game_sessions gs
      WHERE gs.id = reflection_responses.session_id AND gs.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "reflection_responses: update own" ON public.reflection_responses;
CREATE POLICY "reflection_responses: update own"
  ON public.reflection_responses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.game_sessions gs
      WHERE gs.id = reflection_responses.session_id AND gs.user_id = auth.uid()
    )
  );
