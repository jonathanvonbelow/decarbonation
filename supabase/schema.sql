-- =============================================================================
-- DecarboNation v2.6 — Supabase Schema
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query
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
  started_at         TIMESTAMPTZ DEFAULT NOW(),
  ended_at           TIMESTAMPTZ
);

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
--    Estado de los indicadores al final de cada año de simulación.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.annual_snapshots (
  id                   UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id           UUID     NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  anio                 INT      NOT NULL,
  biodiversidad        NUMERIC,
  co2_per_capita       NUMERIC,
  seg_alimentaria      NUMERIC,
  seg_economica        NUMERIC,
  bienestar_social     NUMERIC,
  estabilidad_politica NUMERIC,
  score_general        NUMERIC,
  politicas_activas    JSONB
);

CREATE INDEX IF NOT EXISTS idx_annual_snapshots_session_anio
  ON public.annual_snapshots (session_id, anio);

-- Garantizar un único snapshot por año por sesión
ALTER TABLE public.annual_snapshots
  DROP CONSTRAINT IF EXISTS uq_annual_snapshots_session_anio;
ALTER TABLE public.annual_snapshots
  ADD CONSTRAINT uq_annual_snapshots_session_anio UNIQUE (session_id, anio);

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
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pre_survey (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id             UUID        REFERENCES public.game_sessions(id) ON DELETE SET NULL,
  vinculo_clima          TEXT,
  experiencia_simulacion TEXT,
  familiaridad_afolu     INT         CHECK (familiaridad_afolu BETWEEN 1 AND 5),
  expectativa            TEXT,
  pais_region            TEXT,
  comentario_abierto     TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_pre_survey_user_session UNIQUE (user_id, session_id)
);

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
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_survey (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id          UUID        REFERENCES public.game_sessions(id) ON DELETE SET NULL,
  estrategia_efectiva TEXT,
  sorpresa_yn         BOOLEAN,
  sorpresa_texto      TEXT,
  cambio_percepcion   INT         CHECK (cambio_percepcion BETWEEN 1 AND 5),
  cambio_texto        TEXT,
  utilidad_docente    INT         CHECK (utilidad_docente BETWEEN 1 AND 5),
  nps                 INT         CHECK (nps BETWEEN 0 AND 10),
  comentarios         TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_post_survey_user_session UNIQUE (user_id, session_id)
);

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

-- =============================================================================
-- FIN DEL SCHEMA
-- =============================================================================
