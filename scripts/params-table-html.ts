/**
 * Phase 50 (mejora-general/files/50 §4): generates, from the code, the parameter table and the nine equation families
 * of docentes-ecuaciones.html. Values are read from PARAMS_V2 and CONTROL_PARAMS (never copied by hand); what this file
 * adds is only each parameter's label, unit and source category (calibrated by simulation / literature / expert
 * judgement / team decision), which the "Rigor" section of the page refers to.
 * Run: npx tsx scripts/params-table-html.ts [--write | --check]   (see scripts/lib/htmlBlocks.ts)
 */
import { CONTROL_PARAMS } from '../src/constants';
import { PARAMS_V2 } from '../src/sim/v2/params';
import { EQUATION_FAMILIES, SCORE_FAMILY, type Lang } from '../src/components/equations/families';
import { esc, runBlocks } from './lib/htmlBlocks';

type Source = 'calibrated' | 'literature' | 'expert' | 'team';
interface Row {
  /** Name in the code (CONTROL_PARAMS key or PARAMS_V2 path). */
  name: string;
  label: Record<Lang, string>;
  /** Same in both languages when a string; a trailing '/' gets 'año' / 'yr'. */
  unit: Record<Lang, string> | string;
  source: Source;
  /** Source note (reference or how it was set). */
  note?: Record<Lang, string>;
  value: unknown;
}

const P = PARAMS_V2;
const CP = CONTROL_PARAMS;
const L = (es: string, en: string): Record<Lang, string> => ({ es, en });

export const PARAM_ROWS: Row[] = [
  { name: 'Poblacion_Inicial', label: L('Población inicial', 'Initial population'), unit: L('habitantes', 'inhabitants'), source: 'team', note: L('decisión 4 del índice v6: AFOLU ≈ 20–35 % de las emisiones, comparable al inventario argentino', 'v6 index decision 4: AFOLU ≈ 20–35 % of emissions, comparable to the Argentine inventory'), value: CP.Poblacion_Inicial },
  { name: 'Tasa_Crecimiento_Poblacional_Base', label: L('Crecimiento de la población', 'Population growth'), unit: L('fracción/año', 'fraction/yr'), source: 'expert', value: CP.Tasa_Crecimiento_Poblacional_Base },
  { name: 'Tasa_Base_Crecimiento_PBI', label: L('Crecimiento base del PBI', 'Base GDP growth'), unit: L('fracción/año', 'fraction/yr'), source: 'expert', value: CP.Tasa_Base_Crecimiento_PBI },
  { name: 'Tasa_Impositiva_General_Sobre_PBI', label: L('Recaudación base', 'Base revenue'), unit: L('fracción del PBI', 'share of GDP'), source: 'expert', value: CP.Tasa_Impositiva_General_Sobre_PBI },
  { name: 'Gasto_Publico_Base_Nivel_1..3', label: L('Gasto público base γ (niveles 1 / 2 / 3)', 'Base public spending γ (levels 1 / 2 / 3)'), unit: L('fracción del PBI/año', 'share of GDP/yr'), source: 'calibrated', note: L('el parámetro más sensible del modelo', "the model's most sensitive parameter"), value: [CP.Gasto_Publico_Base_Nivel_1, CP.Gasto_Publico_Base_Nivel_2, CP.Gasto_Publico_Base_Nivel_3] },
  { name: 'Tasa_de_interes_Nivel_1..3', label: L('Tasa de interés base (niveles 1 / 2 / 3)', 'Base interest rate (levels 1 / 2 / 3)'), unit: L('fracción/año', 'fraction/yr'), source: 'expert', value: [CP.Tasa_de_interes_Nivel_1, CP.Tasa_de_interes_Nivel_2, CP.Tasa_de_interes_Nivel_3] },
  { name: 'Pago_deuda_anual_Nivel_1..3', label: L('Amortización de la deuda (niveles 1 / 2 / 3)', 'Debt amortisation (levels 1 / 2 / 3)'), unit: L('fracción de la deuda/año', 'share of debt/yr'), source: 'expert', value: [CP.Pago_deuda_anual_Nivel_1, CP.Pago_deuda_anual_Nivel_2, CP.Pago_deuda_anual_Nivel_3] },
  { name: 'finance.reserveFloor / debtThreshold / riskPremium', label: L('Piso de reservas · umbral de deuda · prima de riesgo', 'Reserve floor · debt threshold · risk premium'), unit: L('fracción del PBI · D/Y · tasa por punto de D/Y', 'share of GDP · D/Y · rate per point of D/Y'), source: 'expert', value: [P.finance.reserveFloor, P.finance.debtThreshold, P.finance.riskPremium] },
  { name: 'Velocidad_Ajuste_*', label: L('Velocidades de ajuste B / F / E / C / Pc / π', 'Adjustment speeds B / F / E / C / Pc / π'), unit: L('fracción del camino/año', 'fraction of the way/yr'), source: 'expert', value: [CP.Velocidad_Ajuste_Biodiversidad, CP.Velocidad_Ajuste_Seg_Alimentaria, CP.Velocidad_Ajuste_Seg_Economica, CP.Velocidad_Ajuste_Conflicto, CP.Velocidad_Ajuste_Colapso, CP.Velocidad_Ajuste_Presiones] },
  { name: 'Eficiencia_Minima_Politicas', label: L('Piso institucional de eficiencia η_min', 'Institutional efficiency floor η_min'), unit: '0–1', source: 'expert', value: CP.Eficiencia_Minima_Politicas },
  { name: 'Recuperacion_Politicas_Anios', label: L('Recuperación en reposo ρ', 'Recovery at rest ρ'), unit: L('años', 'years'), source: 'expert', value: CP.Recuperacion_Politicas_Anios },
  { name: 'rampYears', label: L('Puesta en marcha λ por política', 'Start-up λ per policy'), unit: L('años', 'years'), source: 'expert', value: P.rampYears },
  { name: 'fatigueYears', label: L('Desgaste δ por política', 'Wear δ per policy'), unit: L('años de uso', 'years of use'), source: 'expert', value: P.fatigueYears },
  { name: 'costShare', label: L('Costo a esfuerzo pleno κ', 'Cost at full effort κ'), unit: L('fracción del PBI/año', 'share of GDP/yr'), source: 'expert', note: L('calibrado contra el gasto público base', 'calibrated against base public spending'), value: P.costShare },
  { name: 'effortE0', label: L('Escala de rendimientos decrecientes del esfuerzo', 'Diminishing-returns scale of effort'), unit: L('puntos de esfuerzo', 'effort points'), source: 'expert', value: P.effortE0 },
  { name: 'flux', label: L('Flujo de carbono por uso del suelo', 'Carbon flux per land use'), unit: 'tCO₂e/ha/', source: 'expert', value: P.flux },
  { name: 'stock', label: L('Carbono almacenado por uso del suelo', 'Carbon stock per land use'), unit: 'Mg C/ha', source: 'literature', note: L('revisión del Bosque Atlántico (Anais da ABC, 2024) más carbono subterráneo y del suelo', 'Atlantic Forest review (Anais da ABC, 2024) plus below-ground and soil carbon'), value: P.stock },
  { name: 'energy.eps0', label: L('Emisiones de energía por habitante al inicio (niveles 1 / 2 / 3)', 'Energy emissions per inhabitant at start (levels 1 / 2 / 3)'), unit: 'tCO₂/hab', source: 'literature', note: L('fijadas para que el perfil AFOLU / energía se parezca al del inventario nacional', 'set so the AFOLU / energy profile resembles the national inventory'), value: P.energy.eps0 },
  { name: 'energy.adjust / parksFullShare / renewablesMaxCN', label: L('Inercia de la energía · parques para electricidad 100 % renovable · techo renovable de Neutralidad de Carbono', 'Energy inertia · parks for 100 % renewable electricity · Carbon Neutrality renewable ceiling'), unit: L('fracción/año · fracción del territorio · fracción', 'fraction/yr · share of territory · fraction'), source: 'expert', value: [P.energy.adjust, P.energy.parksFullShare, P.energy.renewablesMaxCN] },
  { name: 'energy.budgetCut2054', label: L('Recorte de la senda del presupuesto de carbono a 2054', 'Cut of the carbon-budget path by 2054'), unit: L('fracción', 'fraction'), source: 'team', value: P.energy.budgetCut2054 },
  { name: 'zSAR', label: L('Exponente especies-área z', 'Species-area exponent z'), unit: '—', source: 'literature', note: L('Pereira, Ziv y Miranda (2014), relación especies-área de paisaje', 'Pereira, Ziv & Miranda (2014), countryside species-area relationship'), value: P.zSAR },
  { name: 'habitat', label: L('Afinidad de hábitat por uso', 'Habitat affinity per use'), unit: '0–1', source: 'expert', value: P.habitat },
  { name: 'qB', label: L('Efecto de cada política sobre la biodiversidad', 'Effect of each policy on biodiversity'), unit: L('logit por unidad de eficiencia', 'logit per unit of efficiency'), source: 'expert', value: P.qB },
  { name: 'food.yield', label: L('Rendimiento relativo por uso agrícola', 'Relative yield per farm use'), unit: L('relativo al cultivo convencional', 'relative to conventional crops'), source: 'expert', value: P.food.yield },
  { name: 'bE', label: L('Efecto de cada política sobre la seguridad económica', 'Effect of each policy on economic security'), unit: L('logit por unidad de eficiencia', 'logit per unit of efficiency'), source: 'expert', value: P.bE },
  { name: 'conflictWeights', label: L('Pesos del conflicto (alimentos, economía, presión ambiental, concentración G, transición justa J)', 'Conflict weights (food, economy, environmental pressure, concentration G, just transition J)'), unit: L('logit', 'logit'), source: 'expert', value: P.conflictWeights },
  { name: 'pressure.phiScale', label: L('Escala de los efectos de política sobre las presiones', 'Scale of policy effects on pressures'), unit: L('puntos por logit', 'points per logit'), source: 'expert', value: P.pressure.phiScale },
  { name: 'pacts.*.entry / annual', label: L('Adhesión / cuota anual de los pactos (tratado, acuerdo de carbono, transferencia)', 'Pact entry / annual fee (treaty, carbon accord, tech transfer)'), unit: L('fracción del PBI', 'share of GDP'), source: 'expert', value: [P.pacts.biodiversityTreaty.entry, P.pacts.biodiversityTreaty.annual, P.pacts.globalCarbonAccord.entry, P.pacts.globalCarbonAccord.annual, P.pacts.techTransferInitiative.entry, P.pacts.techTransferInitiative.annual] },
  { name: 'situations.halfLifeMonths', label: L('Vida media del efecto de una situación (Territorio)', 'Half-life of a situation effect (Territorio)'), unit: L('meses', 'months'), source: 'expert', value: P.situations.halfLifeMonths },
];

const SOURCE_LABEL: Record<Source, Record<Lang, string>> = {
  calibrated: L('calibrado por simulación', 'calibrated by simulation'),
  literature: L('literatura', 'literature'),
  expert: L('criterio experto', 'expert judgement'),
  team: L('decisión del equipo', 'team decision'),
};

const fmtNum = (x: number, lang: Lang): string => (lang === 'es' ? String(x).replace('.', ',') : String(x));
function fmtValue(v: unknown, lang: Lang): string {
  if (typeof v === 'number') return lang === 'es' ? v.toLocaleString('es-AR', { maximumFractionDigits: 4 }) : v.toLocaleString('en-US', { maximumFractionDigits: 4 });
  if (Array.isArray(v)) return v.map((x) => fmtNum(x as number, lang)).join(' / ');
  if (v && typeof v === 'object') return Object.entries(v as Record<string, number>).map(([k, x]) => `${k} ${fmtNum(x, lang)}`).join(' · ');
  return String(v);
}
const unitOf = (u: Record<Lang, string> | string, lang: Lang): string => (typeof u === 'string' ? (u.endsWith('/') ? `${u}${lang === 'es' ? 'año' : 'yr'}` : u) : u[lang]);

function paramsTable(lang: Lang): string {
  const ind = '        ';
  const th = lang === 'es' ? ['Parámetro', 'Valor', 'Unidad', 'Origen'] : ['Parameter', 'Value', 'Unit', 'Source'];
  const rows = PARAM_ROWS.map((r) => `${ind}    <tr class="border-t border-basalt-700 align-top"><td class="py-1.5 pr-3"><span class="text-bone">${esc(r.label[lang])}</span><br><code class="text-xs text-ash-dim">${esc(r.name)}</code></td><td class="py-1.5 pr-3 tnum">${esc(fmtValue(r.value, lang))}</td><td class="py-1.5 pr-3">${esc(unitOf(r.unit, lang))}</td><td class="py-1.5">${esc(SOURCE_LABEL[r.source][lang])}${r.note ? `<br><span class="text-xs text-ash-dim">${esc(r.note[lang])}</span>` : ''}</td></tr>`);
  return [
    `${ind}<div data-lang="${lang}"${lang === 'en' ? ' hidden' : ''} class="overflow-x-auto">`,
    `${ind}  <table class="w-full min-w-[560px] text-left text-sm text-ash">`,
    `${ind}    <thead><tr class="text-xs text-ash-dim">${th.map((h) => `<th class="py-1 pr-3 font-normal">${h}</th>`).join('')}</tr></thead>`,
    `${ind}    <tbody>`,
    ...rows,
    `${ind}    </tbody>`,
    `${ind}  </table>`,
    `${ind}</div>`,
  ].join('\n');
}

function familiesHtml(): string {
  const ind = '          ';
  return [...EQUATION_FAMILIES, SCORE_FAMILY].map((f) => [
    `${ind}<div class="panel p-5">`,
    `${ind}  <h3 class="font-semibold text-hydro mb-1" data-lang="es">${esc(f.title.es)}</h3>`,
    `${ind}  <h3 class="font-semibold text-hydro mb-1" data-lang="en" hidden>${esc(f.title.en)}</h3>`,
    `${ind}  <p class="text-sm text-ash" data-lang="es">${esc(f.summary.es)}</p>`,
    `${ind}  <p class="text-sm text-ash" data-lang="en" hidden>${esc(f.summary.en)}</p>`,
    `${ind}  <pre class="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-basalt-900 p-3 text-xs text-bone" data-lang="es">${esc(f.formula.es)}</pre>`,
    `${ind}  <pre class="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-basalt-900 p-3 text-xs text-bone" data-lang="en" hidden>${esc(f.formula.en)}</pre>`,
    `${ind}</div>`,
  ].join('\n')).join('\n');
}

export function paramsBlocks(): Record<string, string> {
  return { 'params-table': [paramsTable('es'), paramsTable('en')].join('\n'), 'equation-families': familiesHtml() };
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/params-table-html.ts')) {
  runBlocks('docentes-ecuaciones.html', paramsBlocks());
}
