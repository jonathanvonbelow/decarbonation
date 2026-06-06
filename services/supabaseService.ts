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

export interface PreSurveyData {
  rol: string;
  experienciaClima: string;
  expectativa: string;
}

export interface PostSurveyData {
  aprendizaje: string;
  dificultad: number;
  recomendaria: boolean;
  comentarios: string;
}

// ─── Game sessions ────────────────────────────────────────────────────────────

export async function createGameSession(
  userId: string,
  nivelInicial: number
): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('game_sessions')
    .insert({ user_id: userId, nivel_inicial: nivelInicial, estado: 'en_curso' })
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
    .update({ resultado, nivel_alcanzado: nivelAlcanzado, estado: 'finalizada', finalizado_en: new Date().toISOString() })
    .eq('id', sessionId);
  if (error) console.error('finalizeGameSession error:', error);
}

// ─── Annual snapshots ─────────────────────────────────────────────────────────

export async function upsertAnnualSnapshot(
  sessionId: string,
  anio: number,
  indicators: Record<string, number>,
  politicasActivas: string[]
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('annual_snapshots')
    .upsert({
      session_id: sessionId,
      anio,
      indicadores: indicators,
      politicas_activas: politicasActivas,
    }, { onConflict: 'session_id,anio' });
  if (error) console.error('upsertAnnualSnapshot error:', error);
}

// ─── Surveys ──────────────────────────────────────────────────────────────────

export async function insertPreSurvey(
  userId: string,
  sessionId: string | null,
  data: PreSurveyData
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('surveys_pre')
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
    .from('surveys_post')
    .insert({ user_id: userId, session_id: sessionId, ...data });
  if (error) console.error('insertPostSurvey error:', error);
}
