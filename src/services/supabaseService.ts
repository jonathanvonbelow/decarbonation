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
  // Explicit redirectTo (phase 11 regression, fixed post-deploy): without this, Supabase sends
  // the OAuth callback back to the project's configured Site URL, which is the bare domain root
  // -- since 20_landing_shareables.md split the site into a React-free static landing at "/" and
  // the actual game at "/play", the callback landed on a page with no Supabase client to consume
  // the "#access_token=..." fragment, silently discarding the session. The player would land back
  // on the marketing page, the token would sit unused in the URL, and Google sign-in would look
  // completely broken -- "only demo mode works" was the reported symptom. `/play` is the only
  // page that can actually complete the callback (it's the one that boots src/main.tsx).
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/play` },
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
) {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange(callback);
}

// ---------------------------------------------------------------------------
// Game session helpers
// ---------------------------------------------------------------------------

// `game_sessions` is one row per playthrough. `createGameSession` must only be
// called once per playthrough (guarded in `useSessionPersistence`); subsequent
// level changes call `updateSessionLevel` to UPDATE the same row instead of
// inserting a new one.
export async function createGameSession(
  userId: string,
  nivel: number,
  anioInicio: number
): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('game_sessions')
    .insert({ user_id: userId, nivel_alcanzado: nivel, anio_inicio: anioInicio })
    .select('id')
    .single();
  if (error) { console.error('createGameSession:', error); return null; }
  return data?.id ?? null;
}

export async function updateSessionLevel(
  sessionId: string,
  nivel: number
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('game_sessions')
    .update({ nivel_alcanzado: nivel })
    .eq('id', sessionId);
  if (error) console.error('updateSessionLevel:', error);
}

export async function finalizeGameSession(
  sessionId: string,
  resultado: 'victoria' | 'derrota' | 'abandono',
  nivelAlcanzado: number,
  anioFin: number
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('game_sessions')
    .update({ resultado, nivel_alcanzado: nivelAlcanzado, anio_fin: anioFin, ended_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (error) console.error('finalizeGameSession:', error);
}

// `annual_snapshots` is trimmed to one row per session holding only the FINAL
// state (see ultimo-ajuste/05_datos_minimos_supabase.md). There is no more
// per-year history — `insertFinalSnapshot` is called exactly once, at
// end-of-session, instead of once per simulated year.
export interface FinalSnapshotData {
  biodiversidad_final: number;
  co2_final: number;
  seg_alimentaria_final: number;
  seg_economica_final: number;
  score_final: number;
}

export async function insertFinalSnapshot(
  sessionId: string,
  data: FinalSnapshotData,
  politicasActivas: string[]
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('annual_snapshots')
    .upsert(
      { session_id: sessionId, ...data, politicas_activas_final: politicasActivas },
      { onConflict: 'session_id' }
    );
  if (error) console.error('insertFinalSnapshot:', error);
}

// ---------------------------------------------------------------------------
// Survey data types & helpers
// ---------------------------------------------------------------------------

// Trimmed to the 3-question minimal spec — see
// ultimo-ajuste/05_datos_minimos_supabase.md section 2. Do not add fields back
// without also adding a real question for them; no fabricated/hardcoded data.
export interface PreSurveyData {
  vinculo_clima: string;             // (1) vínculo principal con clima/sostenibilidad
  experiencia_simulacion: boolean;   // (2) experiencia previa con simulaciones de política pública (sí/no)
  bloque_convocatoria: string;       // (3) '1' | '2' | '3' | '4' | 'no_aplica' — ver ultimo-ajuste/04_recalibracion_actores_y_convocatoria.md
}

// Trimmed to the 4-question minimal spec — see
// ultimo-ajuste/05_datos_minimos_supabase.md section 2.
export interface PostSurveyData {
  utilidad_sintesis: number;    // (1) utilidad de la síntesis de cierre, 1-5
  sorpresa_yn: boolean;         // (2) ¿algo te sorprendió?
  sorpresa_texto?: string;      // (2) campo abierto corto, opcional
  nps: number;                  // (3) NPS real, 0-10
  comentarios?: string;         // (4) comentarios libres, opcional
}

export async function insertPreSurvey(
  userId: string,
  sessionId: string | null,
  data: PreSurveyData
): Promise<void> {
  if (!supabase) return;
  // NOTE: table name is singular ('pre_survey'), matching supabase/schema.sql.
  // This was already fixed in commit 03958c0 (previously called 'pre_surveys',
  // causing 404s). If 404s reappear in production it's a stale deployment that
  // hasn't picked up that fix — not a mismatch here. Don't "fix" this again.
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
  // NOTE: table name is singular ('post_survey'), matching supabase/schema.sql.
  // Same already-fixed 404 issue as insertPreSurvey above — see that comment.
  const { error } = await supabase
    .from('post_survey')
    .insert({ user_id: userId, session_id: sessionId, ...data });
  if (error) console.error('insertPostSurvey:', error);
}
