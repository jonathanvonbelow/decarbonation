/**
 * Copy access for the Territorio preview. Reads the locale from the app-wide I18nProvider (so the
 * language toggle and the stored preference are shared with the main game) and serves the
 * preview's own dictionary (src/i18n/territorio/).
 */
import { useMemo } from 'react';
import { useFormat, useT } from '../i18n';
import { TERRITORIO_EN } from '../i18n/territorio/en';
import { TERRITORIO_ES } from '../i18n/territorio/es';

export type Copy = typeof TERRITORIO_ES;

/** Fills {placeholders}; for 'singular|plural' templates, picks by the numeric value of {n}. */
export function fill(template: string, values: Record<string, string | number> = {}): string {
  let text = template;
  if (text.includes('|')) {
    const [one, many] = text.split('|');
    text = Number(values.n) === 1 ? one : many;
  }
  return text.replace(/\{(\w+)\}/g, (_, k) => (values[k] !== undefined ? String(values[k]) : `{${k}}`));
}

export function useCopy() {
  const { locale, setLocale, tag } = useT();
  const fmt = useFormat();
  return useMemo(() => {
    const c: Copy = locale === 'en' ? TERRITORIO_EN : TERRITORIO_ES;
    return {
      c,
      locale,
      setLocale,
      fmt,
      /** Short month name (Jan / ene) in the active locale. */
      monthName: (m: number) => new Date(2000, m, 1).toLocaleString(tag, { month: 'short' }).replace('.', ''),
      /** Signed number with one decimal: +1,2 / −0,4. */
      signed: (n: number, digits = 1) => `${n >= 0 ? '+' : '−'}${fmt.num(Math.abs(n), digits)}`,
    };
  }, [locale, setLocale, tag, fmt]);
}
