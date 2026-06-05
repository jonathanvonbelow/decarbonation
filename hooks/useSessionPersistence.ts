import { useRef } from 'react';
import {
  createGameSession,
  finalizeGameSession,
  upsertAnnualSnapshot,
  insertPreSurvey,
  insertPostSurvey,
  PreSurveyData,
  PostSurveyData,
} from '../services/supabaseService';

export function useSessionPersistence(userId: string | null) {
  const sessionIdRef = useRef<string | null>(null);

  const startSession = async (nivel: number) => {
    if (!userId) return;
    sessionIdRef.current = await createGameSession(userId, nivel);
  };

  const saveSnapshot = async (
    anio: number,
    indicators: Record<string, number>,
    politicasActivas: string[]
  ) => {
    if (!sessionIdRef.current) return;
    await upsertAnnualSnapshot(sessionIdRef.current, anio, indicators, politicasActivas);
  };

  const savePreSurvey = async (data: PreSurveyData) => {
    if (!userId) return;
    await insertPreSurvey(userId, sessionIdRef.current, data);
  };

  const savePostSurvey = async (
    data: PostSurveyData,
    resultado: 'victoria' | 'derrota' | 'abandono',
    nivelAlcanzado: number
  ) => {
    if (!userId) return;
    await insertPostSurvey(userId, sessionIdRef.current, data);
    if (sessionIdRef.current)
      await finalizeGameSession(sessionIdRef.current, resultado, nivelAlcanzado);
  };

  return { sessionIdRef, startSession, saveSnapshot, savePreSurvey, savePostSurvey };
}
