/**
 * Photography for the news feed and the situations inbox (`nuevo-arte/news_situations_v3`,
 * incorporado el 2026-09-22).
 *
 * The pack is agency-style photography: droughts, tractor blockades, environmental camps, soup
 * kitchens, burning fields, ports, a solar install, an international press conference, public works
 * left half-built. It does not replace anything the map draws — the map is the model's land use.
 * What it adds is the register the feed was missing: a situation that arrives with a photograph of
 * what it is about reads as a thing happening in a place, not as a row in a list.
 *
 * Two rules keep it honest:
 *   - a photo is only shown when the theme is *certain* (a category, an event id, a crossing the
 *     feed already names). Everything else stays text, rather than illustrating a number with a
 *     picture that happens to be at hand;
 *   - most themes have one frame per win route, and the route chosen is the one the player is
 *     actually leading. The same drought looks different in a region that bet on conservation and
 *     in one that bet on production, which is the story the game is telling anyway.
 */
import type { NewsItem } from './news';
import type { SituationCategory, SituationDef } from './situations';

/** Which frame of a theme to use: the win route the player leads, or the generic agency photo. */
export type NewsRoute = 'innovation' | 'integrity' | 'production' | 'equilibrium' | 'any';

export type NewsTheme =
  | 'climate' | 'agri' | 'env' | 'social' | 'emissions' | 'biodiversity'
  | 'economy' | 'treasury' | 'international' | 'technology';

/** Route frames that exist on disk per theme (see `public/assets/news/`). */
const ROUTES_FOR_THEME: Record<NewsTheme, NewsRoute[]> = {
  climate: ['innovation', 'integrity', 'production', 'equilibrium'],
  agri: ['innovation', 'integrity', 'production', 'equilibrium'],
  env: ['innovation', 'integrity', 'production', 'equilibrium'],
  social: ['innovation', 'integrity', 'production', 'equilibrium'],
  emissions: ['innovation', 'production', 'equilibrium'],
  biodiversity: ['integrity'],
  economy: [],
  treasury: [],
  international: [],
  technology: [],
};

/** The win route ids of both games, in the pack's own vocabulary. */
export function artRoute(routeId: string | null | undefined): NewsRoute {
  switch (routeId) {
    case 'conservation': return 'integrity';
    case 'production': return 'production';
    case 'innovation': return 'innovation';
    case 'equilibrium': return 'equilibrium';
    default: return 'any';
  }
}

export function newsArtUrl(theme: NewsTheme, route: NewsRoute = 'any'): string {
  const variant = route !== 'any' && ROUTES_FOR_THEME[theme].includes(route) ? route : 'any';
  return `/assets/news/${theme}-${variant}.webp`;
}

/* ── Situations ────────────────────────────────────────────────────────────────────────────── */

const THEME_FOR_CATEGORY: Record<SituationCategory, NewsTheme> = {
  climate: 'climate',
  ecology: 'biodiversity',
  production: 'agri',
  society: 'social',
  politics: 'treasury',
  economy: 'economy',
  technology: 'technology',
  international: 'international',
};

/**
 * Situations whose own subject is sharper than their category: a blockade is the farmers on the
 * road, a march is the environmental camp, a fishery collapse is not a "society" photo.
 */
const THEME_FOR_SITUATION: Record<string, NewsTheme> = {
  'road-blockade': 'agri',
  'transport-strike': 'agri',
  'export-ban': 'agri',
  'export-quota': 'agri',
  'dairy-crisis': 'agri',
  'fertilizer-price': 'agri',
  'rural-wages': 'social',
  'urban-gardens': 'social',
  'food-waste': 'social',
  'pesticide-drift': 'social',
  'just-transition-demand': 'social',
  'midterm-elections': 'social',
  'local-referendum': 'social',
  'public-hearing': 'social',
  'indigenous-consultation': 'env',
  'press-investigation': 'biodiversity',
  'fishery-collapse': 'biodiversity',
  'satellite-monitoring': 'technology',
  'carbon-soil-study': 'technology',
  'energy-tariff': 'economy',
  'climate-march': 'env',
  'youth-council': 'env',
  'ngo-lawsuit': 'env',
  'protected-area-pressure': 'env',
  'illegal-logging': 'biodiversity',
  'wetland-drained': 'biodiversity',
  'corridor-proposal': 'biodiversity',
  'pollinator-crash': 'biodiversity',
  'invasive-species': 'biodiversity',
  'food-prices-protest': 'social',
  'community-kitchens': 'social',
  'informal-settlement': 'social',
  'rural-exodus': 'social',
  'drought-season': 'climate',
  heatwave: 'climate',
  'flood-lowlands': 'climate',
  'dust-storms': 'climate',
  'aquifer-drop': 'climate',
  wildfire: 'emissions',
  'carbon-market': 'emissions',
  'fuel-subsidy-cut': 'emissions',
  'solar-pumping': 'technology',
  'biochar-plant': 'technology',
  'precision-irrigation': 'technology',
  'drone-monitoring': 'technology',
  'ai-advisory': 'technology',
  'green-bond': 'treasury',
  'sovereign-fund': 'treasury',
  'credit-rating': 'treasury',
  'audit-subsidies': 'treasury',
  'corruption-scandal': 'treasury',
  recession: 'economy',
  'inflation-spike': 'economy',
  'plant-closure': 'economy',
  'tariff-war': 'economy',
  'capital-flight': 'economy',
  'summit-invite': 'international',
  'ipcc-report': 'international',
  'climate-fund': 'international',
  'debt-swap': 'international',
  'water-treaty': 'international',
  'fdi-offer': 'international',
  'land-grab': 'international',
};

/**
 * Good news the pack has no frame for: every climate photograph in it is a drought or a fire, so a
 * generous rainy season or a record harvest would be illustrated by its opposite. They stay text.
 */
const NO_ART = new Set(['good-rains', 'bumper-harvest', 'agroecology-pilot', 'community-restoration']);

export const themeForSituation = (def: SituationDef): NewsTheme | null =>
  (NO_ART.has(def.id) ? null : THEME_FOR_SITUATION[def.id] ?? THEME_FOR_CATEGORY[def.category]);

/**
 * Theme of the situation a feed item is about, when it is the one announcing its arrival. The
 * arrival is the news; the note saying it was settled, or that it expired, stays text.
 * (The caller resolves the id: this module keeps no runtime dependency on the catalogue, so the
 * 3-level game can import it without pulling the hundred situations into its bundle.)
 */
export function themeForSituationNews(item: NewsItem, lookup: (id: string) => SituationDef | undefined): NewsTheme | null {
  if (item.key !== 'situation.arrived') return null;
  const id = item.values?.situation;
  const def = typeof id === 'string' ? lookup(id) : undefined;
  return def ? themeForSituation(def) : null;
}

/* ── News ──────────────────────────────────────────────────────────────────────────────────── */

/** The model's own random events. */
const THEME_FOR_EVENT: Record<string, NewsTheme> = {
  drought_severe: 'climate',
  supply_chain_crisis: 'economy',
  international_scrutiny: 'international',
  global_recession: 'economy',
  fossil_fuel_shock: 'emissions',
  bumper_harvest: 'agri',   // the tractors on the road double as a harvest shot
  green_tech_investment_boom: 'technology',
  climate_justice_movement: 'env',
};

/** Photo for one of the model's random events, for surfaces that only have the event (no feed). */
export const eventArtUrl = (eventId: string, route: NewsRoute = 'any'): string | null =>
  (THEME_FOR_EVENT[eventId] ? newsArtUrl(THEME_FOR_EVENT[eventId], route) : null);

/** Feed entries that name something concrete enough to be worth a photograph. */
const THEME_FOR_KEY: Record<string, NewsTheme> = {
  'actor.farmersUp': 'agri',
  'actor.ngoUp': 'env',
  'actor.citizensUp': 'social',
  'alert.biodiversity': 'biodiversity',
  'alert.social': 'social',
  'alert.food': 'climate',
  'finance.negative': 'treasury',
  'milestone.co2Up': 'emissions',
  'milestone.co2Down': 'technology',
};

/**
 * Theme for a feed item, or null when it is better left as text: routine land moves, unlocks, the
 * yearly balance and the player's own declarations already say what they are.
 */
export function themeForNews(item: NewsItem): NewsTheme | null {
  if (item.kind === 'event' && item.eventId) return THEME_FOR_EVENT[item.eventId] ?? null;
  return THEME_FOR_KEY[item.key] ?? null;
}
