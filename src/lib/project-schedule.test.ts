import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  buildScheduleFromItems,
  clampProgress,
  invalidDateRange,
  nextSortOrder,
  overallProgress,
  statusForProgress,
} from "./project-schedule";

test("progress is a whole number from 0 to 100", () => {
  assert.equal(clampProgress(95), 95);
  assert.equal(clampProgress("65"), 65);
  assert.equal(clampProgress(94.6), 95);
  assert.equal(clampProgress(140), 100);
  assert.equal(clampProgress(-5), 0);
  assert.equal(clampProgress("abc"), 0);
  assert.equal(clampProgress(null), 0);
});

test("status follows progress", () => {
  assert.equal(statusForProgress(0), "scheduled");
  assert.equal(statusForProgress(1), "in_progress");
  assert.equal(statusForProgress(95), "in_progress");
  assert.equal(statusForProgress(100), "complete");
});

test("adding days crosses month and year ends", () => {
  assert.equal(addDays("2026-09-28", 4), "2026-10-02");
  assert.equal(addDays("2026-12-30", 3), "2027-01-02");
});

test("date ranges must be real dates in order", () => {
  assert.equal(invalidDateRange("2026-09-01", "2026-09-05"), null);
  assert.equal(invalidDateRange("2026-09-01", "2026-09-01"), null, "a one-day task is fine");
  assert.match(invalidDateRange("2026-09-05", "2026-09-01")!, /before/);
  assert.match(invalidDateRange("", "2026-09-01")!, /Enter/);
  assert.match(invalidDateRange("2026-13-45", "2026-09-01")!, /Enter/);
});

test("signing's timeline: one 5-day row per line, back to back, matching the portal today", () => {
  // The customer's screenshot shows Sep 1–5, Sep 6–10, Sep 11–15 from a
  // Sep 1 start. The shared builder must reproduce exactly that.
  const rows = buildScheduleFromItems("p1", [
    { title: "Basement Framing & Wall Construction", cost: 8260 },
    { title: "Drywall Installation & Finishing", cost: 5605 },
    { title: "Painting & Exposed Ceiling Finish", cost: 8130.74 },
  ], "2026-09-01");

  assert.deepEqual(rows.map((r) => [r.target_start_date, r.target_end_date]), [
    ["2026-09-01", "2026-09-05"],
    ["2026-09-06", "2026-09-10"],
    ["2026-09-11", "2026-09-15"],
  ]);
  assert.deepEqual(rows.map((r) => r.sort_order), [0, 10, 20]);
  assert.ok(rows.every((r) => r.progress_percent === 0 && r.status === "scheduled" && r.parent_id === null));
  assert.equal(rows[0].project_id, "p1");
});

test("untitled lines don't become blank timeline rows", () => {
  const rows = buildScheduleFromItems("p1", [{ title: "  " }, { cost: 5 }, { title: "Trim" }], "2026-09-01");
  assert.deepEqual(rows.map((r) => r.task_name), ["Trim"]);
});

test("a missing or invalid start date still builds a timeline", () => {
  assert.equal(buildScheduleFromItems("p1", [{ title: "A" }], null).length, 1);
  assert.equal(buildScheduleFromItems("p1", [{ title: "A" }], "not a date").length, 1);
  assert.deepEqual(buildScheduleFromItems("p1", undefined, "2026-09-01"), []);
});

test("overall progress weights phases by length", () => {
  // 10-day phase at 100%, 2-day phase at 0% → 10/12 ≈ 83%, not a flat 50%.
  const progress = overallProgress([
    { parent_id: null, progress_percent: 100, target_start_date: "2026-09-01", target_end_date: "2026-09-10" },
    { parent_id: null, progress_percent: 0, target_start_date: "2026-09-11", target_end_date: "2026-09-12" },
  ]);
  assert.equal(progress, 83);
});

test("overall progress counts phases, not their sub-tasks", () => {
  const progress = overallProgress([
    { parent_id: null, progress_percent: 50, target_start_date: "2026-09-01", target_end_date: "2026-09-05" },
    { parent_id: "x", progress_percent: 100, target_start_date: "2026-09-01", target_end_date: "2026-09-05" },
  ]);
  assert.equal(progress, 50);
});

test("an empty timeline is 0%", () => {
  assert.equal(overallProgress([]), 0);
});

test("new rows sort after existing ones", () => {
  assert.equal(nextSortOrder([]), 0);
  assert.equal(nextSortOrder([{ sort_order: 0 }, { sort_order: 120 }, { sort_order: 30 }]), 130);
});
