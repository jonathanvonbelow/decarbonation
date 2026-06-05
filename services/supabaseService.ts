import { createClient, SupabaseClient, Session, AuthChangeEvent } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "SUPABASE_URL or SUPABASE_ANON_KEY environment variables not set. " +
    "Supabase functionality will be disabled (demo mode)."
  );
}

export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

// ── Interfaces ────────────────────────────────────────────────────────────────

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

// ── Auth helpers ───────────────────────────────────────────────────────────────

export async function signInWithGoogle(): Promise<void> {
  if (!supabase) {
    console.warn("[supabaseService] signInWithGoogle: Supabase client not available (demo mode).");
    return;
  }
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
  if (error) {
    console.error("[supabaseService] signInWithGoogle error:", error.message);
    throw error;
  }
}

export async function signOut(): Promise<void> {
  if (!supabase) {
    console.warn("[supabaseService] signOut: Supabase client not available (demo mode).");
    return;
  }
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("[supabaseService] signOut error:", error.message);
    throw error;
  }
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) {
    console.warn("[supabaseService] getSession: Supabase client not available (demo mode).");
    return null;
  }
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("[supabaseService] getSession error:", error.message);
    return null;
  }
  return data.session;
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): { data: { subscription: { unsubscribe: () => void } } } {
  if (!supabase) {
    console.warn("[supabaseService] onAuthStateChange: Supabase client not available (demo mode).");
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
  return supabase.auth.onAuthStateChange(callback);
}

// ── Game session helpers ───────────────────────────────────────────────────────

export async function createGameSession(
  userId: string,
  nivel: number
): Promise<string | null> {
  if (!supabase) {
    console.warn("[supabaseService] createGameSession: Supabase client not available (demo mode).");
    return null;
  }
  const { data, error } = await supabase
    .from('game_sessions')
    .insert({ user_id: userId, nivel_inicio: nivel })
    .select('id')
    .single();
  if (error) {
    console.error("[supabaseService] createGameSession error:", error.message);
    return null;
  }
  return data?.id ?? null;
}

export async function finalizeGameSession(
  sessionId: string,
  resultado: 'victoria' | 'derrota' | 'abandono' | 'demo',
  nivelAlcanzado: number
): Promise<void> {
  if (!supabase) {
    console.warn("[supabaseService] finalizeGameSession: Supabase client not available (demo mode).");
    return;
  }
  const { error } = await supabase
    .from('game_sessions')
    .update({
      ended_at: new Date().toISOString(),
      resultado,
      nivel_alcanzado: nivelAlcanzado,
    })
    .eq('id', sessionId);
  if (error) {
    console.error("[supabaseService] finalizeGameSession error:", error.message);
  }
}

// ── Snapshot helper ────────────────────────────────────────────────────────────

export async function upsertAnnualSnapshot(
  sessionId: string,
  anio: number,
  indicators: Record<string, number>,
  politicasActivas: string[]
): Promise<void> {
  if (!supabase) {
    console.warn("[supabaseService] upsertAnnualSnapshot: Supabase client not available (demo mode).");
    return;
  }
  const { error } = await supabase
    .from('annual_snapshots')
    .upsert(
      {
        session_id: sessionId,
        anio,
        indicators,
        politicas_activas: politicasActivas,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id,anio' }
    );
  if (error) {
    console.error("[supabaseService] upsertAnnualSnapshot error:", error.message);
  }
}

// ── Survey helpers ─────────────────────────────────────────────────────────────

export async function insertPreSurvey(
  userId: string,
  sessionId: string | null,
  data: PreSurveyData
): Promise<void> {
  if (!supabase) {
    console.warn("[supabaseService] insertPreSurvey: Supabase client not available (demo mode).");
    return;
  }
  const { error } = await supabase
    .from('pre_surveys')
    .insert({ user_id: userId, session_id: sessionId, ...data });
  if (error) {
    console.error("[supabaseService] insertPreSurvey error:", error.message);
  }
}

export async function insertPostSurvey(
  userId: string,
  sessionId: string | null,
  data: PostSurveyData
): Promise<void> {
  if (!supabase) {
    console.warn("[supabaseService] insertPostSurvey: Supabase client not available (demo mode).");
    return;
  }
  const { error } = await supabase
    .from('post_surveys')
    .insert({ user_id: userId, session_id: sessionId, ...data });
  if (error) {
    console.error("[supabaseService] insertPostSurvey error:", error.message);
  }
}
