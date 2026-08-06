import { describe, expect, it } from 'vitest';
import { UI_ES } from '../src/i18n/ui/es';
import { UI_EN } from '../src/i18n/ui/en';

const keysDeep = (o: unknown, p = ''): string[] =>
  o && typeof o === 'object'
    ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => keysDeep(v, p ? `${p}.${k}` : k))
    : [p];

describe('i18n UI dictionary (Capa A)', () => {
  it('has identical key sets in es and en', () => {
    expect(keysDeep(UI_EN).sort()).toEqual(keysDeep(UI_ES).sort());
  });

  it('has no empty strings in either locale', () => {
    for (const dict of [UI_ES, UI_EN]) {
      const empties = keysDeep(dict).filter((k) => {
        const v = k.split('.').reduce<any>((a, part) => a?.[part], dict);
        return typeof v === 'string' && v.trim() === '';
      });
      expect(empties).toEqual([]);
    }
  });

  it('every {placeholder} in the es template also appears in the matching en template', () => {
    const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of keysDeep(UI_ES)) {
      const esValue = key.split('.').reduce<any>((a, part) => a?.[part], UI_ES);
      const enValue = key.split('.').reduce<any>((a, part) => a?.[part], UI_EN);
      expect(placeholders(enValue), `placeholder mismatch at "${key}"`).toEqual(placeholders(esValue));
    }
  });
});
