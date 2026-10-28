/**
 * Phase 50 (debt of 49): the level intro lists the floors and routes of LEVEL_ROUTES, not the deleted 1.1 headline
 * targets. Server-rendered (no DOM needed).
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import LevelIntroModal from '../../src/components/common/LevelIntroModal';
import { LanguageProvider } from '../../src/contexts/LanguageContext';
import { I18nProvider } from '../../src/i18n';
import { LEVEL_CONFIGS } from '../../src/constants';

describe('LevelIntroModal', () => {
  it('shows the governance floors and every route of level 3 with their thresholds', () => {
    const html = renderToString(
      <I18nProvider><LanguageProvider><LevelIntroModal levelConfig={LEVEL_CONFIGS[2]} onClose={() => {}} /></LanguageProvider></I18nProvider>,
    );
    expect(html).toContain('Mínimos de gobernabilidad');
    expect(html).toContain('Vía del Equilibrio');
    expect(html).toContain('7 de estas 9');
    expect(html).toMatch(/Puntaje general\s*≥\s*720/);
  });
});
