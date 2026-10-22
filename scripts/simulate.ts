/**
 * Minimal Monte Carlo-ish balance harness (mejora-general/files/16_auditoria_ecuaciones.md §5),
 * built out now because phase 5 (17_multiples_vias_victoria.md) needs it to sanity-check the
 * LEVEL_ROUTES thresholds -- rather than leaving it entirely for later, per that file's own
 * dependency note ("no se pueden calibrar rutas sin harness").
 *
 * Deliberately smaller than the full spec: 5 strategies (not 8), a fixed "activate once at year
 * 0" policy plan (not a per-year synthetic player), single-seed runs (not a sweep over 200 seeds
 * per strategy). Enough to catch the two failure modes that actually matter for calibration --
 * "do_nothing wins" and "one strategy wins every route" -- without building the full harness this
 * phase doesn't need yet. Run with: npx tsx scripts/simulate.ts
 */
import { baseEfficiency, createInitialState, stepYear, evaluateLevel, makeRng } from '../src/sim';
import { Policy, type GameState } from '../src/types';
import { YEARS_PER_LEVEL, INITIAL_YEAR, CONTROL_PARAMS } from '../src/constants';

function freshState(level: number): GameState {
  const { gameStatePatch } = createInitialState(level);
  return {
    ...gameStatePatch,
    finances: { pbi: 0, treasuryReserves: 0, debt: 0 },
    gameLog: [], isSimulating: false, gameOverReason: null, loanRequestedThisRound: 0,
    currentEvent: null, newsHeadlines: [], wonLevels: [], _pendingLevelIntroTrigger: null,
  };
}

function activate(state: GameState, ids: Policy[], effortByPolicy?: Partial<Record<Policy, Record<string, number>>>) {
  ids.forEach((id) => {
    const p = state.policies[id];
    p.isActive = true;
    p.currentEfficiency = baseEfficiency(p, CONTROL_PARAMS);
    if (p.instruments) {
      const overrides = effortByPolicy?.[id];
      const instIds = Object.keys(p.instruments);
      if (overrides) {
        instIds.forEach((iid) => { p.instruments![iid].effortPercentage = overrides[iid] ?? 0; });
      } else {
        const share = 100 / instIds.length;
        instIds.forEach((iid) => { p.instruments![iid].effortPercentage = share; });
      }
      p.totalInstrumentEffortApplied = Object.values(p.instruments).reduce((s, i) => s + i.effortPercentage, 0);
    }
  });
}

interface Strategy {
  id: string;
  /** Called every simulated year so strategies can stagger policies in as earlier ones wear
   *  out -- see the note on policy efficiency below. `apply(state)` alone
   *  (year-independent) is still fine for simple always-on strategies. */
  perYear: (state: GameState, yearsIntoLevel: number) => void;
}

const STRATEGIES: Strategy[] = [
  { id: 'do_nothing', perYear: () => {} },
  {
    id: 'all_green',
    perYear: (s) => activate(s, [Policy.NaturalConservation, Policy.Agroecological, Policy.SustainableWaterManagement]),
  },
  {
    id: 'all_brown',
    perYear: (s) => activate(s, [Policy.IntensiveAgriculture, Policy.AgriculturalExports, Policy.ForeignInvestment]),
  },
  {
    id: 'tech_bet',
    perYear: (s) => activate(s, [Policy.CarbonNeutrality], {
      [Policy.CarbonNeutrality]: {
        C_Fomento_Energias_Renovables_No_Convencionales: 40,
        C_Investigacion_Desarrollo_Captura_Carbono: 40,
        C_Impuesto_Carbono_Sectorial: 10,
        C_Eficiencia_Energetica_Industrial_Residencial: 10,
      },
    }),
  },
  {
    id: 'balanced',
    perYear: (s) => activate(s, [Policy.NaturalConservation, Policy.Agroecological, Policy.IntensiveAgriculture, Policy.AgriculturalExports]),
  },
  // Rotates in fresh policies as earlier ones wear out (fatigue only accumulates while a policy is
  // active, src/sim/v2/policies.ts; a fresh one still needs its start-up ramp) -- see the note below.
  {
    id: 'rotating_green',
    perYear: (s, y) => {
      if (y === 0) activate(s, [Policy.NaturalConservation, Policy.Agroecological]);
      if (y === 10) activate(s, [Policy.SustainableWaterManagement, Policy.SustainableLivestock]);
      if (y === 20) activate(s, [Policy.CarbonNeutrality]);
    },
  },
  {
    id: 'rotating_brown',
    perYear: (s, y) => {
      if (y === 0) activate(s, [Policy.AgriculturalExports, Policy.ForeignInvestment]);
      if (y === 7) activate(s, [Policy.IntensiveAgriculture, Policy.EnergySubsidies]);
      if (y === 15) activate(s, [Policy.FlexibleEnvironmentalRegulations]);
    },
  },
];

// NOTE on policy efficiency (docs/audit-equations.md P-1 / N-07): until model 1.1 the decay counter
// Tiempo_Activacion_X never reset, so wear was permanent. Since model 2.0 (phase 36,
// src/sim/v2/policies.ts) a policy ramps up after activation, wears towards an institutional floor
// (Eficiencia_Minima_Politicas) and recovers while resting (Recuperacion_Politicas_Anios), so the
// rotating strategies above now measure a real trade-off.

function runLevel(level: number, strategy: Strategy, seed: number) {
  let state = freshState(level);
  const targetYear = state.activeLevelConfig?.targetYear ?? INITIAL_YEAR + YEARS_PER_LEVEL * level;

  strategy.perYear(state, 0);
  while (state.year < targetYear && !state.gameOverReason) {
    const rng = makeRng(seed, state.year + 1);
    state = stepYear(state, rng).next;
    strategy.perYear(state, state.year - INITIAL_YEAR);
  }
  const outcome = evaluateLevel(state, { ...state, indicators: state.levelBaseline });
  return { strategy: strategy.id, level, gameOver: state.gameOverReason, outcome, finalIndicators: state.indicators };
}

function main() {
  const results: { level: number; strategy: string; achieved: string | null; won: boolean; gameOver: string | null; fi: GameState['indicators'] }[] = [];

  for (const level of [1, 2, 3]) {
    for (const strategy of STRATEGIES) {
      const { outcome, gameOver, finalIndicators } = runLevel(level, strategy, 1);
      results.push({
        level, strategy: strategy.id, achieved: outcome.achieved?.id ?? null, won: outcome.won,
        gameOver: gameOver ?? null, fi: finalIndicators,
      });
    }
  }

  console.log('\nlevel | strategy    | won   | route         | biodiv | co2   | econSec | foodSec | score | gameOver');
  console.log('------|-------------|-------|---------------|--------|-------|---------|---------|-------|---------');
  for (const r of results) {
    console.log(
      `${r.level}     | ${r.strategy.padEnd(11)} | ${String(r.won).padEnd(5)} | ${(r.achieved ?? '-').padEnd(13)} | `
      + `${r.fi.biodiversity.toFixed(1).padStart(6)} | ${r.fi.co2EqEmissionsPerCapita.toFixed(2).padStart(5)} | `
      + `${r.fi.economicSecurity.toFixed(1).padStart(7)} | ${r.fi.foodSecurity.toFixed(1).padStart(7)} | `
      + `${r.fi.generalScore.toFixed(0).padStart(5)} | ${r.gameOver ?? ''}`,
    );
  }

  const byLevel = [1, 2, 3].map((level) => {
    const rows = results.filter((r) => r.level === level);
    const doNothingWon = rows.find((r) => r.strategy === 'do_nothing')?.won;
    const winners = rows.filter((r) => r.won);
    const routesWon = new Set(winners.map((r) => r.achieved));
    return { level, doNothingWon, winCount: winners.length, of: rows.length, distinctRoutes: routesWon.size };
  });

  console.log('\nCalibration checks:');
  for (const l of byLevel) {
    const flags: string[] = [];
    if (l.doNothingWon) flags.push('FAIL: do_nothing wins');
    if (l.winCount === 0) flags.push('WARN: nobody wins');
    if (l.distinctRoutes <= 1 && l.winCount > 1) flags.push('WARN: only one route ever achieved');
    console.log(`  level ${l.level}: ${l.winCount}/${l.of} strategies won, ${l.distinctRoutes} distinct route(s) achieved ${flags.length ? '  ' + flags.join('; ') : '(OK)'}`);
  }
}

main();
