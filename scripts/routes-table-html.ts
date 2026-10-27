/**
 * Prints the HTML of the "win routes of Territorio" table used by docentes-ecuaciones.html (v5/27 §9),
 * generated from src/territorio/routes.ts so the thresholds are never copied by hand.
 * Run: npx tsx scripts/routes-table-html.ts
 */
import { UI_EN } from '../src/i18n/ui/en';
import { UI_ES } from '../src/i18n/ui/es';
import { TERRITORIO_FLOORS, TERRITORIO_ROUTES } from '../src/territorio/routes';

type Dict = Record<string, unknown>;
const get = (dict: Dict, key: string): string =>
  key.split('.').reduce<unknown>((acc, part) => (acc as Dict | undefined)?.[part], dict) as string;
const PCT = new Set(['cond.nativeForest', 'cond.publicNature', 'cond.energyPark', 'cond.treasuryPct', 'cond.primaryAvg']);

function cond(c: { labelKey: string; target: number; dir: 'min' | 'max' }, dict: Dict): string {
  const label = get(dict, c.labelKey);
  const num = String(c.target).replace('.', dict === UI_ES ? ',' : '.');
  return `${label}: ${c.dir === 'min' ? '≥' : '≤'} ${num}${PCT.has(c.labelKey) ? ' %' : ''}`;
}

for (const [lang, dict] of [['es', UI_ES], ['en', UI_EN]] as const) {
  const d = dict as unknown as Dict;
  console.log(`<!-- ${lang} -->`);
  console.log(`<ul data-lang="${lang}"${lang === 'en' ? ' hidden' : ''} class="text-sm text-ash space-y-3 list-none">`);
  console.log(`  <li><strong class="text-bone">${lang === 'es' ? 'Mínimos de gobernabilidad (todos a la vez)' : 'Governance floors (all at once)'}:</strong> ${TERRITORIO_FLOORS.map((f) => cond({ ...f, labelKey: f.labelKey }, d)).join('; ')}.</li>`);
  for (const r of TERRITORIO_ROUTES) {
    console.log(`  <li><strong class="text-bone">${get(d, r.nameKey)}</strong> (${lang === 'es' ? 'todas a la vez' : 'all at once'}): ${r.conditions.map((c) => cond(c, d)).join('; ')}.</li>`);
  }
  console.log('</ul>');
}
