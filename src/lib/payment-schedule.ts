import { toNum } from "./utils";

/**
 * One place that answers "what is the deposit worth, and what is each draw
 * worth, right now".
 *
 * Percentage is the source of truth; dollars are always derived from the
 * project's CURRENT total. Both the deposit and each draw phase also carry a
 * stored `amount`, and the app used to prefer it — `phase.amount ?? computed`.
 * That froze every figure at whatever the total happened to be when it was last
 * touched, so editing line items left a schedule whose percentages said 100%
 * while its dollars added up to the old contract value. The homeowner was then
 * shown, and charged, the stale numbers.
 *
 * Stored amounts are still written, as a mirror for anything reading the row
 * directly, but they are never read back as authority.
 */

export const DEFAULT_DEPOSIT_PERCENT = 20;

/** Money is always cents. Kills the 5862.59999999 the old float math produced. */
export function roundCents(value: unknown): number {
  const n = toNum(value);
  return Math.round(n * 100) / 100;
}

/**
 * Stored percentages keep ten decimals. That looks excessive until you type a
 * dollar amount: $1,234.56 of a $20,442 contract is 6.0393112220%, and at four
 * decimals it derives back to $1,234.55 — the contractor types a figure and the
 * page shows them a different one. Precision lives in storage; rounding is a
 * display concern, handled by displayPercent below.
 */
function roundPercent(value: unknown): number {
  const n = toNum(value);
  return Math.min(100, Math.max(0, Math.round(n * 1e10) / 1e10));
}

/**
 * A percentage as a human should read it: at most two decimals, no trailing
 * zeros. 40 stays "40", 39.135109% becomes "39.14".
 */
export function displayPercent(value: unknown): number {
  return Math.round(toNum(value) * 100) / 100;
}

export function percentToAmount(percent: unknown, total: unknown): number {
  return roundCents(toNum(total) * (toNum(percent) / 100));
}

export function amountToPercent(amount: unknown, total: unknown): number {
  const t = toNum(total);
  if (t <= 0) return 0;
  return roundPercent((toNum(amount) / t) * 100);
}

/**
 * The deposit percentage on a proposal.
 *
 * Rows written before percentages were authoritative may carry only a dollar
 * amount, so that is converted rather than ignored — otherwise those proposals
 * would silently snap to the 20% default.
 */
export function depositPercentOf(invoice: Record<string, any> | null | undefined, total?: unknown): number {
  const stored = invoice?.deposit_percentage;
  if (stored !== null && stored !== undefined && stored !== "") return roundPercent(stored);

  const amount = invoice?.deposit_amount;
  if (amount !== null && amount !== undefined && amount !== "") {
    const derived = amountToPercent(amount, total ?? invoice?.amount);
    if (derived > 0) return derived;
  }

  return DEFAULT_DEPOSIT_PERCENT;
}

/** The deposit in dollars, against the total passed in. */
export function depositAmountOf(invoice: Record<string, any> | null | undefined, total: unknown): number {
  return percentToAmount(depositPercentOf(invoice, total), total);
}

/** The columns to write when the deposit or the project total changes. */
export function depositFieldsFor(percent: unknown, total: unknown): { deposit_percentage: number; deposit_amount: number } {
  const pct = roundPercent(percent);
  return { deposit_percentage: pct, deposit_amount: percentToAmount(pct, total) };
}

export function phasePercentOf(phase: Record<string, any> | null | undefined, total: unknown): number {
  const stored = phase?.percentage;
  if (stored !== null && stored !== undefined && stored !== "") return roundPercent(stored);

  const amount = phase?.amount;
  if (amount !== null && amount !== undefined && amount !== "") return amountToPercent(amount, total);

  return 0;
}

export function phaseAmountOf(phase: Record<string, any> | null | undefined, total: unknown): number {
  return percentToAmount(phasePercentOf(phase, total), total);
}

/**
 * Rewrites every phase's stored amount against the current total, so the row
 * on disk agrees with what everyone displays. Call this wherever the project
 * total can move.
 */
export function syncPhaseAmounts(
  phases: Record<string, any>[] | null | undefined,
  total: unknown
): Record<string, any>[] {
  if (!Array.isArray(phases)) return [];
  return phases.map((phase) => {
    const percentage = phasePercentOf(phase, total);
    return { ...phase, percentage, amount: percentToAmount(percentage, total) };
  });
}

/** Phases resolved for display: name, percentage, and current dollar value. */
export function resolvePhases(
  phases: Record<string, any>[] | null | undefined,
  total: unknown
): { name: string; percentage: number; amount: number; phase: Record<string, any> }[] {
  if (!Array.isArray(phases)) return [];
  return phases.map((phase) => {
    const percentage = phasePercentOf(phase, total);
    return {
      name: phase?.name || "Payment",
      percentage,
      amount: percentToAmount(percentage, total),
      phase,
    };
  });
}

/** Sum of the draw percentages — 100 means the schedule covers the contract. */
export function totalScheduledPercent(phases: Record<string, any>[] | null | undefined, total: unknown): number {
  return roundPercent(
    (Array.isArray(phases) ? phases : []).reduce((sum, phase) => sum + phasePercentOf(phase, total), 0)
  );
}

/**
 * What the draws actually collect. Compared against the contract total this is
 * what surfaces an under- or over-collecting schedule to the contractor.
 */
export function totalScheduledAmount(phases: Record<string, any>[] | null | undefined, total: unknown): number {
  return roundCents(
    resolvePhases(phases, total).reduce((sum, p) => sum + p.amount, 0)
  );
}
