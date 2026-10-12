import { beforeEach, describe, expect, it, vi } from 'vitest';
import { advanceMonth, createSession } from '../../src/territorio/session';
import { buildSummary, loadSummary, saveSummary, toRowFields } from '../../src/territorio/survey/summary';

beforeEach(() => {
  const store: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
  });
});

describe('survey summary', () => {
  const played = () => {
    let s = createSession(42);
    for (let i = 0; i < 13; i++) s = advanceMonth(s);
    return s;
  };

  it('buildSummary de una partida a medias es incompleta', () => {
    const sum = buildSummary(played(), 1000);
    expect(sum.estado).toBe('incompleta');
    expect(sum.resultado).toBeNull();
    expect(sum.mesesJugados).toBe(13);
    expect(sum.seed).toBe(42);
    expect(['conservation', 'production', 'innovation']).toContain(sum.rutaCercana);
    for (const code of sum.politicasActivas) expect(code).toMatch(/^[A-Z-]+$/);
  });

  it('loadSummary expira a las 12 h', () => {
    saveSummary(buildSummary(played(), 1000));
    expect(loadSummary(1000 + 60_000)).not.toBeNull();
    expect(loadSummary(1000 + 13 * 3600_000)).toBeNull();
  });

  it('toRowFields(null) es sin_partida', () => {
    const f = toRowFields(null);
    expect(f.partida_estado).toBe('sin_partida');
    expect(f.seed).toBeNull();
  });
});
