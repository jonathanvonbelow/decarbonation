/**
 * Side panels, parcel card and event card of the Territorio preview.
 */
import React, { useState } from 'react';
import { CONTROL_PARAMS, MAX_ACTIVE_POLICIES, POLICY_LOCK_IN_DURATION, POLICY_UI_ORDER } from '../constants';
import { Line, LineChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import { getIndicatorName, getInstrumentName, getPactName, getPolicyName } from '../legacyContent/gameData';
import { useT, type TranslationKey } from '../i18n';
import { evaluateTerritorio, leadingRouteId } from './routes';
import { artRoute, newsArtUrl, themeForNews, themeForSituationNews } from './newsArt';
import { portraitUrl, type PortraitActor } from './sprites';
import { canDeclare, lotFor, parcelAt, publicUseCost, PUBLIC_USES, isProductive, regionAt, type PublicUse } from '../sim';
import { EffortSlider } from '../components/ui/EffortSlider';
import { Button } from '../components/ui/Button';
import type { Pact, PolicyInstrument, PolicyState, RandomEvent } from '../types';
import { LandUseType, Policy } from '../types';
import { fill, useCopy, type Copy } from './copy';
import { rawCoefficient } from './heat';
import { SITUATION_BY_ID } from './situations';
import { SWATCH, TONE_DOT, useNewsText, type PanelId } from './hud';
import { INSTRUMENTS_UNLOCK_YEAR, maxLoan, unlocks, type Session } from './session';

/* ── Sheet shell ───────────────────────────────────────────────────────────────────────────── */

export function SideSheet({ panel, onClose, children }: { panel: PanelId; onClose: () => void; children: React.ReactNode }) {
  const { c } = useCopy();
  return (
    <aside
      className="pointer-events-auto panel flex max-h-full w-full flex-col overflow-hidden md:w-[380px]"
      aria-label={c.panels[panel]}
    >
      <header className="flex items-center justify-between border-b border-basalt-700 px-4 py-3">
        <h2 className="font-[var(--font-display)] text-[17px] text-bone">{c.panels[panel]}</h2>
        <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded text-ash hover:bg-basalt-800 hover:text-bone" aria-label={c.panels.close}>✕</button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
    </aside>
  );
}

/* ── Policies ──────────────────────────────────────────────────────────────────────────────── */

/**
 * Policy families, in the shape the Grok fusion proposed (combinacion/vAlRAn1GjcMwOEjO-grok-workspace):
 * green and extractive families side by side, filterable, each card carrying its cost, its decay,
 * the trade-off it forces and the instruments underneath. What it shows is this model's data:
 * efficiency and effort come from PolicyState, names and descriptions from legacyContent/gameData.
 */
export const POLICY_STANCE: Record<string, 'green' | 'extractive'> = {
  [Policy.Agroecological]: 'green',
  [Policy.NaturalConservation]: 'green',
  [Policy.SustainableLivestock]: 'green',
  [Policy.SustainableWaterManagement]: 'green',
  [Policy.CarbonNeutrality]: 'green',
  [Policy.IntensiveAgriculture]: 'extractive',
  [Policy.AgriculturalExports]: 'extractive',
  [Policy.ForeignInvestment]: 'extractive',
  [Policy.FlexibleEnvironmentalRegulations]: 'extractive',
  [Policy.EnergySubsidies]: 'extractive',
};

const POLICY_ICON: Record<string, string> = {
  [Policy.Agroecological]: '🌿',
  [Policy.NaturalConservation]: '🌳',
  [Policy.SustainableLivestock]: '🐄',
  [Policy.SustainableWaterManagement]: '💧',
  [Policy.CarbonNeutrality]: '☁',
  [Policy.IntensiveAgriculture]: '🚜',
  [Policy.AgriculturalExports]: '🚢',
  [Policy.ForeignInvestment]: '🌐',
  [Policy.FlexibleEnvironmentalRegulations]: '📄',
  [Policy.EnergySubsidies]: '⛽',
};

type PolicyFilter = 'all' | 'green' | 'extractive' | 'active';

export function PoliciesPanel({ session, onToggle, onEffort }: {
  session: Session;
  onToggle: (id: Policy) => void;
  onEffort: (id: Policy, instrumentId: string, value: number) => void;
}) {
  const { c, locale, fmt } = useCopy();
  const [open, setOpen] = useState<Policy | null>(null);
  const [filter, setFilter] = useState<PolicyFilter>('all');
  const instrumentsOpen = unlocks(session).instruments;
  const activeCount = (Object.values(session.game.policies) as PolicyState[]).filter((p) => p.isActive).length;

  const list = POLICY_UI_ORDER.filter((id) => {
    if (filter === 'active') return session.game.policies[id].isActive;
    if (filter === 'all') return true;
    return POLICY_STANCE[id] === filter;
  });

  return (
    <div className="space-y-2">
      <p className="px-1 text-[12px] text-ash">
        {fill(c.policies.subtitle, { max: MAX_ACTIVE_POLICIES, years: POLICY_LOCK_IN_DURATION })}
        <span className="tnum ml-2 text-bone">{activeCount}/{MAX_ACTIVE_POLICIES}</span>
      </p>
      <div className="flex flex-wrap gap-1 px-1">
        {(['all', 'green', 'extractive', 'active'] as PolicyFilter[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            aria-pressed={filter === id}
            className={`h-7 rounded px-2 text-[12px] ${filter === id ? 'bg-basalt-600 text-bone' : 'bg-basalt-800 text-ash hover:text-bone'}`}
          >
            {c.policies.filters[id]}
          </button>
        ))}
      </div>

      {list.map((id) => {
        const p = session.game.policies[id];
        const stance = POLICY_STANCE[id];
        const lockedUntil = p.isActive && p.activationYear !== undefined ? p.activationYear + POLICY_LOCK_IN_DURATION : null;
        const locked = lockedUntil !== null && session.game.year < lockedUntil;
        const instruments = p.instruments ? (Object.values(p.instruments) as PolicyInstrument[]) : [];
        const used = instruments.reduce((sum, i) => sum + i.effortPercentage, 0);
        const yearsActive = p.isActive && p.activationYear !== undefined ? session.game.year - p.activationYear : 0;
        const expanded = open === id;
        return (
          <div key={id} className={`rounded-md border p-3 ${p.isActive ? 'border-chlorophyll/50 bg-basalt-800' : 'border-basalt-700'}`}>
            <div className="flex items-start gap-2">
              <button type="button" className="flex min-w-0 flex-1 items-start gap-2 text-left" onClick={() => setOpen(expanded ? null : id)} aria-expanded={expanded}>
                <span className={`grid size-8 shrink-0 place-items-center rounded ${stance === 'green' ? 'bg-chlorophyll/15' : 'bg-ochre/15'}`} aria-hidden>
                  {POLICY_ICON[id]}
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] leading-tight text-bone">{getPolicyName(id, locale)}</span>
                  <span className="tnum block text-[11px] text-ash-dim">
                    {fill(c.policies.cost, { pct: fmt.pct(p.costFactor * 100, 1) })}
                    {p.isActive && ` · ${fill(c.policies.efficiency, { pct: fmt.pct((p.currentEfficiency ?? 0) * 100, 0) })}`}
                    {p.isActive && yearsActive > 0 && ` · ${fill(c.policies.years, { n: yearsActive })}`}
                  </span>
                </span>
              </button>
              <Button size="sm" variant={p.isActive ? 'ghost' : 'primary'} onClick={() => onToggle(id)} disabled={p.isActive && locked}>
                {p.isActive ? (locked ? `🔒 ${lockedUntil}` : c.policies.deactivate) : c.policies.activate}
              </Button>
            </div>

            {p.isActive && (
              <span className="mt-2 block h-1 overflow-hidden rounded-full bg-basalt-700">
                <span className="block h-full rounded-full bg-chlorophyll" style={{ width: `${Math.max(0, Math.min(100, (p.currentEfficiency ?? 0) * 100))}%` }} />
              </span>
            )}

            {expanded && (
              <div className="mt-2 space-y-2">
                <p className="text-[12px] leading-relaxed text-ash">{p.description}</p>
                <p className="text-[11px] leading-relaxed text-ochre">
                  <span className="text-ash-dim">{c.policies.tradeoff}: </span>
                  {c.policies.tradeoffs[id as keyof Copy['policies']['tradeoffs']]}
                </p>
                {p.isActive && instruments.length > 0 && (
                  instrumentsOpen ? (
                    <div className="space-y-3 pt-1">
                      <p className="label-eyebrow !text-[10px]">{c.policies.effortTitle}</p>
                      {instruments.map((inst) => (
                        <div key={inst.id}>
                          <EffortSlider
                            id={`eff-${inst.id}`}
                            label={getInstrumentName(inst.id, locale)}
                            value={inst.effortPercentage}
                            remaining={100 - used}
                            onChange={(v) => onEffort(id, inst.id, v)}
                          />
                          <p className="text-[11px] leading-snug text-ash-dim">{inst.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12px] text-ash">{fill(c.policies.instrumentsLocked, { year: INSTRUMENTS_UNLOCK_YEAR })}</p>
                  )
                )}
                {!p.isActive && instruments.length > 0 && (
                  <ul className="space-y-0.5">
                    {instruments.map((inst) => (
                      <li key={inst.id} className="text-[11px] leading-snug text-ash-dim">
                        <span className="text-ash">{getInstrumentName(inst.id, locale)}</span> — {inst.description}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Pacts & finance ───────────────────────────────────────────────────────────────────────── */

export function FinancePanel({ session, onPact, onTax, onLoan }: {
  session: Session; onPact: (id: string) => void; onTax: (pct: number) => void; onLoan: () => void;
}) {
  const { c, locale, fmt } = useCopy();
  const u = unlocks(session);
  const s = session.game.stellaSpecificState;
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-3 gap-2">
        {[
          [c.finance.reserves, s.Reservas_del_Tesoro],
          [c.finance.debt, s.Deuda],
          [c.finance.gdp, s.PBI_Real],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-md bg-basalt-800 px-2 py-2">
            <dt className="text-[11px] text-ash-dim">{label}</dt>
            <dd className={`tnum text-[14px] ${(value as number) < 0 ? 'text-ember' : 'text-bone'}`}>{fmt.big(value as number)}</dd>
          </div>
        ))}
      </dl>

      <section>
        <h3 className="label-eyebrow mb-2 !text-[11px]">{c.finance.pactsTitle}</h3>
        <div className="space-y-2">
          {(Object.values(session.game.pacts) as Pact[]).map((pact) => {
            const open = u.pact(pact.id);
            return (
              <div key={pact.id} className={`rounded-md border p-3 ${pact.isActive ? 'border-hydro/50 bg-basalt-800' : 'border-basalt-700'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[14px] text-bone">{getPactName(pact.id, locale)}</p>
                    <p className="tnum text-[11px] text-ash">
                      {open ? fill(c.finance.annualCost, { cost: fmt.big(pact.annualCost ?? 0) }) : fill(c.finance.availableFrom, { year: pact.unlockYear ?? 0 })}
                    </p>
                  </div>
                  <Button size="sm" variant={pact.isActive ? 'ghost' : 'secondary'} disabled={!open} onClick={() => onPact(pact.id)}>
                    {pact.isActive ? c.finance.leave : fill(c.finance.join, { cost: fmt.big(pact.costToJoin ?? 0) })}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="label-eyebrow mb-2 !text-[11px]">{c.finance.lockedTitle}</h3>
        {!u.finance ? (
          <p className="text-[12px] text-ash">{fill(c.finance.locked, { year: CONTROL_PARAMS.Ano_Activacion_Prestamo })}</p>
        ) : (
          <div className="space-y-3">
            <div>
              <label htmlFor="tax" className="flex justify-between text-[13px] text-bone">
                <span>{c.finance.tax}</span>
                <output htmlFor="tax" className="tnum text-ash">{session.game.additionalTaxPressurePercentage}%</output>
              </label>
              <input
                id="tax" type="range" min={0} max={CONTROL_PARAMS.Max_Additional_Tax_Rate_Percentage} step={1}
                value={session.game.additionalTaxPressurePercentage}
                onChange={(e) => onTax(Number(e.target.value))}
                className="w-full accent-ochre"
              />
              <p className="text-[11px] text-ash">{c.finance.taxHint}</p>
            </div>
            <div>
              <Button size="sm" variant="secondary" onClick={onLoan} disabled={session.game.loanRequestedThisRound > 0}>{c.finance.loan}</Button>
              <p className="tnum mt-1 text-[11px] text-ash">{fill(c.finance.loanMax, { max: fmt.big(maxLoan(session)) })}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/* ── Routes & news ─────────────────────────────────────────────────────────────────────────── */

/**
 * How the game is going: each route's own conditions with target and current value, the land-use
 * shares the map is drawing, the three pressures, and the trajectory so far. The per-condition
 * read comes from the Grok fusion's routes pane; the numbers are this model's `evaluateLevel`.
 */
export function RoutesPanel({ session }: { session: Session }) {
  const { c, locale, fmt } = useCopy();
  const { t: tMain } = useT();
  const t = (key: string) => tMain(key as TranslationKey);
  const outcome = evaluateTerritorio(session.game, { ...session.game, indicators: session.game.levelBaseline });
  const routes = [...outcome.routes].sort((a, b) => b.progress - a.progress);
  const total = (Object.values(session.game.landUses) as { area: number }[]).reduce((sum, lu) => sum + lu.area, 0) || 1;
  const i = session.game.indicators;
  const history = session.history.filter((_, idx) => idx % 3 === 0);

  return (
    <div className="space-y-4">
      <p className="px-1 text-[12px] text-ash">{c.routes.title}</p>

      {!outcome.floorsMet && (
        <p className="rounded border border-ember/40 px-2 py-1 text-[12px] text-ember">
          {t('routes.floorsBroken')}: {outcome.failedFloors.map((f) => t(f.labelKey)).join(', ')}
        </p>
      )}

      {routes.map((rp) => (
        <section key={rp.route.id} className={`rounded-md border p-3 ${rp.met ? 'border-chlorophyll/50' : 'border-basalt-700'}`}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[14px] text-bone">{t(rp.route.nameKey)}</h3>
            <span className={`tnum text-[12px] ${rp.met ? 'text-chlorophyll' : 'text-ash'}`}>{fmt.pct(rp.progress * 100, 0)}</span>
          </div>
          <p className="mt-0.5 text-[11px] text-ash-dim">{t(rp.route.taglineKey)}</p>
          <span className="mt-2 block h-1 overflow-hidden rounded-full bg-basalt-700">
            <span className={`block h-full rounded-full ${rp.met ? 'bg-chlorophyll' : 'bg-hydro'}`} style={{ width: `${rp.progress * 100}%` }} />
          </span>
          <ul className="mt-2 space-y-0.5">
            {rp.conditions.map((cond) => (
              <li key={cond.condition.labelKey} className="flex items-center justify-between gap-2 text-[11px]">
                <span className={cond.met ? 'text-chlorophyll' : 'text-ash'}>
                  {t(cond.condition.labelKey)} {cond.condition.dir === 'min' ? '≥' : '≤'}{' '}
                  {fmt.num(cond.condition.target, Number.isInteger(cond.condition.target) ? 0 : 1)}
                </span>
                <span className={`tnum ${cond.met ? 'text-bone' : 'text-ochre'}`}>{fmt.num(cond.value, 1)}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section>
        <h3 className="label-eyebrow mb-1 !text-[11px]">{c.legend.title}</h3>
        <ul className="space-y-1">
          {(Object.values(LandUseType) as LandUseType[])
            .filter((lu) => session.game.landUses[lu].area > 0)
            .sort((a, b) => session.game.landUses[b].area - session.game.landUses[a].area)
            .map((lu) => {
              const share = (session.game.landUses[lu].area / total) * 100;
              return (
                <li key={lu} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 truncate text-[11px] text-ash">{c.kinds[lu as keyof Copy['kinds']]}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-basalt-700">
                    <span className="block h-full rounded-full" style={{ width: `${share}%`, background: SWATCH[lu] ?? 'var(--color-ash)' }} />
                  </span>
                  <span className="tnum w-10 shrink-0 text-right text-[11px] text-bone">{fmt.pct(share, 0)}</span>
                </li>
              );
            })}
        </ul>
      </section>

      <section>
        <h3 className="label-eyebrow mb-1 !text-[11px]">{c.actors.title}</h3>
        <dl className="grid grid-cols-3 gap-1">
          {[[c.actors.farmers, i.ppAgricola], [c.actors.environmentalists, i.ppAmbientalista], [c.actors.citizens, i.ppSocial]].map(([label, value]) => (
            <div key={label as string} className="rounded bg-basalt-800 px-2 py-1.5">
              <dt className="truncate text-[10px] text-ash-dim">{label}</dt>
              <dd className={`tnum text-[13px] ${(value as number) > 70 ? 'text-ember' : 'text-bone'}`}>{fmt.num(value as number, 0)}</dd>
            </div>
          ))}
        </dl>
      </section>

      {history.length > 3 && (
        <section>
          <h3 className="label-eyebrow mb-1 !text-[11px]">{c.routes.trajectory}</h3>
          <div className="h-32 rounded-md bg-basalt-800 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="t" hide />
                <YAxis hide domain={[0, 100]} />
                <RTooltip
                  contentStyle={{ background: 'var(--color-basalt-900)', border: '1px solid var(--color-basalt-600)', borderRadius: 6, fontSize: 12 }}
                  labelFormatter={(v) => `${c.routes.month} ${v}`}
                  formatter={(value: number, key: string) => [fmt.num(value, 1), getIndicatorName(CHART_KEYS[key] ?? key, locale)]}
                />
                <Line type="monotone" dataKey="biodiversity" stroke="var(--color-chlorophyll)" dot={false} strokeWidth={1.5} />
                <Line type="monotone" dataKey="foodSecurity" stroke="var(--color-ochre)" dot={false} strokeWidth={1.5} />
                <Line type="monotone" dataKey="economicSecurity" stroke="var(--color-hydro)" dot={false} strokeWidth={1.5} />
                <Line type="monotone" dataKey="socialWellbeing" stroke="var(--color-bloom)" dot={false} strokeWidth={1.5} />
                <Line type="monotone" dataKey="politicalStability" stroke="var(--color-indigo-ink)" dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}

const CHART_KEYS: Record<string, string> = {
  biodiversity: 'biodiversity',
  foodSecurity: 'foodSecurity',
  economicSecurity: 'economicSecurity',
  socialWellbeing: 'socialWellbeing',
  politicalStability: 'politicalStability',
};

export function NewsPanel({ session }: { session: Session }) {
  const { c, monthName } = useCopy();
  const text = useNewsText();
  if (session.news.length === 0) return <p className="px-1 text-[13px] text-ash">{c.news.empty}</p>;
  // The photograph follows the route the player is leading (newsArt.ts).
  const route = artRoute(leadingRouteId(session.game, { ...session.game, indicators: session.game.levelBaseline }));
  // A theme has a handful of frames, so two nearby entries about the same thing would show the
  // same photograph twice: in a feed this long, the second one goes back to being a line of text.
  const recent: string[] = [];
  return (
    <ol className="space-y-2">
      {session.news.map((item) => {
        const { title, body } = text(item);
        const theme = themeForNews(item) ?? themeForSituationNews(item, (id) => SITUATION_BY_ID[id]);
        const url = theme ? newsArtUrl(theme, route) : null;
        const show = url && !recent.includes(url);
        if (url) recent.push(url);
        if (recent.length > 4) recent.shift();
        return (
          <li key={item.id} className="overflow-hidden rounded-md bg-basalt-800">
            {show && <img src={url!} alt="" loading="lazy" className="h-24 w-full object-cover" />}
            <div className="flex gap-2 px-3 py-2">
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${TONE_DOT[item.tone]}`} aria-hidden />
              <div className="min-w-0">
                <p className="tnum text-[11px] text-ash-dim">{monthName(item.month)} {item.year}</p>
                <p className="text-[13px] text-bone">{title}</p>
                {body && <p className="mt-0.5 text-[12px] text-ash">{body}</p>}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ── Parcel card ───────────────────────────────────────────────────────────────────────────── */

const LAND_USES = Object.values(LandUseType) as LandUseType[];

function Effect({ label, value }: { label: string; value: number }) {
  const arrows = Math.abs(value) < 0.05 ? '·' : (value > 0 ? '▲' : '▼').repeat(Math.abs(value) >= 0.3 ? 2 : 1);
  return (
    <div className="flex items-center justify-between rounded bg-basalt-800 px-2 py-1 text-[12px]">
      <span className="text-ash">{label}</span>
      <span className={value > 0.05 ? 'text-chlorophyll' : value < -0.05 ? 'text-ember' : 'text-ash-dim'}>{arrows}</span>
    </div>
  );
}

export function ParcelCard({ session, at, onDeclare, onClose }: {
  session: Session; at: { x: number; y: number }; onDeclare: (use: PublicUse) => void; onClose: () => void;
}) {
  const { c, fmt } = useCopy();
  const parcel = parcelAt(session.territory, at.x, at.y);
  if (!parcel) return null;
  const kind = parcel.kind;
  const lu = LAND_USES.includes(kind as LandUseType) ? (kind as LandUseType) : null;
  const hint = (c.kindHints as Record<string, string>)[kind] ?? c.kindHints.context;
  const carbon = lu ? rawCoefficient('carbon', lu, session.game.landUses) : 0;
  const region = regionAt(session.territory, at.x, at.y);
  // What a declaration would actually take here: the lot, its area and its price.
  const lots = PUBLIC_USES
    .filter((use) => canDeclare(session.territory, at.x, at.y, use))
    .map((use) => {
      const cells = lotFor(session.territory, at.x, at.y, use).length;
      return { use, km2: Math.round(cells * session.territory.kHaPerParcel * 10), cost: publicUseCost(use, CONTROL_PARAMS, cells * session.territory.kHaPerParcel) };
    });
  return (
    <div className="pointer-events-auto panel w-full p-3 md:w-72" role="dialog" aria-label={c.kinds[kind as keyof Copy['kinds']]}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[15px] text-bone">{c.kinds[kind as keyof Copy['kinds']]}</p>
          <p className="text-[11px] text-ash-dim">{region ? c.regions[region] : ''}{region ? ' · ' : ''}1 km²</p>
          {parcel.declared && <p className="text-[11px] text-chlorophyll">{c.parcel.declared}</p>}
        </div>
        <button type="button" onClick={onClose} className="grid size-7 place-items-center rounded text-ash hover:text-bone" aria-label={c.parcel.close}>✕</button>
      </div>
      <p className="mt-1 text-[12px] leading-relaxed text-ash">{hint}</p>
      {lu && isProductive(kind) && (
        <div className="mt-2">
          <p className="label-eyebrow mb-1 !text-[10px]">{c.parcel.effectsTitle}</p>
          <div className="grid grid-cols-2 gap-1">
            <div className="col-span-2 flex items-center justify-between rounded bg-basalt-800 px-2 py-1 text-[12px]">
              <span className="text-ash">{c.parcel.carbon}</span>
              <span className={`tnum ${carbon >= 0 ? 'text-chlorophyll' : 'text-ember'}`}>
                {carbon >= 0 ? c.parcel.sink : c.parcel.source} {fmt.num(Math.abs(carbon), 1)}
              </span>
            </div>
            <Effect label={c.parcel.biodiversity} value={rawCoefficient('biodiversity', lu, session.game.landUses)} />
            <Effect label={c.parcel.food} value={rawCoefficient('food', lu, session.game.landUses)} />
            <Effect label={c.parcel.economy} value={rawCoefficient('economy', lu, session.game.landUses)} />
          </div>
        </div>
      )}
      {lots.length > 0 && (
        <div className="mt-3 space-y-1">
          <p className="label-eyebrow !text-[10px]">{c.parcel.declareTitle}</p>
          {lots.map(({ use, km2, cost }) => (
            <Button key={use} size="sm" variant="secondary" className="w-full justify-between" onClick={() => onDeclare(use)}>
              <span>{c.uses[use].name} <span className="tnum text-[11px] text-ash-dim">{km2} km²</span></span>
              <span className="tnum text-[12px] text-ash">{fmt.big(cost)}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Event card ────────────────────────────────────────────────────────────────────────────── */

const PORTRAIT_FOR_CATEGORY: Record<RandomEvent['category'], PortraitActor> = {
  environmental: 'farmer',
  economic: 'investor',
  social: 'citizen',
  political: 'mayor',
  technological: 'scientist',
};

export function EventCard({ event, year, month, onContinue }: { event: RandomEvent; year: number; month: number; onContinue: () => void }) {
  const { c, locale, monthName } = useCopy();
  const text = useNewsText();
  const tone = event.type === 'positive' ? 'good' : event.type === 'negative' ? 'bad' : 'neutral';
  const { title, body } = text({ id: event.id, monthIndex: 0, year, month, kind: 'event', tone, key: 'event', eventId: event.id });
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-end justify-center bg-basalt-950/60 p-3 md:items-center" role="dialog" aria-modal="true" aria-labelledby="event-title">
      <div className="panel w-full max-w-lg p-5 animate-fade-in-scale-up" lang={locale}>
        <div className="flex gap-3">
          <img src={portraitUrl(PORTRAIT_FOR_CATEGORY[event.category], event.id)} alt="" className="size-16 rounded-md object-cover" />
          <div className="min-w-0">
            <p className="label-eyebrow !text-[11px]">
              {fill(c.event.eyebrow, { date: `${monthName(month)} ${year}` })} · <span className={tone === 'good' ? 'text-chlorophyll' : tone === 'bad' ? 'text-ember' : 'text-ash'}>{c.event[tone]}</span>
            </p>
            <h2 id="event-title" className="font-[var(--font-display)] text-[21px] leading-tight text-bone">{title}</h2>
          </div>
        </div>
        {body && <p className="mt-4 text-[14px] leading-relaxed text-ash">{body}</p>}
        <Button variant="primary" className="mt-5 w-full" onClick={onContinue} autoFocus>{c.event.continue}</Button>
      </div>
    </div>
  );
}
