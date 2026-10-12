-- funnel_events_migration.sql
-- Fase v5 / 31 (mejora-general/files/31_cierre_qa_deploy.md §1.5).
-- Tabla de eventos de embudo que usan src/services/funnelTelemetry.ts y funnelTelemetryLite.ts
-- (landing_view, play_click, preview_click, survey_click, teacher_space_click, teacher_space_view,
-- workshop_link_created, ...). Hasta ahora no había migración en supabase/.
--
-- NO SE APLICA AUTOMÁTICAMENTE. ANTES de correrla, verificar en el dashboard de Supabase (Table
-- Editor) si la tabla `funnel_events` ya existe en el proyecto real; si existe, no hace falta.
-- Pegar en Supabase → SQL Editor → Run. Idempotente.

CREATE TABLE IF NOT EXISTS public.funnel_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event       TEXT        NOT NULL CHECK (char_length(event) <= 64),
  properties  JSONB       NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(properties) <= 4096)
);

CREATE INDEX IF NOT EXISTS funnel_events_event_idx   ON public.funnel_events (event);
CREATE INDEX IF NOT EXISTS funnel_events_created_idx ON public.funnel_events (created_at);

-- RLS: el cliente solo puede insertar (PostgREST responde return=minimal por defecto en POST).
ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.funnel_events FROM anon, authenticated;
GRANT INSERT ON public.funnel_events TO anon, authenticated;

DROP POLICY IF EXISTS "funnel_events: anonymous insert" ON public.funnel_events;
CREATE POLICY "funnel_events: anonymous insert"
  ON public.funnel_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
