/**
 * Stripe payment bookkeeping shared by checkout, the webhook and the portal.
 *
 * Card payments settle at checkout. ACH bank payments do not: Stripe completes
 * the checkout with `payment_status: "unpaid"` and only later sends
 * `checkout.session.async_payment_succeeded` (or `_failed`) once the bank
 * transfer clears, typically a few business days later. The webhook used to
 * treat both alike, so a bank payment marked the deposit paid and emailed a
 * "Payment Confirmed" receipt before any money had arrived, and a returned
 * transfer left it marked paid.
 *
 * Every payment_history entry now carries a status:
 *   - "paid"        settled (card, or ACH after it cleared)
 *   - "processing"  ACH started, not yet cleared — nothing is unlocked by it
 *   - "failed"      ACH returned — the phase is payable again
 * Entries written before this existed have Stripe's raw status ("paid", or
 * "unpaid" for ACH); those were treated as settled at the time and still are.
 */
import { toNum } from "./utils";
import { depositAmountOf, phaseAmountOf, roundCents } from "./payment-schedule";

export type PaymentStatus = "paid" | "processing" | "failed";

export interface PaymentRecord {
  stripe_session_id?: string;
  stripe_payment_intent?: unknown;
  amount: number;
  phase_index?: number;
  status?: string;
  customer_email?: string | null;
  paid_at?: string;
  settled_at?: string;
  failed_at?: string;
}

/** True when this entry is money actually received. */
export function isSettled(record: PaymentRecord | null | undefined): boolean {
  if (!record) return false;
  return record.status !== "processing" && record.status !== "failed";
}

/** Sum of what has actually been received. */
export function settledTotal(history: unknown): number {
  if (!Array.isArray(history)) return 0;
  return roundCents(history.filter(isSettled).reduce((sum: number, p: any) => sum + toNum(p?.amount), 0));
}

/** A bank payment still clearing for this phase (or for a change order, when phaseIndex is omitted). */
export function processingPaymentFor(history: unknown, phaseIndex?: number): PaymentRecord | null {
  if (!Array.isArray(history)) return null;
  return (
    history.find(
      (p: any) => p?.status === "processing" && (phaseIndex === undefined || toNum(p?.phase_index) === phaseIndex)
    ) ?? null
  );
}

/** How a checkout.session.completed event should be recorded. */
export function statusAtCheckout(paymentStatus: string | null | undefined): PaymentStatus {
  return paymentStatus === "paid" || paymentStatus === "no_payment_required" ? "paid" : "processing";
}

/**
 * What a contract payment is allowed to charge, computed from the stored
 * proposal rather than trusted from the browser. Mirrors the portal: the
 * deposit and each draw are taken against the signed contract amount.
 */
export function contractChargeFor(invoice: Record<string, any>, phaseIndex: number): number {
  const total = toNum(invoice?.amount);
  if (phaseIndex === 0) return depositAmountOf(invoice, total);
  const phase = Array.isArray(invoice?.payment_phases) ? invoice.payment_phases[phaseIndex] : null;
  return phase ? phaseAmountOf(phase, total) : 0;
}

/** The contract fields that change when a phase's payment settles. */
export function settlementUpdate(invoice: Record<string, any>, phaseIndex: number): Record<string, unknown> {
  if (phaseIndex === 0) {
    return {
      deposit_cleared: true,
      ...(!invoice?.current_phase_index ? { current_phase_index: 1 } : {}),
    };
  }
  return { current_phase_index: Math.max(toNum(invoice?.current_phase_index), phaseIndex + 1) };
}

/** Replace the entry for this session, or append it. */
export function upsertPaymentRecord(history: unknown, record: PaymentRecord): PaymentRecord[] {
  const list: PaymentRecord[] = Array.isArray(history) ? [...history] : [];
  const i = list.findIndex((p) => p?.stripe_session_id && p.stripe_session_id === record.stripe_session_id);
  if (i === -1) return [...list, record];
  list[i] = { ...list[i], ...record };
  return list;
}
