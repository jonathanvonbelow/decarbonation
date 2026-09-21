/**
 * Landing page behavior (20_landing_shareables.md). The landing itself is static HTML+CSS (§2:
 * "no una ruta de la SPA") — this is the ONLY script it loads, and it never mounts React. Three
 * jobs: the es/en toggle, the funnel events this page alone can emit (`landing_view` on load,
 * `play_click` and `preview_click` on the CTAs), and the screenshot carousel, which is a plain
 * scroll-snap strip that works without this script and only gains its buttons and dots here.
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
      // The 3-level game is no longer the hero CTA: it now starts from its own section.
      const origin = link.id === 'cta-play' ? 'main_game_section' : link.id === 'cta-demo' ? 'demo' : 'audience_card';
      logFunnelEvent('play_click', { origin });
    });
  });

  // Territorio keeps its own event, so the two funnels stay separable now that the preview is
  // what the page leads with (21_fusion_ecosim.md; reordenado 2026-09-21).
  document.querySelectorAll<HTMLAnchorElement>('a[href^="/territorio"]').forEach((link) => {
    link.addEventListener('click', () => {
      logFunnelEvent('preview_click', { preview: 'territorio', origin: link.id === 'cta-territorio' ? 'hero' : 'other' });
    });
  });
}

/**
 * Screenshot carousel. The markup is a scroll-snap strip: with no JS it still scrolls and snaps,
 * so this only adds the previous/next buttons, the dots and arrow-key support.
 */
function initCarousel(): void {
  const track = document.getElementById('shots');
  const dotsBox = document.getElementById('shots-dots');
  if (!track || !dotsBox) return;
  const slides = Array.from(track.querySelectorAll<HTMLElement>('.carousel-slide'));
  if (slides.length < 2) return;

  const currentIndex = () => Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
  const goTo = (i: number) => {
    const clamped = (i + slides.length) % slides.length;
    track.scrollTo({ left: clamped * track.clientWidth, behavior: 'smooth' });
  };

  const dots = slides.map((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'carousel-dot';
    dot.setAttribute('aria-label', `${i + 1} / ${slides.length}`);
    dot.addEventListener('click', () => goTo(i));
    dotsBox.appendChild(dot);
    return dot;
  });

  const paint = () => {
    const current = currentIndex();
    dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === current)));
  };
  paint();

  let ticking = false;
  track.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      paint();
      ticking = false;
    });
  });
  window.addEventListener('resize', paint);

  document.getElementById('shots-prev')?.addEventListener('click', () => goTo(currentIndex() - 1));
  document.getElementById('shots-next')?.addEventListener('click', () => goTo(currentIndex() + 1));
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(currentIndex() + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(currentIndex() - 1); }
  });
}

initLocale();
initFunnelTracking();
initCarousel();
