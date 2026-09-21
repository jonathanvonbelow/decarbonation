/**
 * DecarboNito's brain for the Territorio preview (mejora-general/files/21_fusion_ecosim.md §8).
 *
 * Two pure pieces, no React and no network, so both are testable (tests/territorio/advisor.spec.ts):
 *
 *   `territorioContext(session, locale)`  the state of the region, written out for the language
 *                                        model. Everything in it is read from the session — the
 *                                        advisor never invents a number the player cannot verify
 *                                        on screen.
 *   `cueFor(prev, next)`                  at most ONE proactive remark per month, chosen by
 *                                        priority. This is the piece that keeps him useful without
 *                                        making him a nuisance: in a game that runs continuously,
 *                                        an advisor who talks every month is noise.
 *
 * Rules for cues, in the spirit of the preview's "nothing stops the clock" decision:
 *   - a cue never pauses the game and never blocks input; it is a bubble or a notification;
 *   - at most one per month, highest priority wins;
 *   - each cue fires once per game (the caller keeps the `seen` set keyed by `Cue.id`), except
 *     the critical ones, which may repeat because the situation itself is repeating;
 *   - the provider's own budget (2 spontaneous messages per year) still applies on top for
 *     priority <= 1, so a quiet game stays quiet.
 */
import { CONTROL_PARAMS } from '../constants';
import { getPolicyName } from '../legacyContent/gameData';
import { MONTHS_PER_YEAR, publicUseCost, PUBLIC_USES } from '../sim';
import type { ControlParams, PolicyInstrument, PolicyState } from '../types';
import { LandUseType } from '../types';
import type { Language } from '../hooks/useLanguage';
import { INSTRUMENTS_UNLOCK_YEAR, TOTAL_MONTHS } from './calendar';
import { evaluateTerritorio, publicNaturePct, TERRITORIO_FLOORS } from './routes';
import { SITUATION_BY_ID } from './situations';
import { unlocks, type Session } from './session';

/** Anchor ids owned by the preview (registered in hud.tsx / TerritorioApp.tsx). */
export const ANCHOR = {
  indicators: 'terr-indicators',
  policies: 'terr-dock-policies',
  situations: 'terr-dock-situations',
  finance: 'terr-dock-finance',
  routes: 'terr-dock-routes',
  news: 'terr-dock-news',
  tools: 'terr-tools',
  clock: 'terr-clock',
  map: 'terr-map',
} as const;

/* ── Cues ──────────────────────────────────────────────────────────────────────────────────── */

export type CueTone = 'normal' | 'caution' | 'critical' | 'success';

export interface Cue {
  /** Unique per occurrence: the caller shows each id at most once (critical ones excepted). */
  id: string;
  /** Key into the preview dictionary's `advisor.cues`. */
  key: string;
  values?: Record<string, string | number>;
  tone: CueTone;
  priority: 0 | 1 | 2 | 3;
  surface: 'bubble' | 'notification';
  /** Anchor DecarboNito points at while saying it. */
  anchor?: string;
  /** Critical cues may repeat: the danger is still there. */
  repeatable?: boolean;
}

const pct = (n: number) => Math.round(n);
const totalArea = (s: Session) => (Object.values(s.game.landUses) as { area: number }[]).reduce((sum, lu) => sum + lu.area, 0) || 1;
const nativeForestPct = (s: Session) =>
  ((s.game.landUses[LandUseType.UnprotectedNativeForest].area + s.game.landUses[LandUseType.ProtectedNativeForest].area) / totalArea(s)) * 100;

/** Indicators whose collapse ends the game, with the margin at which DecarboNito starts warning. */
const DANGER: { key: 'politicalStability' | 'biodiversity' | 'foodSecurity'; floor: number; warnAt: number }[] = [
  { key: 'politicalStability', floor: 5, warnAt: 15 },
  { key: 'biodiversity', floor: 5, warnAt: 15 },
  { key: 'foodSecurity', floor: 10, warnAt: 20 },
];

/**
 * The one thing DecarboNito says this month, or nothing. Ordered by how much it matters that the
 * player hears it — the first rule that fires wins, so a collapse warning is never crowded out by
 * a remark about the inbox.
 */
export function cueFor(prev: Session, next: Session, CP: ControlParams = CONTROL_PARAMS): Cue | null {
  if (next.outcome) return null;
  const i = next.game.indicators;
  const stella = next.game.stellaSpecificState;
  const year = next.game.year;

  // 1. About to lose. Repeatable: as long as it holds, it is worth saying again.
  for (const d of DANGER) {
    const value = i[d.key];
    if (value <= d.warnAt) {
      return {
        id: `danger-${d.key}-${Math.floor(next.monthIndex / 12)}`,
        key: `danger.${d.key}`,
        values: { value: pct(value), floor: d.floor },
        tone: 'critical', priority: 3, surface: 'bubble', repeatable: true,
        anchor: ANCHOR.indicators,
      };
    }
  }

  // 2. Bankruptcy approaching: the model's own two conditions, before either is met.
  if (stella.Reservas_del_Tesoro < 0 && stella.Deuda > stella.PBI_Real) {
    return {
      id: `danger-debt-${Math.floor(next.monthIndex / 12)}`,
      key: 'danger.debt',
      values: { debt: Math.round(stella.Deuda), reserves: Math.round(stella.Reservas_del_Tesoro) },
      tone: 'critical', priority: 3, surface: 'bubble', repeatable: true,
      anchor: ANCHOR.finance,
    };
  }

  // 3. A governance floor that was holding last month and broke this month.
  const brokenNow = TERRITORIO_FLOORS.filter((f) => f.read(next.game) < f.target);
  const brokenBefore = new Set(TERRITORIO_FLOORS.filter((f) => f.read(prev.game) < f.target).map((f) => f.labelKey));
  const justBroke = brokenNow.find((f) => !brokenBefore.has(f.labelKey));
  if (justBroke) {
    return {
      id: `floor-${justBroke.labelKey}`,
      key: 'floor.broken',
      values: { floor: justBroke.labelKey, value: pct(justBroke.read(next.game)), target: justBroke.target },
      tone: 'caution', priority: 2, surface: 'bubble', anchor: ANCHOR.routes,
    };
  }

  // 4. The model's own random event. It arrived as a note; he says what it means.
  if (next.lastEvent && next.lastEvent.id !== prev.lastEvent?.id) {
    return {
      id: `event-${next.lastEvent.id}-${next.monthIndex}`,
      key: 'event.arrived',
      // The name is resolved by the caller (bilingual, by event id, in legacyContent/gameData).
      values: { event: next.lastEvent.id },
      tone: next.lastEvent.type === 'positive' ? 'success' : 'caution',
      priority: 2, surface: 'notification', anchor: ANCHOR.news,
    };
  }

  // 5. Something on the desk is about to resolve itself the way nobody chose.
  const expiring = next.open
    .filter((o) => o.expiresAt - next.monthIndex <= 2)
    .sort((a, b) => a.expiresAt - b.expiresAt)[0];
  if (expiring && SITUATION_BY_ID[expiring.defId]) {
    return {
      id: `expiring-${expiring.id}`,
      key: 'inbox.expiring',
      values: { situation: expiring.defId, n: Math.max(1, expiring.expiresAt - next.monthIndex) },
      tone: 'caution', priority: 2, surface: 'notification', anchor: ANCHOR.situations,
    };
  }

  // 6. A mechanic just became available.
  const before = unlocks(prev, CP);
  const after = unlocks(next, CP);
  if (!before.instruments && after.instruments) {
    return { id: 'unlock-instruments', key: 'unlock.instruments', values: { year: INSTRUMENTS_UNLOCK_YEAR }, tone: 'normal', priority: 2, surface: 'bubble', anchor: ANCHOR.policies };
  }
  if (!before.finance && after.finance) {
    return { id: 'unlock-finance', key: 'unlock.finance', values: { year: CP.Ano_Activacion_Prestamo }, tone: 'normal', priority: 2, surface: 'bubble', anchor: ANCHOR.finance };
  }

  // 7. The inbox is winning. Wear is the mechanic players notice last, so name it.
  if (next.open.length >= 4) {
    return {
      id: `inbox-${next.open.length}`,
      key: 'inbox.piling',
      values: { n: next.open.length, wear: Math.round(next.wearTotal) },
      tone: 'caution', priority: 1, surface: 'bubble', anchor: ANCHOR.situations,
    };
  }

  // 8. Governing without policies. Only worth saying once the first year is gone.
  const activePolicies = (Object.values(next.game.policies) as PolicyState[]).filter((p) => p.isActive);
  if (activePolicies.length === 0 && next.monthIndex >= MONTHS_PER_YEAR) {
    return { id: 'idle-policies', key: 'idle.policies', tone: 'normal', priority: 1, surface: 'bubble', anchor: ANCHOR.policies };
  }

  // 9. Native forest thinning out. Measured on the land uses (not the history samples, which carry
  //    indicators only): below 18% of the territory and still falling this month.
  const forestNow = nativeForestPct(next);
  if (forestNow < 18 && forestNow < nativeForestPct({ ...next, game: prev.game })) {
    return {
      id: `deforestation-${Math.floor(forestNow)}`,
      key: 'trend.deforestation',
      values: { forest: pct(forestNow) },
      tone: 'caution', priority: 1, surface: 'bubble', anchor: ANCHOR.tools,
    };
  }

  // 10. A route is within reach with time still on the clock: say which one, and what is missing.
  const monthsLeft = TOTAL_MONTHS - next.monthIndex;
  if (monthsLeft <= MONTHS_PER_YEAR * 8 && monthsLeft > 0) {
    const outcome = evaluateTerritorio(next.game, { ...next.game, indicators: next.game.levelBaseline });
    const best = outcome.closest;
    if (!outcome.won && best.progress >= 0.75) {
      const missing = best.conditions.find((c) => !c.met);
      if (missing) {
        return {
          id: `route-${best.route.id}-${Math.floor(next.monthIndex / 12)}`,
          key: 'route.close',
          values: {
            route: best.route.nameKey, condition: missing.condition.labelKey,
            value: Math.round(missing.value * 10) / 10, target: missing.condition.target,
            years: Math.max(1, Math.round(monthsLeft / MONTHS_PER_YEAR)),
          },
          tone: 'success', priority: 1, surface: 'bubble', anchor: ANCHOR.routes,
        };
      }
    }
  }

  // 11. Never declared a public use, with money in the bank: the one direct lever he can point at.
  const cheapest = Math.min(...PUBLIC_USES.map((u) => publicUseCost(u, CP)));
  if (next.declaredCount === 0 && next.monthIndex >= MONTHS_PER_YEAR * 2 && stella.Reservas_del_Tesoro > cheapest * 3) {
    return { id: 'idle-declare', key: 'idle.declare', values: { cost: Math.round(cheapest) }, tone: 'normal', priority: 1, surface: 'bubble', anchor: ANCHOR.tools };
  }

  return null;
}

/* ── Context for the language model ────────────────────────────────────────────────────────── */

const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * The region, written out for the model. Always in Spanish regardless of the player's language —
 * the reply language is enforced separately by the system instruction, and keeping one context
 * language keeps the prompt stable and the behaviour reproducible.
 */
export function territorioContext(s: Session, locale: Language = 'es'): string {
  const g = s.game;
  const i = g.indicators;
  const stella = g.stellaSpecificState;
  const area = totalArea(s);
  const outcome = evaluateTerritorio(g, { ...g, indicators: g.levelBaseline });
  const u = unlocks(s);
  const L: string[] = [];

  L.push('--- ESTADO DE LA REGIÓN ---');
  L.push(`Fecha: ${MONTH_NAMES[s.month]} de ${g.year}. Partida: mes ${s.monthIndex} de ${TOTAL_MONTHS} (termina en 2054).`);
  L.push('');
  L.push('**Indicadores (0-100 salvo CO2):**');
  L.push(`- Biodiversidad: ${i.biodiversity.toFixed(1)}`);
  L.push(`- CO2eq per cápita: ${i.co2EqEmissionsPerCapita.toFixed(2)} t (más bajo es mejor)`);
  L.push(`- Seguridad alimentaria: ${i.foodSecurity.toFixed(1)}`);
  L.push(`- Seguridad económica: ${i.economicSecurity.toFixed(1)}`);
  L.push(`- Bienestar social: ${i.socialWellbeing.toFixed(1)}`);
  L.push(`- Estabilidad política: ${i.politicalStability.toFixed(1)}`);
  L.push(`- Puntaje general: ${i.generalScore.toFixed(0)}`);
  L.push('');
  L.push('**Presiones sectoriales (0-100, alto = más presión sobre el gobierno):**');
  L.push(`- Agrícola: ${i.ppAgricola.toFixed(0)} | Ambientalista: ${i.ppAmbientalista.toFixed(0)} | Social: ${i.ppSocial.toFixed(0)}`);
  L.push('');
  L.push('**Finanzas:**');
  L.push(`- Reservas del tesoro: ${Math.round(stella.Reservas_del_Tesoro)} | Deuda: ${Math.round(stella.Deuda)} | PBI real: ${Math.round(stella.PBI_Real)}`);
  L.push(`- Presión fiscal adicional: ${g.additionalTaxPressurePercentage}%`);
  L.push('');
  L.push(`**Uso del suelo (total ${Math.round(area)} kHa):**`);
  (Object.keys(g.landUses) as LandUseType[]).forEach((k) => {
    const lu = g.landUses[k];
    if (lu.area <= 0) return;
    L.push(`- ${k}: ${Math.round(lu.area)} kHa (${((lu.area / area) * 100).toFixed(1)}%)`);
  });
  L.push(`- Naturaleza bajo protección pública (protegido + humedal + restauración): ${publicNaturePct(g).toFixed(1)}%`);
  L.push(`- Parcelas declaradas por el jugador: ${s.declaredCount}`);
  L.push('');

  const active = (Object.values(g.policies) as PolicyState[]).filter((p) => p.isActive);
  L.push(`**Políticas activas (${active.length} de 5 posibles):**`);
  if (active.length === 0) L.push('- Ninguna.');
  active.forEach((p) => {
    const instruments = p.instruments
      ? (Object.values(p.instruments) as PolicyInstrument[]).filter((x) => x.effortPercentage > 0).map((x) => `${x.name} ${x.effortPercentage}%`).join(', ')
      : '';
    L.push(`- ${getPolicyName(p.id, locale)} (eficiencia ${((p.currentEfficiency ?? 1) * 100).toFixed(0)}%${instruments ? `; esfuerzo: ${instruments}` : ''})`);
  });
  L.push('');

  const activePacts = Object.values(g.pacts).filter((p) => p.isActive);
  L.push(`**Pactos internacionales:** ${activePacts.length > 0 ? activePacts.map((p) => p.name).join(', ') : 'ninguno activo'}.`);
  L.push('');

  L.push('**Escritorio (situaciones sin resolver):**');
  if (s.open.length === 0) L.push('- Vacío.');
  s.open.forEach((o) => {
    const def = SITUATION_BY_ID[o.defId];
    L.push(`- ${def ? def.id : o.defId}: vence en ${Math.max(0, o.expiresAt - s.monthIndex)} meses. Desgaste acumulado: ${o.worn.toFixed(1)}`);
  });
  L.push(`Desgaste total acumulado por el escritorio: ${Math.round(s.wearTotal)}. Resueltas: ${s.resolvedCount}. Vencidas sin decidir: ${s.expiredCount}.`);
  L.push('');

  L.push('**Rutas de victoria (hay que cumplir los mínimos de gobernabilidad y UNA ruta completa):**');
  outcome.failedFloors.forEach((f) => L.push(`- MÍNIMO INCUMPLIDO: ${f.labelKey} (objetivo ${f.target})`));
  if (outcome.failedFloors.length === 0) L.push('- Todos los mínimos de gobernabilidad se cumplen.');
  outcome.routes.forEach((r) => {
    const missing = r.conditions.filter((c) => !c.met).map((c) => `${c.condition.labelKey} ${Math.round(c.value * 10) / 10}/${c.condition.target}`);
    L.push(`- ${r.route.id}: ${Math.round(r.progress * 100)}% ${missing.length === 0 ? '(completa)' : `— falta: ${missing.join(', ')}`}`);
  });
  L.push('');

  L.push('**Qué puede hacer el jugador AHORA:**');
  L.push('- Activar o desactivar políticas (máximo 5 activas; 5 años de permanencia mínima).');
  L.push(u.instruments ? '- Repartir el esfuerzo entre los instrumentos de cada política activa.' : `- (Instrumentos disponibles desde ${INSTRUMENTS_UNLOCK_YEAR}.)`);
  L.push(u.finance ? '- Pedir préstamos y ajustar la presión fiscal adicional.' : `- (Préstamos y presión fiscal desde ${CONTROL_PARAMS.Ano_Activacion_Prestamo}.)`);
  L.push('- Declarar usos públicos sobre el mapa, por lotes de 5 kHa (50 parcelas de 1 km²): área protegida, restauración, humedal o parque energético. Es la ÚNICA forma de cambiar el uso del suelo a mano; todo lo demás sale de la dinámica del modelo.');
  L.push('- Decidir las situaciones del escritorio. El tiempo no se detiene: lo que no se decide, se decide solo y peor.');
  L.push('--- FIN DEL ESTADO ---');
  return L.join('\n');
}
