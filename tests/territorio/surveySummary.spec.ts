import { beforeEach, describe, expect, it, vi } from 'vitest';
import { advanceMonth, createSession } from '../../src/territorio/session';
import { buildSummary, loadSummary, saveSummary, toRowFields } from '../../src/territorio/survey/summary';
import { MODEL_VERSION_BY_GAME } from '../../src/sim/version';

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
    expect(f.model_version).toBe(MODEL_VERSION_BY_GAME.territorio);
  });

  it('el resumen guarda la version del modelo (v6 / fase 32)', () => {
    const sum = buildSummary(played(), 1000);
    expect(sum.modelVersion).toBe(MODEL_VERSION_BY_GAME.territorio);
    expect(toRowFields(sum).model_version).toBe(MODEL_VERSION_BY_GAME.territorio);
    // un resumen guardado antes de la fase 32 no tiene el campo: lo produjo el modelo 1.0
    const legacy = { ...sum };
    delete legacy.modelVersion;
    expect(toRowFields(legacy).model_version).toBe('1.0');
  });
});
