/**
 * Asynchronous teacher space (mejora-general/files/28_espacio_docente_asincronico.md): a static,
 * self-guided path. This script adds the persisted checklist, the version/format wizard and the
 * workshop-link generator with QR. No React, no Supabase client; without JS the stages, texts and
 * links are all visible and the generator shows the URL pattern to fill in by hand.
 */
import { logFunnelEventLite } from './services/funnelTelemetryLite';
import { CONTACT_EMAIL } from './shared/contact';
import { initLocale } from './shared/locale';
import { WORKSHOP_CODE_RE } from './shared/workshopCodeRe';

/* ── Pure logic (unit-tested in tests/docentes/espacioRules.spec.ts) ─────────────────────────── */

export type TimeAnswer = 'una' | 'dos' | 'taller';
export type DevicesAnswer = 'pc' | 'cel' | 'pantalla';
export type GoalAnswer = 'intuicion' | 'datos' | 'actores';
export interface WizardAnswers { time: TimeAnswer; devices: DevicesAnswer; goal: GoalAnswer }
export type Notice = 'room' | 'phones' | 'actors';
export interface Recommendation {
  version: 'territorio' | 'niveles';
  /** Teacher-package page to start with. */
  startWith: 'plan-clase' | 'guia';
  /** Extra notes to show, in this order. */
  notices: Notice[];
}

/**
 * Rule table of the wizard. Order matters only for the version decision:
 *  1. Default → Territorio, starting with the lesson plan.
 *  2. "Two or more classes" AND "data analysis" → 3-level game (two-class lesson-plan variant).
 *  3. "A single projected screen" → Territorio in room mode (the teacher plays on the projector and
 *     the room votes at each pause), starting with the facilitation guide. A single shared screen
 *     rules out one-device-per-person play, so this wins over rule 2.
 *  4. "Phones only" → add the pairs / one-computer-per-group notice.
 *  5. "Discussion between stakeholders" → suggest the guide's comparative wrap-up (step 4).
 */
export function recommend(a: WizardAnswers): Recommendation {
  let version: Recommendation['version'] = 'territorio';
  let startWith: Recommendation['startWith'] = 'plan-clase';
  const notices: Notice[] = [];
  if (a.time === 'dos' && a.goal === 'datos') version = 'niveles';
  if (a.devices === 'pantalla') {
    version = 'territorio';
    startWith = 'guia';
    notices.push('room');
  }
  if (a.devices === 'cel') notices.push('phones');
  if (a.goal === 'actores') notices.push('actors');
  return { version, startWith, notices };
}

export function validateCode(code: string): boolean {
  return WORKSHOP_CODE_RE.test(code);
}

/** `DN-` + 4 random characters from an unambiguous alphabet. */
export function suggestCode(rand: () => number = Math.random): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'DN-';
  for (let i = 0; i < 4; i++) out += alphabet[Math.floor(rand() * alphabet.length)];
  return out;
}

const ORIGIN = 'https://decarbonation.vercel.app';
export const playLink = (code: string) => `${ORIGIN}/territorio?taller=${encodeURIComponent(code)}`;
export const surveyLink = (code: string) => `${ORIGIN}/territorio/encuesta?taller=${encodeURIComponent(code)}`;

export const TOTAL_STEPS = 13;
export const countDone = (progress: Record<string, boolean>): number =>
  Object.entries(progress).filter(([id, v]) => v && /^step-\d+$/.test(id)).length;

/* ── Browser wiring ──────────────────────────────────────────────────────────────────────────── */

const PROGRESS_KEY = 'dn_espacio_progreso_v1';
const CODE_KEY = 'dn_espacio_taller_v1';
const WIZARD_KEY = 'dn_espacio_asistente_v1';

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown): void => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable: works without remembering */ }
};
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

function initChecklist(): void {
  const progress = read<Record<string, boolean>>(PROGRESS_KEY, {});
  const boxes = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-step]'));
  const paint = () => {
    const n = countDone(progress);
    const bar = $('progress-bar');
    if (bar) bar.style.width = `${(n / TOTAL_STEPS) * 100}%`;
    document.querySelectorAll<HTMLElement>('[data-progress-n]').forEach((el) => { el.textContent = String(n); });
    $('progress')?.setAttribute('aria-valuenow', String(n));
  };
  boxes.forEach((box) => {
    box.checked = Boolean(progress[box.id]);
    box.addEventListener('change', () => {
      progress[box.id] = box.checked;
      write(PROGRESS_KEY, progress);
      paint();
    });
  });
  paint();
}

function setHref(selector: string, build: (el: HTMLAnchorElement) => string): void {
  document.querySelectorAll<HTMLAnchorElement>(selector).forEach((el) => el.setAttribute('href', build(el)));
}

function initWizard(): void {
  const form = $<HTMLFormElement>('wizard');
  if (!form) return;
  const saved = read<Partial<WizardAnswers>>(WIZARD_KEY, {});
  const get = (name: string): string | null => (form.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value ?? null);
  for (const [name, value] of Object.entries(saved)) {
    const input = form.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`);
    if (input) input.checked = true;
  }
  const render = () => {
    const time = get('time') as TimeAnswer | null;
    const devices = get('devices') as DevicesAnswer | null;
    const goal = get('goal') as GoalAnswer | null;
    const answers: WizardAnswers = { time: time ?? 'una', devices: devices ?? 'pc', goal: goal ?? 'intuicion' };
    const rec = recommend(answers);
    $('wizard-result')?.toggleAttribute('hidden', false);
    document.querySelectorAll<HTMLElement>('[data-result]').forEach((el) => { el.hidden = el.dataset.result !== rec.version; });
    document.querySelectorAll<HTMLElement>('[data-start]').forEach((el) => { el.hidden = el.dataset.start !== rec.startWith; });
    document.querySelectorAll<HTMLElement>('[data-notice]').forEach((el) => { el.hidden = !rec.notices.includes(el.dataset.notice as Notice); });
    setHref('a[data-resource]', (a) => `/docentes/${a.dataset.resource}?v=${rec.version}${a.dataset.hash ?? ''}`);
    setHref('a[data-resource-hub]', () => `/docentes?v=${rec.version}#que-version`);
    write(WIZARD_KEY, { time, devices, goal });
  };
  form.addEventListener('change', render);
  render();
}

async function copyText(text: string, field: HTMLInputElement | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    if (!field) return false;
    field.focus();
    field.select();
    try { return document.execCommand('copy'); } catch { return false; }
  }
}

function initGenerator(): void {
  const input = $<HTMLInputElement>('taller-code');
  if (!input) return;
  const msg = $('code-msg');
  const outputs = $('code-outputs');
  const playField = $<HTMLInputElement>('link-play');
  const surveyField = $<HTMLInputElement>('link-survey');
  const qrBox = $('qr-box');
  const qrBtn = $<HTMLButtonElement>('qr-generate');
  const qrDl = $<HTMLAnchorElement>('qr-download');
  let logged = '';

  const refresh = () => {
    const code = input.value.trim();
    const ok = validateCode(code);
    input.setAttribute('aria-invalid', String(code !== '' && !ok));
    msg?.querySelectorAll<HTMLElement>('[data-code-state]').forEach((el) => {
      el.hidden = el.dataset.codeState !== (code === '' ? 'empty' : ok ? 'ok' : 'bad');
    });
    if (outputs) outputs.hidden = !ok;
    if (qrBox) { qrBox.innerHTML = ''; }
    if (qrDl) qrDl.hidden = true;
    if (!ok) return;
    if (playField) playField.value = playLink(code);
    if (surveyField) surveyField.value = surveyLink(code);
    write(CODE_KEY, code);
    setHref('a[data-mailto]', () => mailto(code));
    if (logged !== code) {
      logged = code;
      logFunnelEventLite('workshop_link_created', { code_length: code.length });
    }
  };

  const saved = read<string>(CODE_KEY, '');
  if (typeof saved === 'string' && saved) input.value = saved;
  input.addEventListener('input', refresh);
  $('code-suggest')?.addEventListener('click', () => { input.value = suggestCode(); refresh(); input.focus(); });

  document.querySelectorAll<HTMLButtonElement>('button[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const field = $<HTMLInputElement>(btn.dataset.copy as string);
      if (!field) return;
      const ok = await copyText(field.value, field);
      const live = $('copy-live');
      if (live) {
        live.querySelectorAll<HTMLElement>('[data-copy-state]').forEach((el) => { el.hidden = el.dataset.copyState !== (ok ? 'ok' : 'fail'); });
        window.setTimeout(() => live.querySelectorAll<HTMLElement>('[data-copy-state]').forEach((el) => { el.hidden = true; }), 2500);
      }
    });
  });

  qrBtn?.addEventListener('click', async () => {
    const code = input.value.trim();
    if (!validateCode(code) || !qrBox) return;
    const QR = await import('qrcode');
    qrBox.innerHTML = await QR.toString(playLink(code), { type: 'svg', margin: 1 });
    if (qrDl) {
      qrDl.href = await QR.toDataURL(playLink(code), { width: 640, margin: 2 });
      qrDl.download = `decarbonation-taller-${code}.png`;
      qrDl.hidden = false;
    }
  });
  refresh();
}

function mailto(code: string): string {
  const subject = encodeURIComponent(`DecarboNation — taller ${code || ''}`.trim());
  const en = document.documentElement.lang === 'en';
  const nl = '%0A%0A';
  const body = en
    ? ['What worked:', 'What did not work:', 'What you would need:'].map(encodeURIComponent).join(nl)
    : ['Qué funcionó:', 'Qué no funcionó:', 'Qué necesitarías:'].map(encodeURIComponent).join(nl);
  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}

function initReset(): void {
  $('reset-path')?.addEventListener('click', () => {
    const confirmText = document.documentElement.lang === 'en' ? 'Reset your path? This clears the checklist, the wizard and the code saved in this browser.' : '¿Reiniciar tu recorrido? Se borran la lista, el asistente y el código guardados en este navegador.';
    if (!window.confirm(confirmText)) return;
    try { [PROGRESS_KEY, CODE_KEY, WIZARD_KEY].forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
    window.location.reload();
  });
}

if (typeof document !== 'undefined') {
  initLocale();
  initChecklist();
  initWizard();
  initGenerator();
  setHref('a[data-mailto]', () => mailto(read<string>(CODE_KEY, '')));
  initReset();
  logFunnelEventLite('teacher_space_view');
}
