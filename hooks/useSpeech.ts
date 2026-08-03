import { useState, useRef, useCallback, useEffect } from 'react';
import { Language } from './useLanguage';

const STORAGE_KEY = 'decarbonationVoiceEnabled_v1';

function readStoredPreference(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
}

function pickVoice(voices: SpeechSynthesisVoice[], lang: Language): SpeechSynthesisVoice | undefined {
  if (voices.length === 0) return undefined;
  const prefix = lang === 'es' ? 'es' : 'en';
  const candidates = voices.filter(v => v.lang.toLowerCase().startsWith(prefix));
  const pool = candidates.length > 0 ? candidates : voices;
  // Browsers that ship high-quality "Google"/"Natural"/"Neural" voices sound
  // far more natural than the default platform voice — prefer those if present.
  const highQuality = pool.find(v => /google|neural|natural|premium/i.test(v.name));
  return highQuality || pool[0];
}

// Wraps the browser's native Web Speech API (no external TTS service/API key
// needed). Voice list loads asynchronously on some browsers, hence the
// onvoiceschanged listener.
export function useSpeech() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [enabled, setEnabled] = useState<boolean>(() => supported && readStoredPreference());
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!supported) return;
    const loadVoices = () => { voicesRef.current = window.speechSynthesis.getVoices(); };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [supported]);

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [supported]);

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  // Stop any in-flight utterance immediately when voice gets turned off.
  useEffect(() => { if (!enabled) cancel(); }, [enabled, cancel]);

  const speak = useCallback((text: string, lang: Language) => {
    if (!supported || !enabled || !text.trim()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(voicesRef.current.length ? voicesRef.current : window.speechSynthesis.getVoices(), lang);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || (lang === 'es' ? 'es-ES' : 'en-US');
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [supported, enabled]);

  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported]);

  return { supported, enabled, toggle, speak, cancel, isSpeaking };
}
