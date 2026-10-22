import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushFeedbackQueue, sanitizeRow, submitFeedback } from '../../src/territorio/survey/feedbackService';
import { resetModelVersionColumnCache } from '../../src/services/modelVersionColumn';
import { CONTEXTOS, ELEMENTOS, FORMATOS, MEJORAS, ROLES, type TerritorioFeedbackRow } from '../../src/territorio/survey/types';

const base = (over: Partial<TerritorioFeedbackRow> = {}): TerritorioFeedbackRow => ({
  variant: 'territorio', origen: 'pagina', lang: 'es', taller_codigo: null, client_id: null, app_version: 'dev',
  duracion_seg: 60, rol: 'otro', rol_otro: null, contexto_uso: null, comprension: null, ritmo: null, mapa_utilidad: null,
  elementos_utiles: null, tradeoffs: null, realismo: null, aprendizaje_texto: null, mejora_prioritaria: null,
  mejoras_texto: null, uso_taller: null, formatos_uso: null, taller_conceptos_texto: null,
  partida_estado: 'sin_partida', resultado: null, ruta_lograda: null, ruta_cercana: null, ruta_cercana_progreso: null,
  pisos_cumplidos: null, anio_alcanzado: null, meses_jugados: null, situaciones_resueltas: null,
  situaciones_vencidas: null, areas_declaradas: null, politicas_activas: null, indicadores_finales: null, seed: null,
  model_version: '1.0',
  ...over,
});

let store: Record<string, string>;
beforeEach(() => {
  resetModelVersionColumnCache();
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

  it('envia model_version en el cuerpo', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    vi.stubGlobal('fetch', fetchMock);
    await submitFeedback(base());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model_version).toBe('1.0');
  });

  // v6 / fase 32: proyecto sin supabase/model_version_migration.sql -> PostgREST responde 400 PGRST204.
  const MISSING = { code: 'PGRST204', message: "Could not find the 'model_version' column of 'territorio_feedback' in the schema cache" };
  const rejectsColumn = () => vi.fn().mockImplementation(async (_url: string, init: { body: string }) =>
    ('model_version' in JSON.parse(init.body)
      ? { ok: false, status: 400, json: async () => MISSING }
      : { ok: true, status: 201 }));

  it('sin la columna migrada reintenta una vez sin model_version, avisa y no pierde la respuesta', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchMock = rejectsColumn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await submitFeedback(base({ aprendizaje_texto: 'hola' }))).toEqual({ ok: true, queued: false });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retried = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(retried).not.toHaveProperty('model_version');
    expect(retried.aprendizaje_texto).toBe('hola');
    expect(warn).toHaveBeenCalledTimes(1);
    // el siguiente envio ya no intenta la columna
    await submitFeedback(base());
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('otro 400 (p. ej. el CHECK de la version) es rejected sin reintentar sin la columna', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false, status: 400,
      json: async () => ({ code: '23514', message: 'new row violates check constraint "territorio_feedback_model_version_check"' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    expect(await submitFeedback(base())).toEqual({ ok: false, reason: 'rejected' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('una fila encolada conserva model_version y flush la reenvia sin la columna si la base no la tiene', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await submitFeedback(base());
    expect(JSON.parse(store.dn_territorio_feedback_queue_v1)[0].model_version).toBe('1.0');
    const fetchMock = rejectsColumn();
    vi.stubGlobal('fetch', fetchMock);
    await flushFeedbackQueue();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(store.dn_territorio_feedback_queue_v1)).toHaveLength(0);
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

  it('model_version que no cumple el CHECK del SQL se anula (no se trunca)', () => {
    expect(sanitizeRow(base({ model_version: '1.1' })).model_version).toBe('1.1');
    expect(sanitizeRow(base({ model_version: '2.0.1-dev' })).model_version).toBe('2.0.1-dev');
    expect(sanitizeRow(base({ model_version: '1.0.0-dev-xxxxxxxxxxxx' })).model_version).toBeNull();
    expect(sanitizeRow(base({ model_version: '2.0-rc1' })).model_version).toBeNull();
    expect(sanitizeRow(base({ model_version: '  ' })).model_version).toBeNull();
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
