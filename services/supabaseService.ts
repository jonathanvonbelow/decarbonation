import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';

// Variables de entorno inyectadas vía vite.config.ts define block → process.env.X
const supabaseUrl: string | undefined = process.env.SUPABASE_URL;
const supabaseAnonKey: string | undefined = process.env.SUPABASE_ANON_KEY;

// Si no hay credenciales configuradas, supabase queda null → modo demo
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function signInWithGoogle(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
): { data: { subscription: { unsubscribe: () => void } } } {
  if (!supabase) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
  return supabase.auth.onAuthStateChange(callback);
}

// ─── Survey types ─────────────────────────────────────────────────────────────
// Campos alineados exactamente con el schema de Supabase (supabase/schema.sql)

export interface PreSurveyData {
  // Tabla: public.pre_survey
  vinculo_clima: string;           // vínculo con clima/política ambiental
  experiencia_simulacion: string;  // experiencia previa con simulaciones
  familiaridad_afolu: number;      // 1-5
  expectativa: string;             // qué espera aprender
  pais_region: string;             // país o región
}

export interface PostSurveyData {
  // Tabla: public.post_survey
  estrategia_efectiva: string;  // qué estrategia resultó efectiva
  sorpresa_yn: boolean;         // ¿algo te sorprendió?
  sorpresa_texto: string;       // descripción de la sorpresa
  cambio_percepcion: number;    // 1-5: cuánto cambió su percepción
  cambio_texto: string;         // descripción del cambio
  utilidad_docente: number;     // 1-5: utilidad para uso docente
  nps: number;                  // 0-10: Net Promoter Score
  comentarios: string;          // comentarios adicionales
}

// ─── Game sessions ────────────────────────────────────────────────────────────
// Schema: id, user_id, nivel_alcanzado, duracion_segundos, resultado, started_at, ended_at

export async function createGameSession(
  userId: string,
  nivelInicial: number
): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('game_sessions')
    .insert({
      user_id: userId,
      nivel_alcanzado: nivelInicial,   // nivel al inicio; se actualiza al finalizar
      resultado: 'demo',               // valor válido según CHECK constraint hasta que termine
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error) {
    console.error('createGameSession error:', error);
    return null;
  }
  return data?.id ?? null;
}

export async function finalizeGameSession(
  sessionId: string,
  resultado: 'victoria' | 'derrota' | 'abandono',
  nivelAlcanzado: number
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('game_sessions')
    .update({
      resultado,
      nivel_alcanzado: nivelAlcanzado,
      ended_at: new Date().toISOString(),
    })
    .eq('id', sessionId);
  if (error) console.error('finalizeGameSession error:', error);
}

// ─── Annual snapshots ─────────────────────────────────────────────────────────
// Schema: columnas planas (biodiversidad, co2_per_capita, …) + politicas_activas JSONB
// NOTA: el upsert usa el constraint uq_annual_snapshots_session_anio

export interface AnnualSnapshotIndicators {
  biodiversidad: number;
  co2_per_capita: number;
  seg_alimentaria: number;
  seg_economica: number;
  bienestar_social: number;
  estabilidad_politica: number;
  score_general: number;
}

export async function upsertAnnualSnapshot(
  sessionId: string,
  anio: number,
  indicators: AnnualSnapshotIndicators,
  politicasActivas: string[]
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('annual_snapshots')
    .upsert(
      {
        session_id: sessionId,
        anio,
        // columnas planas del schema
        biodiversidad:        indicators.biodiversidad,
        co2_per_capita:       indicators.co2_per_capita,
        seg_alimentaria:      indicators.seg_alimentaria,
        seg_economica:        indicators.seg_economica,
        bienestar_social:     indicators.bienestar_social,
        estabilidad_politica: indicators.estabilidad_politica,
        score_general:        indicators.score_general,
        // array JSON de ids de políticas activas
        politicas_activas:    politicasActivas,
      },
      { onConflict: 'session_id,anio' }
    );
  if (error) console.error('upsertAnnualSnapshot error:', error);
}

// ─── Surveys ──────────────────────────────────────────────────────────────────
// Tablas reales: public.pre_survey y public.post_survey (singular, sin prefijo surveys_)

export async function insertPreSurvey(
  userId: string,
  sessionId: string | null,
  data: PreSurveyData
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('pre_survey')       // ← nombre correcto de la tabla
    .insert({ user_id: userId, session_id: sessionId, ...data });
  if (error) console.error('insertPreSurvey error:', error);
}

export async function insertPostSurvey(
  userId: string,
  sessionId: string | null,
  data: PostSurveyData
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('post_survey')      // ← nombre correcto de la tabla
    .insert({ user_id: userId, session_id: sessionId, ...data });
  if (error) console.error('insertPostSurvey error:', error);
}
