/**
 * v6 / phase 32: shared rules for the `model_version` column of the research tables.
 * Dependency-free so the light survey page (fetch, no supabase-js) can use it too.
 */

/** Same pattern as the CHECK in supabase/model_version_migration.sql. */
export const MODEL_VERSION_RE = /^[0-9]+\.[0-9]+(\.[0-9]+)?(-dev)?$/;

/**
 * True only when an insert failed because the table has no `model_version` column yet (the project
 * has not run supabase/model_version_migration.sql): PostgREST PGRST204 "Could not find the
 * 'model_version' column ... in the schema cache", or Postgres 42703 (undefined_column) naming it.
 * A CHECK violation or a different missing column is NOT this case: those must fail as they are,
 * never be retried without the version tag (the row would be stored as model 1.0).
 */
export function isMissingModelVersionColumn(error: { code?: string; message?: string } | null | undefined): boolean {
  return isMissingColumn(error, 'model_version');
}

/**
 * v6 / phase 48: the same fallback for any column a migration adds (`band`, `persistence_pred`, `research_indices` of
 * supabase/research_indices_migration.sql). True only when the error is PostgREST PGRST204 / Postgres 42703 naming
 * exactly `column` (quoted or as a whole word).
 */
export function isMissingColumn(error: { code?: string; message?: string } | null | undefined, column: string): boolean {
  if (!error || (error.code !== 'PGRST204' && error.code !== '42703')) return false;
  return new RegExp(`(^|[^A-Za-z0-9_])${column}([^A-Za-z0-9_]|$)`).test(error.message ?? '');
}

/** Migration that adds each optional column, for the console warning. */
const MIGRATION_OF: Record<string, string> = {
  model_version: 'supabase/model_version_migration.sql',
  band: 'supabase/research_indices_migration.sql',
  persistence_pred: 'supabase/research_indices_migration.sql',
  research_indices: 'supabase/research_indices_migration.sql',
};

const warnedColumns = new Set<string>();
/** One console warning per page load and table/column when a table still lacks the column. */
export function warnMissingColumn(table: string, column: string): void {
  const id = `${table}.${column}`;
  if (warnedColumns.has(id)) return;
  warnedColumns.add(id);
  if (column === 'model_version') {
    console.warn(`[model_version] ${table} has no model_version column: run supabase/model_version_migration.sql. Rows are being saved without the version tag.`);
  } else {
    console.warn(`[research] ${table} has no ${column} column: run ${MIGRATION_OF[column] ?? 'the pending migration'}. Rows are being saved without it.`);
  }
}

/** One console warning per page load when a table still lacks the column. */
export function warnMissingModelVersionColumn(table: string): void {
  warnMissingColumn(table, 'model_version');
}

/** Columns seen missing in this page load (`table.column`): later sends skip them instead of failing twice. */
const lacking = new Set<string>();

/**
 * Sends `row` plus the `optional` columns (a null/undefined value is not sent). If (and only if) the table lacks one of
 * them, warns once, remembers it and resends without it — repeatedly, so a table missing several columns still gets
 * the row. Any other error (a CHECK violation, a different missing column) is returned as is: the row is never stored
 * without a column that exists. `send` returns anything with a PostgREST-shaped `error`.
 */
export async function sendWithOptionalColumns<R extends { error: { code?: string; message?: string } | null }>(
  table: string,
  row: Record<string, unknown>,
  optional: Record<string, unknown>,
  send: (row: Record<string, unknown>) => PromiseLike<R>,
): Promise<R> {
  const pending = Object.keys(optional).filter((c) => optional[c] != null && !lacking.has(`${table}.${c}`));
  for (;;) {
    const extra: Record<string, unknown> = {};
    pending.forEach((c) => { extra[c] = optional[c]; });
    const result = await send({ ...row, ...extra });
    const missing = pending.find((c) => isMissingColumn(result.error, c));
    if (!missing) return result;
    lacking.add(`${table}.${missing}`);
    warnMissingColumn(table, missing);
    pending.splice(pending.indexOf(missing), 1);
  }
}

/**
 * Sends `row` tagged with `model_version`; if (and only if) the table lacks the column, warns once,
 * remembers it and resends the same row without the tag (the DB default / NULL then applies). A null
 * version sends the row as is. `send` returns anything with a PostgREST-shaped `error`.
 */
export async function sendWithModelVersion<R extends { error: { code?: string; message?: string } | null }>(
  table: string,
  row: Record<string, unknown>,
  version: string | null,
  send: (row: Record<string, unknown>) => PromiseLike<R>,
): Promise<R> {
  return sendWithOptionalColumns(table, row, { model_version: version }, send);
}

/** Test hook: forget which tables lacked which columns. */
export function resetModelVersionColumnCache(): void {
  lacking.clear();
  warnedColumns.clear();
}

/**
 * v6 / phase 48: `research_indices` as the SQL CHECK accepts it (supabase/research_indices_migration.sql): a flat object
 * of finite numbers / nulls with short snake_case keys, at most 4 KB as JSON; anything else becomes null (never sent).
 */
const MAX_INDICES_BYTES = 4096;
export function sanitizeIndices(v: unknown): Record<string, number | null> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const out: Record<string, number | null> = {};
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
    if (!/^[a-z_]{1,40}$/.test(k)) continue;
    if (x === null || (typeof x === 'number' && Number.isFinite(x))) out[k] = x as number | null;
  }
  if (Object.keys(out).length === 0) return null;
  return JSON.stringify(out).length <= MAX_INDICES_BYTES ? out : null;
}
