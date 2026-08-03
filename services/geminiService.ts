import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { GameState, Policy, PolicyState, LandUse, LandUseType, Pact, HistoricalDataPoint, ClosingSynthesis, Indicators } from '../types';
import { LEVEL_CONFIGS, GEMINI_MODEL_TEXT, GEMINI_MODEL_TTS, GEMINI_TTS_VOICE_NAME, ALL_POLICIES } from '../constants';
import { Language } from '../hooks/useLanguage';
import { getPolicyName, getIndicatorName } from '../i18n/gameData';

// Suffix appended to the system instruction to enforce response language
const LANGUAGE_INSTRUCTION: Record<Language, string> = {
  es: '\n\nIMPORTANTE: Responde SIEMPRE en español, independientemente del idioma en que te hagan la pregunta.',
  en: '\n\nIMPORTANT: Always respond in English, regardless of the language in which you are asked the question.',
};

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY environment variable not set. Chatbot functionality will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

// DecarboNito's replies are shown as plain text AND read aloud via TTS, so any
// stray markdown from Gemini (it's instructed not to use it, but models can
// slip) must be stripped here rather than rendered — asterisks/hashes/backticks
// read aloud as literal symbols and otherwise show up unrendered in the chat bubble.
const stripMarkdown = (text: string): string =>
  text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/(?<!\*)\*(?!\*)([^*\n]+)\*(?!\*)/g, '$1')
    .replace(/(?<!_)_(?!_)([^_\n]+)_(?!_)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[*-]\s+/gm, '')
    .trim();

export interface SynthesizedSpeech {
  base64Pcm: string;
  sampleRateHz: number;
}

// Gemini TTS returns raw 16-bit PCM; its mimeType looks like
// "audio/L16;codec=pcm;rate=24000" — parse the rate, falling back to the
// documented default when absent.
const DEFAULT_TTS_SAMPLE_RATE_HZ = 24000;
const parseSampleRateHz = (mimeType: string | undefined): number => {
  const match = mimeType?.match(/rate=(\d+)/);
  return match ? parseInt(match[1], 10) : DEFAULT_TTS_SAMPLE_RATE_HZ;
};

// Generates spoken audio for DecarboNito's replies via Gemini's native TTS —
// reuses the same GEMINI_API_KEY as the chatbot, no separate Google Cloud TTS
// project/billing/credentials needed. Returns raw PCM as base64; callers wrap
// it in a playable container (see hooks/useSpeech.ts).
export const synthesizeSpeech = async (
  text: string,
  language: Language,
  signal?: AbortSignal
): Promise<SynthesizedSpeech | null> => {
  if (!API_KEY || !text.trim()) return null;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_TTS,
      contents: text,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: GEMINI_TTS_VOICE_NAME } },
          languageCode: language === 'es' ? 'es-US' : 'en-US',
        },
        abortSignal: signal,
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    const base64Pcm = part?.inlineData?.data;
    if (!base64Pcm) return null;

    return { base64Pcm, sampleRateHz: parseSampleRateHz(part?.inlineData?.mimeType) };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return null;
    console.error("Error in synthesizeSpeech:", error);
    return null;
  }
};

// Helper function to create a concise summary of the game state
const createGameStateContext = (gameState: GameState, purpose: 'GENERAL_ASSISTANCE' | 'LEVEL_REFLECTION' | 'NEWS_HEADLINES' = 'GENERAL_ASSISTANCE', language: Language = 'es'): string => {
    const { year, currentLevel, policies, indicators, stellaSpecificState, pacts, gameLog, currentEvent, additionalTaxPressurePercentage } = gameState;
    const activeLevelConfig = LEVEL_CONFIGS.find(lc => lc.levelNumber === currentLevel);

    let context = `--- INICIO DEL CONTEXTO DEL JUEGO ---\n`;
    context += `**Estado Actual:**\n`;
    context += `- **Año:** ${year}\n`;
    context += `- **Nivel Actual:** ${currentLevel} - ${activeLevelConfig?.name}\n`;
    context += `- **Puntaje General:** ${indicators.generalScore.toFixed(1)}/1000\n\n`;

    context += `**Indicadores Clave (0-100, alto es generalmente mejor, excepto para CO2):**\n`;
    context += `- Biodiversidad: ${indicators.biodiversity.toFixed(1)}\n`;
    context += `- Emisiones CO2eq per cápita: ${indicators.co2EqEmissionsPerCapita.toFixed(2)} (un valor bajo es favorable)\n`;
    if (currentLevel >= 2) {
        context += `- Seguridad Alimentaria: ${indicators.foodSecurity.toFixed(1)}\n`;
        context += `- Seguridad Económica: ${indicators.economicSecurity.toFixed(1)}\n`;
        context += `- Bienestar Social: ${indicators.socialWellbeing.toFixed(1)}\n`;
        context += `- Estabilidad Política: ${indicators.politicalStability.toFixed(1)}\n\n`;
        context += `**Presiones Políticas (0-100, bajo es mejor):**\n`;
        context += `- Presión Agrícola: ${indicators.ppAgricola.toFixed(1)}\n`;
        context += `- Presión Ambientalista: ${indicators.ppAmbientalista.toFixed(1)}\n`;
        context += `- Presión Social: ${indicators.ppSocial.toFixed(1)}\n\n`;
    }
    if (currentLevel >= 3) {
        context += `**Finanzas:**\n`;
        context += `- PBI Real: ${stellaSpecificState.PBI_Real.toFixed(0)}\n`;
        context += `- Deuda: ${stellaSpecificState.Deuda.toFixed(0)}\n`;
        context += `- Reservas del Tesoro: ${stellaSpecificState.Reservas_del_Tesoro.toFixed(0)}\n\n`;
    }
    // FIX: Add explicit type annotation to fix potential 'unknown' type error on 'p'.
    const activePolicies = Object.values(policies).filter((p: PolicyState) => p.isActive);
    if (activePolicies.length > 0) {
        context += `**Políticas Activas (${activePolicies.length}):**\n`;
        activePolicies.forEach(p => {
            const pName = getPolicyName(p.id, language) || p.name;
            context += `- ${pName}`;
            if (currentLevel >= 2) {
                context += ` (Eficiencia: ${(p.currentEfficiency! * 100).toFixed(0)}%, Esfuerzo Instr.: ${p.totalInstrumentEffortApplied || 0}%)`;
            }
            context += `\n`;
        });
        context += `\n`;
    } else {
        context += `**Políticas Activas:** Ninguna\n\n`;
    }

    if (purpose === 'GENERAL_ASSISTANCE') {
        context += `**TODAS las Políticas Disponibles en el Juego (para tus recomendaciones):**\n`;
        ALL_POLICIES.forEach(p => context += `- ${p}\n`);
        context += `\n`;

        context += `**Acciones Disponibles para el Jugador en el Nivel ${currentLevel}:**\n`;
        context += `- Activar o desactivar políticas.\n`;
        if (currentLevel >= 2) {
            context += `- Asignar esfuerzo a instrumentos de políticas activas.\n`;
        }
        if (currentLevel >= 3) {
            context += `- Unirse o abandonar pactos internacionales.\n`;
            context += `- Solicitar préstamos.\n`;
            context += `- Ajustar la presión fiscal adicional.\n`;
        }
        context += `\n`;
    }

    if (currentEvent) {
        context += `**Evento Aleatorio Reciente:** ${currentEvent.name} - ${currentEvent.description}\n\n`;
    }

    const recentActions = gameLog.slice(0, 5).join('\n');
    context += `**Historial de Acciones Recientes:**\n${recentActions}\n`;
    context += `--- FIN DEL CONTEXTO DEL JUEGO ---\n`;
    return context;
};

export const askGemini = async (userInput: string, gameState: GameState, purpose: 'GENERAL_ASSISTANCE' | 'LEVEL_REFLECTION' = 'GENERAL_ASSISTANCE', language: Language = 'es'): Promise<string> => {
  if (!API_KEY) {
    throw new Error("API_KEY is not configured.");
  }

  const activeLevelConfig = LEVEL_CONFIGS.find(lc => lc.levelNumber === gameState.currentLevel);
  if (!activeLevelConfig) {
    throw new Error(`Configuration for level ${gameState.currentLevel} not found.`);
  }

  const systemInstruction = activeLevelConfig.chatbotSystemInstruction + LANGUAGE_INSTRUCTION[language];
  const gameStateContext = createGameStateContext(gameState, purpose, language);
  const playerLabel = language === 'en' ? 'Player Question' : 'Pregunta del Jugador';
  const fullPrompt = `${gameStateContext}\n**${playerLabel}:**\n${userInput}`;
  
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: fullPrompt,
      config: {
          systemInstruction: systemInstruction,
          temperature: 0.6,
          topP: 0.9,
          topK: 40,
      }
    });

    return stripMarkdown(response.text);
  } catch (error) {
    console.error("Error in askGemini:", error);
    if (error instanceof Error) {
        return language === 'en'
          ? `Sorry, an error occurred while processing your request: ${error.message}`
          : `Lo siento, ocurrió un error al procesar tu solicitud: ${error.message}`;
    }
    return language === 'en'
      ? "Sorry, an unexpected error occurred while processing your request."
      : "Lo siento, ocurrió un error inesperado al procesar tu solicitud.";
  }
};


export const generateNewsHeadlines = async (gameState: GameState, language: Language = 'es'): Promise<string[]> => {
    if (!API_KEY) {
        console.warn("Cannot generate news without API_KEY.");
        return [];
    }

    const gameStateContext = createGameStateContext(gameState, 'NEWS_HEADLINES', language);
    const prompt = language === 'en'
      ? `Based on the following DecarboNation game state, generate 3 brief news headlines (max 15 words each) reflecting the current state of the nation. Headlines should be plausible and can be positive, negative, or neutral. Do not explain the headlines.

    ${gameStateContext}

    Format examples: "Energy crisis hits industry as reserves drop", "Agro-ecological advances boost food security", "Political debate intensifies over new environmental regulations".`
      : `Basado en el siguiente estado del juego DecarboNation, genera 3 titulares de noticias breves (máximo 15 palabras cada uno) que reflejen la situación actual de la nación. Los titulares deben ser plausibles y pueden ser positivos, negativos o neutros. No expliques los titulares.

    ${gameStateContext}

    Ejemplos de formato: "Crisis energética golpea la industria mientras las reservas bajan", "Avances en agroecología impulsan la seguridad alimentaria", "Debate político se intensifica por nuevas regulaciones ambientales".`;
    
    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL_TEXT,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        headlines: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING,
                                description: "Un titular de noticia conciso."
                            }
                        }
                    },
                },
                temperature: 0.8,
            }
        });

        const jsonString = response.text.trim();
        const parsed = JSON.parse(jsonString);
        
        if (parsed && Array.isArray(parsed.headlines)) {
            return parsed.headlines.slice(0, 3).map(stripMarkdown);
        }
        
        return [];

    } catch (error) {
        console.error("Error generating news headlines:", error);
        return ["La oficina de prensa nacional enfrenta dificultades técnicas inesperadas."];
    }
};

// ─── Closing synthesis ("Guía para la Reflexión" personalizada de cierre) ────
//
// Produces a 4-section, non-evaluative synthesis of the player's session:
// decisions taken, trade-offs identified, cross-sectoral effects observed,
// and open reflection questions. Two implementations are exported:
//   - generateClosingSynthesis: AI-generated, via Gemini structured JSON.
//   - buildFallbackSynthesis: pure, local, no network — used whenever the
//     API key is missing or the Gemini call fails. This fallback is mandatory,
//     not optional: every session must end with a synthesis, never an error.

type SessionResult = 'won' | 'lost' | 'abandoned';

const getSessionResult = (gameState: GameState): SessionResult => {
  const reason = gameState.gameOverReason || '';
  if (reason === 'Partida abandonada por el jugador.') return 'abandoned';
  if (/victoria/i.test(reason)) return 'won';
  return 'lost';
};

const RESULT_LABELS: Record<Language, Record<SessionResult, string>> = {
  es: { won: 'alcanzó el umbral de la meta', lost: 'no alcanzó el umbral de la meta', abandoned: 'fue cerrada antes de finalizar' },
  en: { won: 'reached the goal threshold', lost: 'did not reach the goal threshold', abandoned: 'was closed before finishing' },
};

// Indicators considered when looking for the most/least favorable trajectory,
// each tagged with whether a *lower* value is the favorable direction (so deltas
// can be normalized onto a single "more favorable ⇄ less favorable" axis).
// Level 1 only meaningfully drives biodiversity, native forest and emissions, so
// we keep the comparison narrow there (but still two-sided, biodiversity vs.
// emissions, so a real trade-off can be identified); from Level 2 onward the
// full socio-economic set becomes relevant.
interface ComparableIndicator { key: keyof Indicators; lowerIsBetter?: boolean }

const getComparableIndicatorKeys = (level: number): ComparableIndicator[] =>
  level >= 2
    ? [
        { key: 'biodiversity' },
        { key: 'foodSecurity' },
        { key: 'economicSecurity' },
        { key: 'socialWellbeing' },
        { key: 'politicalStability' },
      ]
    : [
        { key: 'biodiversity' },
        { key: 'co2EqEmissionsPerCapita', lowerIsBetter: true },
      ];

// Fixed, non-evaluative reflection questions per level, written once in both
// languages. Adapted from PLAYER_REPORT_GUIDE_QUESTIONS / REPORT_GUIDE_SECTIONS
// but reframed as open questions specific to the closing synthesis (no
// "aprobado/desaprobado" framing, never the word "juego").
const LEVEL_REFLECTION_QUESTIONS: Record<Language, Record<number, string[]>> = {
  es: {
    1: [
      '¿Qué te llevó a priorizar ciertas políticas por sobre otras al sentar las bases del sistema?',
      '¿Qué relación notaste entre las políticas activadas y la evolución del bosque nativo y la biodiversidad?',
      '¿Qué harías distinto si volvieras a diseñar la estrategia fundacional?',
    ],
    2: [
      '¿Cómo describirías el equilibrio que buscaste entre desarrollo económico, bienestar social y sostenibilidad ambiental?',
      '¿Qué instrumentos de política concentraron tu esfuerzo, y por qué esos y no otros?',
      '¿Cómo respondiste cuando las presiones políticas (agrícola, ambientalista, social) empezaron a crecer?',
      '¿Qué relación identificás entre las decisiones tempranas y los resultados que viste más adelante?',
    ],
    3: [
      '¿Qué rol jugaron las decisiones financieras (deuda, préstamos, presión fiscal) en tu estrategia general?',
      '¿Cómo interactuaron los pactos internacionales con tus políticas internas?',
      '¿Qué eventos externos condicionaron más tu trayectoria, y cómo respondiste a ellos?',
      '¿Qué le dirías a alguien que empieza esta exploración sobre la tensión entre liderazgo global y estabilidad interna?',
    ],
  },
  en: {
    1: [
      'What led you to prioritize certain policies over others while laying the foundations of the system?',
      'What relationship did you notice between the policies activated and the evolution of native forest and biodiversity?',
      'What would you do differently if you redesigned the foundational strategy?',
    ],
    2: [
      'How would you describe the balance you sought between economic development, social wellbeing, and environmental sustainability?',
      'Which policy instruments concentrated your effort, and why those rather than others?',
      'How did you respond as political pressures (agricultural, environmental, social) began to grow?',
      'What relationship do you see between early decisions and the results you observed later on?',
    ],
    3: [
      'What role did financial decisions (debt, loans, tax pressure) play in your overall strategy?',
      'How did international pacts interact with your domestic policies?',
      'Which external events most shaped your trajectory, and how did you respond to them?',
      'What would you tell someone starting this exploration about the tension between global leadership and internal stability?',
    ],
  },
};

// Builds the extended prompt context for the closing synthesis: current
// state + policy/effort snapshot (reused from createGameStateContext) plus
// a per-indicator trajectory summary (first vs. last recorded year) and a
// longer slice of the session log, so the model has enough material to
// identify trade-offs and cross-sectoral causal chains.
const createClosingSynthesisContext = (
  gameState: GameState,
  historicalData: HistoricalDataPoint[],
  language: Language
): string => {
  const activeLevelConfig = LEVEL_CONFIGS.find(lc => lc.levelNumber === gameState.currentLevel);
  const result = getSessionResult(gameState);

  let context = createGameStateContext(gameState, 'LEVEL_REFLECTION', language);

  context += `\n--- INICIO DEL RESUMEN DE CIERRE DE SESIÓN ---\n`;
  context += `- **Nivel:** ${gameState.currentLevel} - ${activeLevelConfig?.name || ''}\n`;
  context += `- **Resultado:** ${RESULT_LABELS[language][result]}\n`;
  context += `- **Motivo de cierre:** ${gameState.gameOverReason || 'N/D'}\n`;

  const first = historicalData[0];
  const last = historicalData[historicalData.length - 1];
  if (first && last) {
    context += `\n**Trayectoria de indicadores (año ${first.year} → año ${last.year}):**\n`;
    getComparableIndicatorKeys(gameState.currentLevel).forEach(({ key }) => {
      const name = getIndicatorName(key as string, language);
      const startVal = first[key as string];
      const endVal = last[key as string];
      if (typeof startVal === 'number' && typeof endVal === 'number') {
        context += `- ${name}: ${startVal.toFixed(1)} → ${endVal.toFixed(1)} (Δ ${(endVal - startVal).toFixed(1)})\n`;
      }
    });
  }

  context += `\n**Historial extendido de acciones y eventos de la sesión (más recientes primero):**\n`;
  context += `${gameState.gameLog.slice(0, 20).join('\n')}\n`;
  context += `--- FIN DEL RESUMEN DE CIERRE DE SESIÓN ---\n`;

  return context;
};

export const generateClosingSynthesis = async (
  gameState: GameState,
  historicalData: HistoricalDataPoint[],
  language: Language = 'es'
): Promise<ClosingSynthesis> => {
  if (!API_KEY) {
    throw new Error('API_KEY is not configured.');
  }

  const context = createClosingSynthesisContext(gameState, historicalData, language);

  const systemInstruction = language === 'en'
    ? `You are a strategic reflection assistant for a scenario laboratory on climate and sustainability policy. Never use the word "game" — refer to the experience as a "scenario exploration" or "simulation session". Never evaluate the player as "passed/failed" or "approved/rejected"; your tone is informational and reflective, never a grade.`
    : `Sos un asistente de reflexión estratégica de un laboratorio de escenarios sobre políticas climáticas y de sostenibilidad. Nunca uses la palabra "juego" — referite a la experiencia como "exploración de escenarios" o "sesión de simulación". Nunca evalúes al usuario como "aprobado/desaprobado"; tu tono es informativo y reflexivo, nunca una calificación.`;

  const prompt = language === 'en'
    ? `Based on the following scenario-lab session data:

${context}

Generate a closing synthesis with these 4 sections, in English, professional and non-evaluative tone:
1. decisionsTaken: a brief summary of which policies were activated and how effort was distributed among them.
2. tradeOffs: the main trade-offs identified — which indicators improved at the expense of others.
3. crossSectoralEffects: relevant cross-sectoral causal relationships observed during the session (e.g. fiscal pressure → cut to environmental policy → drop in an indicator).
4. reflectionQuestions: 2 to 4 open strategic reflection questions. These must never be evaluative (never "passed/failed") — just open questions that invite the person to think about what they would do differently.

Never use the word "game". Refer to the experience as "scenario exploration" or "simulation session".`
    : `Basado en los siguientes datos de la sesión del laboratorio de escenarios:

${context}

Generá una síntesis de cierre con estas 4 secciones, en español, en tono profesional y no evaluativo:
1. decisionsTaken: un resumen breve de qué políticas se activaron y cómo se distribuyó el esfuerzo entre ellas.
2. tradeOffs: los principales trade-offs identificados — qué indicadores mejoraron a costa de cuáles.
3. crossSectoralEffects: relaciones causales intersectoriales relevantes que se observaron durante la sesión (ej. presión fiscal → recorte de política ambiental → caída de un indicador).
4. reflectionQuestions: 2 a 4 preguntas de reflexión estratégica abiertas. Nunca deben ser evaluativas (nunca "aprobado/desaprobado") — solo preguntas abiertas que inviten a pensar qué harían distinto.

No uses la palabra "juego". Referite a la experiencia como "exploración de escenarios" o "sesión de simulación".`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            decisionsTaken: {
              type: Type.STRING,
              description: "Resumen de las políticas activadas y la distribución del esfuerzo.",
            },
            tradeOffs: {
              type: Type.STRING,
              description: "Trade-offs identificados entre indicadores.",
            },
            crossSectoralEffects: {
              type: Type.STRING,
              description: "Relaciones causales intersectoriales observadas durante la sesión.",
            },
            reflectionQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
                description: "Una pregunta de reflexión estratégica abierta, no evaluativa.",
              },
            },
          },
          required: ["decisionsTaken", "tradeOffs", "crossSectoralEffects", "reflectionQuestions"],
        },
        temperature: 0.7,
      }
    });

    const parsed = JSON.parse(response.text.trim());

    const decisionsTaken = typeof parsed?.decisionsTaken === 'string' ? stripMarkdown(parsed.decisionsTaken) : '';
    const tradeOffs = typeof parsed?.tradeOffs === 'string' ? stripMarkdown(parsed.tradeOffs) : '';
    const crossSectoralEffects = typeof parsed?.crossSectoralEffects === 'string' ? stripMarkdown(parsed.crossSectoralEffects) : '';
    const reflectionQuestions = Array.isArray(parsed?.reflectionQuestions)
      ? parsed.reflectionQuestions
          .filter((q: unknown): q is string => typeof q === 'string' && q.trim().length > 0)
          .slice(0, 4)
          .map(stripMarkdown)
      : [];

    if (!decisionsTaken || !tradeOffs || !crossSectoralEffects || reflectionQuestions.length === 0) {
      throw new Error('Incomplete closing synthesis response from Gemini.');
    }

    return { decisionsTaken, tradeOffs, crossSectoralEffects, reflectionQuestions };
  } catch (error) {
    console.error("Error generating closing synthesis:", error);
    throw error instanceof Error ? error : new Error('Unknown error generating closing synthesis.');
  }
};

// Pure, network-free fallback. Always produces a complete 4-section
// ClosingSynthesis from data already present in gameState/historicalData, so
// the closing screen never gets stuck even without an API key or with the
// Gemini call failing.
export const buildFallbackSynthesis = (
  gameState: GameState,
  historicalData: HistoricalDataPoint[],
  language: Language = 'es'
): ClosingSynthesis => {
  const level = gameState.currentLevel;
  const activeLevelConfig = LEVEL_CONFIGS.find(lc => lc.levelNumber === level);
  const result = getSessionResult(gameState);

  // Section 1: decisions taken (policies activated + effort distribution)
  const activePolicies = Object.values(gameState.policies).filter((p: PolicyState) => p.isActive);
  const policyNames = activePolicies.map(p => getPolicyName(p.id, language));
  const mostActivePolicy = [...activePolicies].sort(
    (a, b) => (b.totalInstrumentEffortApplied || 0) - (a.totalInstrumentEffortApplied || 0)
  )[0];

  let decisionsTaken: string;
  if (language === 'en') {
    decisionsTaken = `Session on Level ${level} ("${activeLevelConfig?.name || ''}"), which ${RESULT_LABELS.en[result]}. `;
    decisionsTaken += activePolicies.length > 0
      ? `${activePolicies.length} polic${activePolicies.length === 1 ? 'y was' : 'ies were'} active by the end: ${policyNames.join(', ')}. `
      : `No policy was active by the end of the session. `;
    if (mostActivePolicy && (mostActivePolicy.totalInstrumentEffortApplied || 0) > 0) {
      decisionsTaken += `Effort concentrated mainly on "${getPolicyName(mostActivePolicy.id, language)}" (~${mostActivePolicy.totalInstrumentEffortApplied}% of accumulated instrument effort).`;
    } else if (activePolicies.length > 0) {
      decisionsTaken += `At this level, effort is not distributed across instruments — decisions were limited to activating or deactivating policies.`;
    }
  } else {
    decisionsTaken = `Sesión en el Nivel ${level} ("${activeLevelConfig?.name || ''}"), que ${RESULT_LABELS.es[result]}. `;
    decisionsTaken += activePolicies.length > 0
      ? `Al cierre había ${activePolicies.length} política(s) activa(s): ${policyNames.join(', ')}. `
      : `Al cierre no había ninguna política activa. `;
    if (mostActivePolicy && (mostActivePolicy.totalInstrumentEffortApplied || 0) > 0) {
      decisionsTaken += `El esfuerzo se concentró principalmente en "${getPolicyName(mostActivePolicy.id, language)}" (~${mostActivePolicy.totalInstrumentEffortApplied}% del esfuerzo instrumental acumulado).`;
    } else if (activePolicies.length > 0) {
      decisionsTaken += `En este nivel el esfuerzo no se distribuye entre instrumentos: las decisiones se limitaron a activar o desactivar políticas.`;
    }
  }

  // Section 2: trade-offs (indicator that moved most favorably vs. least favorably).
  // "favorability" normalizes lowerIsBetter indicators (e.g. CO2/capita) onto the same
  // axis as the rest (higher = better) purely for ranking; "value" keeps the raw
  // delta/level so the displayed number matches what the player actually saw move.
  const indicatorKeys = getComparableIndicatorKeys(level);
  const first = historicalData[0];
  const last = historicalData[historicalData.length - 1];

  let mostFavorable: { key: keyof Indicators; value: number; favorability: number } | null = null;
  let leastFavorable: { key: keyof Indicators; value: number; favorability: number } | null = null;

  indicatorKeys.forEach(({ key, lowerIsBetter }) => {
    const value = (first && last && typeof first[key as string] === 'number' && typeof last[key as string] === 'number')
      ? last[key as string] - first[key as string] // delta over the session
      : (gameState.indicators[key] as number); // fallback: final absolute value
    const favorability = lowerIsBetter ? -value : value;
    if (!mostFavorable || favorability > mostFavorable.favorability) mostFavorable = { key, value, favorability };
    if (!leastFavorable || favorability < leastFavorable.favorability) leastFavorable = { key, value, favorability };
  });

  let tradeOffs: string;
  if (mostFavorable && leastFavorable && mostFavorable.key !== leastFavorable.key) {
    const highName = getIndicatorName(mostFavorable.key as string, language);
    const lowName = getIndicatorName(leastFavorable.key as string, language);
    tradeOffs = language === 'en'
      ? `Of the tracked indicators, "${highName}" showed the most favorable movement (${mostFavorable.value >= 0 ? '+' : ''}${mostFavorable.value.toFixed(1)}), while "${lowName}" showed the least favorable movement (${leastFavorable.value >= 0 ? '+' : ''}${leastFavorable.value.toFixed(1)}). This points to effort concentrating on one axis of the system, possibly at the expense of the other.`
      : `Entre los indicadores relevados, "${highName}" tuvo el movimiento más favorable (${mostFavorable.value >= 0 ? '+' : ''}${mostFavorable.value.toFixed(1)}), mientras que "${lowName}" tuvo el movimiento menos favorable (${leastFavorable.value >= 0 ? '+' : ''}${leastFavorable.value.toFixed(1)}). Esto sugiere que el esfuerzo se concentró en un eje del sistema, posiblemente a costa del otro.`;
  } else {
    tradeOffs = language === 'en'
      ? `There is not enough recorded trajectory data in this session to compare indicator trade-offs in detail.`
      : `No hay suficientes datos de trayectoria registrados en esta sesión como para comparar trade-offs entre indicadores en detalle.`;
  }

  // Section 3: cross-sectoral effects — surfaced from log lines that mention
  // known causal keywords (fiscal pressure, efficiency drops, collapse, etc.)
  const causalKeywords = language === 'en'
    ? ['pressure', 'collapse', 'efficiency', 'debt', 'loan', 'shortfall', 'cut']
    : ['presión', 'colapso', 'eficiencia', 'deuda', 'préstamo', 'déficit', 'recorte'];
  const relevantLogLines = gameState.gameLog
    .filter(line => causalKeywords.some(kw => line.toLowerCase().includes(kw)))
    .slice(0, 3);

  let crossSectoralEffects: string;
  if (relevantLogLines.length > 0) {
    crossSectoralEffects = language === 'en'
      ? `The session log recorded events suggesting relationships between different dimensions of the system, for example:\n- ${relevantLogLines.join('\n- ')}`
      : `El registro de la sesión reflejó eventos que sugieren relaciones entre distintas dimensiones del sistema, por ejemplo:\n- ${relevantLogLines.join('\n- ')}`;
  } else {
    crossSectoralEffects = language === 'en'
      ? `No specific cross-sectoral chain stood out in the recorded log for this session; reviewing the full log alongside the indicator trajectory can still reveal relevant connections.`
      : `No se destacó una cadena intersectorial específica en el registro de esta sesión; revisar el registro completo junto con la trayectoria de indicadores igualmente puede revelar conexiones relevantes.`;
  }

  // Section 4: fixed, open, non-evaluative reflection questions per level
  const questionsForLevel = LEVEL_REFLECTION_QUESTIONS[language][level] || LEVEL_REFLECTION_QUESTIONS[language][1];

  return {
    decisionsTaken,
    tradeOffs,
    crossSectoralEffects,
    reflectionQuestions: questionsForLevel,
    isFallback: true,
  };
};