import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { GameState, Policy, PolicyState, LandUse, LandUseType, Pact } from '../types';
import { LEVEL_CONFIGS, GEMINI_MODEL_TEXT, ALL_POLICIES } from '../constants';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY environment variable not set. Chatbot functionality will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

// Helper function to create a concise summary of the game state
const createGameStateContext = (gameState: GameState, purpose: 'GENERAL_ASSISTANCE' | 'LEVEL_REFLECTION' | 'NEWS_HEADLINES' = 'GENERAL_ASSISTANCE'): string => {
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
            context += `- ${p.name}`;
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

export const askGemini = async (userInput: string, gameState: GameState, purpose: 'GENERAL_ASSISTANCE' | 'LEVEL_REFLECTION' = 'GENERAL_ASSISTANCE'): Promise<string> => {
  if (!API_KEY) {
    throw new Error("API_KEY is not configured.");
  }
  
  const activeLevelConfig = LEVEL_CONFIGS.find(lc => lc.levelNumber === gameState.currentLevel);
  if (!activeLevelConfig) {
    throw new Error(`Configuration for level ${gameState.currentLevel} not found.`);
  }
  
  const systemInstruction = activeLevelConfig.chatbotSystemInstruction;
  const gameStateContext = createGameStateContext(gameState, purpose);
  
  const fullPrompt = `${gameStateContext}\n**Pregunta del Jugador:**\n${userInput}`;
  
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

    return response.text;
  } catch (error) {
    console.error("Error in askGemini:", error);
    if (error instanceof Error) {
        return `Lo siento, ocurrió un error al procesar tu solicitud: ${error.message}`;
    }
    return "Lo siento, ocurrió un error inesperado al procesar tu solicitud.";
  }
};


export const generateNewsHeadlines = async (gameState: GameState): Promise<string[]> => {
    if (!API_KEY) {
        console.warn("Cannot generate news without API_KEY.");
        return [];
    }

    const gameStateContext = createGameStateContext(gameState, 'NEWS_HEADLINES');
    const prompt = `Basado en el siguiente estado del juego DecarboNation, genera 3 titulares de noticias breves (máximo 15 palabras cada uno) que reflejen la situación actual de la nación. Los titulares deben ser plausibles y pueden ser positivos, negativos o neutros. No expliques los titulares.

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
            return parsed.headlines.slice(0, 3);
        }
        
        return [];

    } catch (error) {
        console.error("Error generating news headlines:", error);
        return ["La oficina de prensa nacional enfrenta dificultades técnicas inesperadas."];
    }
};