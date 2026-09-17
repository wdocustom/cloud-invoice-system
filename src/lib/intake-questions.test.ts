import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INTAKE_QUESTIONS,
  describeAnswers,
  estimatorHintsFor,
  flagsForAnswers,
  hasBranchQuestions,
  questionsForProjectType,
} from "./intake-questions";

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

test("every project type except Other has branch questions", () => {
  for (const label of PROJECT_TYPE_LABELS) {
    const expected = label !== "Other";
    assert.equal(hasBranchQuestions(label), expected, `${label} should ${expected ? "" : "not "}branch`);
  }
});

test("registry keys all correspond to real project types", () => {
  for (const key of Object.keys(INTAKE_QUESTIONS)) {
    assert.ok(PROJECT_TYPE_LABELS.includes(key), `${key} is not a project type on the form`);
  }
});

test("questions and options are well formed throughout", () => {
  for (const [type, questions] of Object.entries(INTAKE_QUESTIONS)) {
    assert.ok(questions.length >= 2 && questions.length <= 3, `${type} asks ${questions.length} questions`);
    const ids = questions.map((q) => q.id);
    assert.equal(new Set(ids).size, ids.length, `${type} has duplicate question ids`);

    for (const question of questions) {
      assert.ok(question.label.trim().endsWith("?"), `${type}/${question.id} is not phrased as a question`);
      assert.ok(question.options.length >= 2, `${type}/${question.id} needs a real choice`);
      const values = question.options.map((o) => o.value);
      assert.equal(new Set(values).size, values.length, `${type}/${question.id} has duplicate values`);
      for (const option of question.options) {
        assert.ok(option.label.trim(), "option needs a label");
        assert.ok(option.estimatorHint.trim().length > 10, "every option must steer the estimate");
      }
    }
  }
});

test("unknown project types branch into nothing rather than throwing", () => {
  assert.deepEqual(questionsForProjectType("Roof Replacement"), []);
  assert.deepEqual(questionsForProjectType(""), []);
  assert.deepEqual(questionsForProjectType(null), []);
  assert.equal(estimatorHintsFor("Roof Replacement", { a: "b" }), "");
  assert.deepEqual(flagsForAnswers(null, { a: "b" }), []);
});

test("hints are produced only for answered questions", () => {
  const hints = estimatorHintsFor("Bathroom Remodel", { plumbing: "full" });
  assert.match(hints, /plumbing reconfiguration/i);
  assert.equal(hints.split("\n").length, 1, "only the answered question contributes");
});

test("hints accumulate across several answers", () => {
  const hints = estimatorHintsFor("Kitchen Remodel", {
    layout: "same",
    cabinets: "custom",
    appliances: "no",
  });
  assert.equal(hints.split("\n").length, 3);
  assert.match(hints, /Fully custom cabinetry/);
});

test("no answers produces no hints", () => {
  assert.equal(estimatorHintsFor("Kitchen Remodel", {}), "");
  assert.equal(estimatorHintsFor("Kitchen Remodel", null), "");
});

test("unrecognised answer values are ignored, not interpolated", () => {
  assert.equal(estimatorHintsFor("Kitchen Remodel", { layout: "bogus" }), "");
  assert.deepEqual(flagsForAnswers("Kitchen Remodel", { layout: "bogus" }), []);
});

test("a basement moisture history raises a site risk flag", () => {
  assert.deepEqual(flagsForAnswers("Basement Finishing", { moisture: "yes" }), ["site_risk"]);
  assert.deepEqual(flagsForAnswers("Basement Finishing", { moisture: "none" }), []);
});

test("an addition with no drawings is flagged as needing design", () => {
  assert.deepEqual(flagsForAnswers("Room Addition", { plans: "no" }), ["needs_design"]);
  assert.deepEqual(flagsForAnswers("Room Addition", { plans: "yes" }), []);
});

test("duplicate flags across answers collapse to one", () => {
  const flags = flagsForAnswers("Room Addition", { plans: "no", stories: "two" });
  assert.equal(new Set(flags).size, flags.length);
  assert.ok(flags.includes("needs_design") && flags.includes("site_risk"));
});

test("describeAnswers pairs the question with the chosen label for the admin", () => {
  const described = describeAnswers("Bathroom Remodel", { which: "primary", plumbing: "no" });
  assert.equal(described.length, 2);
  assert.equal(described[0].label, "Which bathroom?");
  assert.equal(described[0].answer, "Primary");
});

test("describeAnswers skips unanswered and unknown entries", () => {
  assert.deepEqual(describeAnswers("Bathroom Remodel", { which: "", nonsense: "x" }), []);
});

test("painting branches too, since the partner benefits from the detail", () => {
  assert.ok(hasBranchQuestions("Interior Painting"));
  assert.match(estimatorHintsFor("Interior Painting", { surfaces: "all" }), /ceilings/i);
});
