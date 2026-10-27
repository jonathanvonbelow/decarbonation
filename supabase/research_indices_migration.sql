-- v6 / fase 48: predicción 2.0 e índices de investigación.
-- (mejora-general/files/48_prediccion_e_indices.md §4; src/sim/v2/research.ts, src/components/tutorial/predictionBands.json)
--
-- Pegar en el SQL Editor de Supabase DESPUÉS de supabase/model_version_migration.sql. Es idempotente: se puede correr
-- dos veces sin error. NO se aplica automáticamente: el cliente funciona sin este paso (si una columna no existe, la fila
-- se reenvía sin ella y se avisa una vez en la consola — src/services/modelVersionColumn.ts, sendWithOptionalColumns).
--
--   predictions.band               banda de "sin cambio" usada para clasificar el año (|Δ| < band ⇒ 'flat')
--   predictions.persistence_pred   predicción de la regla de persistencia (dirección real del año anterior; 'flat' el
--                                  primer año de cada nivel)
--   game_sessions.research_indices        índices de la sesión del juego de 3 niveles (objeto JSON ≤ 4 KB)
--   territorio_feedback.research_indices  índices de la partida de Territorio resumida en el cuestionario anónimo
--
-- Políticas: predictions y game_sessions ya tienen RLS por dueño (insert/update own) sin listas de columnas;
-- territorio_feedback tiene GRANT INSERT a nivel de tabla y WITH CHECK (true): las columnas nuevas no requieren cambiar RLS.
-- Los CHECK van aparte y con nombre propio (como en model_version_migration.sql): con ADD COLUMN IF NOT EXISTS ... CHECK,
-- el CHECK no se crearía si la columna ya existía.

ALTER TABLE public.predictions         ADD COLUMN IF NOT EXISTS band NUMERIC;
ALTER TABLE public.predictions         ADD COLUMN IF NOT EXISTS persistence_pred TEXT;
ALTER TABLE public.game_sessions       ADD COLUMN IF NOT EXISTS research_indices JSONB;
ALTER TABLE public.territorio_feedback ADD COLUMN IF NOT EXISTS research_indices JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'predictions_persistence_pred_check' AND conrelid = 'public.predictions'::regclass
  ) THEN
    ALTER TABLE public.predictions
      ADD CONSTRAINT predictions_persistence_pred_check
      CHECK (persistence_pred IS NULL OR persistence_pred IN ('down', 'flat', 'up'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'predictions_band_check' AND conrelid = 'public.predictions'::regclass
  ) THEN
    ALTER TABLE public.predictions
      ADD CONSTRAINT predictions_band_check CHECK (band IS NULL OR band >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'game_sessions_research_indices_check' AND conrelid = 'public.game_sessions'::regclass
  ) THEN
    ALTER TABLE public.game_sessions
      ADD CONSTRAINT game_sessions_research_indices_check
      CHECK (research_indices IS NULL OR (jsonb_typeof(research_indices) = 'object' AND pg_column_size(research_indices) <= 4096));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'territorio_feedback_research_indices_check' AND conrelid = 'public.territorio_feedback'::regclass
  ) THEN
    ALTER TABLE public.territorio_feedback
      ADD CONSTRAINT territorio_feedback_research_indices_check
      CHECK (research_indices IS NULL OR (jsonb_typeof(research_indices) = 'object' AND pg_column_size(research_indices) <= 4096));
  END IF;
END $$;
