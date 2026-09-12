/**
 * Full-screen states of the Territorio preview: title, briefing and end of game.
 */
import React from 'react';
import { useT, type TranslationKey } from '../i18n';
import { getIndicatorName } from '../legacyContent/gameData';
import { gameOverKind } from '../sim';
import { Button } from '../components/ui/Button';
import type { Indicators } from '../types';
import { fill, useCopy } from './copy';
import type { Session } from './session';

function LangToggle() {
  const { c, locale, setLocale } = useCopy();
  return (
    <button type="button" className="text-[13px] text-ash hover:text-bone" onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}>
      {c.hud.language}
    </button>
  );
}

export function TitleScreen({ onPlay, onHowTo }: { onPlay: () => void; onHowTo: () => void }) {
  const { c } = useCopy();
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-basalt-950">
      <img src="/assets/ecosim/hero.webp" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-60" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-basalt-950 via-basalt-950/75 to-basalt-950/10" />
      <div className="absolute right-4 top-4 z-10"><LangToggle /></div>
      <main className="relative z-10 flex min-h-dvh flex-col justify-center px-6 py-16 md:px-16">
        <img src="/assets/ecosim/emblem.webp" alt="" className="mb-4 size-14 object-contain md:size-16" />
        <p className="label-eyebrow">{c.title.eyebrow}</p>
        <h1 className="mt-2 font-[var(--font-display)] text-4xl leading-[1.05] text-bone md:text-6xl">{c.brand.name}</h1>
        <p className="mt-2 inline-flex w-fit rounded border border-ochre/50 px-2 py-0.5 text-[12px] text-ochre">{c.brand.preview}</p>
        <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-ash">{c.title.tagline}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" variant="primary" onClick={onPlay}>{c.title.play}</Button>
          <Button size="lg" variant="secondary" onClick={onHowTo}>{c.title.howTo}</Button>
          <a href="/play" className="inline-flex h-12 items-center rounded-md px-6 text-[17px] text-ash hover:bg-basalt-800 hover:text-bone">{c.title.backToMain}</a>
        </div>
        <p className="mt-6 max-w-md text-[12px] text-ash-dim">{c.title.note}</p>
      </main>
    </div>
  );
}

export function BriefingScreen({ onBegin, onBack }: { onBegin: () => void; onBack: () => void }) {
  const { c } = useCopy();
  return (
    <div className="min-h-dvh overflow-y-auto bg-level-ambience px-6 py-12 md:px-24">
      <div className="mx-auto max-w-2xl">
        <div className="flex justify-end"><LangToggle /></div>
        <p className="label-eyebrow">{c.briefing.eyebrow}</p>
        <h1 className="mt-2 font-[var(--font-display)] text-3xl text-bone md:text-5xl">{c.briefing.title}</h1>
        <p className="mt-6 text-[16px] leading-relaxed text-ash">{c.briefing.intro}</p>
        <h2 className="mt-8 text-[17px] text-bone">{c.briefing.rulesTitle}</h2>
        <ul className="mt-3 space-y-2">
          {c.briefing.rules.map((rule) => (
            <li key={rule} className="panel px-4 py-3 text-[14px] leading-relaxed text-ash">{rule}</li>
          ))}
        </ul>
        <h2 className="mt-8 text-[17px] text-bone">{c.briefing.goalTitle}</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ash">{c.briefing.goal}</p>
        <div className="mt-10 flex flex-wrap gap-3 pb-8">
          <Button size="lg" variant="primary" onClick={onBegin}>{c.briefing.begin}</Button>
          <Button size="lg" variant="ghost" onClick={onBack}>{c.briefing.back}</Button>
        </div>
      </div>
    </div>
  );
}

const END_INDICATORS: (keyof Indicators)[] = [
  'co2EqEmissionsPerCapita', 'biodiversity', 'foodSecurity', 'economicSecurity', 'socialWellbeing', 'politicalStability',
];


export function EndScreen({ session, onAgain, onTitle }: { session: Session; onAgain: () => void; onTitle: () => void }) {
  const { c, locale, fmt } = useCopy();
  // Route names live in the main dictionary (routes.*), shared with the 3-level game.
  const { t: tMain } = useT();
  const t = (key: string) => tMain(key as TranslationKey);
  const outcome = session.outcome!;
  const routes = outcome.routes;
  const title = outcome.kind === 'won'
    ? fill(c.end.won, { route: t(routes.achieved!.nameKey) })
    : outcome.kind === 'lost'
      ? c.end.lost
      : fill(c.end.collapse, { year: session.game.year });
  const start = session.game.levelBaseline;
  const final = session.game.indicators;
  return (
    <div className="absolute inset-0 z-50 overflow-y-auto bg-basalt-950/95 px-6 py-12 md:px-24" role="dialog" aria-modal="true" aria-labelledby="end-title">
      <div className="mx-auto max-w-3xl">
        <p className="label-eyebrow">{c.brand.name}</p>
        <h1 id="end-title" className="mt-2 font-[var(--font-display)] text-3xl text-bone md:text-5xl">{title}</h1>
        {outcome.kind === 'collapse' && <p className="mt-3 text-[15px] text-ember">{c.end.reasons[gameOverKind(outcome.reason) ?? 'other']}</p>}
        {outcome.kind !== 'won' && (
          <p className="mt-3 text-[15px] text-ash">
            {routes.floorsMet ? fill(c.end.closest, { route: t(routes.closest.route.nameKey) }) : c.end.floorsBroken}
          </p>
        )}
        <h2 className="mt-8 text-[17px] text-bone">{c.end.statsTitle}</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-[14px]">
            <thead>
              <tr className="text-[12px] text-ash-dim">
                <th className="py-1 font-normal" />
                <th className="py-1 text-right font-normal">{c.end.start}</th>
                <th className="py-1 text-right font-normal">{c.end.final}</th>
              </tr>
            </thead>
            <tbody>
              {END_INDICATORS.map((key) => (
                <tr key={key} className="border-t border-basalt-700">
                  <td className="py-2 text-ash">{getIndicatorName(key, locale)}</td>
                  <td className="tnum py-2 text-right text-ash">{fmt.num(start[key], 1)}</td>
                  <td className="tnum py-2 text-right text-bone">{fmt.num(final[key], 1)}</td>
                </tr>
              ))}
              <tr className="border-t border-basalt-700">
                <td className="py-2 text-ash">{c.end.declared}</td>
                <td className="py-2" />
                <td className="tnum py-2 text-right text-bone">{session.declaredCount}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-10 flex flex-wrap gap-3 pb-8">
          <Button size="lg" variant="primary" onClick={onAgain}>{c.end.again}</Button>
          <Button size="lg" variant="secondary" onClick={onTitle}>{c.end.toTitle}</Button>
          <a href="/play" className="inline-flex h-12 items-center rounded-md px-6 text-[17px] text-ash hover:bg-basalt-800 hover:text-bone">{c.end.toMain}</a>
        </div>
      </div>
    </div>
  );
}
