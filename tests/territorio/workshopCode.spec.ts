import { beforeEach, describe, expect, it, vi } from 'vitest';
import { activeWorkshopCode, captureWorkshopCode, withWorkshopCode } from '../../src/territorio/survey/workshopCode';

beforeEach(() => {
  const store: Record<string, string> = {};
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
  });
});

describe('workshopCode', () => {
  it('captura un codigo valido y lo persiste', () => {
    expect(captureWorkshopCode('?taller=MISIONES-01')).toBe('MISIONES-01');
    expect(activeWorkshopCode()).toBe('MISIONES-01');
    expect(captureWorkshopCode('')).toBe('MISIONES-01');
  });
  it('ignora codigos invalidos', () => {
    expect(captureWorkshopCode('?taller=a b')).toBeNull();
    expect(captureWorkshopCode('?taller=x')).toBeNull();
  });
  it('withWorkshopCode agrega el parametro una sola vez', () => {
    expect(withWorkshopCode('/territorio')).toBe('/territorio');
    captureWorkshopCode('?taller=ABC');
    expect(withWorkshopCode('/territorio')).toBe('/territorio?taller=ABC');
    expect(withWorkshopCode('/territorio/encuesta?origen=fin_partida')).toBe('/territorio/encuesta?origen=fin_partida&taller=ABC');
    expect(withWorkshopCode('/territorio?taller=ABC')).toBe('/territorio?taller=ABC');
  });
});
