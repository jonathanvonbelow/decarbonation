import { createClient, Session, User } from '@supabase/supabase-js';

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
    .insert({ user_id: userId, nivel_inicio: nivel, inicio: new Date().toISOString() })
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
    .update({ resultado, nivel_alcanzado: nivelAlcanzado, fin: new Date().toISOString() })
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
  rol?: string;
  experiencia_previa?: string;
  expectativas?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface PostSurveyData {
  aprendizaje?: string;
  dificultad?: number;
  recomendaria?: boolean;
  comentarios?: string;
  [key: string]: string | number | boolean | undefined;
}

export async function insertPreSurvey(
  userId: string,
  sessionId: string | null,
  data: PreSurveyData
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('pre_surveys')
    .insert({ user_id: userId, session_id: sessionId, ...data, created_at: new Date().toISOString() });
  if (error) console.error('insertPreSurvey:', error);
}

export async function insertPostSurvey(
  userId: string,
  sessionId: string | null,
  data: PostSurveyData
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('post_surveys')
    .insert({ user_id: userId, session_id: sessionId, ...data, created_at: new Date().toISOString() });
  if (error) console.error('insertPostSurvey:', error);
}
