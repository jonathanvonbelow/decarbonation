/**
 * Single source of truth for Gemini model ids and generation parameters.
 *
 * Model ids are configuration, never literals in call sites: they come from env (injected by
 * vite.config.ts `define`) with defaults chosen against the official deprecations page
 * (checked 2026-10-12, see mejora-general/files/24_gemini_modelo_configurable.md).
 *
 * Gemini 3 guidance: keep `temperature` at its default (1.0); lower values can cause looping.
 * `topP`/`topK` are not documented for Gemini 3, so they are omitted for that family.
 * Rollback: set GEMINI_MODEL=gemini-2.5-flash and `samplingFor` restores the legacy parameters.
 */
import type { GenerateContentConfig, ThinkingLevel } from '@google/genai';

/** Default text model. Override with GEMINI_MODEL without touching code. */
export const DEFAULT_TEXT_MODEL = 'gemini-3.8-flash';
/** Cheaper/faster fallback used by the serverless proxy on upstream errors. */
export const DEFAULT_FALLBACK_MODEL = 'gemini-3.5-flash-lite';
/** TTS model. The 2.5 preview TTS model shuts down on 2026-11-17. */
export const DEFAULT_TTS_MODEL = 'gemini-3.8-flash-tts';

export const GEMINI_MODEL_TEXT: string = process.env.GEMINI_MODEL || DEFAULT_TEXT_MODEL;
export const GEMINI_MODEL_FALLBACK: string = process.env.GEMINI_MODEL_FALLBACK || DEFAULT_FALLBACK_MODEL;
export const GEMINI_MODEL_TTS: string = process.env.GEMINI_MODEL_TTS || DEFAULT_TTS_MODEL;

/** True for any Gemini 3.x model id (e.g. "gemini-3.8-flash", "gemini-3.5-flash-lite"). */
export function isGemini3(model: string): boolean {
  return /^gemini-3(\.|-)/.test(model);
}

/**
 * Sampling parameters for a call site, adapted to the model family.
 *
 * @param model  Model id the call will use.
 * @param legacy Parameters the call site used with Gemini 2.5.
 */
export function samplingFor(
  model: string,
  legacy: { temperature?: number; topP?: number; topK?: number },
): Pick<GenerateContentConfig, 'temperature' | 'topP' | 'topK' | 'thinkingConfig'> {
  if (!isGemini3(model)) return { ...legacy };
  // Short in-game advice: low thinking keeps latency acceptable during a live session.
  return { thinkingConfig: { thinkingLevel: 'LOW' as ThinkingLevel } };
}
