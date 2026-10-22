import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { MODEL_VERSION, MODEL_VERSION_BY_GAME } from '../../src/sim';

// v6 / fase 32 (mejora-general/files/32_versionado_del_modelo.md)
describe('model version', () => {
  it('is semver-like', () => expect(MODEL_VERSION).toMatch(/^\d+\.\d+(\.\d+)?(-dev)?$/));
  it('is recorded in docs/audit-equations.md', () => {
    const audit = readFileSync('docs/audit-equations.md', 'utf8');
    // whole version token: "Modelo 1.0" must not be satisfied by a "Modelo 1.0.1" row or vice versa
    const v = MODEL_VERSION.replace('-dev', '').replace(/\./g, '\.');
    expect(audit).toMatch(new RegExp(`Modelo ${v}(?![\d.])`));
  });
  it('per-game versions pass the SQL check of territorio_feedback and fit the sanitized width', () => {
    for (const v of Object.values(MODEL_VERSION_BY_GAME) as string[]) {
      expect(v).toMatch(/^[0-9]+\.[0-9]+(\.[0-9]+)?(-dev)?$/);
      expect(v.length).toBeLessThanOrEqual(16);
    }
  });
});
