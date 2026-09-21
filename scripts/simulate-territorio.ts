/**
 * Balance harness for the Territorio preview (mejora-general/files/21_fusion_ecosim.md §10, F7).
 * Plays seven strategies to 2054 — policies, public uses and situations included — and prints where
 * each one lands against the preview's own win routes (src/territorio/routes.ts).
 *
 * The calibration rule: the strategy that pursues a route wins it, doing nothing loses, and no
 * single strategy wins all three. Run with: npm run sim:territorio
 */
import { CONTROL_PARAMS } from '../src/constants';
import { canDeclare, publicUseCost, type PublicUse } from '../src/sim';
import { Policy } from '../src/types';
import { evaluateTerritorio, publicNaturePct } from '../src/territorio/routes';
import {
  advanceMonth, createSession, decideSituation, declareUse, setInstrumentEffort, togglePact, togglePolicy,
  TOTAL_MONTHS, unlocks, type Session,
} from '../src/territorio/session';
import { SITUATION_BY_ID } from '../src/territorio/situations';

interface Strategy {
  name: string;
  policies: Policy[];
  /** Public uses to declare, in order, whenever the treasury allows. */
  uses: PublicUse[];
  /** Effort concentrated on these instruments once they unlock. */
  focusInstruments?: { policy: Policy; instrument: string }[];
  joinPacts?: boolean;
  /** How it deals with the inbox: the first affordable option, or nothing at all. */
  settle: 'first' | 'none';
}

const STRATEGIES: Strategy[] = [
  { name: 'do_nothing', policies: [], uses: [], settle: 'none' },
  {
    name: 'conservation',
    policies: [Policy.NaturalConservation, Policy.Agroecological, Policy.SustainableWaterManagement],
    uses: ['protected', 'protected', 'wetland', 'restoration', 'protected', 'restoration', 'wetland', 'protected'],
    joinPacts: true, settle: 'first',
  },
  {
    name: 'production',
    policies: [Policy.IntensiveAgriculture, Policy.AgriculturalExports, Policy.ForeignInvestment],
    uses: [], settle: 'first',
  },
  {
    name: 'innovation',
    policies: [Policy.CarbonNeutrality, Policy.SustainableLivestock, Policy.Agroecological],
    uses: ['energy', 'energy', 'energy', 'energy', 'energy', 'energy'],
    focusInstruments: [
      { policy: Policy.CarbonNeutrality, instrument: 'C_Fomento_Energias_Renovables_No_Convencionales' },
      { policy: Policy.CarbonNeutrality, instrument: 'C_Investigacion_Desarrollo_Captura_Carbono' },
    ],
    joinPacts: true, settle: 'first',
  },
  {
    // The two shapes the engine review found unguarded: governing nothing but the inbox, and
    // buying the whole map. Neither should win a route on its own.
    name: 'settle_only', policies: [], uses: [], settle: 'first',
  },
  {
    name: 'buy_everything',
    policies: [Policy.CarbonNeutrality],
    uses: ['protected', 'wetland', 'restoration', 'energy', 'protected', 'wetland', 'restoration', 'energy',
      'protected', 'wetland', 'restoration', 'energy', 'protected', 'restoration', 'energy', 'protected'],
    settle: 'first',
  },
  {
    name: 'balanced',
    policies: [Policy.Agroecological, Policy.CarbonNeutrality, Policy.AgriculturalExports, Policy.NaturalConservation],
    uses: ['protected', 'energy', 'restoration', 'protected'],
    joinPacts: true, settle: 'first',
  },
];

function firstDeclarable(session: Session, use: PublicUse) {
  return session.territory.parcels.find((p) => canDeclare(session.territory, p.x, p.y, use));
}

function play(strategy: Strategy, seed: number): Session {
  let s = createSession(seed);
  strategy.policies.forEach((p) => { s = togglePolicy(s, p).session; });
  let pendingUses = [...strategy.uses];

  for (let i = 0; i < TOTAL_MONTHS && !s.outcome; i++) {
    s = advanceMonth(s);
    if (s.outcome) break;

    // Public uses, one at a time, whenever there is money for it.
    if (pendingUses.length > 0) {
      const use = pendingUses[0];
      if (s.game.stellaSpecificState.Reservas_del_Tesoro > publicUseCost(use, CONTROL_PARAMS) * 2) {
        const parcel = firstDeclarable(s, use);
        if (parcel) {
          const r = declareUse(s, parcel.x, parcel.y, use);
          if (!r.error) {
            s = r.session;
            pendingUses = pendingUses.slice(1);
          }
        } else {
          pendingUses = pendingUses.slice(1);
        }
      }
    }

    // Concentrate instrument effort once it unlocks.
    if (strategy.focusInstruments && unlocks(s).instruments && i % 12 === 0) {
      strategy.focusInstruments.forEach(({ policy, instrument }) => {
        s = setInstrumentEffort(s, policy, instrument, 50).session;
      });
    }

    // Pacts only once the public uses this strategy wants are already on the map: joining all three
    // costs 1.800, which otherwise starves the very thing the strategy is about.
    if (strategy.joinPacts && pendingUses.length === 0 && i % 6 === 0 && s.game.stellaSpecificState.Reservas_del_Tesoro > 1200) {
      Object.values(s.game.pacts).forEach((pact) => {
        if (!pact.isActive && unlocks(s).pact(pact.id)) s = togglePact(s, pact.id).session;
      });
    }

    if (strategy.settle === 'first') {
      const item = s.open[0];
      if (item) {
        const def = SITUATION_BY_ID[item.defId];
        const reserves = s.game.stellaSpecificState.Reservas_del_Tesoro;
        const option = def.options.find((o) => (o.cost ?? 0) <= reserves);
        if (option) s = decideSituation(s, item.id, option.id).session;
      }
    }
  }
  return s;
}

const pad = (v: string | number, n: number) => String(v).padStart(n);

console.log('strategy     | seed | end  | won | route        | bio  | co2   | food | econ | soc  | pub% | enr% | tes  | score | floors');
console.log('-------------|------|------|-----|--------------|------|-------|------|------|------|------|------|------|-------|-------');
for (const strategy of STRATEGIES) {
  for (const seed of [11, 22, 33]) {
    const s = play(strategy, seed);
    const outcome = evaluateTerritorio(s.game, { ...s.game, indicators: s.game.levelBaseline });
    const i = s.game.indicators;
    const routeNames = outcome.routes.filter((r) => r.met).map((r) => r.route.id).join('+') || '-';
    console.log([
      strategy.name.padEnd(12), pad(seed, 4), pad(s.game.year, 4), pad(outcome.won ? 'yes' : 'no', 3),
      routeNames.padEnd(12), pad(i.biodiversity.toFixed(1), 4), pad(i.co2EqEmissionsPerCapita.toFixed(2), 5),
      pad(i.foodSecurity.toFixed(1), 4), pad(i.economicSecurity.toFixed(1), 4), pad(i.socialWellbeing.toFixed(1), 4),
      pad(publicNaturePct(s.game).toFixed(1), 4),
      pad(((s.game.landUses.ENR.area / 600) * 100).toFixed(1), 4),
      pad(s.game.stellaSpecificState.Reservas_del_Tesoro.toFixed(0), 4), pad(i.generalScore.toFixed(0), 5),
      outcome.floorsMet ? 'ok' : outcome.failedFloors.map((f) => f.labelKey.split('.').pop()).join(','),
    ].join(' | '));
  }
}
