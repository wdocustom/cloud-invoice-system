/**
 * Lead scoring — deterministic triage for instant-estimate leads.
 *
 * Every lead used to land in the ledger with the same weight, ordered by
 * arrival time, so a ready-to-build basement sat below someone pricing a spare
 * bedroom for next spring. This module turns what the estimator knows about a
 * lead into a 0-100 score so the ledger can be ordered by something better.
 *
 * Three rules this deliberately follows:
 *
 *  1. No AI call. The score has to be explainable, free, stable across runs and
 *     testable. A weighted sum of known inputs is all of those; a model call is
 *     none of them.
 *  2. No outcome data feeds the score. It would be easy to award points for
 *     `status = 'converted'`, and it would make the backfill's calibration
 *     circular — a score that "predicts" conversion because it was told the
 *     answer. Scoring reads intake signals only; the ledger shows status
 *     separately.
 *  3. Nothing here rejects anyone. A low score changes the order Skyler works
 *     the list in. It never changes what the homeowner sees or receives.
 *
 * ── Versions ──
 *
 * v1 scored only what the form collected without asking anything extra. v2 adds
 * the three questions the unlock gate now asks — timeline, budget fit against
 * the range the homeowner just saw, and ownership — and reweights everything
 * around them, because when someone tells you they want to start within a month
 * that outranks any amount of inference from their ZIP code.
 *
 * Unanswered questions score neutral rather than falling back to a separate v1
 * scale. One comparable scale keeps the ledger sortable as a single list, and
 * neutral is the honest position: someone who skipped the question is a better
 * prospect than someone who said "just researching" and a worse one than
 * someone who said "as soon as possible".
 */

export const LEAD_SCORE_VERSION = 2;

export type LeadBand = "A" | "B" | "C";

export type IntakeTimeline = "asap" | "1_3_months" | "3_6_months" | "researching";
export type IntakeBudgetFit = "works" | "needs_options" | "higher_than_expected";
export type IntakeOwnership = "own" | "buying" | "renting";

/**
 * Non-scoring conditions worth surfacing on their own. These are deliberately
 * kept out of the number: "no phone or email" isn't a lead that scores low, it's
 * a lead that can't be called at all, and averaging that into a 0-100 total
 * buries it.
 */
export type LeadFlag =
  | "out_of_area"
  | "no_zip"
  | "no_contact"
  | "vague_description"
  | "referral"
  | "not_owner"
  | "budget_gap"
  | "site_risk"
  | "needs_design";

export interface LeadScoreInput {
  projectType?: string | null;
  scopeLevel?: string | null;
  size?: string | null;
  zip?: string | null;
  description?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  /** Midpoint is taken from these; pass the raw numbers from estimate_data. */
  estimateLow?: number | null;
  estimateHigh?: number | null;
  /** Tier B answers from the unlock gate. Absent on leads created before v2. */
  timeline?: IntakeTimeline | string | null;
  budgetFit?: IntakeBudgetFit | string | null;
  ownership?: IntakeOwnership | string | null;
}

export interface ScoreComponent {
  key: string;
  label: string;
  points: number;
  max: number;
  /** Human-readable reason, shown verbatim in the admin breakdown. */
  detail: string;
}

export interface LeadScore {
  score: number;
  band: LeadBand;
  version: number;
  components: ScoreComponent[];
  flags: LeadFlag[];
}

/**
 * ZIP prefixes WDO actually serves, in tiers. 680/681/682 are the Omaha metro,
 * 683-685 reach Lincoln and greater Nebraska, and 515 covers Council Bluffs and
 * southwest Iowa — across the river and well inside normal driving distance,
 * which the labor-rate multiplier table doesn't model because it only knows
 * Nebraska prefixes.
 */
const SERVICE_AREA: Record<string, { points: number; label: string }> = {
  "680": { points: 14, label: "Omaha metro" },
  "681": { points: 14, label: "Omaha metro" },
  "682": { points: 14, label: "Omaha metro" },
  "683": { points: 8, label: "Lincoln area" },
  "684": { points: 8, label: "Greater Nebraska" },
  "685": { points: 8, label: "Greater Nebraska" },
  "515": { points: 10, label: "Council Bluffs / SW Iowa" },
};

/**
 * Words that separate "remodel my bathroom" from a homeowner who has already
 * thought about materials and fixtures. Someone naming quartz and a frameless
 * enclosure has been planning; someone writing four words is still browsing.
 */
const SPECIFIC_TERMS = [
  "quartz", "granite", "marble", "tile", "vanity", "cabinet", "shower", "tub",
  "hardwood", "lvp", "laminate", "backsplash", "drywall", "egress", "island",
  "countertop", "fixture", "subfloor", "trim", "permit", "plumbing", "electrical",
  "hvac", "insulation", "framing", "wet bar", "walk-in", "frameless", "recessed",
  "soffit", "load-bearing", "joist", "foundation", "appliance", "faucet", "sink",
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function zipPrefix(zip?: string | null): string | null {
  const trimmed = (zip || "").trim();
  return trimmed.length >= 3 ? trimmed.slice(0, 3) : null;
}

/**
 * Timeline — the strongest single signal available, which is why it carries the
 * most weight. Everything else is inference; this is the homeowner telling you
 * directly when they intend to start.
 */
function scoreTimeline(input: LeadScoreInput): ScoreComponent {
  const max = 22;
  const table: Record<string, { points: number; detail: string }> = {
    asap: { points: 22, detail: "Ready to start as soon as possible" },
    "1_3_months": { points: 18, detail: "Starting in 1–3 months" },
    "3_6_months": { points: 11, detail: "Starting in 3–6 months" },
    researching: { points: 3, detail: "Still researching" },
  };
  const match = table[(input.timeline || "").trim()];
  return {
    key: "timeline",
    label: "Timeline",
    points: match?.points ?? 8,
    max,
    detail: match?.detail ?? "Not answered — scored neutral",
  };
}

/**
 * Budget fit, asked against the range the homeowner had just watched render.
 * Asking "what's your budget?" cold produces noise; asking "does $92k–$118k
 * work?" produces an answer you can act on — and "higher than I expected" is
 * more useful than a yes, because it says walk in leading with phasing.
 */
function scoreBudgetFit(input: LeadScoreInput): { component: ScoreComponent; flags: LeadFlag[] } {
  const max = 20;
  const table: Record<string, { points: number; detail: string; flags: LeadFlag[] }> = {
    works: { points: 20, detail: "Range works for their budget", flags: [] },
    needs_options: { points: 11, detail: "Wants to see options at different levels", flags: [] },
    higher_than_expected: {
      points: 5,
      detail: "Range is higher than they expected",
      flags: ["budget_gap"],
    },
  };
  const match = table[(input.budgetFit || "").trim()];
  return {
    component: {
      key: "budget_fit",
      label: "Budget fit",
      points: match?.points ?? 8,
      max,
      detail: match?.detail ?? "Not answered — scored neutral",
    },
    flags: match?.flags ?? [],
  };
}

/**
 * Ownership is a flag, not points. A renter isn't a weak lead, they're usually
 * the wrong person to be signing for the work at all, and burying that in a
 * total loses it.
 */
function ownershipFlags(input: LeadScoreInput): LeadFlag[] {
  return (input.ownership || "").trim() === "renting" ? ["not_owner"] : [];
}

/**
 * Project value, from the midpoint of the range the estimator quoted. Bands
 * rather than a linear scale: the difference between a $12k job and a $20k job
 * matters to the schedule, not to which lead gets called first.
 */
function scoreProjectValue(input: LeadScoreInput): ScoreComponent {
  const max = 18;
  const low = typeof input.estimateLow === "number" ? input.estimateLow : null;
  const high = typeof input.estimateHigh === "number" ? input.estimateHigh : null;

  if (low === null && high === null) {
    return {
      key: "project_value",
      label: "Project value",
      points: 5,
      max,
      detail: "No estimate range on file — scored neutral",
    };
  }

  const midpoint = low !== null && high !== null ? (low + high) / 2 : (low ?? high)!;
  const table: Array<[number, number, string]> = [
    [150_000, 18, "$150k+"],
    [75_000, 16, "$75k–$150k"],
    [40_000, 13, "$40k–$75k"],
    [20_000, 9, "$20k–$40k"],
    [8_000, 5, "$8k–$20k"],
  ];

  for (const [threshold, points, label] of table) {
    if (midpoint >= threshold) {
      return {
        key: "project_value",
        label: "Project value",
        points,
        max,
        detail: `${label} (midpoint $${Math.round(midpoint).toLocaleString("en-US")})`,
      };
    }
  }

  return {
    key: "project_value",
    label: "Project value",
    points: 2,
    max,
    detail: `Under $8k (midpoint $${Math.round(midpoint).toLocaleString("en-US")})`,
  };
}

function scoreServiceArea(input: LeadScoreInput): { component: ScoreComponent; flags: LeadFlag[] } {
  const max = 14;
  const prefix = zipPrefix(input.zip);

  if (!prefix) {
    return {
      component: {
        key: "service_area",
        label: "Service area",
        points: 4,
        max,
        detail: "No ZIP provided — scored neutral",
      },
      flags: ["no_zip"],
    };
  }

  const match = SERVICE_AREA[prefix];
  if (!match) {
    return {
      component: {
        key: "service_area",
        label: "Service area",
        points: 0,
        max,
        detail: `ZIP ${input.zip} is outside the usual service area`,
      },
      flags: ["out_of_area"],
    };
  }

  return {
    component: {
      key: "service_area",
      label: "Service area",
      points: match.points,
      max,
      detail: `${match.label} (${input.zip})`,
    },
    flags: [],
  };
}

/**
 * Description specificity. Length is the base signal, then bonuses for naming
 * real materials and for giving any dimension or quantity.
 */
function scoreDescription(input: LeadScoreInput): { component: ScoreComponent; flags: LeadFlag[] } {
  const max = 12;
  const text = (input.description || "").trim();
  const words = text ? text.split(/\s+/).length : 0;

  let points: number;
  if (words >= 40) points = 7;
  else if (words >= 20) points = 5;
  else if (words >= 10) points = 3;
  else points = 1;

  const lower = text.toLowerCase();
  const termHits = SPECIFIC_TERMS.filter((term) => lower.includes(term));
  if (termHits.length >= 2) points += 3;
  else if (termHits.length === 1) points += 1;

  const hasMeasurement = /\d/.test(text);
  if (hasMeasurement) points += 2;

  points = clamp(points, 0, max);

  const parts = [`${words} word${words === 1 ? "" : "s"}`];
  if (termHits.length) parts.push(`names ${termHits.slice(0, 3).join(", ")}`);
  if (hasMeasurement) parts.push("includes numbers");

  return {
    component: {
      key: "description",
      label: "Description detail",
      points,
      max,
      detail: parts.join(" · "),
    },
    flags: words < 10 ? ["vague_description"] : [],
  };
}

function scoreContact(input: LeadScoreInput): { component: ScoreComponent; flags: LeadFlag[] } {
  const max = 8;
  const hasEmail = !!(input.email || "").trim();
  const hasPhone = !!(input.phone || "").trim();
  const hasName = !!(input.name || "").trim();

  if (!hasEmail && !hasPhone) {
    return {
      component: {
        key: "contact",
        label: "Contact details",
        points: 0,
        max,
        detail: "No email or phone — cannot be contacted",
      },
      flags: ["no_contact"],
    };
  }

  let points: number;
  let detail: string;
  if (hasEmail && hasPhone) {
    points = hasName ? 8 : 7;
    detail = hasName ? "Name, email and phone" : "Email and phone, no name";
  } else {
    points = hasName ? 5 : 4;
    detail = `${hasEmail ? "Email" : "Phone"} only${hasName ? ", with name" : ", no name"}`;
  }

  return {
    component: { key: "contact", label: "Contact details", points, max, detail },
    flags: [],
  };
}

/**
 * Finish level as a budget proxy. Weighted down in v2 now that budget fit is
 * asked outright — inference only matters where the direct answer is missing.
 */
function scoreFinishLevel(input: LeadScoreInput): ScoreComponent {
  const max = 4;
  const level = (input.scopeLevel || "").trim().toLowerCase();
  const table: Record<string, { points: number; detail: string }> = {
    high: { points: 4, detail: "High-end / custom finishes" },
    mid: { points: 2, detail: "Mid-range finishes" },
    budget: { points: 1, detail: "Builder-grade finishes" },
  };
  const match = table[level];
  return {
    key: "finish_level",
    label: "Finish level",
    points: match?.points ?? 2,
    max,
    detail: match?.detail ?? "Not specified — scored neutral",
  };
}

function scoreSize(input: LeadScoreInput): ScoreComponent {
  const max = 2;
  const provided = !!(input.size || "").trim();
  return {
    key: "size",
    label: "Size given",
    points: provided ? 2 : 0,
    max,
    detail: provided ? `"${(input.size || "").trim()}"` : "No size or dimensions given",
  };
}

export function bandForScore(score: number): LeadBand {
  if (score >= 70) return "A";
  if (score >= 45) return "B";
  return "C";
}

export const BAND_LABELS: Record<LeadBand, string> = {
  A: "Call today",
  B: "Worth a call",
  C: "Long-term",
};

export const FLAG_LABELS: Record<LeadFlag, string> = {
  out_of_area: "Outside service area",
  no_zip: "No ZIP given",
  no_contact: "No contact method",
  vague_description: "Vague description",
  referral: "Referred out",
  not_owner: "Renting — not the owner",
  budget_gap: "Range above expectation",
  site_risk: "Site condition to check first",
  needs_design: "Needs drawings before pricing",
};

/**
 * Score a lead. Pure: same input, same output, no clock and no network.
 *
 * `extraFlags` lets a caller attach conditions this module can't see for itself
 * — today that's only whether the lead was routed to a referral partner.
 */
export function scoreLead(input: LeadScoreInput, extraFlags: LeadFlag[] = []): LeadScore {
  const budgetFit = scoreBudgetFit(input);
  const serviceArea = scoreServiceArea(input);
  const description = scoreDescription(input);
  const contact = scoreContact(input);

  const components: ScoreComponent[] = [
    scoreTimeline(input),
    budgetFit.component,
    scoreProjectValue(input),
    serviceArea.component,
    description.component,
    contact.component,
    scoreFinishLevel(input),
    scoreSize(input),
  ];

  const total = components.reduce((sum, c) => sum + c.points, 0);
  const score = clamp(Math.round(total), 0, 100);

  const flags = Array.from(
    new Set<LeadFlag>([
      ...budgetFit.flags,
      ...serviceArea.flags,
      ...description.flags,
      ...contact.flags,
      ...ownershipFlags(input),
      ...extraFlags,
    ])
  );

  return {
    score,
    band: bandForScore(score),
    version: LEAD_SCORE_VERSION,
    components,
    flags,
  };
}

/**
 * Shape the score into the columns `estimates` stores. Kept next to the scorer
 * so the persisted shape and the model never drift apart.
 */
export function leadScoreFields(result: LeadScore) {
  return {
    lead_score: result.score,
    lead_band: result.band,
    lead_score_version: result.version,
    lead_flags: result.flags,
    qualification: {
      version: result.version,
      scored_at: new Date().toISOString(),
      components: result.components,
      flags: result.flags,
    },
  };
}

/** Convenience for callers holding a raw `estimates` row. */
export function scoreLeadRow(row: Record<string, any>, extraFlags: LeadFlag[] = []): LeadScore {
  const data = row?.estimate_data || {};
  return scoreLead(
    {
      projectType: row?.project_type,
      scopeLevel: row?.scope_level,
      size: row?.size,
      zip: row?.zip,
      description: row?.description,
      name: row?.name,
      email: row?.email,
      phone: row?.phone,
      estimateLow: typeof data.total_projected_low === "number" ? data.total_projected_low : null,
      estimateHigh: typeof data.total_projected_high === "number" ? data.total_projected_high : null,
      timeline: row?.intake_timeline,
      budgetFit: row?.intake_budget_fit,
      ownership: row?.intake_ownership,
    },
    extraFlags
  );
}

/**
 * The effective score for sorting, honouring a manual override. Skyler
 * sometimes just knows, and a triage tool that can't be corrected is one people
 * work around rather than with.
 */
export function effectiveScore(row: Record<string, any>): number {
  const override = row?.lead_score_override;
  if (typeof override === "number" && Number.isFinite(override)) return clamp(override, 0, 100);
  return typeof row?.lead_score === "number" ? row.lead_score : 0;
}

export function effectiveBand(row: Record<string, any>): LeadBand {
  return bandForScore(effectiveScore(row));
}
