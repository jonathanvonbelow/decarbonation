/**
 * Anonymous submission of the Territorio questionnaire to `public.territorio_feedback`.
 *
 * Direct `fetch` against PostgREST, no @supabase/supabase-js (same pattern as
 * src/services/funnelTelemetryLite.ts): the survey page must stay light. Never throws toward the
 * UI. On network errors / 5xx the row is queued in localStorage and retried by `flushFeedbackQueue`.
 *
 * The table has no SELECT policy, so inserts must ask for `Prefer: return=minimal`.
 */
import {
  CONTEXTOS, ELEMENTOS, FORMATOS, MAX_ELEMENTOS, MAX_ROL_OTRO, MAX_TEXT, MEJORAS, ROLES,
  type TerritorioFeedbackRow,
} from './types';

const QUEUE_KEY = 'dn_territorio_feedback_queue_v1';
const CLIENT_ID_KEY = 'dn_client_id_v1';
const MAX_QUEUE = 20;
const CODE_RE = /^[A-Za-z0-9_-]{2,32}$/;

export type SubmitResult =
  | { ok: true; queued: false }
  | { ok: true; queued: true }
  | { ok: false; reason: 'no_config' | 'rejected' };

const config = () => ({ url: process.env.SUPABASE_URL, key: process.env.SUPABASE_ANON_KEY });

/** Random per-browser id for de-duplication; not derived from the device. */
export function getClientId(): string {
  try {
    const stored = localStorage.getItem(CLIENT_ID_KEY);
    if (stored) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
    return id;
  } catch {
    try { return crypto.randomUUID(); } catch { return '00000000-0000-4000-8000-000000000000'; }
  }
}

const text = (v: string | null | undefined, max: number): string | null => {
  const t = (v ?? '').trim();
  return t ? t.slice(0, max) : null;
};
const oneOf = <T extends string>(list: readonly T[], v: string | null | undefined): T | null =>
  (v && (list as readonly string[]).includes(v) ? (v as T) : null);
const many = <T extends string>(list: readonly T[], v: readonly string[] | null | undefined, max = Infinity): T[] | null => {
  const out = [...new Set((v ?? []).filter((x): x is T => (list as readonly string[]).includes(x)))].slice(0, max);
  return out.length ? out : null;
};
const likert = (v: number | null | undefined) =>
  (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5 ? (v as 1 | 2 | 3 | 4 | 5) : null);

/** Trims text, nulls empties, clamps to the SQL maxima and drops values outside the option lists. */
export function sanitizeRow(row: TerritorioFeedbackRow): TerritorioFeedbackRow {
  const rol = oneOf(ROLES, row.rol);
  return {
    ...row,
    taller_codigo: row.taller_codigo && CODE_RE.test(row.taller_codigo) ? row.taller_codigo : null,
    app_version: text(row.app_version, 64),
    duracion_seg: row.duracion_seg === null ? null : Math.max(0, Math.min(7200, Math.round(row.duracion_seg))),
    rol,
    rol_otro: rol === 'otro' ? text(row.rol_otro, MAX_ROL_OTRO) : null,
    contexto_uso: oneOf(CONTEXTOS, row.contexto_uso),
    comprension: likert(row.comprension),
    ritmo: likert(row.ritmo),
    mapa_utilidad: likert(row.mapa_utilidad),
    elementos_utiles: many(ELEMENTOS, row.elementos_utiles, MAX_ELEMENTOS),
    tradeoffs: likert(row.tradeoffs),
    realismo: likert(row.realismo),
    aprendizaje_texto: text(row.aprendizaje_texto, MAX_TEXT),
    mejora_prioritaria: oneOf(MEJORAS, row.mejora_prioritaria),
    mejoras_texto: text(row.mejoras_texto, MAX_TEXT),
    uso_taller: likert(row.uso_taller),
    formatos_uso: many(FORMATOS, row.formatos_uso),
    taller_conceptos_texto: text(row.taller_conceptos_texto, MAX_TEXT),
  };
}

function readQueue(): TerritorioFeedbackRow[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function writeQueue(rows: TerritorioFeedbackRow[]): void {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(rows.slice(-MAX_QUEUE))); } catch { /* storage unavailable */ }
}

type Attempt = 'sent' | 'rejected' | 'retry';

async function post(row: TerritorioFeedbackRow): Promise<Attempt> {
  const { url, key } = config();
  try {
    const res = await fetch(`${url}/rest/v1/territorio_feedback`, {
      method: 'POST',
      headers: {
        apikey: key as string,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
      keepalive: true,
    });
    if (res.ok) return 'sent';
    return res.status >= 500 ? 'retry' : 'rejected';
  } catch {
    return 'retry';
  }
}

export async function submitFeedback(input: TerritorioFeedbackRow): Promise<SubmitResult> {
  const { url, key } = config();
  if (!url || !key) {
    console.info('[territorio feedback] SUPABASE_URL / SUPABASE_ANON_KEY not configured: answers were not sent.');
    return { ok: false, reason: 'no_config' };
  }
  const row = sanitizeRow(input);
  const attempt = await post(row);
  if (attempt === 'sent') return { ok: true, queued: false };
  if (attempt === 'rejected') return { ok: false, reason: 'rejected' };
  writeQueue([...readQueue(), row]);
  return { ok: true, queued: true };
}

/** Retries queued rows; keeps the ones that still fail with network/5xx errors. */
export async function flushFeedbackQueue(): Promise<void> {
  const { url, key } = config();
  if (!url || !key) return;
  const queue = readQueue();
  if (!queue.length) return;
  const pending: TerritorioFeedbackRow[] = [];
  for (const row of queue) {
    if ((await post(row)) === 'retry') pending.push(row);
  }
  writeQueue(pending);
}
