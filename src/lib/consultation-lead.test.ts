import { test } from "node:test";
import assert from "node:assert/strict";
import {
  UNSPECIFIED_PROJECT,
  buildLeadUpdate,
  buildNewLead,
  consultationLabel,
  hasEstimate,
  hasUpcomingConsultation,
  pickLeadForBooking,
  zipFromAddress,
} from "./consultation-lead";

const booking = {
  name: "Dana Reyes",
  email: "Dana@Example.com",
  phone: "402-555-0190",
  address: "1234 Pine St, Omaha, NE 68114",
  projectType: "Kitchen Remodel",
  notes: "Want to open the wall to the dining room.",
  date: "2026-11-03",
  time: "10:30 AM",
};

const estimateLead = {
  id: "lead-1",
  token: "abc123",
  email: "dana@example.com",
  name: "Dana Reyes",
  phone: null,
  address: null,
  zip: "68114",
  project_type: "Kitchen Remodel",
  status: "new",
  notes: null,
  converted_to_invoice_id: null,
  created_at: "2026-10-20T15:00:00Z",
  estimate_data: { line_items: [{ item: "Cabinets", low: 1, high: 2 }] },
};

test("the estimate token wins over an email match", () => {
  const other = { ...estimateLead, id: "lead-2", token: "zzz", created_at: "2026-10-27T00:00:00Z" };
  assert.equal(pickLeadForBooking([other, estimateLead], { email: booking.email, token: "abc123" })?.id, "lead-1");
});

test("without a token, the newest open lead with the same email is used, case-insensitively", () => {
  const older = { ...estimateLead, id: "old", created_at: "2026-01-01T00:00:00Z" };
  assert.equal(pickLeadForBooking([older, estimateLead], { email: booking.email })?.id, "lead-1");
});

test("converted and referred leads are history, not a match", () => {
  const converted = { ...estimateLead, converted_to_invoice_id: "inv-1", status: "converted" };
  const referred = { ...estimateLead, id: "lead-r", status: "referred" };
  assert.equal(pickLeadForBooking([converted, referred], { email: booking.email }), null);
});

test("an existing lead moves to Consultation Set and keeps what the contractor already entered", () => {
  const update = buildLeadUpdate({ ...estimateLead, name: "Dana R. (corrected)", notes: "Called once." }, booking);
  assert.equal(update.status, "consultation_scheduled");
  assert.equal(update.consultation_scheduled, true);
  assert.equal(update.consultation_date, "2026-11-03");
  assert.equal(update.consultation_time, "10:30 AM");
  assert.equal(update.name, undefined, "a name already on the lead is not overwritten");
  assert.equal(update.phone, "402-555-0190", "a missing phone is filled in");
  assert.equal(update.address, booking.address);
  assert.match(update.notes, /^Called once\.\n\nConsultation booked for Tuesday, November 3, 2026 at 10:30 AM\./);
  assert.match(update.notes, /open the wall/);
});

test("a converted lead's status is left alone", () => {
  const update = buildLeadUpdate({ ...estimateLead, status: "converted" }, booking);
  assert.equal(update.status, undefined);
});

test("a booking with no lead behind it becomes a numbered-ready consultation lead", () => {
  const row = buildNewLead({ ...booking, projectType: "" }, "tok");
  assert.equal(row.project_type, UNSPECIFIED_PROJECT);
  assert.equal(row.status, "consultation_scheduled");
  assert.equal(row.lead_source, "consultation");
  assert.equal(row.zip, "68114");
  assert.deepEqual(row.estimate_data, {});
  assert.ok(row.description.length > 0, "description is NOT NULL");
  assert.equal(hasEstimate(row), false);
  assert.equal(hasEstimate(estimateLead), true);
});

test("ZIPs are read off the end of an address only", () => {
  assert.equal(zipFromAddress("1234 Pine St, Omaha, NE 68114-2201"), "68114");
  assert.equal(zipFromAddress("12345 Main St, Omaha"), null);
  assert.equal(zipFromAddress(""), null);
});

test("ledger label and upcoming check", () => {
  const row = { consultation_scheduled: true, consultation_date: "2026-11-03", consultation_time: "10:30 AM" };
  assert.equal(consultationLabel(row), "Tue, Nov 3 · 10:30 AM");
  assert.equal(consultationLabel({}), null);
  const before = new Date("2026-11-03T08:00:00").getTime();
  const after = new Date("2026-11-04T08:00:00").getTime();
  assert.equal(hasUpcomingConsultation(row, before), true);
  assert.equal(hasUpcomingConsultation(row, after), false);
  assert.equal(hasUpcomingConsultation({ ...row, converted_to_invoice_id: "x" }, before), false);
});
