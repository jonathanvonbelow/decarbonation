import { describe, expect, it } from 'vitest';
import { resolveVersion, withVersion } from '../../src/docentes';

describe('resolveVersion', () => {
  it('?v= gana sobre lo guardado', () => {
    expect(resolveVersion('?v=niveles', 'territorio')).toBe('niveles');
  });
  it('usa lo guardado si no hay ?v=', () => {
    expect(resolveVersion('', 'niveles')).toBe('niveles');
  });
  it('por defecto es Territorio, aun con valores invalidos', () => {
    expect(resolveVersion('', null)).toBe('territorio');
    expect(resolveVersion('?v=otra', 'basura')).toBe('territorio');
  });
});

describe('withVersion', () => {
  it('propaga la version a links del paquete y conserva el hash', () => {
    expect(withVersion('/docentes/guia', 'niveles')).toBe('/docentes/guia?v=niveles');
    expect(withVersion('/docentes/guia#notas', 'territorio')).toBe('/docentes/guia?v=territorio#notas');
    expect(withVersion('/docentes#faq', 'niveles')).toBe('/docentes?v=niveles#faq');
  });
  it('no toca links externos ni de otras secciones', () => {
    expect(withVersion('/play', 'niveles')).toBe('/play');
    expect(withVersion('/territorio/encuesta', 'niveles')).toBe('/territorio/encuesta');
    expect(withVersion('https://example.com/docentes', 'niveles')).toBe('https://example.com/docentes');
  });
});
