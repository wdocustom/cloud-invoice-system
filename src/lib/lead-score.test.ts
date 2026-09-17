import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LEAD_SCORE_VERSION,
  bandForScore,
  effectiveBand,
  effectiveScore,
  leadScoreFields,
  scoreLead,
  scoreLeadRow,
} from "./lead-score";

/** A strong lead: big Omaha job, detailed brief, full contact, ready to go. */
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
  timeline: "asap",
  budgetFit: "works",
  ownership: "own",
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
  timeline: "researching",
  budgetFit: "higher_than_expected",
  ownership: "renting",
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
  assert.ok(result.flags.includes("not_owner"));
  assert.ok(result.flags.includes("budget_gap"));
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

// ── Tier B: the three questions the unlock gate asks ──

test("timeline orders correctly and outranks every other single component", () => {
  const base = { ...strongLead, timeline: undefined };
  const asap = scoreLead({ ...base, timeline: "asap" }).score;
  const soon = scoreLead({ ...base, timeline: "1_3_months" }).score;
  const later = scoreLead({ ...base, timeline: "3_6_months" }).score;
  const browsing = scoreLead({ ...base, timeline: "researching" }).score;
  assert.ok(asap > soon && soon > later && later > browsing);

  const timelineComponent = scoreLead(strongLead).components.find((c) => c.key === "timeline");
  const others = scoreLead(strongLead).components.filter((c) => c.key !== "timeline");
  assert.ok(others.every((c) => c.max < timelineComponent!.max));
});

test("budget fit orders correctly and flags a gap", () => {
  const base = { ...strongLead, budgetFit: undefined };
  const works = scoreLead({ ...base, budgetFit: "works" });
  const options = scoreLead({ ...base, budgetFit: "needs_options" });
  const gap = scoreLead({ ...base, budgetFit: "higher_than_expected" });
  assert.ok(works.score > options.score && options.score > gap.score);
  assert.ok(gap.flags.includes("budget_gap"));
  assert.ok(!works.flags.includes("budget_gap"));
});

test("unanswered Tier B scores between the best and worst answers", () => {
  const base = { ...strongLead, timeline: undefined, budgetFit: undefined };
  const unanswered = scoreLead(base).score;
  const best = scoreLead({ ...base, timeline: "asap", budgetFit: "works" }).score;
  const worst = scoreLead({ ...base, timeline: "researching", budgetFit: "higher_than_expected" }).score;
  assert.ok(unanswered < best, "unanswered should not beat the best answers");
  assert.ok(unanswered > worst, "unanswered should not rank below the worst answers");
});

test("a legacy lead with no Tier B answers can still reach band A", () => {
  const legacy = { ...strongLead, timeline: undefined, budgetFit: undefined, ownership: undefined };
  assert.equal(scoreLead(legacy).band, "A");
});

test("renting is flagged but not scored", () => {
  const owner = scoreLead({ ...strongLead, ownership: "own" });
  const renter = scoreLead({ ...strongLead, ownership: "renting" });
  assert.equal(owner.score, renter.score);
  assert.ok(renter.flags.includes("not_owner"));
  assert.ok(!owner.flags.includes("not_owner"));
});

test("unrecognised Tier B values fall back to neutral rather than zero", () => {
  const garbage = scoreLead({ ...strongLead, timeline: "someday", budgetFit: "maybe" });
  const unanswered = scoreLead({ ...strongLead, timeline: undefined, budgetFit: undefined });
  assert.equal(garbage.score, unanswered.score);
});

// ── Row adapters and overrides ──

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
    intake_timeline: "asap",
    intake_budget_fit: "works",
    intake_ownership: "own",
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
  assert.equal(fields.qualification.components.length, 8);
});

test("a manual override wins over the computed score", () => {
  assert.equal(effectiveScore({ lead_score: 20, lead_score_override: 90 }), 90);
  assert.equal(effectiveBand({ lead_score: 20, lead_score_override: 90 }), "A");
});

test("an absent or invalid override falls back to the computed score", () => {
  assert.equal(effectiveScore({ lead_score: 62 }), 62);
  assert.equal(effectiveScore({ lead_score: 62, lead_score_override: null }), 62);
  assert.equal(effectiveScore({ lead_score: 62, lead_score_override: NaN }), 62);
  assert.equal(effectiveScore({}), 0);
});

test("an out-of-range override is clamped rather than trusted", () => {
  assert.equal(effectiveScore({ lead_score: 10, lead_score_override: 400 }), 100);
  assert.equal(effectiveScore({ lead_score: 10, lead_score_override: -5 }), 0);
});
