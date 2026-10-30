import { test } from "node:test";
import assert from "node:assert/strict";
import { coiIsCurrent, DEFAULT_COI_EXPIRES_ON } from "./certificate-of-insurance";
import { buildApprovalConfirmationHtml } from "./email-templates";

test("the certificate is attached through its expiration day, never after", () => {
  assert.equal(coiIsCurrent(DEFAULT_COI_EXPIRES_ON, new Date("2027-10-30T12:00:00")), true);
  assert.equal(coiIsCurrent(DEFAULT_COI_EXPIRES_ON, new Date("2027-10-31T08:00:00")), false);
  assert.equal(coiIsCurrent("", new Date()), false);
  assert.equal(coiIsCurrent("not a date", new Date()), false);
});

test("the contract-signed email mentions the certificate only when it's attached", () => {
  const data = {
    homeowner_name: "Richard Parks",
    job_address: "4206 William St",
    amount: 8100,
    deposit_amount: 4050,
    deposit_percentage: 50,
    portal_url: "https://www.wdocustom.com/invoice/abc",
    signed_at: "2026-10-28T17:00:00Z",
    signature_name: "Richard Parks",
    items: [],
  };
  assert.doesNotMatch(buildApprovalConfirmationHtml(data), /certificate of insurance/i);
  assert.match(buildApprovalConfirmationHtml({ ...data, coi_attached: true }), /certificate of insurance is attached/i);
});
