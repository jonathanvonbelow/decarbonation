import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushFeedbackQueue, sanitizeRow, submitFeedback } from '../../src/territorio/survey/feedbackService';
import { CONTEXTOS, ELEMENTOS, FORMATOS, MEJORAS, ROLES, type TerritorioFeedbackRow } from '../../src/territorio/survey/types';

const base = (over: Partial<TerritorioFeedbackRow> = {}): TerritorioFeedbackRow => ({
  variant: 'territorio', origen: 'pagina', lang: 'es', taller_codigo: null, client_id: null, app_version: 'dev',
  duracion_seg: 60, rol: 'otro', rol_otro: null, contexto_uso: null, comprension: null, ritmo: null, mapa_utilidad: null,
  elementos_utiles: null, tradeoffs: null, realismo: null, aprendizaje_texto: null, mejora_prioritaria: null,
  mejoras_texto: null, uso_taller: null, formatos_uso: null, taller_conceptos_texto: null,
  partida_estado: 'sin_partida', resultado: null, ruta_lograda: null, ruta_cercana: null, ruta_cercana_progreso: null,
  pisos_cumplidos: null, anio_alcanzado: null, meses_jugados: null, situaciones_resueltas: null,
  situaciones_vencidas: null, areas_declaradas: null, politicas_activas: null, indicadores_finales: null, seed: null,
  ...over,
});

let store: Record<string, string>;
beforeEach(() => {
  store = {};
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  });
  process.env.SUPABASE_URL = 'https://x.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'anon';
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
});

describe('submitFeedback', () => {
  it('envia con Prefer: return=minimal', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    vi.stubGlobal('fetch', fetchMock);
    expect(await submitFeedback(base())).toEqual({ ok: true, queued: false });
    expect(fetchMock.mock.calls[0][1].headers.Prefer).toBe('return=minimal');
  });

  it('encola ante error de red y flush lo vacia', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await submitFeedback(base())).toEqual({ ok: true, queued: true });
    expect(JSON.parse(store.dn_territorio_feedback_queue_v1)).toHaveLength(1);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 201 }));
    await flushFeedbackQueue();
    expect(JSON.parse(store.dn_territorio_feedback_queue_v1)).toHaveLength(0);
  });

  it('un 400 es rejected y no se encola', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    expect(await submitFeedback(base())).toEqual({ ok: false, reason: 'rejected' });
    expect(store.dn_territorio_feedback_queue_v1).toBeUndefined();
  });

  it('sin configuracion devuelve no_config', async () => {
    delete process.env.SUPABASE_URL;
    vi.spyOn(console, 'info').mockImplementation(() => {});
    expect(await submitFeedback(base())).toEqual({ ok: false, reason: 'no_config' });
  });
});

describe('sanitizeRow', () => {
  it('recorta textos, anula codigo invalido y descarta opciones desconocidas', () => {
    const r = sanitizeRow(base({
      aprendizaje_texto: 'a'.repeat(2000), taller_codigo: 'a b', elementos_utiles: ['mapa', 'x', 'rutas', 'noticias', 'asesor'] as never,
      mejoras_texto: '   ',
    }));
    expect(r.aprendizaje_texto).toHaveLength(1500);
    expect(r.taller_codigo).toBeNull();
    expect(r.elementos_utiles).toEqual(['mapa', 'rutas', 'noticias']);
    expect(r.mejoras_texto).toBeNull();
  });
});

describe('opciones vs SQL', () => {
  const sql = readFileSync('supabase/territorio_feedback_migration.sql', 'utf8');
  const listIn = (col: string): string[] => {
    const start = sql.search(new RegExp('\n  ' + col + ' +(TEXT|SMALLINT)'));
    expect(start, col).toBeGreaterThan(-1);
    const rest = sql.slice(start + 1);
    const end = rest.slice(1).search(/\n {2}\w+ +[A-Z]/);
    return [...rest.slice(0, end + 1).matchAll(/'([^']+)'/g)].map((x) => x[1]);
  };
  it.each([
    ['rol', ROLES], ['contexto_uso', CONTEXTOS], ['elementos_utiles', ELEMENTOS],
    ['mejora_prioritaria', MEJORAS], ['formatos_uso', FORMATOS],
  ] as const)('%s coincide', (col, list) => {
    expect(listIn(col)).toEqual([...list]);
  });
});
