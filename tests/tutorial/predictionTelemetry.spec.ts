/**
 * Phase 48 §4/§6: the row inserted into `predictions` carries model_version, band and persistence_pred, and every
 * optional column the project has not migrated yet is dropped (with one warning) instead of losing the row.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const inserts: Record<string, unknown>[] = [];
let missing: Set<string> = new Set();
vi.mock('../../src/services/supabaseService', () => ({
  supabase: {
    from: () => ({
      insert: async (row: Record<string, unknown>) => {
        inserts.push(row);
        const col = Object.keys(row).find((k) => missing.has(k));
        return col
          ? { error: { code: 'PGRST204', message: `Could not find the '${col}' column of 'predictions' in the schema cache` } }
          : { error: null };
      },
    }),
  },
}));

import { logPrediction } from '../../src/services/predictionTelemetry';
import { isMissingColumn, resetModelVersionColumnCache, sendWithOptionalColumns } from '../../src/services/modelVersionColumn';
import { MODEL_VERSION_BY_GAME } from '../../src/sim/version';
import type { PredictionResult } from '../../src/components/tutorial/predictions';

const result: PredictionResult = {
  indicator: 'biodiversity', predicted: 'up', actual: 'flat', delta: 0.1, correct: false, level: 1, band: 0.18, persistencePred: 'down',
};
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => { inserts.length = 0; missing = new Set(); resetModelVersionColumnCache(); });
afterEach(() => vi.restoreAllMocks());

describe('logPrediction (phase 48)', () => {
  it('inserts model_version, band and persistence_pred with the prediction', async () => {
    logPrediction(result, 2031, 1, 'session-1');
    await flush();
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      session_id: 'session-1', year: 2031, level: 1, indicator: 'biodiversity', predicted: 'up', actual: 'flat', delta: 0.1,
      model_version: MODEL_VERSION_BY_GAME.niveles, band: 0.18, persistence_pred: 'down',
    });
  });

  it('without research_indices_migration.sql: resends without band / persistence_pred, keeps model_version, warns once per column', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    missing = new Set(['band', 'persistence_pred']);
    logPrediction(result, 2031, 1, 'session-1');
    await flush(); await flush(); await flush();
    const last = inserts[inserts.length - 1];
    expect(last).not.toHaveProperty('band');
    expect(last).not.toHaveProperty('persistence_pred');
    expect(last.model_version).toBe(MODEL_VERSION_BY_GAME.niveles);
    expect(warn).toHaveBeenCalledTimes(2);
    // Next insert skips the known-missing columns straight away.
    inserts.length = 0;
    logPrediction(result, 2032, 1, 'session-1');
    await flush();
    expect(inserts).toHaveLength(1);
  });

  it('without any migration: the row is still stored, with neither the version nor the new columns', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    missing = new Set(['band', 'persistence_pred', 'model_version']);
    logPrediction(result, 2031, 1, 'session-1');
    for (let i = 0; i < 6; i++) await flush();
    expect(Object.keys(inserts[inserts.length - 1]).sort()).toEqual(['actual', 'delta', 'indicator', 'level', 'predicted', 'session_id', 'year']);
  });
});

describe('sendWithOptionalColumns', () => {
  it('returns any other error as is (never drops a column that exists)', async () => {
    const send = vi.fn().mockResolvedValue({ error: { code: '23514', message: 'violates check constraint "predictions_band_check"' } });
    const r = await sendWithOptionalColumns('predictions', { a: 1 }, { band: -1 }, send);
    expect(send).toHaveBeenCalledTimes(1);
    expect(r.error?.code).toBe('23514');
  });
  it('a null optional value is not sent', async () => {
    const send = vi.fn().mockResolvedValue({ error: null });
    await sendWithOptionalColumns('game_sessions', { a: 1 }, { research_indices: null }, send);
    expect(send.mock.calls[0][0]).toEqual({ a: 1 });
  });
  it('isMissingColumn matches the column name as a whole word only', () => {
    const e = (m: string) => ({ code: 'PGRST204', message: m });
    expect(isMissingColumn(e("Could not find the 'band' column of 'predictions'"), 'band')).toBe(true);
    expect(isMissingColumn({ code: '42703', message: 'column "band" of relation "predictions" does not exist' }, 'band')).toBe(true);
    expect(isMissingColumn(e("Could not find the 'bandwidth' column"), 'band')).toBe(false);
    expect(isMissingColumn({ code: '23514', message: "'band'" }, 'band')).toBe(false);
  });
});
