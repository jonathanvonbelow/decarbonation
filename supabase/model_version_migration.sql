-- v6 / fase 32: versión del modelo en cada fila de investigación.
-- (mejora-general/files/32_versionado_del_modelo.md; src/sim/version.ts)
--
-- Pegar en el SQL Editor de Supabase. Es idempotente: se puede correr dos veces sin error.
-- Las filas existentes de game_sessions y predictions quedan con '1.0': todo lo recolectado hasta hoy
-- usó el modelo 1.0. En territorio_feedback la columna queda NULL en las filas viejas (también 1.0).
--
-- Políticas: territorio_feedback tiene GRANT INSERT a nivel de tabla y la política de INSERT es
-- WITH CHECK (true), sin lista de columnas: la columna nueva no requiere cambiar RLS.
-- Si el cliente nuevo se despliega antes de correr esto, los inserts se reintentan sin la columna.

ALTER TABLE public.game_sessions       ADD COLUMN IF NOT EXISTS model_version TEXT NOT NULL DEFAULT '1.0';
ALTER TABLE public.predictions         ADD COLUMN IF NOT EXISTS model_version TEXT NOT NULL DEFAULT '1.0';
ALTER TABLE public.territorio_feedback ADD COLUMN IF NOT EXISTS model_version TEXT;

-- El CHECK va aparte y con nombre propio: así el script sigue siendo idempotente aunque la columna
-- ya exista (con ADD COLUMN IF NOT EXISTS ... CHECK, el CHECK no se crea si la columna ya estaba).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'territorio_feedback_model_version_check'
      AND conrelid = 'public.territorio_feedback'::regclass
  ) THEN
    ALTER TABLE public.territorio_feedback
      ADD CONSTRAINT territorio_feedback_model_version_check
      CHECK (model_version IS NULL OR model_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?(-dev)?$');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS predictions_model_version_idx   ON public.predictions (model_version);
CREATE INDEX IF NOT EXISTS game_sessions_model_version_idx ON public.game_sessions (model_version);
