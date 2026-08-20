import { toNum } from "./utils";

/**
 * Applying an AI-proposed scope amendment to a proposal's line items.
 *
 * The model never writes to the database. It proposes operations, the
 * contractor accepts the ones they want in the admin, and these pure functions
 * turn the accepted set into a new items array. Keeping the apply step here —
 * rather than trusting a model-generated items array wholesale — means a
 * hallucinated field can't silently rewrite a line the contractor didn't agree
 * to change.
 */

export const UNCATEGORIZED = "General Scope";

export type ScopeOperationAction = "merge" | "add" | "recategorize";

export interface ScopeOperation {
  action: ScopeOperationAction;
  /** Index into the existing items array. Required for merge/recategorize. */
  target_index?: number;
  category: string;
  title?: string;
  mid_description?: string;
  mid_cost?: number;
  high_title?: string;
  high_description?: string;
  high_cost?: number;
  /** Why the model routed the request this way — shown to the contractor. */
  reason?: string;
  /** The piece of the contractor's request this operation covers. */
  addition?: string;
}

export interface ScopeAmendment {
  summary: string;
  category_order: string[];
  operations: ScopeOperation[];
}

/** An operation paired with the line it affects, so the UI can show a diff. */
export interface ScopeOperationPreview {
  operation: ScopeOperation;
  /** The existing line a merge/recategorize touches. */
  before: Record<string, any> | null;
  /** What that line (or the new line) becomes. */
  after: Record<string, any>;
  /** after.mid_cost - before.mid_cost, or the full cost of a new line. */
  mid_delta: number;
  high_delta: number;
}

export function categoryOf(item: Record<string, any> | null | undefined): string {
  const raw = (item?.category ?? "").toString().trim();
  return raw || UNCATEGORIZED;
}

/** A line item's mid-tier cost, tolerating the older `cost` shape. */
export function midCostOf(item: Record<string, any> | null | undefined): number {
  return toNum(item?.mid_cost ?? item?.cost);
}

export function highCostOf(item: Record<string, any> | null | undefined): number {
  return toNum(item?.high_cost ?? item?.mid_cost ?? item?.cost);
}

/** Costs never go negative, and never carry sub-cent noise from the model. */
function cleanCost(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === "") return fallback;
  const n = toNum(value);
  return n > 0 ? Math.round(n * 100) / 100 : 0;
}

function cleanText(value: unknown, fallback: string): string {
  const text = (value ?? "").toString().trim();
  return text || fallback;
}

/**
 * The line a merge produces: the original item with only the fields the model
 * actually supplied replaced. Everything else — actual_cost above all — is
 * carried through untouched.
 */
export function mergedItem(existing: Record<string, any>, op: ScopeOperation): Record<string, any> {
  const midFallback = midCostOf(existing);
  const highFallback = highCostOf(existing);
  const title = cleanText(op.title, existing.title || "");

  return {
    ...existing,
    category: cleanText(op.category, categoryOf(existing)),
    title,
    mid_description: cleanText(op.mid_description, existing.mid_description || ""),
    mid_cost: cleanCost(op.mid_cost, midFallback),
    high_title: cleanText(op.high_title, existing.high_title || title),
    high_description: cleanText(op.high_description, existing.high_description || ""),
    high_cost: cleanCost(op.high_cost, highFallback),
  };
}

/** The line an `add` operation produces. */
export function newItem(op: ScopeOperation): Record<string, any> {
  const title = cleanText(op.title, "Added scope");
  const midCost = cleanCost(op.mid_cost, 0);
  const midDescription = cleanText(op.mid_description, "");

  return {
    category: cleanText(op.category, UNCATEGORIZED),
    title,
    mid_description: midDescription,
    mid_cost: midCost,
    high_title: cleanText(op.high_title, title),
    high_description: cleanText(op.high_description, midDescription),
    // Matches the manual add form's convention when the model gives no
    // luxury figure.
    high_cost: cleanCost(op.high_cost, Math.round(midCost * 1.35 * 100) / 100),
  };
}

/**
 * Pairs each operation with the line it touches so the contractor sees a real
 * before/after — built from the stored items, not from anything the model said
 * the current state was.
 */
export function previewAmendment(
  items: Record<string, any>[],
  operations: ScopeOperation[]
): ScopeOperationPreview[] {
  return operations.map((operation) => {
    const target =
      operation.action === "add" ? null : items[operation.target_index as number] ?? null;

    if (!target) {
      const after = newItem(operation);
      return {
        operation: { ...operation, action: "add" },
        before: null,
        after,
        mid_delta: midCostOf(after),
        high_delta: highCostOf(after),
      };
    }

    const after =
      operation.action === "recategorize"
        ? { ...target, category: cleanText(operation.category, categoryOf(target)) }
        : mergedItem(target, operation);

    return {
      operation,
      before: target,
      after,
      mid_delta: midCostOf(after) - midCostOf(target),
      high_delta: highCostOf(after) - highCostOf(target),
    };
  });
}

/**
 * Groups items under their category, keeping each category's lines in their
 * existing relative order. `preferredOrder` (the model's suggestion) leads;
 * any category it didn't mention keeps its current position behind that.
 */
export function orderItemsByCategory(
  items: Record<string, any>[],
  preferredOrder: string[] = []
): Record<string, any>[] {
  const seen: string[] = [];
  items.forEach((item) => {
    const category = categoryOf(item);
    if (!seen.includes(category)) seen.push(category);
  });

  const ranked = [
    ...preferredOrder.map((c) => (c || "").trim()).filter((c) => c && seen.includes(c)),
    ...seen,
  ].filter((category, i, all) => all.indexOf(category) === i);

  return ranked.flatMap((category) => items.filter((item) => categoryOf(item) === category));
}

/**
 * Folds the accepted operations into a new items array, then groups it by
 * category. Merges land on their original line; additions go to the end before
 * grouping, so they settle beside the category they belong to.
 */
export function applyScopeAmendment(
  items: Record<string, any>[],
  operations: ScopeOperation[],
  categoryOrder: string[] = []
): Record<string, any>[] {
  const next = [...items];

  operations.forEach((op) => {
    if (op.action === "add") {
      next.push(newItem(op));
      return;
    }

    const idx = op.target_index;
    if (typeof idx !== "number" || !next[idx]) {
      // A stale index would otherwise silently drop the contractor's addition.
      next.push(newItem(op));
      return;
    }

    next[idx] =
      op.action === "recategorize"
        ? { ...next[idx], category: cleanText(op.category, categoryOf(next[idx])) }
        : mergedItem(next[idx], op);
  });

  return orderItemsByCategory(next, categoryOrder);
}

/** [{ category, entries: [{ item, index }] }] for grouped rendering. */
export function groupItemsByCategory(
  items: Record<string, any>[] | null | undefined
): { category: string; entries: { item: Record<string, any>; index: number }[] }[] {
  const groups: { category: string; entries: { item: Record<string, any>; index: number }[] }[] = [];

  (Array.isArray(items) ? items : []).forEach((item, index) => {
    const category = categoryOf(item);
    const group = groups.find((g) => g.category === category);
    if (group) group.entries.push({ item, index });
    else groups.push({ category, entries: [{ item, index }] });
  });

  return groups;
}

const VALID_ACTIONS: ScopeOperationAction[] = ["merge", "add", "recategorize"];

/**
 * A cost as the model wrote it. The prompt asks for a raw number, but models
 * slip into "$4,800" often enough that discarding those to 0 would quietly
 * under-price a line the contractor then has to catch by eye.
 */
function parseModelCost(value: unknown): number {
  const cleaned = typeof value === "string" ? value.replace(/[$,\s]/g, "") : value;
  return Math.max(0, toNum(cleaned));
}

/**
 * Model output is untrusted input. Anything mistyped, out of range, or pointing
 * at a line that doesn't exist is dropped or downgraded here, before it can
 * reach the contractor's ledger.
 *
 * A merge aimed at a missing line degrades to a new line — the contractor asked
 * for that work, so losing it silently would be worse than filing it loose. A
 * recategorize aimed at a missing line has nothing to move, so it goes.
 */
export function normalizeOperations(raw: any, itemCount: number): ScopeOperation[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((op: any): ScopeOperation[] => {
    const action: ScopeOperationAction = VALID_ACTIONS.includes(op?.action) ? op.action : "add";
    const rawIndex = Number(op?.target_index);
    const hasIndex = Number.isInteger(rawIndex) && rawIndex >= 0 && rawIndex < itemCount;

    if (action === "recategorize" && !hasIndex) return [];
    const resolvedAction: ScopeOperationAction = action === "merge" && !hasIndex ? "add" : action;

    const title = (op?.title ?? "").toString().trim();
    if (resolvedAction === "add" && !title) return [];

    return [
      {
        action: resolvedAction,
        ...(resolvedAction === "add" ? {} : { target_index: rawIndex }),
        category: (op?.category ?? "").toString().trim() || UNCATEGORIZED,
        title,
        mid_description: (op?.mid_description ?? "").toString().trim(),
        mid_cost: parseModelCost(op?.mid_cost),
        high_title: (op?.high_title ?? "").toString().trim(),
        high_description: (op?.high_description ?? "").toString().trim(),
        high_cost: parseModelCost(op?.high_cost),
        reason: (op?.reason ?? "").toString().trim(),
        addition: (op?.addition ?? "").toString().trim(),
      },
    ];
  });
}
