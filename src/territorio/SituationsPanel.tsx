/**
 * The inbox: what is on the desk right now. Situations arrive while the clock runs, wear the
 * government down every month they stay open, and resolve themselves badly if their deadline
 * passes (21_fusion_ecosim.md §7). Nothing here ever pauses the game.
 */
import React from 'react';
import { Button } from '../components/ui/Button';
import { fill, useCopy } from './copy';
import { SITUATION_BY_ID, type OpenSituation, type SituationActor, type SituationDef } from './situations';
import type { Session } from './session';

const PORTRAIT: Record<SituationActor, string> = {
  farmer: 'farmer',
  ngo: 'ngo',
  citizen: 'citizen',
  industry: 'industry',
  science: 'ngo',
  government: 'citizen',
  international: 'industry',
};

const TONE_BORDER = {
  good: 'border-chlorophyll/40',
  bad: 'border-ember/40',
  neutral: 'border-basalt-600',
} as const;

function wearLabel(def: SituationDef): number {
  const { conflict = 0, ppAgricola = 0, ppAmbientalista = 0, ppSocial = 0 } = def.wear;
  return conflict + ppAgricola + ppAmbientalista + ppSocial;
}

export function SituationCard({ item, def, monthIndex, reserves, onDecide }: {
  item: OpenSituation;
  def: SituationDef;
  monthIndex: number;
  reserves: number;
  onDecide: (optionId: string) => void;
}) {
  const { c, locale, fmt } = useCopy();
  const copy = locale === 'en' ? def.en : def.es;
  const monthsLeft = Math.max(0, item.expiresAt - monthIndex);
  const total = Math.max(1, item.expiresAt - item.openedAt);
  const urgency = 1 - monthsLeft / total;
  const wear = wearLabel(def);
  return (
    <article className={`rounded-md border bg-basalt-800 p-3 ${TONE_BORDER[def.tone]}`}>
      <div className="flex gap-3">
        <img src={`/assets/ecosim/portraits/${PORTRAIT[def.actor]}.webp`} alt="" className="size-12 shrink-0 rounded-md object-cover" />
        <div className="min-w-0 flex-1">
          <p className="label-eyebrow !text-[10px]">{c.situations.actors[def.actor]}</p>
          <h3 className="text-[14px] leading-tight text-bone">{copy.title}</h3>
        </div>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-ash">{copy.body}</p>

      <div className="mt-2 flex items-center gap-2 text-[11px]">
        <span className="h-1 flex-1 overflow-hidden rounded-full bg-basalt-700">
          <span className={`block h-full rounded-full ${urgency > 0.66 ? 'bg-ember' : 'bg-ochre'}`} style={{ width: `${Math.min(100, urgency * 100)}%` }} />
        </span>
        <span className="tnum shrink-0 text-ash-dim">{fill(c.situations.monthsLeft, { n: monthsLeft })}</span>
      </div>
      {wear > 0 && (
        <p className="tnum mt-1 text-[11px] text-ember">{fill(c.situations.wear, { n: fmt.num(wear, 1) })}</p>
      )}

      <div className="mt-2 space-y-1">
        {def.options.map((option) => {
          const cost = option.cost ?? 0;
          const canPay = cost <= reserves;
          return (
            <Button
              key={option.id}
              size="sm"
              variant="secondary"
              className="w-full justify-between text-left"
              disabled={!canPay}
              onClick={() => onDecide(option.id)}
            >
              <span className="truncate">{locale === 'en' ? option.en : option.es}</span>
              {cost > 0 && <span className="tnum shrink-0 text-[12px] text-ash">{fmt.big(cost)}</span>}
            </Button>
          );
        })}
      </div>
    </article>
  );
}

export function SituationsPanel({ session, onDecide }: {
  session: Session;
  onDecide: (openId: string, optionId: string) => void;
}) {
  const { c, fmt } = useCopy();
  const reserves = session.game.stellaSpecificState.Reservas_del_Tesoro;
  if (session.open.length === 0) {
    return (
      <div className="px-1">
        <p className="text-[13px] text-ash">{c.situations.empty}</p>
        <p className="tnum mt-3 text-[12px] text-ash-dim">
          {fill(c.situations.tally, { resolved: session.resolvedCount, expired: session.expiredCount, wear: fmt.num(session.wearTotal, 0) })}
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="px-1 text-[12px] text-ash">{c.situations.intro}</p>
      {session.open.map((item) => {
        const def = SITUATION_BY_ID[item.defId];
        if (!def) return null;
        return (
          <SituationCard
            key={item.id}
            item={item}
            def={def}
            monthIndex={session.monthIndex}
            reserves={reserves}
            onDecide={(optionId) => onDecide(item.id, optionId)}
          />
        );
      })}
      <p className="tnum px-1 pt-1 text-[12px] text-ash-dim">
        {fill(c.situations.tally, { resolved: session.resolvedCount, expired: session.expiredCount, wear: fmt.num(session.wearTotal, 0) })}
      </p>
    </div>
  );
}
