import { useRef } from 'react';
import {
  createGameSession,
  updateSessionLevel,
  finalizeGameSession,
  insertFinalSnapshot,
  insertPreSurvey,
  insertPostSurvey,
  PreSurveyData,
  PostSurveyData,
  FinalSnapshotData,
} from '../services/supabaseService';

export function useSessionPersistence(userId: string | null) {
  // Tracks the single `game_sessions` row for the current playthrough.
  const sessionIdRef = useRef<string | null>(null);

  // Creates the game_sessions row exactly once per playthrough. If a session
  // already exists (e.g. this fires again on every level change), it UPDATEs
  // nivel_alcanzado on the existing row instead of inserting a new one — see
  // ultimo-ajuste/05_datos_minimos_supabase.md ("game_sessions: 1 fila por partida").
  const startSession = async (nivel: number, anioInicio: number) => {
    if (!userId) return;
    if (sessionIdRef.current) {
      await updateSessionLevel(sessionIdRef.current, nivel);
      return;
    }
    sessionIdRef.current = await createGameSession(userId, nivel, anioInicio);
  };

  // Call when starting a brand-new playthrough after a previous one has
  // concluded (e.g. "Play again"), so the next `startSession` call creates a
  // fresh row instead of reusing/overwriting the finished one.
  const resetSession = () => {
    sessionIdRef.current = null;
  };

  // Persists the FINAL state of the session — one row, written once at
  // end-of-session (not once per simulated year).
  const saveFinalSnapshot = async (
    data: FinalSnapshotData,
    politicasActivas: string[]
  ) => {
    if (!sessionIdRef.current) return;
    await insertFinalSnapshot(sessionIdRef.current, data, politicasActivas);
  };

  const savePreSurvey = async (data: PreSurveyData) => {
    if (!userId) return;
    await insertPreSurvey(userId, sessionIdRef.current, data);
  };

  const savePostSurvey = async (data: PostSurveyData) => {
    if (!userId) return;
    await insertPostSurvey(userId, sessionIdRef.current, data);
  };

  // Marks the session as concluded (resultado, nivel_alcanzado, año_fin).
  // Called exactly once when the game ends, independent of whether the player
  // actually answers/skips the post-survey.
  const endSession = async (
    resultado: 'victoria' | 'derrota' | 'abandono',
    nivelAlcanzado: number,
    anioFin: number
  ) => {
    if (!sessionIdRef.current) return;
    await finalizeGameSession(sessionIdRef.current, resultado, nivelAlcanzado, anioFin);
  };

  return {
    sessionIdRef,
    startSession,
    resetSession,
    saveFinalSnapshot,
    savePreSurvey,
    savePostSurvey,
    endSession,
  };
}
