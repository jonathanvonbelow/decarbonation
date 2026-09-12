/**
 * Heads-up display of the Territorio preview: EcoSIM's floating-panel layout (top bar, side rail,
 * dock, indicator strip) rebuilt on DecarboNation's v3 tokens and fed by the model.
 */
import React from 'react';
import { CONTROL_PARAMS } from '../constants';
import { getEventDescription, getEventName, getIndicatorName, getPactName } from '../legacyContent/gameData';
import { canDeclare, productiveCount, publicUseCost, PUBLIC_USES, type ParcelKind, type PublicUse } from '../sim';
import { Sparkline } from '../components/ui/Sparkline';
import { LandUseType } from '../types';
import { fill, useCopy, type Copy } from './copy';
import { HEAT_MODES, type HeatMode } from './heat';
import type { NewsItem } from './news';
import { TOTAL_MONTHS, type MonthSample, type Session } from './session';

export type Speed = 0 | 1 | 4;
export type PanelId = 'policies' | 'finance' | 'routes' | 'news';

const LAND_USE_ORDER: ParcelKind[] = [
  LandUseType.ProtectedNativeForest, LandUseType.UnprotectedNativeForest, LandUseType.ForestPlantations,
  LandUseType.AgroecologicalCrops, LandUseType.ConventionalCrops, LandUseType.GrasslandsPastures, 'fallow',
];

export const SWATCH: Record<string, string> = {
  [LandUseType.ProtectedNativeForest]: 'var(--color-chlorophyll)',
  [LandUseType.UnprotectedNativeForest]: '#3f7a4f',
  [LandUseType.ForestPlantations]: '#7fa36a',
  [LandUseType.AgroecologicalCrops]: 'var(--color-bloom)',
  [LandUseType.ConventionalCrops]: 'var(--color-ochre)',
  [LandUseType.GrasslandsPastures]: '#b9a36a',
  fallow: 'var(--color-ash-dim)',
};

/* ── Top bar ───────────────────────────────────────────────────────────────────────────────── */

export function TopBar({ session, speed, onSpeed, onStep, onExit }: {
  session: Session; speed: Speed; onSpeed: (s: Speed) => void; onStep: () => void; onExit: () => void;
}) {
  const { c, fmt, locale, setLocale, monthName } = useCopy();
  const m = session.game.indicators;
  const running = speed > 0 && !session.pendingEvent && !session.outcome;
  const btn = 'h-10 min-w-10 px-2 text-[13px] transition-colors';
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-2 p-3">
      <div className="pointer-events-auto panel flex items-center gap-3 px-3 py-2">
        <img src="/assets/ecosim/emblem.webp" alt="" className="size-9 object-contain" />
        <div className="min-w-0">
          <p className="font-[var(--font-display)] text-[15px] leading-tight text-bone">{c.brand.name}</p>
          <p className="text-[11px] text-ochre">{c.brand.preview}</p>
        </div>
        <div className="mx-1 h-8 w-px bg-basalt-600" />
        <p className="tnum text-[15px] text-bone" aria-live="polite">
          {monthName(session.month)} {session.game.year}
          {!running && <span className="ml-2 text-[11px] text-ash-dim">{c.hud.paused}</span>}
        </p>
      </div>

      <div className="pointer-events-auto panel flex flex-wrap items-center gap-1 px-2 py-1.5">
        <div className="px-2">
          <p className="label-eyebrow !text-[10px]">{c.hud.reserves}</p>
          <p className={`tnum text-[14px] ${m.treasuryReserves < 0 ? 'text-ember' : 'text-bone'}`}>{fmt.big(m.treasuryReserves)}</p>
        </div>
        <div className="px-2">
          <p className="label-eyebrow !text-[10px]">{c.hud.score}</p>
          <p className="tnum text-[14px] text-bone">{fmt.big(m.generalScore)}</p>
        </div>
        <div className="ml-1 flex overflow-hidden rounded-md border border-basalt-600" role="group">
          <button type="button" className={`${btn} ${speed === 0 ? 'bg-basalt-600 text-bone' : 'text-ash hover:text-bone'}`} onClick={() => onSpeed(0)} aria-pressed={speed === 0} aria-label={c.hud.pause} title={c.hud.pause}>❚❚</button>
          <button type="button" className={`${btn} ${speed === 1 ? 'bg-basalt-600 text-bone' : 'text-ash hover:text-bone'}`} onClick={() => onSpeed(1)} aria-pressed={speed === 1} aria-label={c.hud.play} title={c.hud.play}>▶</button>
          <button type="button" className={`${btn} ${speed === 4 ? 'bg-basalt-600 text-bone' : 'text-ash hover:text-bone'}`} onClick={() => onSpeed(4)} aria-pressed={speed === 4} title={c.hud.fast}>{c.hud.fast}</button>
          <button type="button" className={`${btn} border-l border-basalt-600 text-ash hover:text-bone disabled:opacity-40`} onClick={onStep} disabled={running} aria-label={c.hud.step} title={c.hud.step}>+1</button>
        </div>
        <button type="button" className="h-10 px-2 text-[13px] text-ash hover:text-bone" onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}>{c.hud.language}</button>
        <button type="button" className="h-10 px-2 text-[13px] text-ash hover:text-bone" onClick={onExit}>{c.hud.exit}</button>
      </div>
    </header>
  );
}

/* ── Indicators ────────────────────────────────────────────────────────────────────────────── */

type IndicatorKey = keyof Omit<MonthSample, 't' | 'score'>;
const INDICATORS: { key: IndicatorKey; name: string; color: string; lowerIsBetter?: boolean; bounded: boolean }[] = [
  { key: 'co2', name: 'co2EqEmissionsPerCapita', color: 'var(--color-ember)', lowerIsBetter: true, bounded: false },
  { key: 'biodiversity', name: 'biodiversity', color: 'var(--color-chlorophyll)', bounded: true },
  { key: 'foodSecurity', name: 'foodSecurity', color: 'var(--color-ochre)', bounded: true },
  { key: 'economicSecurity', name: 'economicSecurity', color: 'var(--color-hydro)', bounded: true },
  { key: 'socialWellbeing', name: 'socialWellbeing', color: 'var(--color-bloom)', bounded: true },
  { key: 'politicalStability', name: 'politicalStability', color: 'var(--color-indigo-ink)', bounded: true },
];

export function IndicatorStrip({ session }: { session: Session }) {
  const { locale, fmt, signed } = useCopy();
  const h = session.history;
  const now = h[h.length - 1];
  const yearAgo = h[Math.max(0, h.length - 13)];
  const recent = h.slice(-36);
  return (
    <div className="pointer-events-auto panel grid grid-cols-3 gap-1 p-2 md:grid-cols-6">
      {INDICATORS.map((ind) => {
        const value = now[ind.key];
        const delta = value - yearAgo[ind.key];
        const good = ind.lowerIsBetter ? delta < 0 : delta > 0;
        const flat = Math.abs(delta) < 0.05;
        return (
          <div key={ind.key} className="flex min-w-0 flex-col gap-1 rounded-md px-2 py-1.5">
            <span className="truncate text-[11px] uppercase tracking-wide text-ash-dim" title={getIndicatorName(ind.name, locale)}>
              {getIndicatorName(ind.name, locale)}
            </span>
            <span className="flex items-baseline gap-2">
              <span className="tnum text-[17px] text-bone">{fmt.num(value, 1)}</span>
              <span className={`tnum text-[11px] ${flat ? 'text-ash-dim' : good ? 'text-chlorophyll' : 'text-ember'}`}>
                {flat ? '·' : signed(delta)}
              </span>
            </span>
            {ind.bounded ? (
              <span className="h-1 overflow-hidden rounded-full bg-basalt-700">
                <span className="block h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: ind.color }} />
              </span>
            ) : (
              <Sparkline values={recent.map((s) => s[ind.key])} width={96} height={10} stroke={ind.color} className="w-full" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Left rail: tool, overlays, legend ─────────────────────────────────────────────────────── */

export const USE_ICON: Record<PublicUse, string> = {
  protected: '⛨',
  restoration: '🌱',
  wetland: '💧',
  energy: '⚡',
};

export function LeftRail({ session, tool, onTool, heat, onHeat }: {
  session: Session; tool: PublicUse | null; onTool: (t: PublicUse | null) => void; heat: HeatMode; onHeat: (h: HeatMode) => void;
}) {
  const { c, fmt } = useCopy();
  const counts = new Map<string, number>();
  session.territory.parcels.forEach((p) => counts.set(p.kind, (counts.get(p.kind) ?? 0) + 1));
  const modelArea = (Object.values(session.game.landUses) as { area: number }[]).reduce((sum, lu) => sum + lu.area, 0);
  const fallowKHa = Math.max(0, productiveCount(session.territory) * session.territory.kHaPerParcel - modelArea);
  return (
    <div className="pointer-events-auto flex w-full flex-col gap-2 md:w-60">
      {/* Public uses: the only direct change the player makes to the map (21_fusion_ecosim.md §5). */}
      <div className="panel p-2">
        <p className="label-eyebrow mb-1 px-1 !text-[11px]">{c.tools.title}</p>
        <div className="grid grid-cols-2 gap-1 md:grid-cols-1">
          {PUBLIC_USES.map((use) => {
            const useCost = publicUseCost(use, CONTROL_PARAMS);
            const affordable = session.game.stellaSpecificState.Reservas_del_Tesoro >= useCost;
            const anywhere = session.territory.parcels.some((p) => canDeclare(session.territory, p.x, p.y, use));
            return (
              <button
                key={use}
                type="button"
                onClick={() => onTool(tool === use ? null : use)}
                aria-pressed={tool === use}
                title={c.uses[use].hint}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
                  tool === use ? 'bg-basalt-600 text-bone' : 'text-ash hover:bg-basalt-800 hover:text-bone'
                } ${affordable && anywhere ? '' : 'opacity-50'}`}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded bg-basalt-700 text-[13px]" aria-hidden>{USE_ICON[use]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px]">{c.uses[use].name}</span>
                  <span className="tnum block text-[11px] text-ash-dim">{fmt.big(useCost)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="panel p-2">
        <p className="label-eyebrow mb-1 px-1 !text-[11px]">{c.heat.title}</p>
        <div className="flex flex-wrap gap-1">
          {HEAT_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onHeat(mode)}
              aria-pressed={heat === mode}
              className={`h-8 rounded px-2 text-[12px] ${heat === mode ? 'bg-basalt-600 text-bone' : 'text-ash hover:bg-basalt-800 hover:text-bone'}`}
            >
              {c.heat[mode]}
            </button>
          ))}
        </div>
        {heat !== 'none' && (
          <p className="mt-2 flex items-center gap-2 px-1 text-[11px] text-ash">
            <span className="size-2.5 rounded-sm bg-chlorophyll" /> {c.heat.good}
            <span className="ml-2 size-2.5 rounded-sm bg-ember" /> {c.heat.bad}
          </p>
        )}
      </div>

      {/* Areas straight from the model (kHa); the map draws them in parcels of 5 kHa. */}
      <div className="panel hidden p-2 md:block">
        <p className="label-eyebrow mb-1 flex justify-between px-1 !text-[11px]"><span>{c.legend.title}</span><span>kHa</span></p>
        <ul className="space-y-0.5">
          {LAND_USE_ORDER.filter((k) => k !== 'fallow' || counts.get('fallow')).map((kind) => (
            <li key={kind} className="flex items-center gap-2 px-1 text-[12px] text-ash">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ background: SWATCH[kind] }} />
              <span className="flex-1 truncate">{c.kinds[kind as keyof Copy['kinds']]}</span>
              <span className="tnum text-bone">
                {kind === 'fallow' ? fmt.num(fallowKHa, 0) : fmt.num(session.game.landUses[kind as LandUseType].area, 0)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ── Dock ──────────────────────────────────────────────────────────────────────────────────── */

const DOCK_ICONS: Record<PanelId, string> = { policies: '⚖', finance: '◎', routes: '⇢', news: '☰' };

export function Dock({ panel, onPanel, unread }: { panel: PanelId | null; onPanel: (p: PanelId) => void; unread: number }) {
  const { c } = useCopy();
  return (
    <nav className="pointer-events-auto flex gap-1 md:flex-col" aria-label="panels">
      {(Object.keys(DOCK_ICONS) as PanelId[]).map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onPanel(id)}
          aria-pressed={panel === id}
          className={`panel relative flex h-10 min-w-10 items-center gap-2 px-3 text-[13px] ${panel === id ? '!border-ash-dim bg-basalt-700 text-bone' : 'text-ash hover:text-bone'}`}
        >
          <span aria-hidden>{DOCK_ICONS[id]}</span>
          <span className="hidden sm:inline">{c.panels[id]}</span>
          {id === 'news' && unread > 0 && (
            <span className="tnum absolute -right-1 -top-1 rounded-full bg-ochre px-1.5 text-[10px] leading-4 text-basalt-950">{unread}</span>
          )}
        </button>
      ))}
    </nav>
  );
}

/* ── Actors ────────────────────────────────────────────────────────────────────────────────── */

export function Actors({ session }: { session: Session }) {
  const { c, fmt } = useCopy();
  const i = session.game.indicators;
  const rows: { img: string; name: string; label: string; value: number; bad: boolean }[] = [
    { img: 'farmer', name: c.actors.farmers, label: c.actors.pressure, value: i.ppAgricola, bad: i.ppAgricola > 70 },
    { img: 'ngo', name: c.actors.environmentalists, label: c.actors.pressure, value: i.ppAmbientalista, bad: i.ppAmbientalista > 70 },
    { img: 'citizen', name: c.actors.citizens, label: c.actors.pressure, value: i.ppSocial, bad: i.ppSocial > 70 },
    { img: 'industry', name: c.actors.industry, label: c.actors.economicSecurity, value: i.economicSecurity, bad: i.economicSecurity < 20 },
  ];
  return (
    <div className="pointer-events-auto panel p-2">
      <p className="label-eyebrow mb-1 px-1 !text-[11px]">{c.actors.title}</p>
      <ul className="grid grid-cols-2 gap-1 md:grid-cols-1">
        {rows.map((r) => (
          <li key={r.img} className="flex items-center gap-2 rounded px-1 py-0.5">
            <img src={`/assets/ecosim/portraits/${r.img}.webp`} alt="" className={`size-9 rounded-md object-cover ${r.bad ? 'ring-2 ring-ember' : ''}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] text-bone">{r.name}</p>
              <p className="flex items-center gap-1.5 text-[11px] text-ash">
                <span className="truncate">{r.label}</span>
                <span className="tnum ml-auto text-bone">{fmt.num(r.value, 0)}</span>
              </p>
              <span className="mt-0.5 block h-1 overflow-hidden rounded-full bg-basalt-700">
                <span className={`block h-full rounded-full ${r.bad ? 'bg-ember' : 'bg-ash'}`} style={{ width: `${Math.max(0, Math.min(100, r.value))}%` }} />
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── News ──────────────────────────────────────────────────────────────────────────────────── */

/** Renders one news item in the active language. */
export function useNewsText() {
  const { c, locale, fmt, signed } = useCopy();
  return (item: NewsItem): { title: string; body?: string } => {
    if (item.text) return { title: item.text };
    if (item.key === 'event' && item.eventId) {
      return { title: getEventName(item.eventId, locale), body: getEventDescription(item.eventId, locale, '') };
    }
    const v = item.values ?? {};
    if (item.key === 'summary') {
      return {
        title: fill(c.news.summary, {
          year: v.year, co2: fmt.num(Number(v.co2), 1), co2Delta: signed(Number(v.co2Delta)),
          bio: fmt.num(Number(v.bio), 1), bioDelta: signed(Number(v.bioDelta)),
        }),
      };
    }
    if (item.key === 'land.generic') {
      const kinds = c.kinds as Record<string, string>;
      return { title: fill(c.news['land.generic'], { n: v.n, from: kinds[String(v.from)] ?? v.from, to: kinds[String(v.to)] ?? v.to }) };
    }
    if (item.key === 'unlock.pact') return { title: fill(c.news['unlock.pact'], { pact: getPactName(String(v.pactId), locale) }) };
    if (item.key === 'declared') return { title: fill(c.news.declared, { cost: fmt.big(Number(v.cost)) }) };
    const template = (c.news as Record<string, string>)[item.key];
    return { title: template ? fill(template, v) : item.key };
  };
}

export const TONE_DOT: Record<NewsItem['tone'], string> = {
  good: 'bg-chlorophyll',
  bad: 'bg-ember',
  neutral: 'bg-ash-dim',
};

export function NewsTicker({ item }: { item: NewsItem | null }) {
  const text = useNewsText();
  const { monthName } = useCopy();
  if (!item) return null;
  const { title } = text(item);
  return (
    <div key={item.id} className="pointer-events-none panel mx-auto flex max-w-xl items-center gap-2 px-3 py-2 text-[13px] text-bone animate-fade-in" role="status" aria-live="polite">
      <span className={`size-2 shrink-0 rounded-full ${TONE_DOT[item.tone]}`} aria-hidden />
      <span className="tnum shrink-0 text-[11px] text-ash-dim">{monthName(item.month)} {item.year}</span>
      <span className="line-clamp-2">{title}</span>
    </div>
  );
}

/* ── Progress ──────────────────────────────────────────────────────────────────────────────── */

export function ProgressRail({ monthIndex }: { monthIndex: number }) {
  const { c } = useCopy();
  const pct = Math.min(100, (monthIndex / TOTAL_MONTHS) * 100);
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1 bg-basalt-800" role="progressbar" aria-label={c.hud.progress} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full bg-chlorophyll/70" style={{ width: `${pct}%` }} />
    </div>
  );
}
