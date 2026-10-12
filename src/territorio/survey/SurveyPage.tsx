/**
 * /territorio/encuesta — anonymous 14-item questionnaire (mejora-general/files/26_cuestionario_territorio.md).
 * One page, five fieldsets, every item optional; submit needs at least one answer (mirrors the
 * table's `territorio_feedback_not_empty` CHECK).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../../i18n';
import { Button } from '../../components/ui/Button';
import { fill } from '../copy';
import { SURVEY_ES, type SurveyCopy } from './copy';
import { SURVEY_EN } from './copy.en';
import { getClientId, submitFeedback, type SubmitResult } from './feedbackService';
import { loadSummary, toRowFields } from './summary';
import {
  CONTEXTOS, ELEMENTOS, FORMATOS, MAX_ELEMENTOS, MAX_ROL_OTRO, MAX_TEXT, MEJORAS, ROLES,
  type Contexto, type Elemento, type Formato, type Likert, type Mejora, type Origen, type Rol, type TerritorioFeedbackRow,
} from './types';
import { activeWorkshopCode, withWorkshopCode } from './workshopCode';

interface Answers {
  rol: Rol | null; rolOtro: string; contexto: Contexto | null;
  comprension: Likert | null; ritmo: Likert | null; mapa: Likert | null; elementos: Elemento[];
  tradeoffs: Likert | null; realismo: Likert | null; aprendizaje: string;
  mejora: Mejora | null; mejoras: string;
  usoTaller: Likert | null; formatos: Formato[]; conceptos: string;
}

const EMPTY: Answers = {
  rol: null, rolOtro: '', contexto: null, comprension: null, ritmo: null, mapa: null, elementos: [],
  tradeoffs: null, realismo: null, aprendizaje: '', mejora: null, mejoras: '', usoTaller: null, formatos: [], conceptos: '',
};

/** How many of the 14 items have an answer. */
export function countAnswered(a: Answers): number {
  return [
    a.rol, a.contexto, a.comprension, a.ritmo, a.mapa, a.elementos.length > 0, a.tradeoffs, a.realismo,
    a.aprendizaje.trim(), a.mejora, a.mejoras.trim(), a.usoTaller, a.formatos.length > 0, a.conceptos.trim(),
  ].filter(Boolean).length;
}

function readOrigin(): Origen {
  const o = new URLSearchParams(window.location.search).get('origen');
  return o === 'fin_partida' || o === 'espacio_docente' ? o : 'pagina';
}

const field = 'rounded-md border border-basalt-600 bg-basalt-800 p-3 text-[15px] text-bone placeholder:text-ash-dim focus-visible:outline-2 focus-visible:outline-chlorophyll';

function Likert5({ name, label, value, onChange, labels }: {
  name: string; label: string; value: Likert | null; onChange: (v: Likert) => void; labels: string[];
}) {
  return (
    <fieldset className="mt-5">
      <legend className="text-[15px] leading-snug text-bone">{label}</legend>
      <div className="mt-2 grid grid-cols-5 gap-1.5">
        {([1, 2, 3, 4, 5] as Likert[]).map((n) => (
          <label
            key={n}
            className={`flex cursor-pointer flex-col items-center gap-1 rounded-md border px-1 py-2 text-center text-[12px] leading-tight transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-chlorophyll ${value === n ? 'border-chlorophyll bg-chlorophyll/15 text-bone' : 'border-basalt-600 text-ash hover:border-ash-dim'}`}
          >
            <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} className="sr-only" />
            <span className="tnum text-[15px]">{n}</span>
            <span className="hidden sm:block">{labels[n - 1]}</span>
            {(n === 1 || n === 5) && <span className="sm:hidden">{labels[n - 1]}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Choice<T extends string>({ name, label, options, labels, value, onChange }: {
  name: string; label: string; options: readonly T[]; labels: Record<T, string>; value: T | null; onChange: (v: T) => void;
}) {
  return (
    <fieldset className="mt-5">
      <legend className="text-[15px] leading-snug text-bone">{label}</legend>
      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {options.map((o) => (
          <label key={o} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-[14px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-chlorophyll ${value === o ? 'border-chlorophyll bg-chlorophyll/15 text-bone' : 'border-basalt-600 text-ash hover:border-ash-dim'}`}>
            <input type="radio" name={name} value={o} checked={value === o} onChange={() => onChange(o)} className="accent-[var(--color-chlorophyll)]" />
            {labels[o]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Multi<T extends string>({ label, options, labels, value, onChange, max, maxNote }: {
  label: string; options: readonly T[]; labels: Record<T, string>; value: T[]; onChange: (v: T[]) => void; max?: number; maxNote?: string;
}) {
  const full = max !== undefined && value.length >= max;
  return (
    <fieldset className="mt-5">
      <legend className="text-[15px] leading-snug text-bone">{label}</legend>
      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {options.map((o) => {
          const checked = value.includes(o);
          const disabled = full && !checked;
          return (
            <label key={o} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-[14px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-chlorophyll ${disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'} ${checked ? 'border-chlorophyll bg-chlorophyll/15 text-bone' : 'border-basalt-600 text-ash hover:border-ash-dim'}`}>
              <input
                type="checkbox" checked={checked} disabled={disabled} className="accent-[var(--color-chlorophyll)]"
                onChange={() => onChange(checked ? value.filter((x) => x !== o) : [...value, o])}
              />
              {labels[o]}
            </label>
          );
        })}
      </div>
      {max !== undefined && <p className="mt-1 text-[12px] text-ash-dim" aria-live="polite">{full ? maxNote : ' '}</p>}
    </fieldset>
  );
}

function OpenText({ label, value, onChange, id }: { label: string; value: string; onChange: (v: string) => void; id: string }) {
  return (
    <div className="mt-5">
      <label htmlFor={id} className="text-[15px] leading-snug text-bone">{label}</label>
      <textarea id={id} rows={4} maxLength={MAX_TEXT} value={value} onChange={(e) => onChange(e.target.value)} className={`${field} mt-2 w-full`} />
    </div>
  );
}

export function SurveyPage() {
  const { locale, setLocale } = useT();
  const c: SurveyCopy = locale === 'en' ? SURVEY_EN : SURVEY_ES;
  const [a, setA] = useState<Answers>(EMPTY);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [sending, setSending] = useState(false);
  const startedAt = useRef(Date.now());
  const origen = useMemo(readOrigin, []);
  const code = useMemo(() => activeWorkshopCode(), []);
  const summary = useMemo(() => loadSummary(), []);
  const answered = countAnswered(a);
  const set = <K extends keyof Answers>(k: K, v: Answers[K]) => setA((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    document.title = c.pageTitle;
  }, [c.pageTitle]);

  // A facilitated workshop preselects the context (still editable).
  useEffect(() => {
    if (code) setA((prev) => (prev.contexto ? prev : { ...prev, contexto: 'taller' }));
  }, [code]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (answered === 0 || sending) return;
    setSending(true);
    const row: TerritorioFeedbackRow = {
      variant: 'territorio', origen, lang: locale, taller_codigo: code, client_id: getClientId(),
      app_version: process.env.APP_VERSION ?? 'dev',
      duracion_seg: Math.min(7200, Math.round((Date.now() - startedAt.current) / 1000)),
      rol: a.rol, rol_otro: a.rol === 'otro' ? a.rolOtro : null, contexto_uso: a.contexto,
      comprension: a.comprension, ritmo: a.ritmo, mapa_utilidad: a.mapa,
      elementos_utiles: a.elementos.length ? a.elementos : null,
      tradeoffs: a.tradeoffs, realismo: a.realismo, aprendizaje_texto: a.aprendizaje,
      mejora_prioritaria: a.mejora, mejoras_texto: a.mejoras,
      uso_taller: a.usoTaller, formatos_uso: a.formatos.length ? a.formatos : null, taller_conceptos_texto: a.conceptos,
      ...toRowFields(summary),
    };
    setResult(await submitFeedback(row));
    setSending(false);
    window.scrollTo({ top: 0 });
  };

  const header = (
    <header className="flex items-start justify-between gap-4">
      <div>
        <p className="label-eyebrow">DecarboNation Territorio</p>
        {code && <p className="mt-1 inline-flex rounded border border-basalt-600 px-2 py-0.5 text-[12px] text-ash">{fill(c.workshop, { code })}</p>}
      </div>
      <button type="button" className="text-[13px] text-ash hover:text-bone" onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}>{c.language}</button>
    </header>
  );

  if (result) {
    const msg = result.ok ? (result.queued ? c.thanksQueued : c.thanks) : c.thanksError;
    return (
      <div className="min-h-dvh bg-basalt-950 px-4 py-12">
        <div className="mx-auto max-w-2xl">
          {header}
          <h1 className="mt-6 font-[var(--font-display)] text-3xl text-bone">{c.title}</h1>
          <p className="mt-4 text-[17px] text-ash" role="status">{msg}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {result.ok ? (
              <>
                <a className="inline-flex h-12 items-center rounded-md bg-chlorophyll px-6 text-[17px] font-medium text-basalt-950" href={withWorkshopCode('/territorio')}>{c.after.again}</a>
                <a className="inline-flex h-12 items-center rounded-md border border-basalt-600 px-6 text-[17px] text-bone hover:bg-basalt-700" href="/play">{c.after.levels}</a>
                <a className="inline-flex h-12 items-center rounded-md px-6 text-[17px] text-ash hover:text-bone" href="/docentes">{c.after.teachers}</a>
              </>
            ) : (
              <a className="inline-flex h-12 items-center rounded-md bg-chlorophyll px-6 text-[17px] font-medium text-basalt-950" href="/">{c.backHome}</a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-basalt-950 pb-16">
      <div className="sticky top-0 z-10 border-b border-basalt-700 bg-basalt-950/95 px-4 py-2 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded bg-basalt-700" role="progressbar" aria-valuemin={0} aria-valuemax={14} aria-valuenow={answered}>
            <div className="h-full bg-chlorophyll transition-[width]" style={{ width: `${(answered / 14) * 100}%` }} />
          </div>
          <span className="tnum text-[13px] text-ash">{fill(c.progress, { n: answered })}</span>
        </div>
      </div>
      <form className="mx-auto max-w-2xl px-4 pt-8" onSubmit={onSubmit} noValidate>
        {header}
        <h1 className="mt-6 font-[var(--font-display)] text-3xl text-bone md:text-4xl">{c.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ash">{c.intro}</p>

        <div className="panel mt-6 px-4 py-3 text-[14px] text-ash">
          {summary ? (
            <>
              <p className="text-bone">{c.game.title}</p>
              <p className="mt-1">{fill(c.game.summary, { year: summary.anioAlcanzado, route: c.routes[summary.rutaCercana], n: summary.situacionesVencidas })}</p>
            </>
          ) : (
            <p>{c.game.none}</p>
          )}
        </div>

        <fieldset className="mt-10">
          <legend className="label-eyebrow">{c.blocks.a}</legend>
          <Choice name="rol" label={c.items.rol} options={ROLES} labels={c.options.rol} value={a.rol} onChange={(v) => set('rol', v)} />
          {a.rol === 'otro' && (
            <input type="text" maxLength={MAX_ROL_OTRO} value={a.rolOtro} onChange={(e) => set('rolOtro', e.target.value)} aria-label={c.items.rolOtro} placeholder={c.items.rolOtro} className={`${field} mt-2 w-full`} />
          )}
          <Choice name="contexto" label={c.items.contexto} options={CONTEXTOS} labels={c.options.contexto} value={a.contexto} onChange={(v) => set('contexto', v)} />
        </fieldset>

        <fieldset className="mt-10">
          <legend className="label-eyebrow">{c.blocks.b}</legend>
          <Likert5 name="comprension" label={c.items.comprension} labels={c.likert} value={a.comprension} onChange={(v) => set('comprension', v)} />
          <Likert5 name="ritmo" label={c.items.ritmo} labels={c.likert} value={a.ritmo} onChange={(v) => set('ritmo', v)} />
          <Likert5 name="mapa" label={c.items.mapa} labels={c.likert} value={a.mapa} onChange={(v) => set('mapa', v)} />
          <Multi label={c.items.elementos} options={ELEMENTOS} labels={c.options.elementos} value={a.elementos} onChange={(v) => set('elementos', v)} max={MAX_ELEMENTOS} maxNote={c.items.elementosMax} />
        </fieldset>

        <fieldset className="mt-10">
          <legend className="label-eyebrow">{c.blocks.c}</legend>
          <Likert5 name="tradeoffs" label={c.items.tradeoffs} labels={c.likert} value={a.tradeoffs} onChange={(v) => set('tradeoffs', v)} />
          <Likert5 name="realismo" label={c.items.realismo} labels={c.likert} value={a.realismo} onChange={(v) => set('realismo', v)} />
          <OpenText id="q-aprendizaje" label={c.items.aprendizaje} value={a.aprendizaje} onChange={(v) => set('aprendizaje', v)} />
        </fieldset>

        <fieldset className="mt-10">
          <legend className="label-eyebrow">{c.blocks.d}</legend>
          <Choice name="mejora" label={c.items.mejora} options={MEJORAS} labels={c.options.mejora} value={a.mejora} onChange={(v) => set('mejora', v)} />
          <OpenText id="q-mejoras" label={c.items.mejoras} value={a.mejoras} onChange={(v) => set('mejoras', v)} />
        </fieldset>

        <fieldset className="mt-10">
          <legend className="label-eyebrow">{c.blocks.e}</legend>
          <Likert5 name="usoTaller" label={c.items.usoTaller} labels={c.likert} value={a.usoTaller} onChange={(v) => set('usoTaller', v)} />
          <Multi label={c.items.formatos} options={FORMATOS} labels={c.options.formatos} value={a.formatos} onChange={(v) => set('formatos', v)} />
          <OpenText id="q-conceptos" label={c.items.conceptos} value={a.conceptos} onChange={(v) => set('conceptos', v)} />
        </fieldset>

        <div className="mt-10">
          <Button type="submit" size="lg" variant="primary" loading={sending} disabled={answered === 0}>{c.submit}</Button>
          {answered === 0 && <p className="mt-2 text-[13px] text-ash-dim">{c.needOne}</p>}
          <p className="mt-4 text-[12px] leading-relaxed text-ash-dim">{c.dataNotice}</p>
        </div>
      </form>
    </div>
  );
}
