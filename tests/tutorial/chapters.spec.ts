import { describe, expect, it } from 'vitest';
import { CHAPTERS, CHAPTERS_BY_ID } from '../../src/components/tutorial/chapters';
import { ANCHORS } from '../../src/components/decarbonito/anchors';
import { UI_ES } from '../../src/i18n/ui/es';
import { UI_EN } from '../../src/i18n/ui/en';

/** Resolves a dot-notation key against a dictionary, mirroring src/i18n/index.tsx's own resolve(). */
function resolves(dict: unknown, key: string): boolean {
  const found = key.split('.').reduce<unknown>(
    (acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined),
    dict,
  );
  return typeof found === 'string';
}

const STATIC_ANCHOR_IDS = new Set(
  (Object.values(ANCHORS) as unknown[]).filter((v) => typeof v === 'string') as string[],
);

describe('tutorial chapters data', () => {
  it('every chapter has a unique id', () => {
    const ids = CHAPTERS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every step id is unique within its chapter', () => {
    CHAPTERS.forEach((chapter) => {
      const ids = chapter.steps.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  it('every titleKey and textKey resolves in both es and en dictionaries', () => {
    CHAPTERS.forEach((chapter) => {
      expect(resolves(UI_ES, chapter.titleKey), `${chapter.id}.titleKey (es): ${chapter.titleKey}`).toBe(true);
      expect(resolves(UI_EN, chapter.titleKey), `${chapter.id}.titleKey (en): ${chapter.titleKey}`).toBe(true);
      chapter.steps.forEach((step) => {
        expect(resolves(UI_ES, step.textKey), `${chapter.id}.${step.id} (es): ${step.textKey}`).toBe(true);
        expect(resolves(UI_EN, step.textKey), `${chapter.id}.${step.id} (en): ${step.textKey}`).toBe(true);
      });
    });
  });

  it('every step anchor is a real, registered static anchor id (no typos pointing nowhere)', () => {
    CHAPTERS.forEach((chapter) => {
      chapter.steps.forEach((step) => {
        if (step.anchor) {
          expect(STATIC_ANCHOR_IDS.has(step.anchor), `${chapter.id}.${step.id} anchor: ${step.anchor}`).toBe(true);
        }
      });
    });
  });

  it('CHAPTERS_BY_ID is a lookup consistent with CHAPTERS', () => {
    CHAPTERS.forEach((c) => expect(CHAPTERS_BY_ID[c.id]).toBe(c));
  });

  it('coldOpen has no trigger (launched explicitly by TutorialRunner, not level/state-driven)', () => {
    expect(CHAPTERS_BY_ID.coldOpen.trigger).toBeUndefined();
  });

  it('level 2+ chapters declare a trigger (offered when reached, not on level entry, per §4.3)', () => {
    CHAPTERS.filter((c) => c.level >= 2).forEach((c) => {
      expect(c.trigger, `${c.id} should declare a trigger`).toBeDefined();
    });
  });
});
