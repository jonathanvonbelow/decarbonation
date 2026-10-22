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
  if (!error) return false;
  return (error.code === 'PGRST204' || error.code === '42703') && /'?model_version'?/.test(error.message ?? '');
}

let warned = false;
/** One console warning per page load when a table still lacks the column. */
export function warnMissingModelVersionColumn(table: string): void {
  if (warned) return;
  warned = true;
  console.warn(`[model_version] ${table} has no model_version column: run supabase/model_version_migration.sql. Rows are being saved without the version tag.`);
}

/** Tables seen without the column in this page load: later inserts skip it instead of failing twice. */
const lacking = new Set<string>();

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
  if (version == null || lacking.has(table)) return send(row);
  const first = await send({ ...row, model_version: version });
  if (!isMissingModelVersionColumn(first.error)) return first;
  lacking.add(table);
  warnMissingModelVersionColumn(table);
  return send(row);
}

/** Test hook: forget which tables lacked the column. */
export function resetModelVersionColumnCache(): void {
  lacking.clear();
  warned = false;
}
