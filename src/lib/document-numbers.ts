import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Sequential numbering for the estimate → proposal → change order chain.
 *
 * The number is issued at the lead, the moment the estimate link is generated,
 * and the proposal reuses that same root when the lead converts. So a single
 * opportunity carries one identity the whole way through:
 *
 *   EST-2026-0007  →  PRO-2026-0007  →  PRO-2026-0007-CO1
 *
 * Proposals written straight from the admin have no lead to inherit from, so
 * they pull the next number off the same counter. Both entry points share one
 * sequence per calendar year, which is what keeps the book gapless.
 */

export const ESTIMATE_PREFIX = "EST";
export const PROPOSAL_PREFIX = "PRO";

export interface DocumentNumber {
  year: number;
  sequence: number;
}

function format(prefix: string, { year, sequence }: DocumentNumber): string {
  return `${prefix}-${year}-${String(sequence).padStart(4, "0")}`;
}

export function formatEstimateNumber(n: DocumentNumber): string {
  return format(ESTIMATE_PREFIX, n);
}

export function formatProposalNumber(n: DocumentNumber): string {
  return format(PROPOSAL_PREFIX, n);
}

/** PRO-2026-0007 + 2 → PRO-2026-0007-CO2 */
export function formatChangeOrderNumber(proposalNumber: string, index: number): string {
  return `${proposalNumber}-CO${index}`;
}

/** The root a lead already carries, or null if it predates the numbering. */
export function documentNumberOf(row: Record<string, any> | null | undefined): DocumentNumber | null {
  const year = Number(row?.sequence_year);
  const sequence = Number(row?.sequence_no);
  if (!Number.isInteger(year) || !Number.isInteger(sequence) || sequence < 1) return null;
  return { year, sequence };
}

/**
 * Claim the next number for the year.
 *
 * Allocation runs through the next_document_number() Postgres function, where a
 * single upsert makes it atomic — two leads landing at once can't be handed the
 * same number.
 *
 * Returns null when that function isn't there, which means the numbering
 * migration hasn't been applied to this database yet. The schema in this
 * project is applied by hand, so a deploy can easily land ahead of it. Callers
 * treat null as "carry on unnumbered" rather than guessing at a value: a
 * missing number can be backfilled later, a duplicated one can't be undone.
 */
export async function allocateDocumentNumber(
  client: SupabaseClient,
  year: number = new Date().getFullYear()
): Promise<DocumentNumber | null> {
  const { data, error } = await client.rpc("next_document_number", { p_year: year });

  if (error) {
    console.warn(
      `[document-numbers] could not allocate a number for ${year} — ` +
        `run the document numbering migration in Supabase. (${error.message})`
    );
    return null;
  }

  const sequence = Number(data);
  if (!Number.isInteger(sequence) || sequence < 1) {
    console.warn(`[document-numbers] next_document_number returned ${JSON.stringify(data)}`);
    return null;
  }

  return { year, sequence };
}

/**
 * The number fields to write onto a new lead. Empty when numbering is
 * unavailable, so it can be spread into an insert either way.
 */
export function estimateNumberFields(n: DocumentNumber | null): Record<string, any> {
  if (!n) return {};
  return {
    estimate_number: formatEstimateNumber(n),
    sequence_year: n.year,
    sequence_no: n.sequence,
  };
}

/**
 * The number fields to write onto a new proposal. `estimateNumber` records the
 * lead it grew out of, when there was one.
 */
export function proposalNumberFields(
  n: DocumentNumber | null,
  estimateNumber?: string | null
): Record<string, any> {
  if (!n) return {};
  return {
    proposal_number: formatProposalNumber(n),
    sequence_year: n.year,
    sequence_no: n.sequence,
    ...(estimateNumber ? { estimate_number: estimateNumber } : {}),
  };
}
