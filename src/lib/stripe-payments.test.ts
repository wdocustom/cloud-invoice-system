import { test } from "node:test";
import assert from "node:assert/strict";
import {
  contractChargeFor,
  isSettled,
  processingPaymentFor,
  settledTotal,
  settlementUpdate,
  statusAtCheckout,
  upsertPaymentRecord,
} from "./stripe-payments";
import { changeOrderIsPaid } from "./change-orders";

const contract = {
  amount: 8100,
  deposit_percentage: 50,
  payment_phases: [
    { name: "Initial Deposit / Mobilization", percentage: 50 },
    { name: "Completion", percentage: 50 },
  ],
  current_phase_index: 0,
};

test("a card checkout settles; a bank checkout is only processing", () => {
  assert.equal(statusAtCheckout("paid"), "paid");
  assert.equal(statusAtCheckout("unpaid"), "processing");
});

test("charges come from the stored proposal", () => {
  assert.equal(contractChargeFor(contract, 0), 4050);
  assert.equal(contractChargeFor(contract, 1), 4050);
  assert.equal(contractChargeFor(contract, 5), 0);
});

test("processing and failed payments don't count as money received", () => {
  const history = [
    { stripe_session_id: "a", amount: 4050, phase_index: 0, status: "processing" },
    { stripe_session_id: "b", amount: 100, status: "failed" },
    { stripe_session_id: "c", amount: 50, status: "paid" },
    // Written before statuses existed: Stripe's raw "unpaid" for ACH, treated as settled then.
    { stripe_session_id: "d", amount: 25, status: "unpaid" },
  ];
  assert.equal(settledTotal(history), 75);
  assert.equal(isSettled(history[0]), false);
  assert.equal(processingPaymentFor(history, 0)?.stripe_session_id, "a");
  assert.equal(processingPaymentFor(history, 1), null);
});

test("settling the deposit clears it and opens the next phase", () => {
  assert.deepEqual(settlementUpdate(contract, 0), { deposit_cleared: true, current_phase_index: 1 });
  assert.deepEqual(settlementUpdate({ ...contract, current_phase_index: 1 }, 1), { current_phase_index: 2 });
});

test("an ACH outcome updates its own entry instead of adding a second", () => {
  const first = upsertPaymentRecord([], { stripe_session_id: "s1", amount: 4050, status: "processing", paid_at: "t0" });
  const settled = upsertPaymentRecord(first, { stripe_session_id: "s1", amount: 4050, status: "paid" });
  assert.equal(settled.length, 1);
  assert.equal(settled[0].status, "paid");
  assert.equal(settled[0].paid_at, "t0");
});

test("a returned bank payment doesn't lock a change order as paid", () => {
  assert.equal(changeOrderIsPaid({ payment_history: [{ amount: 10, status: "failed" }] }), false);
  assert.equal(changeOrderIsPaid({ payment_history: [{ amount: 10, status: "processing" }] }), true);
});
