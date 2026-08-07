/**
 * Landing page behavior (20_landing_shareables.md). The landing itself is static HTML+CSS (§2:
 * "no una ruta de la SPA") — this is the ONLY script it loads, and it never mounts React. Two
 * jobs: the es/en toggle, and the two funnel events this page alone can emit (`landing_view` on
 * load, `play_click` on any CTA that leads to /play).
 */
import { logFunnelEventLite as logFunnelEvent } from './services/funnelTelemetryLite';

const STORAGE_KEY = 'decarbonationLanguage_v1'; // same key useLanguage/i18n already use (see
// src/i18n/index.tsx's own comment) -- a visitor who picks a language on the landing lands in
// the game already set to it, and vice versa for a returning player.

type Locale = 'es' | 'en';

function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'es' || stored === 'en') return stored;
  } catch { /* localStorage unavailable */ }
  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'es';
}

function applyLocale(locale: Locale): void {
  document.documentElement.lang = locale;
  document.querySelectorAll<HTMLElement>('[data-lang]').forEach((el) => {
    el.hidden = el.dataset.lang !== locale;
  });
  const toggle = document.getElementById('lang-toggle');
  toggle?.setAttribute('aria-label', locale === 'es' ? 'Switch to English' : 'Cambiar a español');
}

function initLocale(): void {
  let locale = detectLocale();
  applyLocale(locale);
  document.getElementById('lang-toggle')?.addEventListener('click', () => {
    locale = locale === 'es' ? 'en' : 'es';
    try { localStorage.setItem(STORAGE_KEY, locale); } catch { /* ignore */ }
    applyLocale(locale);
  });
}

function initFunnelTracking(): void {
  // Shared by index.html (the landing proper) and docentes.html (this same module, reused for
  // its lang toggle) -- only the former counts as a `landing_view` in the funnel (§7 table).
  if (document.body.dataset.page === 'landing') {
    const params = new URLSearchParams(window.location.search);
    logFunnelEvent('landing_view', {
      utm_source: params.get('utm_source'),
      utm_campaign: params.get('utm_campaign'),
      locale: detectLocale(),
      referrer: document.referrer || null,
    });
  }

  document.querySelectorAll<HTMLAnchorElement>('a[href^="/play"]').forEach((link) => {
    link.addEventListener('click', () => {
      const origin = link.id === 'cta-play' ? 'hero' : link.id === 'cta-demo' ? 'demo' : 'audience_card';
      logFunnelEvent('play_click', { origin });
    });
  });
}

initLocale();
initFunnelTracking();
