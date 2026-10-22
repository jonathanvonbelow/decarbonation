/**
 * Canonical balance-harness strategies for both games (mejora-general/files/33_arnes_completo.md §3).
 *
 * Ids and definitions mirror `STRATEGIES` and `TERR_STRATEGIES` in scripts/reference/modelo_v2.py
 * one for one (same ids, same policy codes, same effort vectors, same pact list, same public-use
 * schedule). One deliberate difference: on level 1 effort is always even, because level 1 has no
 * instrument panel (33 §3.1, fase 34 §3.2); the prototype applies the vectors on every level. Policies and pacts are written with the prototype's short codes so a `grep` of an id
 * shows both definitions side by side; `POLICY_BY_CODE` / `PACT_BY_CODE` translate them to the
 * engine's real keys (phase 43 discrepancy: the prototype says treaty/accord/tech, the code says
 * biodiversityTreaty/globalCarbonAccord/techTransferInitiative).
 *
 * The old scripts/simulate.ts and scripts/simulate-territorio.ts keep their own ad-hoc strategies
 * (simulate-territorio.ts has seven, with production = PAI/PEA/PIE and no GS, and no
 * cheap_production/extractive): they are quick shortcuts, not the reference (docs/v6-spec-vs-motor.md).
 */
import type { PublicUse } from '../../src/sim';
import { Policy } from '../../src/types';

export type PolicyCode = 'CR' | 'AS' | 'GS' | 'AGUA' | 'CN' | 'PAI' | 'PEA' | 'PIE' | 'FRA' | 'SE';
export type PactCode = 'treaty' | 'accord' | 'tech';

export const POLICY_BY_CODE: Record<PolicyCode, Policy> = {
  CR: Policy.NaturalConservation,
  AS: Policy.Agroecological,
  GS: Policy.SustainableLivestock,
  AGUA: Policy.SustainableWaterManagement,
  CN: Policy.CarbonNeutrality,
  PAI: Policy.IntensiveAgriculture,
  PEA: Policy.AgriculturalExports,
  PIE: Policy.ForeignInvestment,
  FRA: Policy.FlexibleEnvironmentalRegulations,
  SE: Policy.EnergySubsidies,
};

export const PACT_BY_CODE: Record<PactCode, string> = {
  treaty: 'biodiversityTreaty',
  accord: 'globalCarbonAccord',
  tech: 'techTransferInitiative',
};

/**
 * Order of the prototype's 4-number effort vector for Carbon Neutrality (33 §3.1:
 * impuesto/renovables/eficiencia/captura) mapped to the engine's instrument ids.
 */
export const EFFORT_ORDER: Partial<Record<PolicyCode, string[]>> = {
  CN: [
    'C_Impuesto_Carbono_Sectorial',
    'C_Fomento_Energias_Renovables_No_Convencionales',
    'C_Eficiencia_Energetica_Industrial_Residencial',
    'C_Investigacion_Desarrollo_Captura_Carbono',
  ],
};

export type EffortVector = [number, number, number, number];

export type RouteKey = 'conservation' | 'production' | 'innovation';

/** The three "models of country": C3 asks that no strategy meets all of them at once. */
export const MAIN_ROUTES: RouteKey[] = ['conservation', 'production', 'innovation'];
/** Route columns of the report, per scope (level 3 adds `equilibrium`). */
export const LEVEL_ROUTE_IDS: Record<number, string[]> = {
  1: [...MAIN_ROUTES], 2: [...MAIN_ROUTES], 3: [...MAIN_ROUTES, 'equilibrium'],
};
export const TERRITORIO_ROUTE_IDS: string[] = [...MAIN_ROUTES];

/* ── 3-level game ──────────────────────────────────────────────────────────────────────────── */

export interface NivelesStrategy {
  id: string;
  /** Policies switched on at year 0 of every level. */
  ids: PolicyCode[];
  /** Instrument effort (levels 2 and 3 only: level 1 has no instrument panel, so it is always even). */
  effort?: Partial<Record<PolicyCode, EffortVector>>;
  /** Pacts joined as soon as they unlock, from level 2 on. */
  pacts?: PactCode[];
}

export const NIVELES_STRATEGIES: NivelesStrategy[] = [
  { id: 'do_nothing', ids: [] },
  { id: 'green', ids: ['CR', 'AS', 'AGUA', 'CN'] },
  { id: 'extractive', ids: ['PAI', 'PEA', 'PIE', 'FRA', 'SE'] },
  { id: 'production', ids: ['PEA', 'PIE', 'GS', 'AS'] },
  { id: 'innovation', ids: ['CN', 'PIE', 'AS'], effort: { CN: [20, 40, 40, 0] }, pacts: ['accord', 'tech'] },
  { id: 'conservation', ids: ['CR', 'AS', 'GS'], pacts: ['treaty'] },
  { id: 'balanced', ids: ['CR', 'AS', 'PEA', 'CN', 'PIE'] },
  { id: 'tech_tax', ids: ['CN'], effort: { CN: [100, 0, 0, 0] } },
];

/** Additional fiscal pressure (pp) the prototype applies on level 3 to every strategy that has policies. */
export const NIVELES_LEVEL3_TAX_PP = 2;
export const nivelesTax = (s: NivelesStrategy, level: number): number =>
  level === 3 && s.ids.length > 0 ? NIVELES_LEVEL3_TAX_PP : 0;

/* ── Territorio ────────────────────────────────────────────────────────────────────────────── */

export interface TerritorioStrategy {
  id: string;
  ids: PolicyCode[];
  /** Public uses declared in order, one attempt every `every` months; a use is dropped only once declared. */
  uses?: PublicUse[];
  every?: number;
  /** Instrument effort, applied when instruments unlock (2029, src/territorio/calendar.ts). */
  effort?: Partial<Record<PolicyCode, EffortVector>>;
  pacts?: PactCode[];
  /** Additional fiscal pressure (pp) from 2035, when finance unlocks. */
  taxFrom2035?: number;
  /** Inbox: settle every open situation with its first affordable option, or never. */
  settle: 'first' | 'none';
}

const repeat = <T>(items: T[], times: number): T[] => Array.from({ length: times }, () => items).flat();

export const TERRITORIO_STRATEGIES: TerritorioStrategy[] = [
  { id: 'do_nothing', ids: [], settle: 'none' },
  {
    id: 'conservation', ids: ['CR', 'AS', 'AGUA'],
    uses: [...repeat<PublicUse>(['protected'], 6), ...repeat<PublicUse>(['wetland', 'restoration'], 3)], every: 12,
    pacts: ['treaty'], taxFrom2035: 2, settle: 'first',
  },
  { id: 'production', ids: ['PAI', 'PEA', 'PIE', 'GS'], settle: 'first' },
  {
    id: 'innovation', ids: ['CN', 'GS', 'AS'], uses: repeat<PublicUse>(['energy'], 4), every: 18,
    effort: { CN: [20, 40, 40, 0] }, pacts: ['tech'], taxFrom2035: 2, settle: 'first',
  },
  { id: 'settle_only', ids: [], settle: 'first' },
  { id: 'cheap_production', ids: ['PEA'], settle: 'first' },
  { id: 'extractive', ids: ['PAI', 'PEA', 'PIE', 'FRA', 'SE'], settle: 'first' },
  {
    id: 'buy_everything', ids: ['CR', 'CN', 'AS'],
    uses: repeat<PublicUse>(['protected', 'energy', 'wetland', 'restoration'], 6), every: 1, settle: 'first',
  },
];

/* ── Roles used by the criteria (00_INDICE_v6.md §6) ───────────────────────────────────────── */

/** Strategy id → the route it pursues (C2). */
export const TARGETED: Record<RouteKey, string> = {
  conservation: 'conservation',
  production: 'production',
  innovation: 'innovation',
};

/** Shortcuts that must not win (C4). */
export const SHORTCUTS = {
  niveles: ['tech_tax', 'extractive'],
  territorio: ['settle_only', 'cheap_production', 'extractive', 'buy_everything'],
} as const;

/** The only strategy allowed to end in bankruptcy (C8), and only in Territorio. */
export const BANKRUPTCY_ALLOWED = { niveles: [] as string[], territorio: ['buy_everything'] };
