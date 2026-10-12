-- territorio_feedback_migration.sql
-- Fase v5 / 25 (mejora-general/files/25_supabase_territorio_feedback.md).
-- Cuestionario anónimo de DecarboNation Territorio: 14 ítems + contexto + resumen automático de la
-- partida. Inserción anónima (rol anon), sin lectura desde el cliente.
--
-- NO SE APLICA AUTOMÁTICAMENTE. Pegar en Supabase → SQL Editor → Run. Idempotente.

CREATE TABLE IF NOT EXISTS public.territorio_feedback (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Metadatos del envío ------------------------------------------------------------------------
  variant                  TEXT        NOT NULL DEFAULT 'territorio'
                                       CHECK (variant IN ('territorio')),
  origen                   TEXT        NOT NULL
                                       CHECK (origen IN ('fin_partida', 'pagina', 'espacio_docente')),
  lang                     TEXT        NOT NULL CHECK (lang IN ('es', 'en')),
  taller_codigo            TEXT        CHECK (taller_codigo ~ '^[A-Za-z0-9_-]{2,32}$'),
  client_id                UUID,       -- aleatorio por navegador; deduplicación, no identidad
  app_version              TEXT        CHECK (char_length(app_version) <= 64),
  duracion_seg             INT         CHECK (duracion_seg BETWEEN 0 AND 7200),

  -- Bloque A · Contexto (ítems 1-2) ------------------------------------------------------------
  rol                      TEXT        CHECK (rol IN ('docente_secundario', 'docente_universitario',
                                         'estudiante', 'tecnico_extensionista', 'gestion_publica',
                                         'investigacion', 'organizacion_social', 'productor', 'otro')),
  rol_otro                 TEXT        CHECK (char_length(rol_otro) <= 120),
  contexto_uso             TEXT        CHECK (contexto_uso IN ('individual', 'aula', 'taller',
                                         'webinar', 'exploracion_docente')),

  -- Bloque B · Jugabilidad (ítems 3-6) ---------------------------------------------------------
  comprension              SMALLINT    CHECK (comprension BETWEEN 1 AND 5),
  ritmo                    SMALLINT    CHECK (ritmo BETWEEN 1 AND 5),
  mapa_utilidad            SMALLINT    CHECK (mapa_utilidad BETWEEN 1 AND 5),
  elementos_utiles         TEXT[]      CHECK (cardinality(elementos_utiles) <= 3 AND elementos_utiles <@ ARRAY[
                                         'mapa', 'capas_analisis', 'situaciones', 'politicas',
                                         'usos_publicos', 'rutas', 'noticias', 'asesor', 'graficos']::TEXT[]),

  -- Bloque C · Aprendizaje (ítems 7-9) ---------------------------------------------------------
  tradeoffs                SMALLINT    CHECK (tradeoffs BETWEEN 1 AND 5),
  realismo                 SMALLINT    CHECK (realismo BETWEEN 1 AND 5),
  aprendizaje_texto        TEXT        CHECK (char_length(aprendizaje_texto) <= 1500),

  -- Bloque D · Mejoras (ítems 10-11) -----------------------------------------------------------
  mejora_prioritaria       TEXT        CHECK (mejora_prioritaria IN ('explicacion_inicial', 'ritmo',
                                         'indicadores', 'datos_reales', 'asesor', 'rendimiento',
                                         'guardar_partida', 'multijugador', 'otra')),
  mejoras_texto            TEXT        CHECK (char_length(mejoras_texto) <= 1500),

  -- Bloque E · Escalabilidad y usos (ítems 12-14) ----------------------------------------------
  uso_taller               SMALLINT    CHECK (uso_taller BETWEEN 1 AND 5),
  formatos_uso             TEXT[]      CHECK (formatos_uso <@ ARRAY[
                                         'individual', 'parejas', 'equipos_pantalla', 'sala_proyectada',
                                         'equipos_compiten', 'roles_actores', 'datos_region']::TEXT[]),
  taller_conceptos_texto   TEXT        CHECK (char_length(taller_conceptos_texto) <= 1500),

  -- Resumen automático de la partida (no se pregunta) ------------------------------------------
  partida_estado           TEXT        NOT NULL DEFAULT 'sin_partida'
                                       CHECK (partida_estado IN ('completa', 'incompleta', 'sin_partida')),
  resultado                TEXT        CHECK (resultado IN ('won', 'lost', 'collapse')),
  ruta_lograda             TEXT        CHECK (ruta_lograda IN ('conservation', 'production', 'innovation')),
  ruta_cercana             TEXT        CHECK (ruta_cercana IN ('conservation', 'production', 'innovation')),
  ruta_cercana_progreso    NUMERIC(4,3) CHECK (ruta_cercana_progreso BETWEEN 0 AND 1),
  pisos_cumplidos          BOOLEAN,
  anio_alcanzado           SMALLINT    CHECK (anio_alcanzado BETWEEN 2000 AND 2100),
  meses_jugados            SMALLINT    CHECK (meses_jugados BETWEEN 0 AND 360),
  situaciones_resueltas    INT         CHECK (situaciones_resueltas BETWEEN 0 AND 10000),
  situaciones_vencidas     INT         CHECK (situaciones_vencidas BETWEEN 0 AND 10000),
  areas_declaradas         INT         CHECK (areas_declaradas BETWEEN 0 AND 10000),
  politicas_activas        TEXT[]      CHECK (cardinality(politicas_activas) <= 12),
  indicadores_finales      JSONB       CHECK (jsonb_typeof(indicadores_finales) = 'object'
                                              AND pg_column_size(indicadores_finales) <= 2048),
  seed                     BIGINT,

  -- Al menos una respuesta real: un envío vacío no aporta nada.
  CONSTRAINT territorio_feedback_not_empty CHECK (
    num_nonnulls(rol, contexto_uso, comprension, ritmo, mapa_utilidad, elementos_utiles, tradeoffs,
                 realismo, aprendizaje_texto, mejora_prioritaria, mejoras_texto, uso_taller,
                 formatos_uso, taller_conceptos_texto) >= 1
  )
);

CREATE INDEX IF NOT EXISTS territorio_feedback_taller_idx  ON public.territorio_feedback (taller_codigo);
CREATE INDEX IF NOT EXISTS territorio_feedback_created_idx ON public.territorio_feedback (created_at);

-- RLS: el cliente solo puede insertar. Sin políticas de SELECT/UPDATE/DELETE = sin acceso.
ALTER TABLE public.territorio_feedback ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.territorio_feedback FROM anon, authenticated;
GRANT INSERT ON public.territorio_feedback TO anon, authenticated;

DROP POLICY IF EXISTS "territorio_feedback: anonymous insert" ON public.territorio_feedback;
CREATE POLICY "territorio_feedback: anonymous insert"
  ON public.territorio_feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);   -- la validación vive en los CHECK de columna
