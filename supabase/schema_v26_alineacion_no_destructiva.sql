-- =============================================================================
-- Alineación NO destructiva de la base de producción con supabase/schema.sql (v2.6, "set mínimo de datos").
-- Aplicada el 2026-10-28 en el SQL Editor de Supabase.
--
-- Diagnóstico: producción seguía con el esquema de mayo (schema.sql v2.6 nunca se aplicó). Por eso, desde el 2026-08-02:
--   - game_sessions: el código manda anio_inicio / anio_fin, que no existían → 400 en cada createGameSession
--     (y, sin sesión, nada más del juego de 3 niveles se guardaba para usuarios logueados);
--   - annual_snapshots: el código hace upsert de UNA fila final por sesión (columnas *_final, onConflict session_id),
--     la tabla seguía con una fila por año (anio NOT NULL, UNIQUE (session_id, anio));
--   - pre_survey: faltaba bloque_convocatoria y experiencia_simulacion era TEXT (el código manda BOOLEAN);
--   - post_survey: faltaba utilidad_sintesis.
--
-- A diferencia de schema.sql (que hace DROP COLUMN), este script NO pierde datos:
--   - las filas anuales viejas de annual_snapshots se copian a public.annual_snapshots_v1_anual (verificando el conteo)
--     antes de reestructurar la tabla;
--   - pre_survey.experiencia_simulacion (TEXT, otra pregunta) se renombra a experiencia_simulacion_v1;
--   - las columnas viejas de pre_survey / post_survey (nullable) se conservan.
-- Idempotente: se puede correr dos veces sin error ni pérdida.
-- =============================================================================

BEGIN;

-- 1. game_sessions
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS anio_inicio INT;
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS anio_fin    INT;
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_started ON public.game_sessions (user_id, started_at);

-- 2. annual_snapshots: de "una fila por año" a "una fila final por sesión", con respaldo de lo anterior
DO $$
DECLARE
  n_orig   BIGINT;
  n_copied BIGINT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'annual_snapshots' AND column_name = 'anio'
  ) THEN
    CREATE TABLE IF NOT EXISTS public.annual_snapshots_v1_anual AS
      SELECT * FROM public.annual_snapshots WITH NO DATA;
    ALTER TABLE public.annual_snapshots_v1_anual ENABLE ROW LEVEL SECURITY;  -- sin políticas: solo dashboard / service role

    SELECT count(*) INTO n_orig FROM public.annual_snapshots;
    INSERT INTO public.annual_snapshots_v1_anual
      SELECT * FROM public.annual_snapshots s
      WHERE NOT EXISTS (SELECT 1 FROM public.annual_snapshots_v1_anual b WHERE b.id = s.id);
    SELECT count(*) INTO n_copied
      FROM public.annual_snapshots s
      WHERE EXISTS (SELECT 1 FROM public.annual_snapshots_v1_anual b WHERE b.id = s.id);
    IF n_copied <> n_orig THEN
      RAISE EXCEPTION 'Respaldo incompleto de annual_snapshots: % de % filas', n_copied, n_orig;
    END IF;

    DELETE FROM public.annual_snapshots;
    ALTER TABLE public.annual_snapshots DROP CONSTRAINT IF EXISTS uq_annual_snapshots_session_anio;
    DROP INDEX IF EXISTS public.idx_annual_snapshots_session_anio;
    ALTER TABLE public.annual_snapshots DROP COLUMN IF EXISTS anio;
    ALTER TABLE public.annual_snapshots DROP COLUMN IF EXISTS biodiversidad;
    ALTER TABLE public.annual_snapshots DROP COLUMN IF EXISTS co2_per_capita;
    ALTER TABLE public.annual_snapshots DROP COLUMN IF EXISTS seg_alimentaria;
    ALTER TABLE public.annual_snapshots DROP COLUMN IF EXISTS seg_economica;
    ALTER TABLE public.annual_snapshots DROP COLUMN IF EXISTS bienestar_social;
    ALTER TABLE public.annual_snapshots DROP COLUMN IF EXISTS estabilidad_politica;
    ALTER TABLE public.annual_snapshots DROP COLUMN IF EXISTS score_general;
    ALTER TABLE public.annual_snapshots DROP COLUMN IF EXISTS politicas_activas;
  END IF;
END $$;

ALTER TABLE public.annual_snapshots ADD COLUMN IF NOT EXISTS biodiversidad_final     NUMERIC;
ALTER TABLE public.annual_snapshots ADD COLUMN IF NOT EXISTS co2_final               NUMERIC;
ALTER TABLE public.annual_snapshots ADD COLUMN IF NOT EXISTS seg_alimentaria_final   NUMERIC;
ALTER TABLE public.annual_snapshots ADD COLUMN IF NOT EXISTS seg_economica_final     NUMERIC;
ALTER TABLE public.annual_snapshots ADD COLUMN IF NOT EXISTS score_final             NUMERIC;
ALTER TABLE public.annual_snapshots ADD COLUMN IF NOT EXISTS politicas_activas_final JSONB;
ALTER TABLE public.annual_snapshots ADD COLUMN IF NOT EXISTS created_at              TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_annual_snapshots_session' AND conrelid = 'public.annual_snapshots'::regclass
  ) THEN
    ALTER TABLE public.annual_snapshots ADD CONSTRAINT uq_annual_snapshots_session UNIQUE (session_id);
  END IF;
END $$;

-- El upsert (INSERT ... ON CONFLICT DO UPDATE) necesita también una política de UPDATE bajo RLS.
DROP POLICY IF EXISTS "annual_snapshots: update own" ON public.annual_snapshots;
CREATE POLICY "annual_snapshots: update own"
  ON public.annual_snapshots
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.game_sessions gs WHERE gs.id = session_id AND gs.user_id = auth.uid()));

-- 3. pre_survey: la pregunta 2 pasó de nivel de experiencia (TEXT) a sí/no (BOOLEAN). Se conserva la respuesta vieja.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pre_survey'
      AND column_name = 'experiencia_simulacion' AND data_type <> 'boolean'
  ) THEN
    ALTER TABLE public.pre_survey RENAME COLUMN experiencia_simulacion TO experiencia_simulacion_v1;
  END IF;
END $$;
ALTER TABLE public.pre_survey ADD COLUMN IF NOT EXISTS experiencia_simulacion BOOLEAN;
ALTER TABLE public.pre_survey ADD COLUMN IF NOT EXISTS bloque_convocatoria    TEXT;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pre_survey_bloque_convocatoria_check' AND conrelid = 'public.pre_survey'::regclass
  ) THEN
    ALTER TABLE public.pre_survey ADD CONSTRAINT pre_survey_bloque_convocatoria_check
      CHECK (bloque_convocatoria IS NULL OR bloque_convocatoria IN ('1', '2', '3', '4', 'no_aplica'));
  END IF;
END $$;

-- 4. post_survey
ALTER TABLE public.post_survey ADD COLUMN IF NOT EXISTS utilidad_sintesis INT;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'post_survey_utilidad_sintesis_check' AND conrelid = 'public.post_survey'::regclass
  ) THEN
    ALTER TABLE public.post_survey ADD CONSTRAINT post_survey_utilidad_sintesis_check
      CHECK (utilidad_sintesis IS NULL OR utilidad_sintesis BETWEEN 1 AND 5);
  END IF;
END $$;

COMMIT;

-- Que PostgREST vea las columnas nuevas sin esperar.
NOTIFY pgrst, 'reload schema';
