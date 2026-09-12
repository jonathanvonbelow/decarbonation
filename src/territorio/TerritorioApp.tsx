/**
 * Root of the Territorio preview (territorio.html → /territorio). Owns the session and the monthly
 * clock; every rule lives in session.ts, every picture in IsoMap/hud/panels.
 *
 * Clock: EcoSIM's real-time loop (pause / ×1 / ×4, 1.6 s or 0.4 s per month), stopped while an
 * event card is open or the game is over. Player actions are computed once from the latest state
 * to decide the message, and applied through a functional update so a month that ticks in the
 * same frame is never lost (session functions are pure, re-running them is safe).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CONTROL_PARAMS } from '../constants';
import { publicUseCost, type PublicUse } from '../sim';
import type { Policy } from '../types';
import { fill, useCopy } from './copy';
import type { HeatMode } from './heat';
import { Actors, Dock, IndicatorStrip, LeftRail, NewsTicker, ProgressRail, TopBar, type PanelId, type Speed } from './hud';
import { IsoMap } from './IsoMap';
import type { NewsItem } from './news';
import { EventCard, FinancePanel, NewsPanel, ParcelCard, PoliciesPanel, RoutesPanel, SideSheet } from './panels';
import { BriefingScreen, EndScreen, TitleScreen } from './screens';
import {
  advanceMonth, createSession, declareUse, dismissEvent, maxLoan, requestLoan, setInstrumentEffort, setTaxPressure,
  togglePact, togglePolicy, type ActionResult, type Session,
} from './session';

type Screen = 'title' | 'briefing' | 'play';
const SECONDS_PER_MONTH: Record<Exclude<Speed, 0>, number> = { 1: 1.6, 4: 0.4 };
const newSeed = () => Math.floor(Math.random() * 1e9);

export function TerritorioApp() {
  const { c, locale, fmt } = useCopy();
  const [screen, setScreen] = useState<Screen>('title');
  const [session, setSession] = useState<Session>(() => createSession(newSeed()));
  const [speed, setSpeed] = useState<Speed>(0);
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [heat, setHeat] = useState<HeatMode>('none');
  const [tool, setTool] = useState<PublicUse | null>(null);
  const [selected, setSelected] = useState<{ x: number; y: number } | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: 'good' | 'bad' } | null>(null);
  const [ticker, setTicker] = useState<NewsItem | null>(null);
  const [newsSeenAt, setNewsSeenAt] = useState(0);

  const sessionRef = useRef(session);
  sessionRef.current = session;
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    document.title = c.brand.name;
  }, [c.brand.name]);

  // Monthly clock. A timer measuring real time, not requestAnimationFrame: rAF stops entirely in a
  // hidden tab, which would tie the game's calendar to whether frames are being painted.
  useEffect(() => {
    if (screen !== 'play') return undefined;
    let last = performance.now();
    let acc = 0;
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(1, (now - last) / 1000);
      last = now;
      const s = sessionRef.current;
      const sp = speedRef.current;
      if (sp > 0 && !s.pendingEvent && !s.outcome) {
        acc += dt;
        if (acc >= SECONDS_PER_MONTH[sp]) {
          acc = 0;
          setSession((prev) => advanceMonth(prev, CONTROL_PARAMS, locale));
        }
      } else {
        acc = 0;
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [screen, locale]);

  // Leaving the tab pauses the game: in a classroom, nobody should come back to find years gone.
  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'hidden') setSpeed(0); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Latest headline → ticker for a few seconds.
  const latest = session.news[0];
  useEffect(() => {
    if (!latest) return undefined;
    setTicker(latest);
    const id = window.setTimeout(() => setTicker(null), 4500);
    return () => window.clearTimeout(id);
  }, [latest?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (panel === 'news') setNewsSeenAt(session.monthIndex + 1);
  }, [panel, session.monthIndex]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const errorText = useCallback((r: ActionResult) => {
    const detail = { ...r.detail };
    if (typeof detail.cost === 'number') detail.cost = fmt.big(detail.cost);
    return fill(c.errors[r.error!], detail);
  }, [c, fmt]);

  const run = useCallback((fn: (s: Session) => ActionResult, okText?: (r: ActionResult) => string) => {
    const r = fn(sessionRef.current);
    if (r.error) {
      setToast({ text: errorText(r), tone: 'bad' });
      return;
    }
    setSession((prev) => fn(prev).session);
    if (okText) setToast({ text: okText(r), tone: 'good' });
  }, [errorText]);

  const startGame = useCallback(() => {
    setSession(createSession(newSeed()));
    setSpeed(0);
    setPanel(null);
    setTool(null);
    setSelected(null);
    setHeat('none');
    setNewsSeenAt(0);
    setScreen('play');
  }, []);

  const onParcel = useCallback((x: number, y: number) => {
    if (tool) {
      run((s) => declareUse(s, x, y, tool), (r) => fill(c.news.declared, { use: c.uses[tool].name, cost: fmt.big(Number(r.detail?.cost ?? 0)) }));
      return;
    }
    setSelected((cur) => (cur && cur.x === x && cur.y === y ? null : { x, y }));
  }, [tool, run, c, fmt]);

  // Keyboard: Space pauses/resumes, Escape backs out of tool → parcel → panel.
  useEffect(() => {
    if (screen !== 'play') return undefined;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setSpeed((sp) => (sp === 0 ? 1 : 0));
      } else if (e.code === 'Escape') {
        if (tool) setTool(null);
        else if (selected) setSelected(null);
        else if (panel) setPanel(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, tool, selected, panel]);

  if (screen === 'title') return <TitleScreen onPlay={startGame} onHowTo={() => setScreen('briefing')} />;
  if (screen === 'briefing') return <BriefingScreen onBegin={startGame} onBack={() => setScreen('title')} />;

  const unread = Math.min(9, session.news.filter((n) => n.monthIndex >= newsSeenAt).length);
  const eventDate = session.pendingEvent
    ? session.news.find((n) => n.kind === 'event' && n.eventId === session.pendingEvent!.id) ?? { year: session.game.year, month: session.month }
    : null;

  const sheet = panel && (
    <SideSheet panel={panel} onClose={() => setPanel(null)}>
      {panel === 'policies' && (
        <PoliciesPanel
          session={session}
          onToggle={(id: Policy) => run((s) => togglePolicy(s, id))}
          onEffort={(id, inst, v) => run((s) => setInstrumentEffort(s, id, inst, v))}
        />
      )}
      {panel === 'finance' && (
        <FinancePanel
          session={session}
          onPact={(id) => run((s) => togglePact(s, id))}
          onTax={(pct) => run((s) => setTaxPressure(s, pct))}
          onLoan={() => run((s) => requestLoan(s, maxLoan(s)), (r) => fill(c.finance.loanRequested, { amount: fmt.big(Number(r.detail?.amount ?? 0)) }))}
        />
      )}
      {panel === 'routes' && <RoutesPanel session={session} />}
      {panel === 'news' && <NewsPanel session={session} />}
    </SideSheet>
  );

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-basalt-950 text-bone">
      <IsoMap
        territory={session.territory}
        landUses={session.game.landUses}
        heat={heat}
        tool={tool}
        selected={selected}
        changes={session.lastChanges}
        onParcel={onParcel}
        label={c.brand.name}
      />

      <TopBar
        session={session}
        speed={speed}
        onSpeed={setSpeed}
        onStep={() => setSession((prev) => advanceMonth(prev, CONTROL_PARAMS, locale))}
        onExit={() => { setSpeed(0); setScreen('title'); }}
      />

      {/* Desktop left column: tool, overlays, legend, then stakeholders. */}
      <div className="pointer-events-none absolute bottom-[8rem] left-3 top-[5.5rem] z-20 hidden flex-col justify-between gap-2 md:flex">
        <LeftRail session={session} tool={tool} onTool={setTool} heat={heat} onHeat={setHeat} />
        <div className="w-60"><Actors session={session} /></div>
      </div>

      {/* Right column: dock and the open panel. */}
      <div className="pointer-events-none absolute bottom-[8rem] left-3 right-3 top-[7.5rem] z-30 flex flex-col items-end gap-2 md:left-auto md:top-[5.5rem] md:flex-row-reverse md:items-start">
        <Dock panel={panel} onPanel={(p) => setPanel((cur) => (cur === p ? null : p))} unread={panel === 'news' ? 0 : unread} />
        {sheet}
      </div>

      {tool && (
        <div className="pointer-events-none absolute left-1/2 top-[7.5rem] z-30 -translate-x-1/2 md:top-[5.5rem]">
          <div className="pointer-events-auto panel flex items-center gap-3 px-3 py-2 text-[13px]">
            <span>{fill(c.tools.declareHint, { use: c.uses[tool].name, where: c.uses[tool].where, cost: fmt.big(publicUseCost(tool, CONTROL_PARAMS)) })}</span>
            <button type="button" className="text-ash hover:text-bone" onClick={() => setTool(null)}>{c.tools.cancel}</button>
          </div>
        </div>
      )}

      {selected && !tool && (
        <div className="pointer-events-none absolute left-3 right-3 top-[7.5rem] z-30 md:left-[17rem] md:right-auto md:top-[5.5rem]">
          <ParcelCard
            session={session}
            at={selected}
            onClose={() => setSelected(null)}
            onDeclare={(use) => run((s) => declareUse(s, selected.x, selected.y, use), (r) => fill(c.news.declared, { use: c.uses[use].name, cost: fmt.big(Number(r.detail?.cost ?? 0)) }))}
          />
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex flex-col gap-2">
        {toast ? (
          <div className={`pointer-events-auto panel mx-auto max-w-xl px-3 py-2 text-[13px] ${toast.tone === 'bad' ? '!border-ember/60 text-ember' : '!border-chlorophyll/60 text-chlorophyll'}`} role="alert">
            {toast.text}
          </div>
        ) : (
          panel !== 'news' && <NewsTicker item={ticker} />
        )}
        <div className="pointer-events-auto md:hidden">
          <LeftRail session={session} tool={tool} onTool={setTool} heat={heat} onHeat={setHeat} />
        </div>
        <div className="mx-auto w-full max-w-5xl">
          <IndicatorStrip session={session} />
        </div>
      </div>

      <ProgressRail monthIndex={session.monthIndex} />

      {session.pendingEvent && eventDate && (
        <EventCard
          event={session.pendingEvent}
          year={eventDate.year}
          month={eventDate.month}
          onContinue={() => setSession((prev) => dismissEvent(prev))}
        />
      )}

      {session.outcome && <EndScreen session={session} onAgain={startGame} onTitle={() => setScreen('title')} />}
    </div>
  );
}
