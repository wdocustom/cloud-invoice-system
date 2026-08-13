import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

/**
 * Turns a Postgrest error into something a human can act on. The API routes used
 * to swallow these and return a flat "Failed to create proposal", which made
 * every failure look identical from the admin UI.
 */
export function describeDbError(error: PostgrestError | null | undefined): string {
  if (!error) return "Unknown database error";
  const parts = [error.message];
  if (error.details) parts.push(error.details);
  if (error.hint) parts.push(`Hint: ${error.hint}`);
  const text = parts.filter(Boolean).join(" — ");
  return error.code ? `${text} [${error.code}]` : text;
}

// PGRST204: PostgREST could not find the column in its schema cache.
// 42703:    Postgres "column does not exist".
const MISSING_COLUMN_CODES = new Set(["PGRST204", "42703"]);

function missingColumn(error: PostgrestError, payload: Record<string, any>): string | null {
  if (!MISSING_COLUMN_CODES.has(error.code)) return null;
  const text = [error.message, error.details, error.hint].filter(Boolean).join(" ");
  const match = text.match(/'([^']+)' column/) || text.match(/column "([^"]+)"/);
  const column = match?.[1];
  if (!column) return null;
  return Object.prototype.hasOwnProperty.call(payload, column) ? column : null;
}

export interface TolerantResult<T> {
  data: T | null;
  error: PostgrestError | null;
  /** Columns removed from the payload because the table doesn't have them (yet). */
  dropped: string[];
}

/**
 * Insert a row, retrying without any column the table doesn't actually have.
 *
 * The schema in this project is applied by hand in the Supabase dashboard, so a
 * route can easily be deployed ahead of its migration. Rather than failing the
 * whole write, drop the unknown column, keep going, and report what was dropped
 * so the caller can nudge whoever needs to run the migration.
 */
export async function insertTolerant<T = any>(
  client: SupabaseClient,
  table: string,
  payload: Record<string, any>,
  select = "*"
): Promise<TolerantResult<T>> {
  const attempt = { ...payload };
  const dropped: string[] = [];

  for (let i = 0; i <= Object.keys(payload).length; i++) {
    const { data, error } = await client.from(table).insert(attempt).select(select).single();
    if (!error) return { data: data as T, error: null, dropped };

    const column = missingColumn(error, attempt);
    if (!column) return { data: null, error, dropped };

    delete attempt[column];
    dropped.push(column);
    console.warn(`[${table}] dropping unknown column "${column}" and retrying insert`);
  }

  return { data: null, error: null, dropped };
}

/** Same tolerance as insertTolerant, for updates. */
export async function updateTolerant(
  client: SupabaseClient,
  table: string,
  payload: Record<string, any>,
  applyFilter: (query: any) => any,
  select = "*"
): Promise<TolerantResult<any>> {
  const attempt = { ...payload };
  const dropped: string[] = [];

  for (let i = 0; i <= Object.keys(payload).length; i++) {
    if (Object.keys(attempt).length === 0) return { data: null, error: null, dropped };

    const { data, error } = await applyFilter(client.from(table).update(attempt))
      .select(select)
      .single();
    if (!error) return { data, error: null, dropped };

    const column = missingColumn(error, attempt);
    if (!column) return { data: null, error, dropped };

    delete attempt[column];
    dropped.push(column);
    console.warn(`[${table}] dropping unknown column "${column}" and retrying update`);
  }

  return { data: null, error: null, dropped };
}
