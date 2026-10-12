/**
 * Row of `public.territorio_feedback` (supabase/territorio_feedback_migration.sql). The option
 * lists below mirror the table's CHECK constraints; tests/territorio/feedbackService.spec.ts reads
 * the .sql and fails if they diverge.
 */

/** Debe coincidir con el CHECK de supabase/territorio_feedback_migration.sql. */
export const ROLES = [
  'docente_secundario', 'docente_universitario', 'estudiante', 'tecnico_extensionista', 'gestion_publica',
  'investigacion', 'organizacion_social', 'productor', 'otro',
] as const;
/** Debe coincidir con el CHECK de supabase/territorio_feedback_migration.sql. */
export const CONTEXTOS = ['individual', 'aula', 'taller', 'webinar', 'exploracion_docente'] as const;
/** Debe coincidir con el CHECK de supabase/territorio_feedback_migration.sql. */
export const ELEMENTOS = [
  'mapa', 'capas_analisis', 'situaciones', 'politicas', 'usos_publicos', 'rutas', 'noticias', 'asesor', 'graficos',
] as const;
/** Debe coincidir con el CHECK de supabase/territorio_feedback_migration.sql. */
export const MEJORAS = [
  'explicacion_inicial', 'ritmo', 'indicadores', 'datos_reales', 'asesor', 'rendimiento', 'guardar_partida',
  'multijugador', 'otra',
] as const;
/** Debe coincidir con el CHECK de supabase/territorio_feedback_migration.sql. */
export const FORMATOS = [
  'individual', 'parejas', 'equipos_pantalla', 'sala_proyectada', 'equipos_compiten', 'roles_actores', 'datos_region',
] as const;

export const MAX_ELEMENTOS = 3;
export const MAX_TEXT = 1500;
export const MAX_ROL_OTRO = 120;

export type Rol = typeof ROLES[number];
export type Contexto = typeof CONTEXTOS[number];
export type Elemento = typeof ELEMENTOS[number];
export type Mejora = typeof MEJORAS[number];
export type Formato = typeof FORMATOS[number];
export type Likert = 1 | 2 | 3 | 4 | 5;
export type Origen = 'fin_partida' | 'pagina' | 'espacio_docente';
export type RouteCode = 'conservation' | 'production' | 'innovation';

export interface TerritorioFeedbackRow {
  variant: 'territorio';
  origen: Origen;
  lang: 'es' | 'en';
  taller_codigo: string | null;
  client_id: string | null;
  app_version: string | null;
  duracion_seg: number | null;

  rol: Rol | null;
  rol_otro: string | null;
  contexto_uso: Contexto | null;

  comprension: Likert | null;
  ritmo: Likert | null;
  mapa_utilidad: Likert | null;
  elementos_utiles: Elemento[] | null;

  tradeoffs: Likert | null;
  realismo: Likert | null;
  aprendizaje_texto: string | null;

  mejora_prioritaria: Mejora | null;
  mejoras_texto: string | null;

  uso_taller: Likert | null;
  formatos_uso: Formato[] | null;
  taller_conceptos_texto: string | null;

  partida_estado: 'completa' | 'incompleta' | 'sin_partida';
  resultado: 'won' | 'lost' | 'collapse' | null;
  ruta_lograda: RouteCode | null;
  ruta_cercana: RouteCode | null;
  ruta_cercana_progreso: number | null;
  pisos_cumplidos: boolean | null;
  anio_alcanzado: number | null;
  meses_jugados: number | null;
  situaciones_resueltas: number | null;
  situaciones_vencidas: number | null;
  areas_declaradas: number | null;
  politicas_activas: string[] | null;
  indicadores_finales: Record<string, number> | null;
  seed: number | null;
}
