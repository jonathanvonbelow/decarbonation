/**
 * Side panels, parcel card and event card of the Territorio preview.
 */
import React, { useState } from 'react';
import { CONTROL_PARAMS, MAX_ACTIVE_POLICIES, POLICY_LOCK_IN_DURATION, POLICY_UI_ORDER } from '../constants';
import { getInstrumentName, getPactName, getPolicyName } from '../legacyContent/gameData';
import { parcelAt, protectedAreaCost, isProductive } from '../sim';
import { WinRoutesPanel } from '../components/game/WinRoutesPanel';
import { EffortSlider } from '../components/ui/EffortSlider';
import { Button } from '../components/ui/Button';
import type { Pact, Policy, PolicyInstrument, PolicyState, RandomEvent } from '../types';
import { LandUseType } from '../types';
import { fill, useCopy, type Copy } from './copy';
import { rawCoefficient } from './heat';
import { TONE_DOT, useNewsText, type PanelId } from './hud';
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

export function PoliciesPanel({ session, onToggle, onEffort }: {
  session: Session;
  onToggle: (id: Policy) => void;
  onEffort: (id: Policy, instrumentId: string, value: number) => void;
}) {
  const { c, locale, fmt } = useCopy();
  const [open, setOpen] = useState<Policy | null>(null);
  const instrumentsOpen = unlocks(session).instruments;
  const activeCount = (Object.values(session.game.policies) as PolicyState[]).filter((p) => p.isActive).length;
  return (
    <div className="space-y-2">
      <p className="px-1 text-[12px] text-ash">
        {fill(c.policies.subtitle, { max: MAX_ACTIVE_POLICIES, years: POLICY_LOCK_IN_DURATION })}
        <span className="tnum ml-2 text-bone">{activeCount}/{MAX_ACTIVE_POLICIES}</span>
      </p>
      {POLICY_UI_ORDER.map((id) => {
        const p = session.game.policies[id];
        const lockedUntil = p.isActive && p.activationYear !== undefined ? p.activationYear + POLICY_LOCK_IN_DURATION : null;
        const locked = lockedUntil !== null && session.game.year < lockedUntil;
        const instruments = p.instruments ? (Object.values(p.instruments) as PolicyInstrument[]) : [];
        const used = instruments.reduce((s, i) => s + i.effortPercentage, 0);
        return (
          <div key={id} className={`rounded-md border p-3 ${p.isActive ? 'border-chlorophyll/50 bg-basalt-800' : 'border-basalt-700'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[14px] text-bone">{getPolicyName(id, locale)}</p>
                {p.isActive && (
                  <p className="tnum text-[11px] text-ash">
                    {fill(c.policies.efficiency, { pct: fmt.pct((p.currentEfficiency ?? 0) * 100, 0) })}
                    {locked && <span className="ml-2">· {fill(c.policies.lockedUntil, { year: lockedUntil! })}</span>}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant={p.isActive ? 'ghost' : 'primary'}
                onClick={() => onToggle(id)}
                disabled={p.isActive && locked}
              >
                {p.isActive ? c.policies.deactivate : c.policies.activate}
              </Button>
            </div>
            {p.isActive && instruments.length > 0 && (
              <div className="mt-2">
                <button type="button" className="text-[12px] text-hydro hover:underline" onClick={() => setOpen(open === id ? null : id)} aria-expanded={open === id}>
                  {c.policies.effortTitle} {open === id ? '▴' : '▾'}
                </button>
                {open === id && (
                  instrumentsOpen ? (
                    <div className="mt-2 space-y-3">
                      {instruments.map((inst) => (
                        <EffortSlider
                          key={inst.id}
                          id={`eff-${inst.id}`}
                          label={getInstrumentName(inst.id, locale)}
                          value={inst.effortPercentage}
                          remaining={100 - used}
                          onChange={(v) => onEffort(id, inst.id, v)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-[12px] text-ash">{fill(c.policies.instrumentsLocked, { year: INSTRUMENTS_UNLOCK_YEAR })}</p>
                  )
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

export function RoutesPanel({ session }: { session: Session }) {
  const { c } = useCopy();
  return (
    <div>
      <p className="mb-2 px-1 text-[12px] text-ash">{c.routes.title}</p>
      <WinRoutesPanel gameState={session.game} />
    </div>
  );
}

export function NewsPanel({ session }: { session: Session }) {
  const { c, monthName } = useCopy();
  const text = useNewsText();
  if (session.news.length === 0) return <p className="px-1 text-[13px] text-ash">{c.news.empty}</p>;
  return (
    <ol className="space-y-2">
      {session.news.map((item) => {
        const { title, body } = text(item);
        return (
          <li key={item.id} className="flex gap-2 rounded-md bg-basalt-800 px-3 py-2">
            <span className={`mt-1.5 size-2 shrink-0 rounded-full ${TONE_DOT[item.tone]}`} aria-hidden />
            <div className="min-w-0">
              <p className="tnum text-[11px] text-ash-dim">{monthName(item.month)} {item.year}</p>
              <p className="text-[13px] text-bone">{title}</p>
              {body && <p className="mt-0.5 text-[12px] text-ash">{body}</p>}
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

export function ParcelCard({ session, at, onProtect, onClose }: {
  session: Session; at: { x: number; y: number }; onProtect: () => void; onClose: () => void;
}) {
  const { c, fmt } = useCopy();
  const parcel = parcelAt(session.territory, at.x, at.y);
  if (!parcel) return null;
  const kind = parcel.kind;
  const lu = LAND_USES.includes(kind as LandUseType) ? (kind as LandUseType) : null;
  const hint = (c.kindHints as Record<string, string>)[kind] ?? c.kindHints.context;
  const carbon = lu ? rawCoefficient('carbon', lu, session.game.landUses) : 0;
  const cost = protectedAreaCost(CONTROL_PARAMS);
  return (
    <div className="pointer-events-auto panel w-full p-3 md:w-72" role="dialog" aria-label={c.kinds[kind as keyof Copy['kinds']]}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[15px] text-bone">{c.kinds[kind as keyof Copy['kinds']]}</p>
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
      {kind === LandUseType.UnprotectedNativeForest && (
        <Button size="sm" variant="primary" className="mt-3 w-full" onClick={onProtect}>
          {fill(c.parcel.protect, { cost: fmt.big(cost) })}
        </Button>
      )}
    </div>
  );
}

/* ── Event card ────────────────────────────────────────────────────────────────────────────── */

const PORTRAIT_FOR_CATEGORY: Record<RandomEvent['category'], string> = {
  environmental: 'farmer',
  economic: 'industry',
  social: 'citizen',
  political: 'ngo',
  technological: 'industry',
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
          <img src={`/assets/ecosim/portraits/${PORTRAIT_FOR_CATEGORY[event.category]}.webp`} alt="" className="size-16 rounded-md object-cover" />
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
