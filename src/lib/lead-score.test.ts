import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LEAD_SCORE_VERSION,
  bandForScore,
  leadScoreFields,
  scoreLead,
  scoreLeadRow,
} from "./lead-score";

/** A strong lead: big Omaha job, detailed brief, full contact details. */
const strongLead = {
  projectType: "Basement Finishing",
  scopeLevel: "high",
  size: "1200 sq ft",
  zip: "68114",
  description:
    "Full basement finish, roughly 1200 square feet. Adding a three-quarter bathroom with a tile shower, a wet bar with quartz countertop, egress window in the bedroom, and LVP flooring throughout. Ceiling height is 8 feet and there is no moisture history.",
  name: "Dana Whitfield",
  email: "dana@example.com",
  phone: "402-555-0134",
  estimateLow: 82_000,
  estimateHigh: 104_000,
};

/** A weak lead: tiny out-of-area job, four words, one contact method. */
const weakLead = {
  projectType: "Interior Painting",
  scopeLevel: "budget",
  size: "",
  zip: "90210",
  description: "need painting done",
  name: "",
  email: "someone@example.com",
  phone: "",
  estimateLow: 2_400,
  estimateHigh: 3_600,
};

test("scores a strong lead into band A", () => {
  const result = scoreLead(strongLead);
  assert.equal(result.band, "A");
  assert.ok(result.score >= 70, `expected >= 70, got ${result.score}`);
  assert.deepEqual(result.flags, []);
});

test("scores a weak out-of-area lead into band C and flags it", () => {
  const result = scoreLead(weakLead);
  assert.equal(result.band, "C");
  assert.ok(result.score < 45, `expected < 45, got ${result.score}`);
  assert.ok(result.flags.includes("out_of_area"));
  assert.ok(result.flags.includes("vague_description"));
});

test("score never leaves 0-100 and components never exceed their max", () => {
  for (const input of [strongLead, weakLead, {}]) {
    const result = scoreLead(input);
    assert.ok(result.score >= 0 && result.score <= 100, `out of range: ${result.score}`);
    for (const component of result.components) {
      assert.ok(
        component.points >= 0 && component.points <= component.max,
        `${component.key} scored ${component.points}/${component.max}`
      );
    }
  }
});

test("component maxima sum to exactly 100", () => {
  const total = scoreLead(strongLead).components.reduce((sum, c) => sum + c.max, 0);
  assert.equal(total, 100);
});

test("is pure — same input scores the same twice", () => {
  assert.equal(scoreLead(strongLead).score, scoreLead(strongLead).score);
});

test("an empty lead scores without throwing and flags missing data", () => {
  const result = scoreLead({});
  assert.equal(typeof result.score, "number");
  assert.ok(result.flags.includes("no_contact"));
  assert.ok(result.flags.includes("no_zip"));
});

test("a lead with no contact method is flagged rather than merely scored low", () => {
  const result = scoreLead({ ...strongLead, email: "", phone: "" });
  assert.ok(result.flags.includes("no_contact"));
  // Still a substantial score — the flag is what makes it actionable, not the number.
  assert.ok(result.score >= 45);
});

test("band boundaries are inclusive at 70 and 45", () => {
  assert.equal(bandForScore(70), "A");
  assert.equal(bandForScore(69), "B");
  assert.equal(bandForScore(45), "B");
  assert.equal(bandForScore(44), "C");
});

test("adding contact details raises the score, never lowers it", () => {
  const before = scoreLead({ ...strongLead, email: "", phone: "402-555-0134", name: "" });
  const after = scoreLead(strongLead);
  assert.ok(after.score > before.score);
});

test("Council Bluffs is treated as in service area", () => {
  const inArea = scoreLead({ ...strongLead, zip: "51501" });
  assert.ok(!inArea.flags.includes("out_of_area"));
});

test("extra flags are merged and de-duplicated", () => {
  const result = scoreLead(weakLead, ["referral", "out_of_area"]);
  assert.equal(result.flags.filter((f) => f === "out_of_area").length, 1);
  assert.ok(result.flags.includes("referral"));
});

test("scoreLeadRow reads a raw estimates row", () => {
  const row = {
    project_type: "Basement Finishing",
    scope_level: "high",
    size: "1200 sq ft",
    zip: "68114",
    description: strongLead.description,
    name: "Dana Whitfield",
    email: "dana@example.com",
    phone: "402-555-0134",
    estimate_data: { total_projected_low: 82_000, total_projected_high: 104_000 },
  };
  assert.equal(scoreLeadRow(row).score, scoreLead(strongLead).score);
});

test("scoreLeadRow survives a row with no estimate_data", () => {
  const result = scoreLeadRow({ project_type: "Kitchen Remodel", description: "x" });
  assert.equal(typeof result.score, "number");
});

test("persisted fields carry the score, band and version", () => {
  const fields = leadScoreFields(scoreLead(strongLead));
  assert.equal(fields.lead_band, "A");
  assert.equal(fields.lead_score_version, LEAD_SCORE_VERSION);
  assert.ok(Array.isArray(fields.qualification.components));
  assert.equal(fields.qualification.components.length, 6);
});
