import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { UI_ES } from './ui/es';
import { UI_EN } from './ui/en';
import type { FlattenKeys, Interpolations, Locale } from './types';

export type { Locale } from './types';
export type TranslationKey = FlattenKeys<typeof UI_ES>;

const DICTS: Record<Locale, unknown> = { es: UI_ES, en: UI_EN };

// Reuses the storage key the pre-existing useLanguage/LanguageContext already wrote, so
// returning players don't lose their language preference when this system replaces it
// (see docs/DESIGN_DECISIONS_LOG.md, phase-1 entry).
const STORAGE_KEY = 'decarbonationLanguage_v1';

/** Resolves 'a.b.c' against a nested object. Returns the key itself if missing (visible in dev). */
function resolve(dict: unknown, path: string): string {
  const found = path.split('.').reduce<unknown>(
    (acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined),
    dict,
  );
  if (typeof found !== 'string') {
    // No `import.meta.env.DEV` here on purpose — this project reads env vars via
    // `process.env.X` injected through vite's `define` (see CLAUDE.md), not `import.meta.env`,
    // so no ambient vite/client types are declared. A missing key is rare enough that an
    // unconditional warning is fine either way.
    console.warn(`[i18n] Missing key: ${path}`);
    return path;
  }
  return found;
}

function interpolate(template: string, values?: Interpolations): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (values[k] !== undefined ? String(values[k]) : `{${k}}`));
}

/** Reads the initial locale: ?lang= > localStorage > navigator > 'es'. Exported (not just used
 *  internally by I18nProvider) so code that renders outside the provider -- ErrorBoundary, which
 *  has to wrap I18nProvider itself so a crash inside the provider is still caught -- can still
 *  look up the player's locale via `tFor` without a React context. */
export function detectLocale(): Locale {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('lang');
    if (fromUrl === 'es' || fromUrl === 'en') return fromUrl;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'es' || stored === 'en') return stored;
    return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'es';
  } catch {
    return 'es';
  }
}

interface I18nValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey, values?: Interpolations) => string;
  /** Locale tag for Intl APIs. */
  tag: 'es-AR' | 'en-US';
}

const I18nContext = createContext<I18nValue | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // localStorage unavailable (private mode, etc.) — locale still works for this session.
    }
    document.documentElement.lang = l;
  }, []);

  const t = useCallback((key: TranslationKey, values?: Interpolations) => interpolate(resolve(DICTS[locale], key), values), [locale]);

  const value = useMemo<I18nValue>(() => ({ locale, setLocale, t, tag: locale === 'es' ? 'es-AR' : 'en-US' }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useT(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useT must be used inside <I18nProvider>');
  return ctx;
}

/**
 * Locale-parametrized translator for code that runs outside a component tree — the action
 * registry (src/game/uiActionRegistry.ts) and the agent loop (src/services/decarbonitoAgent.ts,
 * phase 8) build player- and model-facing strings from plain functions, not hooks, since tool
 * descriptions and validation messages are constructed per-call rather than rendered.
 */
export function tFor(locale: Locale, key: TranslationKey, values?: Interpolations): string {
  return interpolate(resolve(DICTS[locale], key), values);
}

/* ── Number and date formatting (es-AR uses comma decimals; en-US uses dot) ─────────────────── */

export function useFormat() {
  const { tag } = useT();
  return useMemo(
    () => ({
      /** Indicator values: 1 decimal by default, locale-aware separator. */
      num: (n: number, digits = 1) => n.toLocaleString(tag, { minimumFractionDigits: digits, maximumFractionDigits: digits }),
      /** Money-like magnitudes (PBI, reserves): no decimals, grouped. */
      big: (n: number) => n.toLocaleString(tag, { maximumFractionDigits: 0 }),
      pct: (n: number, digits = 1) => `${n.toLocaleString(tag, { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`,
      time: (ts: number) => new Date(ts).toLocaleTimeString(tag, { hour: '2-digit', minute: '2-digit' }),
    }),
    [tag],
  );
}
