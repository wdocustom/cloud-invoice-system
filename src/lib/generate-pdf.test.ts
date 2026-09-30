import { test } from "node:test";
import assert from "node:assert/strict";
import { generateProposalPdfBuffer } from "./generate-pdf";
import { changeOrderPdfInput } from "./change-orders";

const contract = {
  id: "contract-1",
  proposal_number: "PRO-2026-0007",
  amount: 100_000,
  homeowner_name: "Dana Whitfield",
  homeowner_email: "dana@example.com",
  job_address: "1204 S 180th St, Omaha, NE",
  project_title: "Basement Finish",
  status: "approved",
};

const signedCo1 = {
  id: "co1",
  parent_id: "contract-1",
  proposal_number: "PRO-2026-0007-CO1",
  status: "approved",
  amount: 4_000,
  signed_at: "2026-09-01T15:00:00Z",
  signature_name: "Dana Whitfield",
  items: [{ title: "Pantry shelving", description: "Maple, four shelves", cost: 4000 }],
  description: "Add pantry shelving",
};

const pendingCo2 = {
  id: "co2",
  parent_id: "contract-1",
  proposal_number: "PRO-2026-0007-CO2",
  status: "pending",
  amount: 2_500,
  created_at: "2026-09-12T15:00:00Z",
  schedule_impact: "Adds 2 working days",
  items: [{ title: "Recessed lighting — living room", description: "Six cans on dimmers", cost: 2500 }],
  description: "Add recessed lighting",
};

/** jsPDF writes uncompressed text streams, so rendered text is searchable. */
function render(input: Parameters<typeof generateProposalPdfBuffer>[0]) {
  const { buffer, filename } = generateProposalPdfBuffer(input);
  return { text: buffer.toString("latin1"), filename, buffer };
}

test("a pending change order renders as a real PDF naming the contract it amends", () => {
  const { text, filename, buffer } = render(changeOrderPdfInput(pendingCo2, contract, [signedCo1, pendingCo2]));
  assert.ok(buffer.subarray(0, 5).toString() === "%PDF-", "not a PDF");
  assert.match(filename, /^WDO_Custom_ChangeOrder_PRO-2026-0007-CO2_Dana_Whitfield\.pdf$/);
  assert.match(text, /CHANGE ORDER/);
  assert.doesNotMatch(text, /EXECUTED CHANGE ORDER/);
  assert.match(text, /contract No\. PRO-2026-0007\./);
  assert.match(text, /Adds 2 working days/);
});

test("the change order states original, prior, this change, and revised sums", () => {
  const { text } = render(changeOrderPdfInput(pendingCo2, contract, [signedCo1, pendingCo2]));
  assert.match(text, /ORIGINAL CONTRACT/);
  assert.match(text, /\$100,000\.00/);
  assert.match(text, /PRIOR CHANGE ORDERS/);
  assert.match(text, /\$4,000\.00/);
  assert.match(text, /\+\$2,500\.00/);
  assert.match(text, /REVISED CONTRACT/);
  assert.match(text, /\$106,500\.00/);
});

test("a signed change order renders as executed, with the signature", () => {
  const { text } = render(changeOrderPdfInput(signedCo1, contract, [signedCo1, pendingCo2]));
  assert.match(text, /EXECUTED CHANGE ORDER/);
  assert.match(text, /CHANGE ORDER EXECUTED/);
  assert.match(text, /Dana Whitfield/);
});

test("a blank schedule impact is stated explicitly, not left out", () => {
  const { text } = render(changeOrderPdfInput({ ...pendingCo2, schedule_impact: "" }, contract, []));
  assert.match(text, /No change to the completion date/);
});

test("ordinary proposals and contracts are unchanged", () => {
  const proposal = render({ ...contract, status: "pending", items: [{ title: "Framing", cost: 1000 }] });
  assert.match(proposal.filename, /_Proposal_PRO-2026-0007_/);
  assert.match(proposal.text, /PROPOSAL/);
  assert.doesNotMatch(proposal.text, /CHANGE ORDER/);
  assert.match(proposal.text, /PROJECT TOTAL/);

  const executed = render({ ...contract, items: [{ title: "Framing", cost: 1000 }], signature_name: "Dana Whitfield", signed_at: "2026-08-01T12:00:00Z" });
  assert.match(executed.filename, /_Contract_PRO-2026-0007_/);
  assert.match(executed.text, /EXECUTED CONTRACT/);
  assert.match(executed.text, /CONTRACT EXECUTED/);
});
