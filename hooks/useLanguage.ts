import { useState, useCallback } from 'react';
export type Language = 'es' | 'en';
const STORAGE_KEY = 'decarbonationLanguage_v1';
function readStoredLanguage(): Language {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s === 'en' || s === 'es') return s as Language; } catch {}
  return 'es';
}
export function useLanguage() {
  const [language, setLanguage] = useState<Language>(readStoredLanguage);
  const toggleLanguage = useCallback(() => {
    setLanguage(prev => { const next: Language = prev === 'es' ? 'en' : 'es'; try { localStorage.setItem(STORAGE_KEY, next); } catch {} return next; });
  }, []);
  return { language, toggleLanguage };
}
