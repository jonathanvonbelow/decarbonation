-- =============================================================================
-- DecarboNation v2.6 — Supabase Schema
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query
-- =============================================================================
--
-- Recorte a "set mínimo de datos" (ver ultimo-ajuste/05_datos_minimos_supabase.md):
--   - `game_sessions`: una fila por partida (no una fila por nivel).
--   - `annual_snapshots`: una fila por sesión con el estado FINAL (no una fila
--     por año simulado).
--   - `pre_survey` / `post_survey`: recortadas a 3 y 4 preguntas respectivamente.
--   - `policy_decisions` y `chat_interactions` (logging turno a turno / mensaje
--     a mensaje) se decide explícitamente NO implementarlas este ciclo — es un
--     recorte deliberado de alcance, no un olvido. Ver sección 1 de ese archivo.
--
-- Este script está pensado para poder re-ejecutarse sin errores (CREATE TABLE
-- IF NOT EXISTS / ALTER ... ADD COLUMN IF NOT EXISTS / DROP POLICY IF EXISTS +
-- recreate), pero debe ser ejecutado MANUALMENTE por un humano contra el
-- proyecto Supabase real — no se auto-aplica.
--
-- Si el INSERT en `game_sessions` sigue fallando con 400 (timeout) en
-- producción, ese bug NO tiene causa visible en este archivo (no hay triggers
-- ni políticas RLS recursivas sobre `game_sessions`). Diagnosticarlo requiere
-- correr las queries de `information_schema.triggers` / `pg_policies` de
-- debug_supabase_persistence.md directamente en el SQL Editor de Supabase
-- contra la base en vivo — no se puede reproducir ni depurar desde acá.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. TABLA: profiles
--    Extiende auth.users. Se puebla automáticamente via trigger.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  nombre      TEXT,
  afiliacion  TEXT,
  rol         TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: cada usuario ve y edita solo su propio perfil
DROP POLICY IF EXISTS "profiles: select own" ON public.profiles;
CREATE POLICY "profiles: select own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles: update own" ON public.profiles;
CREATE POLICY "profiles: update own"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 2. TRIGGER: on_auth_user_created
--    Crea automáticamente un perfil cuando un usuario se registra via Google OAuth.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Eliminar trigger si ya existía (seguro para re-ejecución)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 3. TABLA: game_sessions
--    Registra cada partida jugada por un usuario.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nivel_alcanzado    INT,
  duracion_segundos  INT,
  resultado          TEXT        CHECK (resultado IN ('victoria', 'derrota', 'abandono', 'demo')),
  anio_inicio        INT,
  anio_fin           INT,
  started_at         TIMESTAMPTZ DEFAULT NOW(),
  ended_at           TIMESTAMPTZ
);

-- Migración idempotente para instalaciones existentes (creadas antes de que
-- se agregaran año_inicio/año_fin — ver ultimo-ajuste/05_datos_minimos_supabase.md).
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS anio_inicio INT;
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS anio_fin    INT;

CREATE INDEX IF NOT EXISTS idx_game_sessions_user_started
  ON public.game_sessions (user_id, started_at);

-- Habilitar RLS
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: el usuario gestiona solo sus propias sesiones
DROP POLICY IF EXISTS "game_sessions: select own" ON public.game_sessions;
CREATE POLICY "game_sessions: select own"
  ON public.game_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "game_sessions: insert own" ON public.game_sessions;
CREATE POLICY "game_sessions: insert own"
  ON public.game_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "game_sessions: update own" ON public.game_sessions;
CREATE POLICY "game_sessions: update own"
  ON public.game_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. TABLA: annual_snapshots
--    Versión mínima (ultimo-ajuste/05_datos_minimos_supabase.md, sección 2):
--    UNA fila por sesión con el estado FINAL — no una fila por año simulado.
--    Si en el futuro se necesita la serie completa año a año, este es el
--    lugar para reintroducir la columna `anio` y volver a una unicidad
--    compuesta (session_id, anio); documentado como diseño v3.0.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.annual_snapshots (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id               UUID        NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  biodiversidad_final      NUMERIC,
  co2_final                NUMERIC,
  seg_alimentaria_final    NUMERIC,
  seg_economica_final      NUMERIC,
  score_final              NUMERIC,
  politicas_activas_final  JSONB,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

-- Migración idempotente desde la versión "una fila por año" (mayo): elimina
-- las columnas/índice/constraint de esa versión si existen en una instalación
-- previa, y agrega las columnas nuevas si faltan.
DROP INDEX IF EXISTS idx_annual_snapshots_session_anio;
ALTER TABLE public.annual_snapshots DROP CONSTRAINT IF EXISTS uq_annual_snapshots_session_anio;
ALTER TABLE public.annual_snapshots DROP COLUMN IF EXISTS anio;
ALTER TABLE public.annual_snapshots DROP COLUMN IF EXISTS biodiversidad;
ALTER TABLE public.annual_snapshots DROP COLUMN IF EXISTS co2_per_capita;
ALTER TABLE public.annual_snapshots DROP COLUMN IF EXISTS seg_alimentaria;
ALTER TABLE public.annual_snapshots DROP COLUMN IF EXISTS seg_economica;
ALTER TABLE public.annual_snapshots DROP COLUMN IF EXISTS bienestar_social;
ALTER TABLE public.annual_snapshots DROP COLUMN IF EXISTS estabilidad_politica;
ALTER TABLE public.annual_snapshots DROP COLUMN IF EXISTS score_general;
ALTER TABLE public.annual_snapshots DROP COLUMN IF EXISTS politicas_activas;

ALTER TABLE public.annual_snapshots ADD COLUMN IF NOT EXISTS biodiversidad_final     NUMERIC;
ALTER TABLE public.annual_snapshots ADD COLUMN IF NOT EXISTS co2_final               NUMERIC;
ALTER TABLE public.annual_snapshots ADD COLUMN IF NOT EXISTS seg_alimentaria_final   NUMERIC;
ALTER TABLE public.annual_snapshots ADD COLUMN IF NOT EXISTS seg_economica_final     NUMERIC;
ALTER TABLE public.annual_snapshots ADD COLUMN IF NOT EXISTS score_final             NUMERIC;
ALTER TABLE public.annual_snapshots ADD COLUMN IF NOT EXISTS politicas_activas_final JSONB;
ALTER TABLE public.annual_snapshots ADD COLUMN IF NOT EXISTS created_at              TIMESTAMPTZ DEFAULT NOW();

-- Garantizar un único snapshot (final) por sesión — el código hace upsert con
-- onConflict: 'session_id'.
ALTER TABLE public.annual_snapshots
  DROP CONSTRAINT IF EXISTS uq_annual_snapshots_session;
ALTER TABLE public.annual_snapshots
  ADD CONSTRAINT uq_annual_snapshots_session UNIQUE (session_id);

-- Habilitar RLS
ALTER TABLE public.annual_snapshots ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: acceso via join a game_sessions (solo el dueño de la sesión)
DROP POLICY IF EXISTS "annual_snapshots: insert own" ON public.annual_snapshots;
CREATE POLICY "annual_snapshots: insert own"
  ON public.annual_snapshots
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.game_sessions gs
      WHERE gs.id = session_id
        AND gs.user_id = auth.uid()
    )
  );

-- Política UPDATE: necesaria porque insertFinalSnapshot() hace upsert
-- (INSERT ... ON CONFLICT (session_id) DO UPDATE), y Postgres exige que la
-- rama de UPDATE de un upsert también cumpla una política de UPDATE bajo RLS.
DROP POLICY IF EXISTS "annual_snapshots: update own" ON public.annual_snapshots;
CREATE POLICY "annual_snapshots: update own"
  ON public.annual_snapshots
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.game_sessions gs
      WHERE gs.id = session_id
        AND gs.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "annual_snapshots: select own" ON public.annual_snapshots;
CREATE POLICY "annual_snapshots: select own"
  ON public.annual_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.game_sessions gs
      WHERE gs.id = session_id
        AND gs.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 5. TABLA: pre_survey
--    Encuesta inicial (pre-juego) respondida por el usuario.
--    Recortada a 3 preguntas esenciales — ver
--    ultimo-ajuste/05_datos_minimos_supabase.md sección 2:
--      1. vinculo_clima          — vínculo principal con clima/sostenibilidad
--      2. experiencia_simulacion — experiencia previa con simulaciones de
--                                  política pública (sí/no real, no derivado)
--      3. bloque_convocatoria    — bloque de convocatoria 1-4 (o 'no_aplica'),
--                                  ver ultimo-ajuste/04_recalibracion_actores_y_convocatoria.md
--    `familiaridad_afolu` (hardcoded a 3) y `pais_region` (hardcoded vacío) se
--    eliminan: no se preguntaban de verdad, eran datos fabricados. `expectativa`
--    se reemplaza por `bloque_convocatoria` (ver sección 2 del archivo 05).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pre_survey (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id             UUID        REFERENCES public.game_sessions(id) ON DELETE SET NULL,
  vinculo_clima          TEXT,
  experiencia_simulacion BOOLEAN,
  bloque_convocatoria    TEXT        CHECK (bloque_convocatoria IN ('1', '2', '3', '4', 'no_aplica')),
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_pre_survey_user_session UNIQUE (user_id, session_id)
);

-- Migración idempotente desde la versión de mayo (elimina columnas fabricadas
-- / off-spec si existen, agrega las nuevas si faltan).
ALTER TABLE public.pre_survey DROP COLUMN IF EXISTS familiaridad_afolu;
ALTER TABLE public.pre_survey DROP COLUMN IF EXISTS expectativa;
ALTER TABLE public.pre_survey DROP COLUMN IF EXISTS pais_region;
ALTER TABLE public.pre_survey DROP COLUMN IF EXISTS comentario_abierto;

-- experiencia_simulacion pasa de TEXT (enum ninguna/basica/intermedia/avanzada,
-- otra pregunta) a BOOLEAN (sí/no real). Envuelto en un chequeo de tipo actual
-- para que sea seguro re-ejecutar: sin el chequeo, cada re-ejecución del
-- script volvería a poner en NULL todas las respuestas booleanas ya
-- guardadas, porque "TYPE boolean USING NULL" se aplica incondicionalmente.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pre_survey'
      AND column_name = 'experiencia_simulacion' AND data_type <> 'boolean'
  ) THEN
    ALTER TABLE public.pre_survey ALTER COLUMN experiencia_simulacion TYPE BOOLEAN USING NULL;
  END IF;
END $$;

ALTER TABLE public.pre_survey ADD COLUMN IF NOT EXISTS bloque_convocatoria TEXT
  CHECK (bloque_convocatoria IN ('1', '2', '3', '4', 'no_aplica'));

-- Habilitar RLS
ALTER TABLE public.pre_survey ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pre_survey: select own" ON public.pre_survey;
CREATE POLICY "pre_survey: select own"
  ON public.pre_survey
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "pre_survey: insert own" ON public.pre_survey;
CREATE POLICY "pre_survey: insert own"
  ON public.pre_survey
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 6. TABLA: post_survey
--    Encuesta de cierre (post-juego) respondida por el usuario.
--    Recortada a 4 preguntas esenciales — ver
--    ultimo-ajuste/05_datos_minimos_supabase.md sección 2:
--      1. utilidad_sintesis — utilidad de la síntesis de cierre, 1-5
--      2. sorpresa_yn / sorpresa_texto — ¿algo te sorprendió? (sí/no real,
--         antes hardcoded a false) + campo abierto corto
--      3. nps — NPS real 0-10 (antes derivado de un radio sí/no de
--         "recomendarías" no relacionado, ahora una pregunta 0-10 real)
--      4. comentarios — libre, opcional (sin cambios)
--    `estrategia_efectiva`, `cambio_percepcion`/`cambio_texto` y
--    `utilidad_docente` se eliminan: estaban fuera de spec o eran valores
--    derivados de un input no relacionado (ver App.tsx / SurveyPost.tsx
--    previos), no datos reales — no vale la pena fabricarlos.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_survey (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id        UUID        REFERENCES public.game_sessions(id) ON DELETE SET NULL,
  utilidad_sintesis INT         CHECK (utilidad_sintesis BETWEEN 1 AND 5),
  sorpresa_yn       BOOLEAN,
  sorpresa_texto    TEXT,
  nps               INT         CHECK (nps BETWEEN 0 AND 10),
  comentarios       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_post_survey_user_session UNIQUE (user_id, session_id)
);

-- Migración idempotente desde la versión de mayo.
ALTER TABLE public.post_survey DROP COLUMN IF EXISTS estrategia_efectiva;
ALTER TABLE public.post_survey DROP COLUMN IF EXISTS cambio_percepcion;
ALTER TABLE public.post_survey DROP COLUMN IF EXISTS cambio_texto;
ALTER TABLE public.post_survey DROP COLUMN IF EXISTS utilidad_docente;
ALTER TABLE public.post_survey ADD COLUMN IF NOT EXISTS utilidad_sintesis INT
  CHECK (utilidad_sintesis BETWEEN 1 AND 5);

-- Habilitar RLS
ALTER TABLE public.post_survey ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_survey: select own" ON public.post_survey;
CREATE POLICY "post_survey: select own"
  ON public.post_survey
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "post_survey: insert own" ON public.post_survey;
CREATE POLICY "post_survey: insert own"
  ON public.post_survey
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Deliberadamente NO implementadas este ciclo (recorte de alcance, no olvido):
--   - `policy_decisions` — log turno a turno de qué política se activó/
--     desactivó y cuándo. Ver ultimo-ajuste/05_datos_minimos_supabase.md
--     sección 1: "interesante para v3.0 pero no crítico para el informe de
--     octubre". `annual_snapshots.politicas_activas_final` ya captura el
--     estado final de políticas activas, que alcanza para el schema mínimo.
--   - `chat_interactions` — log mensaje a mensaje de la conversación con
--     DecarboNito. Recorte deliberado por consideraciones de privacidad
--     (texto libre de usuarios) frente a un beneficio analítico marginal
--     este ciclo. La síntesis de cierre (archivo 03) no depende de loguear
--     cada mensaje: se resuelve leyendo el estado de la sesión en memoria.
-- =============================================================================
-- FIN DEL SCHEMA
-- =============================================================================
