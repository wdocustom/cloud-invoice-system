import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDepositEmailHtml } from "./email-templates";

const base = {
  homeowner_name: "Richard Parks",
  project_title: "Kitchen Refresh",
  job_address: "4206 William St, Omaha, NE 68105",
  deposit_amount: 4050,
  deposit_percentage: 50,
  total_amount: 8100,
  portal_url: "https://www.wdocustom.com/invoice/abc",
  proposal_number: "PRO-2026-0051",
  signed_at: "2026-10-28T17:00:00Z",
  payment_phases: [
    { name: "Initial Deposit / Mobilization", percentage: 50, amount: 4050 },
    { name: "Completion", percentage: 50, amount: 4050 },
  ],
};

test("the deposit email states the proposal's own figures", () => {
  const html = buildDepositEmailHtml(base);
  assert.match(html, /\$4,050\.00/);
  assert.match(html, /\$8,100\.00/);
  assert.match(html, /\(50%\)/);
  assert.match(html, /PRO-2026-0051/);
  assert.match(html, /4206 William St/);
  assert.match(html, /Initial Deposit \/ Mobilization/);
  assert.match(html, /Completion/);
});

test("it makes no claims the proposal doesn't support", () => {
  const html = buildDepositEmailHtml(base);
  assert.doesNotMatch(html, /lead time/i);
  assert.doesNotMatch(html, /unused value/i);
  assert.doesNotMatch(html, /Estimated start/);
  assert.doesNotMatch(html, /Duration/);
});

test("the certificate of insurance is mentioned only when attached", () => {
  assert.doesNotMatch(buildDepositEmailHtml(base), /certificate of insurance/i);
  assert.match(buildDepositEmailHtml({ ...base, coi_attached: true }), /certificate of insurance is attached/i);
});

test("start date and duration appear when the proposal has them", () => {
  const html = buildDepositEmailHtml({ ...base, estimated_start_date: "2026-11-16", project_length: "3 weeks" });
  assert.match(html, /November 16, 2026/);
  assert.match(html, /3 weeks/);
});

test("it points the homeowner to portal Messages and opens Payments for the deposit", () => {
  const html = buildDepositEmailHtml(base);
  assert.match(html, /invoice\/abc\?tab=messages/);
  assert.match(html, /invoice\/abc\?tab=payments/);
  assert.match(html, /Messages<\/a> tab/);
});

test("the contract-signed email's deposit button opens Payments", async () => {
  const { buildApprovalConfirmationHtml } = await import("./email-templates");
  const html = buildApprovalConfirmationHtml({
    homeowner_name: "Richard Parks",
    job_address: "4206 William St",
    amount: 8100,
    deposit_amount: 4050,
    deposit_percentage: 50,
    portal_url: "https://www.wdocustom.com/invoice/abc",
    signed_at: "2026-10-28T17:00:00Z",
    signature_name: "Richard Parks",
    items: [],
  } as any);
  assert.match(html, /invoice\/abc\?tab=payments"[^>]*>\s*Pay Deposit/);
});

test("it steers toward bank transfer without dropping card", () => {
  const html = buildDepositEmailHtml(base);
  assert.match(html, /bank transfer is preferred/);
  assert.match(html, /or card/);
});
