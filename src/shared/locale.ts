/**
 * es/en toggle shared by every static page (landing, teacher package). No React, no side effects
 * on import: each page's own script calls `initLocale()`.
 */
const STORAGE_KEY = 'decarbonationLanguage_v1'; // same key useLanguage/i18n already use (see
// src/i18n/index.tsx's own comment) -- a visitor who picks a language on the landing lands in
// the game already set to it, and vice versa for a returning player.

export type Locale = 'es' | 'en';

export function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'es' || stored === 'en') return stored;
  } catch { /* localStorage unavailable */ }
  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'es';
}

export function applyLocale(locale: Locale): void {
  document.documentElement.lang = locale;
  document.querySelectorAll<HTMLElement>('[data-lang]').forEach((el) => {
    el.hidden = el.dataset.lang !== locale;
  });
  const toggle = document.getElementById('lang-toggle');
  toggle?.setAttribute('aria-label', locale === 'es' ? 'Switch to English' : 'Cambiar a español');
}

export function initLocale(): void {
  let locale = detectLocale();
  applyLocale(locale);
  document.getElementById('lang-toggle')?.addEventListener('click', () => {
    locale = locale === 'es' ? 'en' : 'es';
    try { localStorage.setItem(STORAGE_KEY, locale); } catch { /* ignore */ }
    applyLocale(locale);
  });
}

