import { useCallback } from 'react';
import { useT } from '../i18n';

export type Language = 'es' | 'en';

/**
 * Bridge to the typed i18n system (src/i18n/), kept so the ~25 components still doing
 * `const { language } = useLanguageContext(); const t = T[language];` with their own local
 * dictionary don't need to change in the same pass that introduces the centralized one — see
 * docs/DESIGN_DECISIONS_LOG.md, phase-3 entry. New/migrated components should use `useT()`
 * directly instead of this hook.
 *
 * Requires an ancestor `<I18nProvider>` (mounted once in src/main.tsx), which is now always the
 * case — this hook is no longer a standalone `useState`.
 */
export function useLanguage() {
  const { locale, setLocale } = useT();
  const toggleLanguage = useCallback(() => {
    setLocale(locale === 'es' ? 'en' : 'es');
  }, [locale, setLocale]);
  return { language: locale as Language, toggleLanguage };
}
