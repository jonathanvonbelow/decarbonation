/**
 * Monthly news for the Territorio preview (mejora-general/files/21_fusion_ecosim.md §7).
 *
 * The decision to go monthly was so more situations and news fit inside each year. The model's own
 * random events keep their calibrated (low) frequency, so the volume comes from here instead: every
 * headline is derived from what the model actually did this month — land that changed use, a
 * pressure or indicator crossing a threshold, the treasury going negative, an emissions milestone,
 * the yearly balance, a mechanic unlocking. News has no mechanical effect of its own: it narrates
 * the model, it never adds to it.
 *
 * Items carry a copy key + values rather than finished text, so switching language re-renders the
 * whole feed. The one exception is `text`, for strings the engine already produced localized
 * (policy-efficiency warnings).
 */
import { CONTROL_PARAMS } from '../constants';
import { isProductive, type ParcelChange } from '../sim';
import type { ControlParams, GameState, Indicators, RandomEvent } from '../types';
import { LandUseType } from '../types';
import { INSTRUMENTS_UNLOCK_YEAR } from './calendar';
import type { Session } from './session';

export type NewsTone = 'good' | 'bad' | 'neutral';
export type NewsKind =
  | 'event' | 'land' | 'actor' | 'finance' | 'alert' | 'milestone' | 'summary' | 'unlock' | 'policy' | 'player'
  | 'situation';

export interface NewsItem {
  id: string;
  /** Months elapsed when the item was produced. */
  monthIndex: number;
  /** Calendar year and month (0-11) the item is about. */
  year: number;
  month: number;
  kind: NewsKind;
  tone: NewsTone;
  /** Key into the `news` section of the Territorio copy dictionary. */
  key: string;
  values?: Record<string, string | number>;
  eventId?: string;
  /** Already-localized text produced by the engine (policy-efficiency warnings). */
  text?: string;
}

export interface MonthNewsContext {
  prev: GameState;
  next: GameState;
  simulatedYear: number;
  simulatedMonth: number;
  monthIndex: number;
  event: RandomEvent | null;
  /** Land that changed use and is worth a headline, km² per `from>to` transition (see `tallyLand`). */
  land: Record<string, number>;
  engineMessages: string[];
  yearRolled: boolean;
  yearStart: Indicators;
}

const LU = LandUseType;

/** Land-use transitions with a headline of their own; anything else falls back to `land.generic`. */
const LAND_HEADLINES: Record<string, { key: string; tone: NewsTone }> = {
  [`${LU.UnprotectedNativeForest}>${LU.ConventionalCrops}`]: { key: 'land.deforestCC', tone: 'bad' },
  [`${LU.UnprotectedNativeForest}>${LU.AgroecologicalCrops}`]: { key: 'land.deforestCA', tone: 'neutral' },
  [`${LU.UnprotectedNativeForest}>${LU.ProtectedNativeForest}`]: { key: 'land.protectedByPolicy', tone: 'good' },
  [`${LU.ConventionalCrops}>${LU.AgroecologicalCrops}`]: { key: 'land.toAgroeco', tone: 'good' },
  [`${LU.AgroecologicalCrops}>${LU.UnprotectedNativeForest}`]: { key: 'land.regrowth', tone: 'good' },
};

/** Threshold crossings worth a headline: [indicator, threshold, direction, key, tone]. */
const CROSSINGS: [keyof Indicators, number, 'up' | 'down', string, NewsTone][] = [
  ['ppAgricola', 70, 'up', 'actor.farmersUp', 'bad'],
  ['ppAgricola', 50, 'down', 'actor.farmersCalm', 'good'],
  ['ppAmbientalista', 70, 'up', 'actor.ngoUp', 'bad'],
  ['ppAmbientalista', 50, 'down', 'actor.ngoCalm', 'good'],
  ['ppSocial', 70, 'up', 'actor.citizensUp', 'bad'],
  ['ppSocial', 50, 'down', 'actor.citizensCalm', 'good'],
  ['treasuryReserves', 0, 'down', 'finance.negative', 'bad'],
  ['treasuryReserves', 0, 'up', 'finance.recovered', 'good'],
  ['foodSecurity', 25, 'down', 'alert.food', 'bad'],
  ['biodiversity', 30, 'down', 'alert.biodiversity', 'bad'],
  ['politicalStability', 30, 'down', 'alert.stability', 'bad'],
  ['socialWellbeing', 30, 'down', 'alert.social', 'bad'],
];

/** Land news waits until a transition has moved this much land (km²): 20 km² = 2 kHa. */
export const LAND_NEWS_KM2 = 20;

/**
 * One parcel is 1 km² (0.1 kHa) on the 100×100 map, so the model moves a few parcels every month.
 * Headlines add them up per transition and report once a transition has moved `LAND_NEWS_KM2`
 * (a drought's loss, which arrives at once, is reported the same month).
 */
export function tallyLand(tally: Record<string, number>, changes: ParcelChange[], kHaPerParcel: number): { tally: Record<string, number>; report: Record<string, number> } {
  const next = { ...tally };
  const km2 = kHaPerParcel * 10;
  changes.forEach((c) => {
    if (!isProductive(c.from) || !isProductive(c.to)) return;
    const key = `${c.from}>${c.to}`;
    next[key] = (next[key] ?? 0) + km2;
  });
  const report: Record<string, number> = {};
  Object.keys(next).forEach((key) => {
    if (next[key] >= LAND_NEWS_KM2) {
      report[key] = Math.round(next[key]);
      delete next[key];
    }
  });
  return { tally: next, report };
}

const crossed = (before: number, after: number, threshold: number, dir: 'up' | 'down') =>
  dir === 'up' ? before < threshold && after >= threshold : before > threshold && after <= threshold;

export function buildMonthNews(ctx: MonthNewsContext): NewsItem[] {
  const items: NewsItem[] = [];
  const base = { monthIndex: ctx.monthIndex, year: ctx.simulatedYear, month: ctx.simulatedMonth };
  const add = (item: Omit<NewsItem, 'id' | 'monthIndex' | 'year' | 'month'>) =>
    items.push({ ...base, ...item, id: `${ctx.monthIndex}-${items.length}-${item.key}` });

  if (ctx.event) {
    add({
      kind: 'event',
      tone: ctx.event.type === 'positive' ? 'good' : ctx.event.type === 'negative' ? 'bad' : 'neutral',
      key: 'event',
      eventId: ctx.event.id,
    });
  }

  // Land that changed use, grouped by transition.
  Object.entries(ctx.land).forEach(([transition, n]) => {
    const [from, to] = transition.split('>');
    if (to === 'fallow') add({ kind: 'land', tone: 'bad', key: 'land.fallow', values: { n } });
    else if (LAND_HEADLINES[transition]) add({ kind: 'land', ...LAND_HEADLINES[transition], values: { n } });
    else add({ kind: 'land', tone: 'neutral', key: 'land.generic', values: { n, from, to } });
  });

  const before = ctx.prev.indicators;
  const after = ctx.next.indicators;
  CROSSINGS.forEach(([indicator, threshold, dir, key, tone]) => {
    if (crossed(before[indicator], after[indicator], threshold, dir)) {
      add({ kind: key.startsWith('actor') ? 'actor' : key.startsWith('finance') ? 'finance' : 'alert', tone, key });
    }
  });

  // Emissions milestones: each whole tonne per capita crossed.
  const co2Before = before.co2EqEmissionsPerCapita;
  const co2After = after.co2EqEmissionsPerCapita;
  if (Math.floor(co2After) < Math.floor(co2Before)) {
    add({ kind: 'milestone', tone: 'good', key: 'milestone.co2Down', values: { value: Math.floor(co2Before) } });
  } else if (Math.floor(co2After) > Math.floor(co2Before)) {
    add({ kind: 'milestone', tone: 'bad', key: 'milestone.co2Up', values: { value: Math.floor(co2After) } });
  }

  ctx.engineMessages.forEach((text) => add({ kind: 'policy', tone: 'bad', key: 'policyFading', text }));

  if (ctx.yearRolled) {
    add({
      kind: 'summary',
      tone: 'neutral',
      key: 'summary',
      values: {
        year: ctx.simulatedYear,
        co2: after.co2EqEmissionsPerCapita,
        co2Delta: after.co2EqEmissionsPerCapita - ctx.yearStart.co2EqEmissionsPerCapita,
        bio: after.biodiversity,
        bioDelta: after.biodiversity - ctx.yearStart.biodiversity,
      },
    });
  }
  return items;
}

/** Headlines for mechanics that became available between two sessions (checked every month). */
export function unlockNews(prev: Session, next: Session, CP: ControlParams = CONTROL_PARAMS): NewsItem[] {
  const items: NewsItem[] = [];
  const base = { monthIndex: next.monthIndex, year: next.game.year, month: next.month, kind: 'unlock' as const, tone: 'neutral' as const };
  const y0 = prev.game.year;
  const y1 = next.game.year;
  if (y1 === y0) return items;
  if (y0 < INSTRUMENTS_UNLOCK_YEAR && y1 >= INSTRUMENTS_UNLOCK_YEAR) items.push({ ...base, id: `${next.monthIndex}-u-instr`, key: 'unlock.instruments' });
  if (y0 < CP.Ano_Activacion_Prestamo && y1 >= CP.Ano_Activacion_Prestamo) {
    items.push({ ...base, id: `${next.monthIndex}-u-fin`, key: 'unlock.finance' });
  }
  Object.values(next.game.pacts).forEach((pact) => {
    const at = pact.unlockYear ?? 0;
    if (y0 < at && y1 >= at) items.push({ ...base, id: `${next.monthIndex}-u-${pact.id}`, key: 'unlock.pact', values: { pactId: pact.id } });
  });
  return items;
}
