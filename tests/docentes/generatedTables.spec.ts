/**
 * Phase 50: the tables of docentes-ecuaciones.html (nine equation families, parameters, win routes of both games) are
 * generated from the code. This test fails when the page is out of date: run
 *   npx tsx scripts/params-table-html.ts --write && npx tsx scripts/routes-table-html.ts --write
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { replaceBlock } from '../../scripts/lib/htmlBlocks';
import { paramsBlocks, PARAM_ROWS } from '../../scripts/params-table-html';
import { routesBlocks } from '../../scripts/routes-table-html';
import { EQUATION_FAMILIES } from '../../src/components/equations/families';
import { CONTROL_PARAMS } from '../../src/constants';

const html = readFileSync('docentes-ecuaciones.html', 'utf8').replace(/\r\n/g, '\n');

describe('docentes-ecuaciones.html generated blocks', () => {
  it.each(Object.entries({ ...paramsBlocks(), ...routesBlocks() }))('block %s is up to date', (name, content) => {
    expect(replaceBlock(html, name, content)).toBe(html);
  });

  it('has the nine families of model 2.0 and no 1.1 wording', () => {
    expect(EQUATION_FAMILIES).toHaveLength(9);
    expect(html).not.toMatch(/siete familias|seven (equation )?families|decaimiento exponencial|exponential decay/i);
    expect(html).toMatch(/modelo de juego y no proyecciones del Bosque Atlántico/);
  });

  it('every facilitator-panel scalar in the parameter table reads CONTROL_PARAMS', () => {
    const row = PARAM_ROWS.find((r) => r.name === 'Poblacion_Inicial');
    expect(row?.value).toBe(CONTROL_PARAMS.Poblacion_Inicial);
  });
});
