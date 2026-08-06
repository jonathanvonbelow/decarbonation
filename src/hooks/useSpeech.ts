import { useState, useRef, useCallback, useEffect } from 'react';
import { Language } from './useLanguage';
import { synthesizeSpeech } from '../services/geminiService';

const STORAGE_KEY = 'decarbonationVoiceEnabled_v1';

function readStoredPreference(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Wraps the raw 16-bit mono PCM buffer returned by Gemini TTS in a minimal
// WAV header so it can be played directly via an <audio> element — browsers
// can't play headerless PCM on their own.
function pcmToWavBlob(pcmBytes: Uint8Array, sampleRateHz: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRateHz * blockAlign;

  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcmBytes.length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRateHz, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, pcmBytes.length, true);

  return new Blob([header, pcmBytes], { type: 'audio/wav' });
}

// Speaks DecarboNito's replies using Gemini's native TTS (services/geminiService
// -> synthesizeSpeech). Reuses the same GEMINI_API_KEY already configured for
// the chatbot — no browser Web Speech API, no separate Google Cloud TTS
// project/credentials.
export function useSpeech(apiKeyAvailable: boolean) {
  const supported = apiKeyAvailable && typeof window !== 'undefined' && typeof Audio !== 'undefined';
  const [enabled, setEnabled] = useState<boolean>(() => supported && readStoredPreference());
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const releaseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    releaseAudio();
    setIsSpeaking(false);
  }, [releaseAudio]);

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  // Stop any in-flight request/playback immediately when voice gets turned off.
  useEffect(() => { if (!enabled) cancel(); }, [enabled, cancel]);

  const speak = useCallback(async (text: string, lang: Language) => {
    if (!supported || !enabled || !text.trim()) return;
    cancel(); // interrupt whatever was playing/requesting before

    const controller = new AbortController();
    abortRef.current = controller;
    setIsSpeaking(true);

    const result = await synthesizeSpeech(text, lang, controller.signal);
    // Bail if superseded by a newer speak() call or cancelled while awaiting.
    if (controller.signal.aborted || abortRef.current !== controller) return;

    if (!result) {
      setIsSpeaking(false);
      return;
    }

    const wavBlob = pcmToWavBlob(base64ToBytes(result.base64Pcm), result.sampleRateHz);
    const url = URL.createObjectURL(wavBlob);
    objectUrlRef.current = url;

    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => { if (abortRef.current === controller) setIsSpeaking(false); };
    audio.onerror = () => { if (abortRef.current === controller) setIsSpeaking(false); };

    try {
      await audio.play();
    } catch {
      if (abortRef.current === controller) setIsSpeaking(false);
    }
  }, [supported, enabled, cancel]);

  useEffect(() => () => { abortRef.current?.abort(); releaseAudio(); }, [releaseAudio]);

  return { supported, enabled, toggle, speak, cancel, isSpeaking };
}
