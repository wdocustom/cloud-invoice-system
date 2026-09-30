import { test } from "node:test";
import assert from "node:assert/strict";
import {
  contractTotalMismatch,
  itemsContractTotal,
  lineBidOf,
  lineContractAmountOf,
} from "./contract-total";

/** The shape signing writes: the chosen tier in `cost`, no `mid_cost`. */
const signedLines = [
  { title: "Basement Framing & Wall Construction", description: "…", cost: 9_000 },
  { title: "Basement Flooring Installation", description: "…", cost: 8_725.65 },
  { title: "HVAC System Modifications", description: "…", cost: 1_770 },
];
const signedTotal = 19_495.65;

/** The shape a proposal carries before signing. */
const proposalLines = [
  { title: "Framing", mid_cost: 9_000, high_cost: 12_150 },
  { title: "Flooring", mid_cost: 8_725.65, high_cost: 11_779.63 },
];

// ── The bug in the recording ──

test("a signed contract totals its signed prices", () => {
  assert.equal(itemsContractTotal(signedLines, true), signedTotal);
});

test("totalling a signed contract with the unsigned rule gives $0 — the reported bug", () => {
  // This is what the stale inline-edit save did: it couldn't see the contract
  // was signed, summed `mid_cost`, and signing had already removed it.
  // Documented here so the mechanism can't quietly come back.
  const legacyUnsignedRule = signedLines.reduce((s, i: any) => s + (Number(i.mid_cost) || 0), 0);
  assert.equal(legacyUnsignedRule, 0);
  // The canonical rule falls back to `cost` even if misclassified.
  assert.equal(itemsContractTotal(signedLines, false), signedTotal);
});

test("the stored $0 on a signed contract is detected as a mismatch", () => {
  assert.deepEqual(
    contractTotalMismatch({ status: "approved", amount: 0, items: signedLines }),
    { stored: 0, expected: signedTotal }
  );
});

// ── Blank values never silently zero a line ──

test("a blank cost falls back to the proposal price instead of counting $0", () => {
  // The old `cost ?? mid_cost` stopped at "" and counted the line as $0,
  // while the Bid Amount display (`cost || mid_cost`) showed the real price.
  assert.equal(lineBidOf({ cost: "", mid_cost: 3_924 }, true), 3_924);
  assert.equal(lineBidOf({ cost: "   ", mid_cost: 3_924 }, true), 3_924);
  assert.equal(lineBidOf({ cost: null, mid_cost: 3_924 }, true), 3_924);
});

test("a blank actual cost doesn't replace the bid", () => {
  assert.equal(lineContractAmountOf({ cost: 2_216, actual_cost: "" }, true), 2_216);
  assert.equal(lineContractAmountOf({ cost: 2_216, actual_cost: null }, true), 2_216);
});

test("a genuine zero is still a zero", () => {
  // A no-charge line is real; only blanks fall through.
  assert.equal(lineBidOf({ cost: 0, mid_cost: 3_924 }, true), 0);
  assert.equal(lineContractAmountOf({ cost: 2_216, actual_cost: 0 }, true), 0);
});

test("non-numeric junk is treated as missing, not as NaN", () => {
  assert.equal(lineBidOf({ cost: "abc", mid_cost: 500 }, true), 500);
  assert.equal(lineBidOf({ cost: "abc" }, true), 0);
});

// ── Existing semantics kept ──

test("an unsigned proposal totals its standard-tier prices", () => {
  assert.equal(itemsContractTotal(proposalLines, false), 17_725.65);
});

test("on a signed contract a recorded actual cost replaces the bid (existing behaviour)", () => {
  assert.equal(itemsContractTotal([{ cost: 1_000, actual_cost: 1_250 }, { cost: 500 }], true), 1_750);
});

test("actual costs are ignored before signing", () => {
  assert.equal(lineContractAmountOf({ mid_cost: 1_000, actual_cost: 50 }, false), 1_000);
});

// ── Mismatch detection ──

test("a stored total that matches its items is not flagged", () => {
  assert.equal(contractTotalMismatch({ status: "approved", amount: signedTotal, items: signedLines }), null);
  assert.equal(contractTotalMismatch({ status: "approved", amount: "19495.65", items: signedLines }), null);
});

test("sub-cent float noise is not a mismatch", () => {
  assert.equal(contractTotalMismatch({ status: "approved", amount: 0.1 + 0.2, items: [{ cost: 0.3 }] }), null);
});

test("a contract with no items isn't flagged — there's nothing to compare against", () => {
  assert.equal(contractTotalMismatch({ status: "approved", amount: 0, items: [] }), null);
  assert.equal(contractTotalMismatch({ status: "approved", amount: 0, items: null }), null);
  assert.equal(contractTotalMismatch(null), null);
});

test("junk input totals to zero rather than throwing", () => {
  assert.equal(itemsContractTotal(undefined, true), 0);
  assert.equal(itemsContractTotal([null, {}, "x"], true), 0);
});
