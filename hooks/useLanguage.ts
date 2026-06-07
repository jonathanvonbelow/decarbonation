import { useState, useCallback } from 'react';

export type Language = 'es' | 'en';

const STORAGE_KEY = 'decarbonationLanguage_v1';

function readStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'es' || stored === 'en') return stored;
  } catch (_) { /* localStorage no disponible */ }
  return 'es'; // español por defecto
}

export function useLanguage() {
  const [language, setLanguage] = useState<Language>(readStoredLanguage);

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => {
      const next: Language = prev === 'es' ? 'en' : 'es';
      try { localStorage.setItem(STORAGE_KEY, next); } catch (_) {}
      return next;
    });
  }, []);

  const setLanguageExplicit = useCallback((lang: Language) => {
    setLanguage(lang);
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) {}
  }, []);

  return { language, toggleLanguage, setLanguageExplicit };
}
