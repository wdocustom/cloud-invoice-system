import { test } from "node:test";
import assert from "node:assert/strict";
import {
  REFERRAL_PARTNERS,
  findPartnerById,
  findPartnerForProjectType,
} from "./referral-partners";

/** Mirrors the PROJECT_TYPES labels rendered on /estimate. */
const PROJECT_TYPE_LABELS = [
  "Kitchen Remodel",
  "Bathroom Remodel",
  "Basement Finishing",
  "Whole-Home Renovation",
  "Room Addition",
  "Outdoor Living / Deck",
  "Flooring",
  "Interior Painting",
  "Custom Built-Ins / Millwork",
  "Other",
];

test("interior painting routes to Nelson Brothers", () => {
  const partner = findPartnerForProjectType("Interior Painting");
  assert.ok(partner);
  assert.equal(partner.company, "Nelson Brothers Painting");
  assert.equal(partner.contactName, "Ben Nelson");
  assert.equal(partner.email, "nelsonrei2@gmail.com");
  assert.equal(partner.phone, "402-690-7909");
});

test("painting is the ONLY project type referred out", () => {
  const referred = PROJECT_TYPE_LABELS.filter((label) => findPartnerForProjectType(label));
  assert.deepEqual(referred, ["Interior Painting"]);
});

test("whole-home work stays with WDO even though it involves painting", () => {
  assert.equal(findPartnerForProjectType("Whole-Home Renovation"), null);
});

test("matching ignores case and surrounding whitespace", () => {
  assert.ok(findPartnerForProjectType("  interior painting  "));
  assert.ok(findPartnerForProjectType("INTERIOR PAINTING"));
});

test("empty or unknown project types are never referred", () => {
  for (const value of ["", "   ", null, undefined, "Roof Replacement"]) {
    assert.equal(findPartnerForProjectType(value as any), null);
  }
});

test("inactive partners are never matched", () => {
  const original = REFERRAL_PARTNERS[0].active;
  REFERRAL_PARTNERS[0].active = false;
  try {
    assert.equal(findPartnerForProjectType("Interior Painting"), null);
  } finally {
    REFERRAL_PARTNERS[0].active = original;
  }
});

test("partners can be resolved by id for ledger display", () => {
  assert.equal(findPartnerById("nelson-brothers-painting")?.contactName, "Ben Nelson");
  assert.equal(findPartnerById("nobody"), null);
  assert.equal(findPartnerById(null), null);
});

test("every partner carries the contact details the emails interpolate", () => {
  for (const partner of REFERRAL_PARTNERS) {
    assert.ok(partner.id, "id");
    assert.ok(partner.contactName, "contactName");
    assert.ok(partner.company, "company");
    assert.ok(/@/.test(partner.email), `email: ${partner.email}`);
    assert.ok(/\d{3}/.test(partner.phone), `phone: ${partner.phone}`);
    assert.ok(partner.blurb.length > 20, "blurb");
    assert.ok(partner.projectTypes.length > 0, "projectTypes");
  }
});

test("no two partners claim the same project type", () => {
  const claimed = REFERRAL_PARTNERS.filter((p) => p.active).flatMap((p) =>
    p.projectTypes.map((t) => t.toLowerCase())
  );
  assert.equal(new Set(claimed).size, claimed.length);
});
