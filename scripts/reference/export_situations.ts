// Exports the Territorio situation catalogue to JSON for the reference prototype (modelo_v2.py).
// Usage: npx tsx scripts/reference/export_situations.ts [out.json]   (default scripts/reference/situations.json)
import { SITUATIONS } from '../../src/territorio/situations';
import { LandUseType } from '../../src/types';
import { writeFileSync } from 'fs';

/**
 * v6/32: translates a `when` predicate to the small expression language modelo_v2.py evaluates
 * (`when_holds`). Names: A["<land use>"], B, F, E, W, St, pa, pe, ps, D, Y, R. Returns null when the
 * source uses anything else, so the prototype treats it as always true and the gap is reported here.
 */
const INDICATOR_NAMES: Record<string, string> = {
  biodiversity: 'B', foodSecurity: 'F', economicSecurity: 'E', socialWellbeing: 'W', politicalStability: 'St',
  ppAgricola: 'pa', ppAmbientalista: 'pe', ppSocial: 'ps',
};
const STELLA_NAMES: Record<string, string> = { Deuda: 'D', PBI_Real: 'Y', Reservas_del_Tesoro: 'R' };
const LAND_CODES = LandUseType as unknown as Record<string, string>;

function whenExpr(fn: unknown): string | null {
  if (typeof fn !== 'function') return null;
  const src = fn.toString().replace(/\s+/g, ' ');
  const m = src.match(/^\(?\s*(\w+)\s*\)?\s*=>\s*(.+)$/);
  if (!m) return null;
  const [, p, body] = m;
  const out = body
    .replace(new RegExp(`\\b${p}\\.landUses\\[LandUseType\\.(\\w+)\\]\\.area`, 'g'), (_, k: string) =>
      LAND_CODES[k] ? `A["${LAND_CODES[k]}"]` : `?${k}`)
    .replace(new RegExp(`\\b${p}\\.indicators\\.(\\w+)`, 'g'), (_, k: string) => INDICATOR_NAMES[k] ?? `?${k}`)
    .replace(new RegExp(`\\b${p}\\.stellaSpecificState\\.(\\w+)`, 'g'), (_, k: string) => STELLA_NAMES[k] ?? `?${k}`)
    .replace(/;$/, '')
    .replace(/!==/g, '!=')
    .replace(/===/g, '==')
    .trim();
  const leftover = out.replace(/A\["\w+"\]/g, '').replace(/\b(B|F|E|W|St|pa|pe|ps|D|Y|R)\b/g, '');
  // numbers, arithmetic and Python-valid comparisons only (a lone "=" or "!" is not one)
  const ok = /^[\d\s.<>=!+\-*/()]*$/.test(leftover) && !/(^|[^<>=!])=(?!=)|!(?!=)/.test(leftover);
  return ok ? out : null;
}

const out = SITUATIONS.map((d) => ({
  id: d.id, category: d.category, deadline: d.deadline, weight: d.weight, wear: d.wear, hasWhen: !!d.when,
  whenExpr: whenExpr(d.when),
  options: d.options.map((o) => ({ id: o.id, cost: o.cost ?? 0, effects: o.effects.map((e: any) => ({
    indicator: e.indicator ?? null, pct: e.changePercentage ?? null, abs: e.changeAbsolute ?? null,
    land: e.landUseChange ? { target: e.landUseChange.target, kHa: typeof e.landUseChange.changeAbsolute_kHa === 'number' ? e.landUseChange.changeAbsolute_kHa : null } : null,
  })) })),
}));
const untranslated = out.filter((d) => d.hasWhen && !d.whenExpr).map((d) => d.id);
if (untranslated.length) console.warn(`when not translated (treated as true): ${untranslated.join(', ')}`);
writeFileSync(process.argv[2] ?? 'scripts/reference/situations.json', JSON.stringify(out, null, 1));
console.log(out.length);
