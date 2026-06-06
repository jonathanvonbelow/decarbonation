import { createClient, Session } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Singleton — null when env vars are absent (demo mode)
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

export async function signInWithGoogle(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signInWithOAuth({ provider: 'google' });
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
) {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange(callback);
}

// ---------------------------------------------------------------------------
// Game session helpers
// ---------------------------------------------------------------------------

export async function createGameSession(
  userId: string,
  nivel: number
): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('game_sessions')
    .insert({ user_id: userId, nivel_alcanzado: nivel })
    .select('id')
    .single();
  if (error) { console.error('createGameSession:', error); return null; }
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
    .update({ resultado, nivel_alcanzado: nivelAlcanzado, ended_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (error) console.error('finalizeGameSession:', error);
}

export async function upsertAnnualSnapshot(
  sessionId: string,
  anio: number,
  indicators: Record<string, number>,
  politicasActivas: string[]
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('annual_snapshots')
    .upsert(
      { session_id: sessionId, anio, ...indicators, politicas_activas: politicasActivas },
      { onConflict: 'session_id,anio' }
    );
  if (error) console.error('upsertAnnualSnapshot:', error);
}

// ---------------------------------------------------------------------------
// Survey data types & helpers
// ---------------------------------------------------------------------------

export interface PreSurveyData {
  vinculo_clima: string;
  experiencia_simulacion: string;
  familiaridad_afolu: number;   // 1-5
  expectativa: string;
  pais_region: string;
  comentario_abierto?: string;
}

export interface PostSurveyData {
  estrategia_efectiva: string;
  sorpresa_yn: boolean;
  sorpresa_texto?: string;
  cambio_percepcion: number;    // 1-5
  cambio_texto?: string;
  utilidad_docente: number;     // 1-5
  nps: number;                  // 0-10
  comentarios?: string;
}

export async function insertPreSurvey(
  userId: string,
  sessionId: string | null,
  data: PreSurveyData
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('pre_survey')
    .insert({ user_id: userId, session_id: sessionId, ...data });
  if (error) console.error('insertPreSurvey:', error);
}

export async function insertPostSurvey(
  userId: string,
  sessionId: string | null,
  data: PostSurveyData
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('post_survey')
    .insert({ user_id: userId, session_id: sessionId, ...data });
  if (error) console.error('insertPostSurvey:', error);
}
