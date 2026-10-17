import { test } from "node:test";
import assert from "node:assert/strict";
import { applyScopeAmendment, normalizeOperations, previewAmendment } from "./scope-amendment";

const proposal = [
  { category: "Electrical", title: "Kitchen lighting", mid_description: "Six cans", mid_cost: 2400, high_cost: 3200 },
  { category: "Fixtures & Finishes", title: "Wet bar", mid_description: "Sink, cabinets, quartz", mid_cost: 5920, high_cost: 8000 },
  { category: "Flooring", title: "LVP flooring", mid_description: "900 sq ft", mid_cost: 8725.65, high_cost: 11779 },
];

test("remove drops the line and previews it as coming off the total", () => {
  const ops = normalizeOperations([{ action: "remove", target_index: 1, category: "Fixtures & Finishes", reason: "Client dropped the wet bar" }], proposal.length);
  assert.equal(ops.length, 1);
  assert.equal(ops[0].action, "remove");

  const [preview] = previewAmendment(proposal, ops);
  assert.equal(preview.before?.title, "Wet bar");
  assert.equal(preview.mid_delta, -5920);
  assert.equal(preview.high_delta, -8000);

  const next = applyScopeAmendment(proposal, ops);
  assert.deepEqual(next.map((i) => i.title), ["Kitchen lighting", "LVP flooring"]);
});

test("a reduction rewrites the line at its lower total", () => {
  const ops = normalizeOperations([
    { action: "merge", target_index: 2, category: "Flooring", title: "LVP flooring", mid_description: "600 sq ft", mid_cost: 5817, high_cost: 7853 },
  ], proposal.length);
  const [preview] = previewAmendment(proposal, ops);
  assert.equal(Math.round(preview.mid_delta * 100) / 100, -2908.65);
  assert.equal(applyScopeAmendment(proposal, ops).find((i) => i.title === "LVP flooring")?.mid_cost, 5817);
});

test("indices all refer to the original proposal, whatever order operations come in", () => {
  // Remove line 0 first, then merge line 2: if removal shifted indices early,
  // the merge would land on the wrong line.
  const ops = normalizeOperations([
    { action: "remove", target_index: 0, category: "Electrical" },
    { action: "merge", target_index: 2, category: "Flooring", title: "LVP flooring + stairs", mid_cost: 9900 },
    { action: "add", category: "Painting", title: "Accent wall", mid_cost: 800 },
  ], proposal.length);
  const next = applyScopeAmendment(proposal, ops);
  assert.deepEqual(next.map((i) => i.title).sort(), ["Accent wall", "LVP flooring + stairs", "Wet bar"]);
  assert.equal(next.find((i) => i.title === "Wet bar")?.mid_cost, 5920, "untouched line unchanged");
});

test("a removal aimed at a line that doesn't exist is dropped, never guessed", () => {
  assert.deepEqual(normalizeOperations([{ action: "remove", target_index: 7 }], proposal.length), []);
  assert.deepEqual(normalizeOperations([{ action: "remove" }], proposal.length), []);
});

test("a stale merge still becomes a new line rather than losing the work", () => {
  const ops = normalizeOperations([{ action: "merge", target_index: 9, category: "Painting", title: "Trim paint", mid_cost: 400 }], proposal.length);
  assert.equal(ops[0].action, "add");
});

test("unknown actions become additions, not removals", () => {
  const ops = normalizeOperations([{ action: "delete-everything", target_index: 0, title: "Thing", mid_cost: 1 }], proposal.length);
  assert.equal(ops[0].action, "add");
  assert.equal(applyScopeAmendment(proposal, ops).length, 4, "nothing removed");
});
