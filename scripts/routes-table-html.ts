/**
 * Generates the win-route tables of docentes-ecuaciones.html (v5/27 §9; phase 50 adds the 3-level game) from
 * src/territorio/routes.ts and src/sim/winRoutes.ts, so the thresholds are never copied by hand.
 * Run: npx tsx scripts/routes-table-html.ts [--write | --check]   (see scripts/lib/htmlBlocks.ts)
 */
import { UI_EN } from '../src/i18n/ui/en';
import { UI_ES } from '../src/i18n/ui/es';
import { TERRITORIO_FLOORS, TERRITORIO_ROUTES } from '../src/territorio/routes';
import { LEVEL_ROUTES, type RouteCondition, type WinRoute } from '../src/sim/winRoutes';
import { runBlocks } from './lib/htmlBlocks';

type Dict = Record<string, unknown>;
const get = (dict: Dict, key: string): string =>
  key.split('.').reduce<unknown>((acc, part) => (acc as Dict | undefined)?.[part], dict) as string;
const PCT = new Set(['cond.nativeForest', 'cond.publicNature', 'cond.energyPark', 'cond.treasuryPct', 'cond.primaryAvg', 'cond.renewables']);

function cond(c: Pick<RouteCondition, 'labelKey' | 'target' | 'dir'>, dict: Dict, lang: 'es' | 'en'): string {
  const label = get(dict, c.labelKey);
  const num = String(c.target).replace('.', lang === 'es' ? ',' : '.');
  return `${label}: ${c.dir === 'min' ? '≥' : '≤'} ${num}${PCT.has(c.labelKey) ? ' %' : ''}`;
}

function list(lang: 'es' | 'en', floors: Pick<RouteCondition, 'labelKey' | 'target' | 'dir'>[], routes: Pick<WinRoute, 'nameKey' | 'conditions' | 'minConditionsMet'>[], indent: string): string {
  const d = (lang === 'es' ? UI_ES : UI_EN) as unknown as Dict;
  const all = lang === 'es' ? 'todas a la vez' : 'all at once';
  const some = (k: number, n: number) => (lang === 'es' ? `${k} de estas ${n}` : `${k} of these ${n}`);
  return [
    `${indent}<ul data-lang="${lang}"${lang === 'en' ? ' hidden' : ''} class="text-sm text-ash space-y-3 list-none">`,
    `${indent}  <li><strong class="text-bone">${lang === 'es' ? 'Mínimos de gobernabilidad (todos a la vez)' : 'Governance floors (all at once)'}:</strong> ${floors.map((f) => cond(f, d, lang)).join('; ')}.</li>`,
    ...routes.map((r) => {
      const scope = r.minConditionsMet !== undefined && r.minConditionsMet < r.conditions.length ? some(r.minConditionsMet, r.conditions.length) : all;
      return `${indent}  <li><strong class="text-bone">${get(d, r.nameKey)}</strong> (${scope}): ${r.conditions.map((c) => cond(c, d, lang)).join('; ')}.</li>`;
    }),
    `${indent}</ul>`,
  ].join('\n');
}

export function routesBlocks(): Record<string, string> {
  const ind = '          ';
  const territorio = [list('es', TERRITORIO_FLOORS, TERRITORIO_ROUTES, ind), list('en', TERRITORIO_FLOORS, TERRITORIO_ROUTES, ind)].join('\n');
  const levels = [1, 2, 3].flatMap((lvl) => [
    `${ind}<h4 class="font-semibold text-bone mt-4 mb-1" data-lang="es">Nivel ${lvl}</h4>`,
    `${ind}<h4 class="font-semibold text-bone mt-4 mb-1" data-lang="en" hidden>Level ${lvl}</h4>`,
    list('es', LEVEL_ROUTES[lvl].floors, LEVEL_ROUTES[lvl].routes, ind),
    list('en', LEVEL_ROUTES[lvl].floors, LEVEL_ROUTES[lvl].routes, ind),
  ]).join('\n');
  return { 'routes-territorio': territorio, 'routes-niveles': levels };
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/routes-table-html.ts')) {
  runBlocks('docentes-ecuaciones.html', routesBlocks());
}
