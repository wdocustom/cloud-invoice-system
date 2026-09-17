import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildEstimateConfirmationHtml,
  buildLeadNotificationHtml,
  buildPartnerReferralHtml,
  buildReferralHandoffHtml,
} from "./email-templates";

/** What a homeowner could type into the description box on /estimate. */
const INJECTION = `<script>alert("xss")</script>`;

const leadData = {
  estimateNumber: "EST-1043",
  name: "Jess Okonkwo",
  email: "jess@example.com",
  phone: "402-555-0122",
  projectType: "Interior Painting",
  scopeLevel: "mid",
  size: "2000 sq ft",
  zip: "68022",
  description: "Full interior repaint including trim and ceilings.",
  estimateLow: "6,500",
  estimateHigh: "9,500",
  timeline: "2-3 weeks",
};

const partnerData = {
  ...leadData,
  partnerContactName: "Ben Nelson",
  partnerCompany: "Nelson Brothers Painting",
};

test("a script tag in the description never reaches the admin email as markup", () => {
  const html = buildLeadNotificationHtml({ ...leadData, description: INJECTION });
  assert.ok(!html.includes("<script>"), "raw script tag rendered into the email");
  assert.ok(html.includes("&lt;script&gt;"));
});

test("a script tag in the description never reaches the partner email as markup", () => {
  const html = buildPartnerReferralHtml({ ...partnerData, description: INJECTION });
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
});

test("names are escaped in every homeowner-facing template", () => {
  const referral = buildReferralHandoffHtml({
    estimateNumber: "",
    name: INJECTION,
    projectType: "Interior Painting",
    estimateLow: "6,500",
    estimateHigh: "9,500",
    timeline: "",
    partnerContactName: "Ben Nelson",
    partnerCompany: "Nelson Brothers Painting",
    partnerPhone: "402-690-7909",
    partnerBlurb: "Painting is the one trade we don't self-perform.",
  });
  assert.ok(!referral.includes("<script>"));

  const confirmation = buildEstimateConfirmationHtml({
    estimateNumber: "",
    name: INJECTION,
    projectType: "Kitchen Remodel",
    estimateLow: "38,000",
    estimateHigh: "52,000",
    timeline: "",
    consultationUrl: "https://www.wdocustom.com/consultation",
  });
  assert.ok(!confirmation.includes("<script>"));
});

test("quotes and ampersands are escaped rather than breaking attributes", () => {
  const html = buildLeadNotificationHtml({
    ...leadData,
    name: `Bob " onmouseover="evil()`,
    description: "Tom & Jerry's kitchen",
  });
  assert.ok(!html.includes(`onmouseover="evil()`));
  assert.ok(html.includes("&amp;"));
});

test("ordinary content still renders readably", () => {
  const html = buildLeadNotificationHtml(leadData);
  assert.ok(html.includes("Jess Okonkwo"));
  assert.ok(html.includes("Full interior repaint including trim and ceilings."));
  assert.ok(html.includes("EST-1043"));
});

test("the partner email carries the partner's own details and the homeowner's", () => {
  const html = buildPartnerReferralHtml(partnerData);
  assert.ok(html.includes("Ben Nelson"));
  assert.ok(html.includes("Nelson Brothers Painting"));
  assert.ok(html.includes("402-555-0122"), "homeowner phone must reach the partner");
});

test("the handoff email tells the homeowner who is calling and how to reach them", () => {
  const html = buildReferralHandoffHtml({
    estimateNumber: "EST-1043",
    name: "Jess",
    projectType: "Interior Painting",
    estimateLow: "6,500",
    estimateHigh: "9,500",
    timeline: "2-3 weeks",
    partnerContactName: "Ben Nelson",
    partnerCompany: "Nelson Brothers Painting",
    partnerPhone: "402-690-7909",
    partnerBlurb: "Painting is the one trade we don't self-perform.",
  });
  assert.ok(html.includes("Ben Nelson"));
  assert.ok(html.includes("402-690-7909"));
  assert.ok(html.includes("tel:4026907909"), "phone must be tappable");
  assert.match(html, /prefer we didn't share your details/i);
});

test("every template produces a complete HTML document", () => {
  const html = buildLeadNotificationHtml(leadData);
  assert.ok(html.trimStart().startsWith("<!DOCTYPE html>"));
  assert.ok(html.trimEnd().endsWith("</html>"));
});

test("missing optional fields degrade to placeholders rather than 'undefined'", () => {
  const html = buildLeadNotificationHtml({
    ...leadData,
    name: "",
    email: "",
    phone: "",
    size: "",
    zip: "",
    estimateNumber: "",
  });
  assert.ok(!html.includes("undefined"));
  assert.ok(!html.includes("null"));
  assert.ok(html.includes("Not provided"));
});
