/**
 * Change orders — the rules, kept apart from the routes that apply them.
 *
 * A change order is a child row in `invoices` (parent_id → the contract). It
 * amends a signed contract, so it has to meet the same bar the contract did:
 * the terms (§3) require it to be "signed or electronically approved by both
 * parties before the additional work begins", with the scope, price and
 * timeline impact stated. Everything here exists to make that true and
 * provable after the fact.
 *
 * Pure functions only — no clock, no network — so the numbering, totals and
 * approval rules can be tested without standing up Supabase.
 */

import { toNum } from "./utils";
import { formatChangeOrderNumber } from "./document-numbers";
import type { PdfInvoiceData } from "./generate-pdf";

const CO_SUFFIX = /-CO(\d+)$/;

/** PRO-2026-0007-CO3 → 3. Null for anything that isn't a change order number. */
export function changeOrderIndexOf(number?: string | null): number | null {
  const match = (number || "").match(CO_SUFFIX);
  if (!match) return null;
  const index = Number(match[1]);
  return Number.isInteger(index) && index > 0 ? index : null;
}

/**
 * The next change order index for a contract: one past the highest issued.
 *
 * Deliberately not `existing.length + 1`. `proposal_number` carries a unique
 * index, so after a deletion a count-based index can land on a number that is
 * still in use — and the insert then fails, blocking every further change
 * order on that job. Counting up from the highest issued never collides, and
 * a deleted number is simply retired rather than silently reused.
 */
export function nextChangeOrderIndex(existingNumbers: Array<string | null | undefined>): number {
  const highest = existingNumbers.reduce<number>((max, number) => {
    const index = changeOrderIndexOf(number);
    return index !== null && index > max ? index : max;
  }, 0);
  return highest + 1;
}

/** The number to issue, or null when the contract itself was never numbered. */
export function nextChangeOrderNumber(
  contractNumber: string | null | undefined,
  existingNumbers: Array<string | null | undefined>
): string | null {
  if (!contractNumber) return null;
  return formatChangeOrderNumber(contractNumber, nextChangeOrderIndex(existingNumbers));
}

export interface ChangeOrderLine {
  title: string;
  description: string;
  cost: number;
}

/**
 * Line items as they'll be stored and signed. Drops blank lines, never lets a
 * cost go negative, and rounds to the cent — this is the exact list a
 * homeowner signs, so it shouldn't carry model noise.
 */
export function normalizeChangeOrderItems(raw: unknown): ChangeOrderLine[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item: any): ChangeOrderLine[] => {
    const title = (item?.title ?? "").toString().trim();
    if (!title) return [];
    const cost = Math.max(0, Math.round(toNum(item?.cost ?? item?.mid_cost) * 100) / 100);
    const description = (item?.description ?? item?.mid_description ?? "").toString().trim();
    return [{ title, description, cost }];
  });
}

export function changeOrderAmount(items: ChangeOrderLine[]): number {
  return Math.round(items.reduce((sum, item) => sum + item.cost, 0) * 100) / 100;
}

export interface ContractTotals {
  /** What the homeowner signed originally. */
  original: number;
  /** Signed change orders — part of the contract now. */
  approved: number;
  /** Issued but not yet signed — not part of the contract. */
  pending: number;
  /** original + approved. The number both sides should agree the job is worth. */
  revised: number;
  approvedCount: number;
  pendingCount: number;
}

/**
 * The contract's value with its change orders folded in. Used by the ledger,
 * the project page and the homeowner portal alike, so the contractor and the
 * homeowner are never looking at two different totals for the same job.
 */
export function contractTotals(
  contract: { amount?: unknown } | null | undefined,
  changeOrders: Array<{ status?: string | null; amount?: unknown }> = []
): ContractTotals {
  const original = toNum(contract?.amount);
  let approved = 0;
  let pending = 0;
  let approvedCount = 0;
  let pendingCount = 0;

  for (const co of changeOrders) {
    if (co?.status === "approved") {
      approved += toNum(co.amount);
      approvedCount += 1;
    } else if (co?.status === "pending") {
      pending += toNum(co.amount);
      pendingCount += 1;
    }
  }

  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    original: round(original),
    approved: round(approved),
    pending: round(pending),
    revised: round(original + approved),
    approvedCount,
    pendingCount,
  };
}

/** Group change orders by the contract they belong to, for list views. */
export function changeOrdersByParent<T extends { parent_id?: string | null }>(
  rows: T[]
): Map<string, T[]> {
  const byParent = new Map<string, T[]>();
  for (const row of rows) {
    if (!row?.parent_id) continue;
    const list = byParent.get(row.parent_id);
    if (list) list.push(row);
    else byParent.set(row.parent_id, [row]);
  }
  return byParent;
}

/**
 * Why a contract can't take a change order right now, or null if it can.
 * A change order amends a signed contract; there's nothing to amend before
 * that, and a change order of a change order isn't a thing.
 */
export function cannotIssueChangeOrder(
  contract: { status?: string | null; parent_id?: string | null } | null | undefined
): string | null {
  if (!contract) return "Contract not found.";
  if (contract.parent_id) return "A change order can only amend the original contract.";
  if (contract.status !== "approved") {
    return "Change orders amend a signed contract. Use scope amendment while the proposal is still awaiting approval.";
  }
  return null;
}

export const MIN_SIGNATURE_LENGTH = 2;

export function cleanSignature(value: unknown): string {
  return (value ?? "").toString().replace(/\s+/g, " ").trim();
}

/**
 * Why this approval must be refused, or null when it may proceed.
 *
 * The parent id comes from the portal URL the homeowner is on. Requiring it to
 * match means a change order can only be signed from the contract it belongs
 * to — the same trust boundary the original contract signature relies on.
 */
export function cannotApproveChangeOrder(
  changeOrder: { status?: string | null; parent_id?: string | null } | null | undefined,
  expectedParentId: string | null | undefined,
  signature: unknown
): { status: number; error: string } | null {
  if (!changeOrder) return { status: 404, error: "Change order not found." };
  if (!expectedParentId || changeOrder.parent_id !== expectedParentId) {
    return { status: 404, error: "Change order not found." };
  }
  if (changeOrder.status === "approved") {
    return { status: 409, error: "This change order has already been signed." };
  }
  if (changeOrder.status !== "pending") {
    return { status: 409, error: "This change order is no longer open for signature." };
  }
  if (cleanSignature(signature).length < MIN_SIGNATURE_LENGTH) {
    return { status: 400, error: "Please type your full name to sign." };
  }
  return null;
}

/**
 * Change orders signed before this one — the "net change by previously
 * authorised change orders" line on the document.
 *
 * For a pending change order that's every signed sibling: if it's signed now,
 * it lands on top of all of them. For a signed one it's only the siblings
 * signed *before* it, so a re-downloaded CO1 still shows the contract as it
 * stood when CO1 was signed, not as it stands today after CO4.
 */
export function priorApprovedTotal(
  changeOrder: { id?: string; status?: string | null; signed_at?: string | null; created_at?: string | null },
  siblings: Array<{ id?: string; status?: string | null; amount?: unknown; signed_at?: string | null; created_at?: string | null }>
): number {
  const signedAt = (row: { signed_at?: string | null; created_at?: string | null }) =>
    new Date(row.signed_at || row.created_at || 0).getTime();
  const thisSignedAt = changeOrder.status === "approved" ? signedAt(changeOrder) : Infinity;

  const total = siblings
    .filter((s) => s.id !== changeOrder.id && s.status === "approved" && signedAt(s) < thisSignedAt)
    .reduce((sum, s) => sum + toNum(s.amount), 0);

  return Math.round(total * 100) / 100;
}

/** Everything the PDF generator needs to render a change order. */
export function changeOrderPdfInput(
  changeOrder: Record<string, any>,
  contract: Record<string, any> | null | undefined,
  siblings: Array<Record<string, any>> = []
): PdfInvoiceData {
  return {
    proposal_number: changeOrder.proposal_number,
    estimate_number: changeOrder.estimate_number,
    homeowner_name: changeOrder.homeowner_name || contract?.homeowner_name || "Client",
    homeowner_email: changeOrder.homeowner_email || contract?.homeowner_email,
    job_address: changeOrder.job_address || contract?.job_address || "",
    project_title: changeOrder.project_title || contract?.project_title,
    amount: toNum(changeOrder.amount),
    items: Array.isArray(changeOrder.items) ? changeOrder.items : [],
    deposit_percentage: 0,
    payment_phases: changeOrder.payment_phases,
    status: changeOrder.status || "pending",
    signature_name: changeOrder.signature_name,
    signed_at: changeOrder.signed_at,
    change_order: {
      contract_number: contract?.proposal_number ?? null,
      original_total: toNum(contract?.amount),
      prior_approved_total: priorApprovedTotal(changeOrder, siblings),
      schedule_impact: changeOrder.schedule_impact ?? null,
    },
  };
}

/**
 * The figures every change-order email states. Built from the same
 * priorApprovedTotal the PDF uses, so the email and the attached document can
 * never disagree about what the contract was or becomes.
 */
export function changeOrderEmailFigures(
  changeOrder: Record<string, any>,
  contract: Record<string, any> | null | undefined,
  siblings: Array<Record<string, any>> = []
) {
  const amount = toNum(changeOrder.amount);
  const priorContractTotal =
    Math.round((toNum(contract?.amount) + priorApprovedTotal(changeOrder, siblings)) * 100) / 100;

  return {
    change_order_number: changeOrder.proposal_number ?? null,
    contract_number: contract?.proposal_number ?? null,
    homeowner_name: changeOrder.homeowner_name || contract?.homeowner_name || "Client",
    project_title: changeOrder.project_title || contract?.project_title || null,
    job_address: changeOrder.job_address || contract?.job_address || null,
    description: (changeOrder.description || "").toString(),
    amount,
    prior_contract_total: priorContractTotal,
    revised_contract_total: Math.round((priorContractTotal + amount) * 100) / 100,
    schedule_impact: changeOrder.schedule_impact ?? null,
    items: (Array.isArray(changeOrder.items) ? changeOrder.items : []).map((item: any) => ({
      title: (item?.title ?? "").toString(),
      cost: toNum(item?.cost ?? item?.mid_cost),
    })),
    signature_name: changeOrder.signature_name ?? null,
    signed_at: changeOrder.signed_at ?? null,
  };
}

/**
 * The signed contract, as the scope generator sees it when drafting a change
 * order. Without this the generator priced from a blank slate, so a change
 * order could re-price work the homeowner had already signed for — and
 * nothing would catch it. Prior change orders are included too: work added by
 * CO1 is just as much "already in the contract" when drafting CO2.
 */
export function describeContractForChangeOrder(
  contractItems: unknown,
  priorChangeOrders: Array<{ proposal_number?: string | null; status?: string | null; items?: unknown }> = []
): string {
  const describe = (items: unknown) =>
    (Array.isArray(items) ? items : [])
      .map((item: any) => {
        const title = (item?.title ?? item?.high_title ?? "").toString().trim();
        if (!title) return null;
        const detail = (item?.description ?? item?.mid_description ?? "").toString().trim();
        const cost = toNum(item?.cost ?? item?.mid_cost);
        return `- ${title} ($${cost.toLocaleString("en-US")})${detail ? ` — ${detail}` : ""}`;
      })
      .filter(Boolean)
      .join("\n");

  const sections = [describe(contractItems) || "- (no line items on file)"];
  for (const co of priorChangeOrders) {
    if (co?.status !== "approved") continue;
    const lines = describe(co.items);
    if (lines) sections.push(`Added by ${co.proposal_number || "an earlier change order"}:\n${lines}`);
  }
  return sections.join("\n\n");
}

export interface AlreadyCovered {
  /** The part of the contractor's request the model thinks is already signed for. */
  request: string;
  /** The contract line it matched. */
  existing_title: string;
}

/** Model output is untrusted input; keep only well-formed overlap notes. */
export function normalizeAlreadyCovered(raw: unknown): AlreadyCovered[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry: any): AlreadyCovered[] => {
    const request = (entry?.request ?? "").toString().trim();
    const existing_title = (entry?.existing_title ?? "").toString().trim();
    return request && existing_title ? [{ request, existing_title }] : [];
  });
}

/** True once any payment has been recorded against the change order. */
export function changeOrderIsPaid(co: { deposit_cleared?: unknown; payment_history?: unknown } | null | undefined): boolean {
  if (!co) return false;
  if (co.deposit_cleared === true) return true;
  return Array.isArray(co.payment_history) && co.payment_history.length > 0;
}

/** What has to be typed to delete a signed change order. */
export function deleteConfirmationFor(co: { proposal_number?: string | null }): string {
  return (co.proposal_number || "").trim() || "DELETE";
}

/**
 * Why this change order can't be deleted, or null.
 *
 * - Awaiting signature: deletable. It's an offer being withdrawn.
 * - Signed: part of the contract, so deleting it lowers what the homeowner
 *   owes. Allowed, but only with its number typed back, so it can't happen
 *   by a stray tap.
 * - Paid: never. A payment is recorded against it, and deleting the change
 *   order would leave that money attached to nothing.
 */
export function cannotDeleteChangeOrder(
  co: { status?: string | null; parent_id?: string | null; proposal_number?: string | null; deposit_cleared?: unknown; payment_history?: unknown } | null | undefined,
  expectedParentId: string | null | undefined,
  confirmation?: unknown
): { status: number; error: string; needsConfirmation?: string } | null {
  if (!co || !expectedParentId || co.parent_id !== expectedParentId) {
    return { status: 404, error: "Change order not found." };
  }
  if (changeOrderIsPaid(co)) {
    return {
      status: 409,
      error: "This change order has been paid, so it can't be deleted. Refund the payment in Stripe first if it needs to be reversed.",
    };
  }
  if (co.status === "approved") {
    const expected = deleteConfirmationFor(co);
    if ((confirmation ?? "").toString().trim().toUpperCase() !== expected.toUpperCase()) {
      return {
        status: 400,
        error: `This change order is signed and part of the contract. Type ${expected} to delete it.`,
        needsConfirmation: expected,
      };
    }
  }
  return null;
}
