/**
 * What a contract's line items add up to — one rule, used everywhere.
 *
 * There used to be three: the stored total used `actual_cost ?? cost ??
 * mid_cost`, the Bid Amount display used `cost || mid_cost`, and the category
 * header used `mid_cost ?? cost`. `??` only skips null and undefined, so a
 * line whose cost was "" or 0 counted as $0 in the total while the display
 * beside it showed the real price.
 *
 * Signed vs unsigned matters because signing rewrites each line to the tier
 * the homeowner chose — `{ title, description, cost }` — and drops `mid_cost`.
 * Totalling a signed contract with the unsigned rule therefore sums to $0,
 * which is exactly what happened when inline edits saved without knowing the
 * contract was signed.
 */

import { toNum } from "./utils";

/** A usable number: present, not blank, and finite. "" and "abc" are missing. */
function present(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** The price a line was bid at, whichever shape it's stored in. */
export function lineBidOf(item: Record<string, any> | null | undefined, signed: boolean): number {
  // Signed lines carry the chosen tier in `cost`; proposals carry `mid_cost`.
  // Each falls back to the other so a line added in either shape still counts.
  const primary = signed ? present(item?.cost) : present(item?.mid_cost);
  const fallback = signed ? present(item?.mid_cost) : present(item?.cost);
  return primary ?? fallback ?? 0;
}

/**
 * What a line contributes to the contract total. On a signed contract a
 * recorded actual cost replaces the bid — the behaviour the admin already had,
 * kept as-is here; this module only makes it consistent and blank-safe.
 */
export function lineContractAmountOf(item: Record<string, any> | null | undefined, signed: boolean): number {
  if (signed) {
    const actual = present(item?.actual_cost);
    if (actual !== null) return actual;
  }
  return lineBidOf(item, signed);
}

export function itemsContractTotal(items: unknown, signed: boolean): number {
  if (!Array.isArray(items)) return 0;
  const total = items.reduce((sum: number, item: any) => sum + lineContractAmountOf(item, signed), 0);
  return Math.round(total * 100) / 100;
}

export interface TotalMismatch {
  stored: number;
  expected: number;
}

/**
 * The stored total disagrees with the line items it's supposed to be the sum
 * of. Null when they agree to the cent, or when there are no items to check
 * against (an empty contract is ambiguous, not evidence of damage).
 */
export function contractTotalMismatch(
  contract: { status?: string | null; amount?: unknown; items?: unknown } | null | undefined
): TotalMismatch | null {
  if (!contract || !Array.isArray(contract.items) || contract.items.length === 0) return null;
  const expected = itemsContractTotal(contract.items, contract.status === "approved");
  const stored = Math.round(toNum(contract.amount) * 100) / 100;
  return Math.abs(stored - expected) >= 0.01 ? { stored, expected } : null;
}
