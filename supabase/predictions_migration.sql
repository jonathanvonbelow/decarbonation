-- predictions_migration.sql
-- Fase 9 (mejora-general/files/18_tutoriales_v3.md §5): serie de predicciones por jugador y anio,
-- la variable dependiente central del articulo sobre aprendizaje ("la tasa de acierto deberia
-- crecer a lo largo de la partida").
--
-- Adaptada a las convenciones reales de supabase/schema.sql: UUID + gen_random_uuid() y RLS
-- "tabla: accion propia" en vez del `bigint generated always as identity` sin RLS que usa el
-- pseudocodigo del archivo fuente (ese esquema no tiene owner/session vinculado a auth.uid()).
-- Mismo patron de NO APLICACION AUTOMATICA que las otras migraciones de este ciclo (Fase 8/9):
-- src/services/predictionTelemetry.ts funciona sin este paso.

CREATE TABLE IF NOT EXISTS public.predictions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID        NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  year          INT         NOT NULL,
  level         INT         NOT NULL,
  indicator     TEXT        NOT NULL,
  predicted     TEXT        NOT NULL CHECK (predicted IN ('down', 'flat', 'up')),
  actual        TEXT        NOT NULL CHECK (actual IN ('down', 'flat', 'up')),
  delta         NUMERIC     NOT NULL,
  correct       BOOLEAN     GENERATED ALWAYS AS (predicted = actual) STORED,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_predictions_session_year
  ON public.predictions (session_id, year);

ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "predictions: select own" ON public.predictions;
CREATE POLICY "predictions: select own"
  ON public.predictions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.game_sessions gs
      WHERE gs.id = predictions.session_id AND gs.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "predictions: insert own" ON public.predictions;
CREATE POLICY "predictions: insert own"
  ON public.predictions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.game_sessions gs
      WHERE gs.id = predictions.session_id AND gs.user_id = auth.uid()
    )
  );
