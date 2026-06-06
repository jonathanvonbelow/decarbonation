import { useRef } from 'react';
import {
  createGameSession,
  finalizeGameSession,
  upsertAnnualSnapshot,
  insertPreSurvey,
  insertPostSurvey,
} from '../services/supabaseService';
import type { PreSurveyData, PostSurveyData, AnnualSnapshotIndicators } from '../services/supabaseService';

export function useSessionPersistence(userId: string | null) {
  const sessionIdRef = useRef<string | null>(null);

  const startSession = async (nivel: number) => {
    if (!userId) return;
    // Guard contra re-entrada: solo crea una sesión por instancia del hook
    if (sessionIdRef.current) return;
    const id = await createGameSession(userId, nivel);
    sessionIdRef.current = id;
  };

  const saveSnapshot = async (
    anio: number,
    indicators: AnnualSnapshotIndicators,
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
    resultado: string,
    nivelAlcanzado: number
  ) => {
    if (!userId) return;
    await insertPostSurvey(userId, sessionIdRef.current, data);
    if (sessionIdRef.current) {
      await finalizeGameSession(
        sessionIdRef.current,
        resultado as 'victoria' | 'derrota' | 'abandono',
        nivelAlcanzado
      );
    }
  };

  return { sessionIdRef, startSession, saveSnapshot, savePreSurvey, savePostSurvey };
}
