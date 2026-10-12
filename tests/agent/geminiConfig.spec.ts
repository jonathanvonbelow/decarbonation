import { describe, it, expect } from 'vitest';
import { isGemini3, samplingFor } from '../../src/services/geminiConfig';

describe('geminiConfig', () => {
  it('detecta la familia Gemini 3', () => {
    expect(isGemini3('gemini-3.8-flash')).toBe(true);
    expect(isGemini3('gemini-3.5-flash-lite')).toBe(true);
    expect(isGemini3('gemini-2.5-flash')).toBe(false);
  });
  it('conserva los parametros legacy en 2.5', () => {
    const legacy = { temperature: 0.6, topP: 0.9, topK: 40 };
    expect(samplingFor('gemini-2.5-flash', legacy)).toEqual(legacy);
  });
  it('omite temperature/topP/topK en Gemini 3', () => {
    const r = samplingFor('gemini-3.8-flash', { temperature: 0.6, topP: 0.9, topK: 40 });
    expect(r).not.toHaveProperty('temperature');
    expect(r).not.toHaveProperty('topP');
    expect(r).not.toHaveProperty('topK');
  });
});
