import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cannotApproveChangeOrder,
  cannotIssueChangeOrder,
  changeOrderAmount,
  changeOrderEmailFigures,
  changeOrderIndexOf,
  changeOrderPdfInput,
  changeOrdersByParent,
  cleanSignature,
  contractTotals,
  describeContractForChangeOrder,
  nextChangeOrderIndex,
  nextChangeOrderNumber,
  normalizeAlreadyCovered,
  normalizeChangeOrderItems,
  priorApprovedTotal,
} from "./change-orders";

// ── Numbering ──

test("reads the index off a change order number", () => {
  assert.equal(changeOrderIndexOf("PRO-2026-0007-CO1"), 1);
  assert.equal(changeOrderIndexOf("PRO-2026-0007-CO12"), 12);
  assert.equal(changeOrderIndexOf("PRO-2026-0007"), null);
  assert.equal(changeOrderIndexOf(""), null);
  assert.equal(changeOrderIndexOf(null), null);
  assert.equal(changeOrderIndexOf("PRO-2026-0007-CO0"), null);
});

test("the first change order is CO1", () => {
  assert.equal(nextChangeOrderIndex([]), 1);
  assert.equal(nextChangeOrderNumber("PRO-2026-0007", []), "PRO-2026-0007-CO1");
});

test("numbering counts up from the highest issued", () => {
  assert.equal(nextChangeOrderIndex(["PRO-2026-0007-CO1", "PRO-2026-0007-CO2"]), 3);
});

test("after a deletion, the next number never collides with one still in use", () => {
  // CO1 was deleted; CO2 remains. The old length+1 rule gave CO2 — a collision
  // with the unique index that made every further change order fail to save.
  const remaining = ["PRO-2026-0007-CO2"];
  assert.equal(remaining.length + 1, 2, "the old rule would have collided");
  assert.equal(nextChangeOrderIndex(remaining), 3);
});

test("a deleted trailing number is retired, not reissued", () => {
  // CO3 was deleted; CO1 and CO2 remain. Reissuing CO3 would give two
  // different documents the same number across time.
  assert.equal(nextChangeOrderIndex(["PRO-2026-0007-CO1", "PRO-2026-0007-CO2"]), 3);
});

test("unnumbered and malformed siblings are ignored rather than miscounted", () => {
  assert.equal(nextChangeOrderIndex([null, undefined, "", "garbage", "PRO-2026-0007-CO4"]), 5);
});

test("order of existing numbers doesn't matter", () => {
  assert.equal(nextChangeOrderIndex(["PRO-2026-0007-CO9", "PRO-2026-0007-CO2"]), 10);
});

test("an unnumbered contract issues unnumbered change orders", () => {
  assert.equal(nextChangeOrderNumber(null, []), null);
  assert.equal(nextChangeOrderNumber("", ["PRO-2026-0007-CO1"]), null);
});

// ── Line items ──

test("line items are cleaned into exactly what gets signed", () => {
  const items = normalizeChangeOrderItems([
    { title: "  Recessed lighting ", mid_description: "Six cans on dimmers", mid_cost: "1840.456" },
    { title: "", cost: 500 },
    { title: "Credit attempt", cost: -300 },
    null,
  ]);
  assert.deepEqual(items, [
    { title: "Recessed lighting", description: "Six cans on dimmers", cost: 1840.46 },
    { title: "Credit attempt", description: "", cost: 0 },
  ]);
});

test("non-array input yields no lines rather than throwing", () => {
  assert.deepEqual(normalizeChangeOrderItems(undefined), []);
  assert.deepEqual(normalizeChangeOrderItems({ title: "x" }), []);
});

test("the amount is the sum of the lines, to the cent", () => {
  assert.equal(changeOrderAmount([
    { title: "a", description: "", cost: 0.1 },
    { title: "b", description: "", cost: 0.2 },
  ]), 0.3);
});

// ── Totals ──

test("only signed change orders count toward the contract", () => {
  const totals = contractTotals({ amount: 100_000 }, [
    { status: "approved", amount: 12_500 },
    { status: "approved", amount: 2_500 },
    { status: "pending", amount: 8_000 },
  ]);
  assert.equal(totals.original, 100_000);
  assert.equal(totals.approved, 15_000);
  assert.equal(totals.pending, 8_000);
  assert.equal(totals.revised, 115_000);
  assert.equal(totals.approvedCount, 2);
  assert.equal(totals.pendingCount, 1);
});

test("a contract with no change orders is its own revised total", () => {
  const totals = contractTotals({ amount: "48250.5" });
  assert.equal(totals.revised, 48_250.5);
  assert.equal(totals.approved, 0);
});

test("totals tolerate missing contract and junk amounts", () => {
  const totals = contractTotals(null, [{ status: "approved", amount: "n/a" }, {} as any]);
  assert.equal(totals.revised, 0);
  assert.equal(totals.approvedCount, 1);
});

test("change orders group under their contract", () => {
  const grouped = changeOrdersByParent([
    { id: "a", parent_id: "p1" },
    { id: "b", parent_id: "p2" },
    { id: "c", parent_id: "p1" },
    { id: "d", parent_id: null },
  ]);
  assert.deepEqual(grouped.get("p1")?.map((r) => r.id), ["a", "c"]);
  assert.deepEqual(grouped.get("p2")?.map((r) => r.id), ["b"]);
  assert.equal(grouped.size, 2);
});

// ── Issuing ──

test("a change order can only amend a signed original contract", () => {
  assert.equal(cannotIssueChangeOrder({ status: "approved", parent_id: null }), null);
  assert.match(cannotIssueChangeOrder({ status: "pending", parent_id: null })!, /scope amendment/);
  assert.match(cannotIssueChangeOrder({ status: "approved", parent_id: "x" })!, /original contract/);
  assert.match(cannotIssueChangeOrder(null)!, /not found/);
});

// ── Signing ──

const pendingCo = { status: "pending", parent_id: "contract-1" };

test("a pending change order signed from its own contract may be approved", () => {
  assert.equal(cannotApproveChangeOrder(pendingCo, "contract-1", "Dana Whitfield"), null);
});

test("an approval without a signature is refused", () => {
  for (const signature of ["", "   ", "D", null, undefined]) {
    const refusal = cannotApproveChangeOrder(pendingCo, "contract-1", signature);
    assert.equal(refusal?.status, 400, `accepted signature ${JSON.stringify(signature)}`);
  }
});

test("a change order can't be signed from a different contract's portal", () => {
  const refusal = cannotApproveChangeOrder(pendingCo, "contract-2", "Dana Whitfield");
  assert.equal(refusal?.status, 404);
});

test("a missing parent id is refused, not treated as a wildcard", () => {
  assert.equal(cannotApproveChangeOrder(pendingCo, "", "Dana Whitfield")?.status, 404);
  assert.equal(cannotApproveChangeOrder(pendingCo, undefined, "Dana Whitfield")?.status, 404);
});

test("signing twice is refused, so the first signature and timestamp stand", () => {
  const refusal = cannotApproveChangeOrder({ ...pendingCo, status: "approved" }, "contract-1", "Someone Else");
  assert.equal(refusal?.status, 409);
});

test("a change order in any other state can't be signed", () => {
  assert.equal(cannotApproveChangeOrder({ ...pendingCo, status: "declined" }, "contract-1", "Dana")?.status, 409);
});

test("an unknown change order is a 404", () => {
  assert.equal(cannotApproveChangeOrder(null, "contract-1", "Dana")?.status, 404);
});

test("signatures are collapsed to single spaces and trimmed", () => {
  assert.equal(cleanSignature("  Dana   Whitfield \n"), "Dana Whitfield");
  assert.equal(cleanSignature(null), "");
});

// ── The document's "prior change orders" line ──


const co1 = { id: "co1", status: "approved", amount: 4_000, signed_at: "2026-09-01T10:00:00Z" };
const co2 = { id: "co2", status: "approved", amount: 6_000, signed_at: "2026-09-10T10:00:00Z" };
const co3 = { id: "co3", status: "pending", amount: 2_500, created_at: "2026-09-12T10:00:00Z" };
const siblings = [co1, co2, co3];

test("a pending change order lands on top of every signed one", () => {
  assert.equal(priorApprovedTotal(co3, siblings), 10_000);
});

test("a signed change order counts only those signed before it", () => {
  assert.equal(priorApprovedTotal(co1, siblings), 0);
  assert.equal(priorApprovedTotal(co2, siblings), 4_000);
});

test("re-downloading an old change order still shows the contract as it stood then", () => {
  const later = { id: "co4", status: "approved", amount: 9_000, signed_at: "2026-09-20T10:00:00Z" };
  assert.equal(priorApprovedTotal(co1, [...siblings, later]), 0);
});

test("a change order never counts itself", () => {
  assert.equal(priorApprovedTotal(co2, [co2]), 0);
});

test("pending siblings never count as prior changes", () => {
  assert.equal(priorApprovedTotal({ id: "x", status: "pending" }, [co3]), 0);
});

test("the PDF input carries the contract reference and the revised-sum inputs", () => {
  const input = changeOrderPdfInput(
    { ...co3, proposal_number: "PRO-2026-0007-CO3", items: [{ title: "Cans", cost: 2500 }], schedule_impact: "Adds 2 working days" },
    { proposal_number: "PRO-2026-0007", amount: 100_000, homeowner_name: "Dana Whitfield", job_address: "1 Main St" },
    siblings
  );
  assert.equal(input.change_order?.contract_number, "PRO-2026-0007");
  assert.equal(input.change_order?.original_total, 100_000);
  assert.equal(input.change_order?.prior_approved_total, 10_000);
  assert.equal(input.change_order?.schedule_impact, "Adds 2 working days");
  assert.equal(input.homeowner_name, "Dana Whitfield", "falls back to the contract's client");
  assert.equal(input.amount, 2_500);
});

test("email figures agree with the document's revised contract sum", () => {
  const contract = { proposal_number: "PRO-2026-0007", amount: 100_000, homeowner_name: "Dana Whitfield" };
  const figures = changeOrderEmailFigures({ ...co3, proposal_number: "PRO-2026-0007-CO3" }, contract, siblings);
  const pdf = changeOrderPdfInput({ ...co3 }, contract, siblings);

  assert.equal(figures.prior_contract_total, 110_000);
  assert.equal(figures.revised_contract_total, 112_500);
  assert.equal(
    figures.revised_contract_total,
    pdf.change_order!.original_total + pdf.change_order!.prior_approved_total + pdf.amount,
    "the email and the attached PDF must state the same revised total"
  );
});

// ── What the scope generator is told about the signed contract ──

test("the contract description lists every signed line with its price", () => {
  const text = describeContractForChangeOrder([
    { title: "Electrical — Kitchen", mid_description: "Six recessed cans", mid_cost: 2400 },
    { title: "Plumbing", description: "Relocate sink", cost: 3100 },
  ]);
  assert.match(text, /Electrical — Kitchen \(\$2,400\) — Six recessed cans/);
  assert.match(text, /Plumbing \(\$3,100\) — Relocate sink/);
});

test("signed change orders count as part of the contract; pending ones don't", () => {
  const text = describeContractForChangeOrder(
    [{ title: "Base scope", cost: 1000 }],
    [
      { proposal_number: "PRO-2026-0007-CO1", status: "approved", items: [{ title: "Pantry shelving", cost: 900 }] },
      { proposal_number: "PRO-2026-0007-CO2", status: "pending", items: [{ title: "Unsigned work", cost: 500 }] },
    ]
  );
  assert.match(text, /Added by PRO-2026-0007-CO1:\n- Pantry shelving/);
  assert.doesNotMatch(text, /Unsigned work/);
});

test("an empty contract says so rather than sending nothing", () => {
  assert.match(describeContractForChangeOrder([]), /no line items on file/);
  assert.match(describeContractForChangeOrder(null), /no line items on file/);
});

test("overlap notes keep only complete entries", () => {
  assert.deepEqual(
    normalizeAlreadyCovered([
      { request: "can lights in kitchen", existing_title: "Electrical — Kitchen" },
      { request: "", existing_title: "x" },
      { request: "y" },
      "garbage",
    ]),
    [{ request: "can lights in kitchen", existing_title: "Electrical — Kitchen" }]
  );
  assert.deepEqual(normalizeAlreadyCovered(undefined), []);
});
