/**
 * Snapshot of the latest Territorio game in this browser, read by the survey page.
 * Written by TerritorioApp at every year boundary and when the game ends, so a player who stops
 * mid-game in a workshop still contributes a partial summary.
 * Storage key: dn_territorio_last_game_v1. Expires after 12 h (a stale game is not "the latest").
 */
import type { Policy } from '../../types';
import { evaluateTerritorio } from '../routes';
import type { Session } from '../session';
import type { RouteCode, TerritorioFeedbackRow } from './types';

const KEY = 'dn_territorio_last_game_v1';
const TTL_MS = 12 * 60 * 60 * 1000;

export interface GameSummary {
  savedAt: number;
  estado: 'completa' | 'incompleta';
  resultado: 'won' | 'lost' | 'collapse' | null;
  rutaLograda: RouteCode | null;
  rutaCercana: RouteCode;
  rutaCercanaProgreso: number;
  pisosCumplidos: boolean;
  anioAlcanzado: number;
  mesesJugados: number;
  situacionesResueltas: number;
  situacionesVencidas: number;
  areasDeclaradas: number;
  /** Short codes, e.g. "P-AS". */
  politicasActivas: string[];
  indicadoresFinales: Record<'biodiversity' | 'foodSecurity' | 'economicSecurity' | 'socialWellbeing' | 'politicalStability' | 'co2', number>;
  seed: number;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const shortCode = (p: Policy | string) => /\(([A-Z-]+)\)$/.exec(p)?.[1] ?? null;

/** Pure: builds the summary from a session. `now` is injectable for tests. */
export function buildSummary(session: Session, now: number = Date.now()): GameSummary {
  const outcome = session.outcome;
  const routes = outcome?.routes ?? evaluateTerritorio(session.game, { ...session.game, indicators: session.game.levelBaseline });
  const ind = session.game.indicators;
  const policies = (Object.values(session.game.policies) as { id: Policy; isActive: boolean }[])
    .filter((p) => p.isActive)
    .map((p) => shortCode(p.id))
    .filter((c): c is string => c !== null);
  return {
    savedAt: now,
    estado: outcome ? 'completa' : 'incompleta',
    resultado: outcome ? outcome.kind : null,
    rutaLograda: (routes.achieved?.id ?? null) as RouteCode | null,
    rutaCercana: routes.closest.route.id as RouteCode,
    rutaCercanaProgreso: Math.round(routes.closest.progress * 1000) / 1000,
    pisosCumplidos: routes.floorsMet,
    anioAlcanzado: session.game.year,
    mesesJugados: session.monthIndex,
    situacionesResueltas: session.resolvedCount,
    situacionesVencidas: session.expiredCount,
    areasDeclaradas: session.declaredCount,
    politicasActivas: policies,
    indicadoresFinales: {
      biodiversity: r1(ind.biodiversity),
      foodSecurity: r1(ind.foodSecurity),
      economicSecurity: r1(ind.economicSecurity),
      socialWellbeing: r1(ind.socialWellbeing),
      politicalStability: r1(ind.politicalStability),
      co2: r1(ind.co2EqEmissionsPerCapita),
    },
    seed: session.seed,
  };
}

export function saveSummary(s: GameSummary): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
}

export function loadSummary(now: number = Date.now()): GameSummary | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameSummary;
    if (typeof s?.savedAt !== 'number' || now - s.savedAt > TTL_MS) return null;
    return s;
  } catch {
    return null;
  }
}

type SummaryFields = Pick<TerritorioFeedbackRow,
  'partida_estado' | 'resultado' | 'ruta_lograda' | 'ruta_cercana' | 'ruta_cercana_progreso' | 'pisos_cumplidos'
  | 'anio_alcanzado' | 'meses_jugados' | 'situaciones_resueltas' | 'situaciones_vencidas' | 'areas_declaradas'
  | 'politicas_activas' | 'indicadores_finales' | 'seed'>;

export function toRowFields(s: GameSummary | null): SummaryFields {
  if (!s) {
    return {
      partida_estado: 'sin_partida', resultado: null, ruta_lograda: null, ruta_cercana: null, ruta_cercana_progreso: null,
      pisos_cumplidos: null, anio_alcanzado: null, meses_jugados: null, situaciones_resueltas: null,
      situaciones_vencidas: null, areas_declaradas: null, politicas_activas: null, indicadores_finales: null, seed: null,
    };
  }
  return {
    partida_estado: s.estado,
    resultado: s.resultado,
    ruta_lograda: s.rutaLograda,
    ruta_cercana: s.rutaCercana,
    ruta_cercana_progreso: s.rutaCercanaProgreso,
    pisos_cumplidos: s.pisosCumplidos,
    anio_alcanzado: s.anioAlcanzado,
    meses_jugados: s.mesesJugados,
    situaciones_resueltas: s.situacionesResueltas,
    situaciones_vencidas: s.situacionesVencidas,
    areas_declaradas: s.areasDeclaradas,
    politicas_activas: s.politicasActivas.slice(0, 12),
    indicadores_finales: s.indicadoresFinales,
    seed: s.seed,
  };
}
