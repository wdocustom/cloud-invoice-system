import { test } from "node:test";
import assert from "node:assert/strict";
import { ADMIN_RECIPIENT, parseMoney, planLeadNotification } from "./lead-notification-plan";

const paintingLead = {
  name: "Jess Okonkwo",
  email: "jess@example.com",
  phone: "402-555-0122",
  projectType: "Interior Painting",
  scopeLevel: "mid",
  size: "2000 sq ft",
  zip: "68022",
  description: "Full interior repaint of our two storey home including trim and ceilings.",
  estimateLow: "6,500",
  estimateHigh: "9,500",
  timeline: "2-3 weeks",
  token: "abc123def456",
  estimateNumber: "EST-1043",
};

const kitchenLead = {
  ...paintingLead,
  projectType: "Kitchen Remodel",
  estimateLow: "38,000",
  estimateHigh: "52,000",
};

function kinds(plan: ReturnType<typeof planLeadNotification>) {
  return plan.emails.map((e) => e.kind);
}

test("a painting lead emails Skyler, the partner, and the homeowner", () => {
  const plan = planLeadNotification(paintingLead);
  assert.deepEqual(kinds(plan), ["admin", "partner", "homeowner_referral"]);
  assert.equal(plan.partner?.company, "Nelson Brothers Painting");
  assert.equal(plan.emails[1].to, "nelsonrei2@gmail.com");
  assert.equal(plan.recordReferral, true);
});

test("a painting lead never gets the WDO consultation email", () => {
  const plan = planLeadNotification(paintingLead);
  assert.ok(!kinds(plan).includes("homeowner_estimate"));
});

test("a non-painting lead stays with WDO", () => {
  const plan = planLeadNotification(kitchenLead);
  assert.deepEqual(kinds(plan), ["admin", "homeowner_estimate"]);
  assert.equal(plan.partner, null);
  assert.equal(plan.recordReferral, false);
});

test("the partner is named in Skyler's subject for a referral", () => {
  const plan = planLeadNotification(paintingLead);
  assert.match(plan.emails[0].subject, /^\[Referred → Nelson Brothers Painting\]/);
});

test("Skyler's subject carries the band for a lead WDO keeps", () => {
  const plan = planLeadNotification(kitchenLead);
  assert.match(plan.emails[0].subject, /^\[[ABC] · /);
  assert.equal(plan.emails[0].to, ADMIN_RECIPIENT);
});

test("the estimate number appears in the subject when present", () => {
  assert.match(planLeadNotification(kitchenLead).emails[0].subject, /EST-1043/);
  const noNumber = planLeadNotification({ ...kitchenLead, estimateNumber: "" });
  assert.ok(!noNumber.emails[0].subject.includes("EST-"));
});

test("a phone-only lead still notifies Skyler but emails no homeowner", () => {
  const plan = planLeadNotification({ ...kitchenLead, email: "" });
  assert.deepEqual(kinds(plan), ["admin"]);
  assert.equal(plan.error, null);
});

test("a phone-only painting lead still reaches the partner", () => {
  const plan = planLeadNotification({ ...paintingLead, email: "" });
  assert.deepEqual(kinds(plan), ["admin", "partner"]);
});

test("a lead with no contact method is rejected and sends nothing", () => {
  const plan = planLeadNotification({ ...kitchenLead, email: "", phone: "" });
  assert.ok(plan.error);
  assert.deepEqual(plan.emails, []);
  assert.equal(plan.recordReferral, false);
});

test("dry run suppresses the partner email but keeps everything else", () => {
  const plan = planLeadNotification(paintingLead, { dryRun: true });
  assert.deepEqual(kinds(plan), ["admin", "homeowner_referral"]);
  assert.equal(plan.recordReferral, false, "must not record a referral that was never sent");
});

test("a referral without a token is not recorded", () => {
  const plan = planLeadNotification({ ...paintingLead, token: "" });
  assert.equal(plan.recordReferral, false);
  assert.ok(kinds(plan).includes("partner"), "the email still goes out");
});

test("the anonymous fallback is used when no name is given", () => {
  const plan = planLeadNotification({ ...kitchenLead, name: "" });
  assert.match(plan.emails[0].subject, /jess@example\.com/);
});

test("every planned email has a recipient and a non-empty subject", () => {
  for (const input of [paintingLead, kitchenLead, { ...kitchenLead, name: "", phone: "" }]) {
    for (const planned of planLeadNotification(input).emails) {
      assert.ok(planned.to.includes("@"), `bad recipient: ${planned.to}`);
      assert.ok(planned.subject.trim().length > 0);
    }
  }
});

test("no lead is ever emailed twice in one plan", () => {
  const recipients = planLeadNotification(paintingLead).emails.map((e) => e.to);
  assert.equal(new Set(recipients).size, recipients.length);
});

test("Tier B answers feed the band in Skyler's subject line", () => {
  const ready = planLeadNotification({
    ...kitchenLead,
    intakeTimeline: "asap",
    budgetFit: "works",
  });
  const browsing = planLeadNotification({
    ...kitchenLead,
    intakeTimeline: "researching",
    budgetFit: "higher_than_expected",
  });
  assert.ok(ready.score.score > browsing.score.score);
  assert.notEqual(ready.emails[0].subject, browsing.emails[0].subject);
});

test("the build duration is not mistaken for the start timeline", () => {
  // `timeline` is "2-3 weeks" of construction; it must not be read as a
  // qualification answer.
  const withDuration = planLeadNotification({ ...kitchenLead, timeline: "asap" });
  const withoutDuration = planLeadNotification({ ...kitchenLead, timeline: "" });
  assert.equal(withDuration.score.score, withoutDuration.score.score);
});

// ── parseMoney ──

test("parseMoney handles the formatted strings the client sends", () => {
  assert.equal(parseMoney("92,400"), 92400);
  assert.equal(parseMoney("$92,400"), 92400);
  assert.equal(parseMoney(92400), 92400);
});

test("parseMoney returns null rather than NaN for unusable input", () => {
  assert.equal(parseMoney("—"), null);
  assert.equal(parseMoney(""), null);
  assert.equal(parseMoney(null), null);
  assert.equal(parseMoney(undefined), null);
  assert.equal(parseMoney(NaN), null);
});
