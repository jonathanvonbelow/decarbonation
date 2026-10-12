import { describe, expect, it } from 'vitest';
import { countDone, playLink, recommend, suggestCode, surveyLink, validateCode, type WizardAnswers } from '../../src/docentesEspacio';

const base: WizardAnswers = { time: 'una', devices: 'pc', goal: 'intuicion' };

describe('recommend (reglas del asistente, 28 §3 etapa 2)', () => {
  it('por defecto: Territorio + plan de clase', () => {
    expect(recommend(base)).toEqual({ version: 'territorio', startWith: 'plan-clase', notices: [] });
  });
  it('dos clases + analisis de datos: juego de 3 niveles', () => {
    expect(recommend({ ...base, time: 'dos', goal: 'datos' }).version).toBe('niveles');
    expect(recommend({ ...base, time: 'dos' }).version).toBe('territorio');
    expect(recommend({ ...base, goal: 'datos' }).version).toBe('territorio');
  });
  it('una sola pantalla proyectada: Territorio en modo sala con la guia', () => {
    expect(recommend({ ...base, devices: 'pantalla' })).toEqual({ version: 'territorio', startWith: 'guia', notices: ['room'] });
    expect(recommend({ time: 'dos', devices: 'pantalla', goal: 'datos' }).version).toBe('territorio');
  });
  it('solo celulares agrega el aviso', () => {
    expect(recommend({ ...base, devices: 'cel' }).notices).toEqual(['phones']);
  });
  it('discusion entre actores sugiere el cierre comparativo', () => {
    expect(recommend({ ...base, goal: 'actores' }).notices).toEqual(['actors']);
  });
});

describe('codigo de taller', () => {
  it('rechaza "a b" y acepta MIS-EPET3-1105', () => {
    expect(validateCode('a b')).toBe(false);
    expect(validateCode('MIS-EPET3-1105')).toBe(true);
    expect(validateCode('x')).toBe(false);
  });
  it('suggestCode genera un codigo valido', () => {
    expect(suggestCode(() => 0.5)).toMatch(/^DN-[A-Z2-9]{4}$/);
    expect(validateCode(suggestCode())).toBe(true);
  });
  it('arma los dos links', () => {
    expect(playLink('MIS-EPET3-1105')).toBe('https://decarbonation.vercel.app/territorio?taller=MIS-EPET3-1105');
    expect(surveyLink('A1')).toBe('https://decarbonation.vercel.app/territorio/encuesta?taller=A1');
  });
});

describe('progreso', () => {
  it('cuenta solo pasos tildados', () => {
    expect(countDone({ 'step-1': true, 'step-2': false, 'step-13': true, otra: true })).toBe(2);
  });
});
