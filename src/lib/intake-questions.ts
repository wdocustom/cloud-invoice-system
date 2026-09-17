/**
 * Conditional intake — the follow-up questions that branch by project type.
 *
 * These are asked *after* the estimate renders, not before it. The hero page
 * promises a number in thirty seconds and the whole funnel is built value-first,
 * so front-loading nine questions would tax the exact conversion the page exists
 * to produce. Asked afterwards, framed as "tighten this range", they have an
 * obvious payoff for the homeowner — and the qualification data falls out as a
 * by-product rather than being the price of admission.
 *
 * Each answer carries an `estimatorHint`, injected verbatim into the pricing
 * prompt on the refinement pass. That's the point: these questions genuinely
 * change the number. A bathroom whose plumbing moves is a different job from one
 * where it doesn't, and the first pass had no way to know.
 *
 * Answers never add points. They can raise a flag — a basement with a moisture
 * history is something to check before driving out, not a three-point deduction
 * — which keeps the scoring scale fixed at 100 across every project type.
 */

import type { LeadFlag } from "./lead-score";

export interface IntakeOption {
  value: string;
  label: string;
  /** Appended to the estimator prompt when chosen. */
  estimatorHint: string;
  /** Raised on the lead when chosen. */
  flag?: LeadFlag;
}

export interface IntakeQuestion {
  id: string;
  label: string;
  options: IntakeOption[];
}

/** Keyed by the exact PROJECT_TYPES labels rendered on /estimate. */
export const INTAKE_QUESTIONS: Record<string, IntakeQuestion[]> = {
  "Kitchen Remodel": [
    {
      id: "layout",
      label: "Are you changing the layout?",
      options: [
        { value: "same", label: "Same footprint", estimatorHint: "Layout unchanged — no plumbing or wall relocation." },
        { value: "minor", label: "Minor changes", estimatorHint: "Minor layout changes; some plumbing or electrical relocation." },
        { value: "full", label: "Full gut, moving walls", estimatorHint: "Full gut with wall removal — include framing, possible structural work, and full mechanical reroutes.", flag: "site_risk" },
      ],
    },
    {
      id: "cabinets",
      label: "What are you doing with cabinets?",
      options: [
        { value: "reface", label: "Reface existing", estimatorHint: "Refacing existing cabinet boxes rather than replacing." },
        { value: "stock", label: "New stock", estimatorHint: "New stock cabinetry." },
        { value: "semi", label: "New semi-custom", estimatorHint: "New semi-custom cabinetry." },
        { value: "custom", label: "Fully custom", estimatorHint: "Fully custom cabinetry — price at the top of the cabinetry range." },
      ],
    },
    {
      id: "appliances",
      label: "Are appliances in the budget?",
      options: [
        { value: "yes", label: "Yes, include them", estimatorHint: "Include an appliance allowance." },
        { value: "no", label: "No, we have them", estimatorHint: "Exclude appliances — homeowner is supplying them." },
      ],
    },
  ],

  "Bathroom Remodel": [
    {
      id: "which",
      label: "Which bathroom?",
      options: [
        { value: "primary", label: "Primary", estimatorHint: "Primary bathroom — typically the largest footprint and highest finish level." },
        { value: "hall", label: "Hall / guest", estimatorHint: "Hall or guest bathroom — standard footprint." },
        { value: "powder", label: "Powder room", estimatorHint: "Powder room — no shower or tub, small footprint." },
        { value: "basement", label: "Basement", estimatorHint: "Basement bathroom — may require below-grade drainage or an ejector pump.", flag: "site_risk" },
      ],
    },
    {
      id: "plumbing",
      label: "Moving any plumbing fixtures?",
      options: [
        { value: "no", label: "Everything stays put", estimatorHint: "No fixture relocation — plumbing stays in place." },
        { value: "some", label: "One or two", estimatorHint: "Relocating one or two fixtures — include partial rough-in." },
        { value: "full", label: "Full reconfigure", estimatorHint: "Full plumbing reconfiguration — include complete rough-in and possible subfloor work.", flag: "site_risk" },
      ],
    },
    {
      id: "conversion",
      label: "Converting a tub to a walk-in shower?",
      options: [
        { value: "yes", label: "Yes", estimatorHint: "Tub-to-shower conversion — include demo, pan, waterproofing and glass." },
        { value: "no", label: "No", estimatorHint: "No tub-to-shower conversion." },
        { value: "unsure", label: "Not sure yet", estimatorHint: "Undecided on tub-to-shower conversion — price the middle case." },
      ],
    },
  ],

  "Basement Finishing": [
    {
      id: "moisture",
      label: "Any history of water or moisture?",
      options: [
        { value: "none", label: "None", estimatorHint: "No moisture history reported." },
        { value: "minor", label: "Minor / occasional", estimatorHint: "Occasional moisture reported — include a modest waterproofing allowance.", flag: "site_risk" },
        { value: "yes", label: "Yes, we've had water", estimatorHint: "Known water intrusion — include waterproofing and note that remediation may be required before finishing.", flag: "site_risk" },
      ],
    },
    {
      id: "bathroom",
      label: "Adding a bathroom?",
      options: [
        { value: "yes", label: "Yes", estimatorHint: "Adding a basement bathroom — include below-grade drainage and possibly an ejector pump." },
        { value: "no", label: "No", estimatorHint: "No basement bathroom." },
        { value: "unsure", label: "Not sure", estimatorHint: "Basement bathroom undecided — include it as a clearly separated optional line." },
      ],
    },
    {
      id: "egress",
      label: "Do you need an egress window?",
      options: [
        { value: "yes", label: "Yes", estimatorHint: "Egress window required — include cutting, well, and window." },
        { value: "no", label: "Already have one", estimatorHint: "Egress already in place." },
        { value: "unsure", label: "Not sure", estimatorHint: "Egress requirement unknown — include an allowance and flag it for the walkthrough." },
      ],
    },
  ],

  "Whole-Home Renovation": [
    {
      id: "occupied",
      label: "Will you live there during construction?",
      options: [
        { value: "yes", label: "Yes, staying", estimatorHint: "Occupied during construction — include phasing, dust control and extended schedule." },
        { value: "no", label: "No, moving out", estimatorHint: "Vacant during construction — trades can work in parallel." },
        { value: "partly", label: "Partly", estimatorHint: "Partially occupied — include some phasing and protection." },
      ],
    },
    {
      id: "age",
      label: "Roughly when was the home built?",
      options: [
        { value: "pre1950", label: "Before 1950", estimatorHint: "Pre-1950 home — allow for knob-and-tube wiring, plaster, asbestos or lead testing, and unforeseen conditions.", flag: "site_risk" },
        { value: "mid", label: "1950 – 1990", estimatorHint: "Mid-century home — expect some mechanical and electrical updates." },
        { value: "modern", label: "After 1990", estimatorHint: "Newer home — systems likely to code." },
      ],
    },
    {
      id: "sqft",
      label: "Approximate square footage?",
      options: [
        { value: "s", label: "Under 1,500", estimatorHint: "Under 1,500 sq ft." },
        { value: "m", label: "1,500 – 2,500", estimatorHint: "1,500–2,500 sq ft." },
        { value: "l", label: "2,500 – 4,000", estimatorHint: "2,500–4,000 sq ft." },
        { value: "xl", label: "Over 4,000", estimatorHint: "Over 4,000 sq ft." },
      ],
    },
  ],

  "Room Addition": [
    {
      id: "plans",
      label: "Do you have architectural plans?",
      options: [
        { value: "yes", label: "Yes, drawn up", estimatorHint: "Architectural plans in hand — no design fee needed." },
        { value: "progress", label: "In progress", estimatorHint: "Plans in progress — include a small design coordination allowance." },
        { value: "no", label: "Not yet", estimatorHint: "No plans yet — include architectural design and engineering fees.", flag: "needs_design" },
      ],
    },
    {
      id: "stories",
      label: "Single story or two?",
      options: [
        { value: "single", label: "Single story", estimatorHint: "Single-storey addition." },
        { value: "two", label: "Two story", estimatorHint: "Two-storey addition — include structural work and a longer schedule.", flag: "site_risk" },
      ],
    },
    {
      id: "foundation",
      label: "What foundation are you planning?",
      options: [
        { value: "slab", label: "Slab", estimatorHint: "Slab-on-grade foundation." },
        { value: "crawl", label: "Crawlspace", estimatorHint: "Crawlspace foundation." },
        { value: "basement", label: "Full basement", estimatorHint: "Full basement foundation — include excavation." },
        { value: "unsure", label: "Not sure", estimatorHint: "Foundation undecided — price a crawlspace and note the variance." },
      ],
    },
  ],

  "Outdoor Living / Deck": [
    {
      id: "material",
      label: "What decking material?",
      options: [
        { value: "composite", label: "Composite", estimatorHint: "Composite decking." },
        { value: "wood", label: "Wood", estimatorHint: "Pressure-treated or cedar wood decking." },
        { value: "unsure", label: "Not sure", estimatorHint: "Material undecided — price composite and note the wood alternative." },
      ],
    },
    {
      id: "coverage",
      label: "Covered or open?",
      options: [
        { value: "open", label: "Open", estimatorHint: "Open deck — no roof structure." },
        { value: "covered", label: "Covered", estimatorHint: "Covered deck — include roof framing and tie-in to the house." },
        { value: "screened", label: "Screened", estimatorHint: "Screened porch — include roof, screening system and framing." },
      ],
    },
    {
      id: "size",
      label: "Roughly how big?",
      options: [
        { value: "s", label: "Under 200 sq ft", estimatorHint: "Under 200 sq ft." },
        { value: "m", label: "200 – 400 sq ft", estimatorHint: "200–400 sq ft." },
        { value: "l", label: "Over 400 sq ft", estimatorHint: "Over 400 sq ft." },
      ],
    },
  ],

  Flooring: [
    {
      id: "area",
      label: "How much of the home?",
      options: [
        { value: "room", label: "One room", estimatorHint: "Single room of flooring." },
        { value: "main", label: "Main level", estimatorHint: "Main level flooring." },
        { value: "whole", label: "Whole home", estimatorHint: "Whole-home flooring replacement." },
      ],
    },
    {
      id: "material",
      label: "What are you putting down?",
      options: [
        { value: "lvp", label: "LVP", estimatorHint: "Luxury vinyl plank." },
        { value: "hardwood", label: "Hardwood", estimatorHint: "Hardwood — include acclimation and finishing." },
        { value: "tile", label: "Tile", estimatorHint: "Tile — include substrate prep." },
        { value: "carpet", label: "Carpet", estimatorHint: "Carpet with pad." },
      ],
    },
    {
      id: "removal",
      label: "Existing flooring to pull up?",
      options: [
        { value: "yes", label: "Yes", estimatorHint: "Existing flooring to demo and dispose of." },
        { value: "no", label: "No, it's bare", estimatorHint: "Subfloor is bare — no demo needed." },
        { value: "unsure", label: "Not sure", estimatorHint: "Demo scope unknown — include a modest removal allowance." },
      ],
    },
  ],

  "Interior Painting": [
    {
      id: "area",
      label: "How much are we painting?",
      options: [
        { value: "room", label: "A room or two", estimatorHint: "One or two rooms." },
        { value: "main", label: "Main level", estimatorHint: "Main level repaint." },
        { value: "whole", label: "Whole home", estimatorHint: "Whole-home interior repaint." },
      ],
    },
    {
      id: "surfaces",
      label: "What's included?",
      options: [
        { value: "walls", label: "Walls only", estimatorHint: "Walls only — no trim or ceilings." },
        { value: "walls_trim", label: "Walls and trim", estimatorHint: "Walls and trim." },
        { value: "all", label: "Walls, trim and ceilings", estimatorHint: "Walls, trim and ceilings — full coverage." },
      ],
    },
    {
      id: "condition",
      label: "What condition are the walls in?",
      options: [
        { value: "good", label: "Good", estimatorHint: "Walls in good condition — minimal prep." },
        { value: "minor", label: "Some patching needed", estimatorHint: "Some patching and prep required." },
        { value: "major", label: "Significant repairs", estimatorHint: "Significant drywall repair before painting — include prep labour.", flag: "site_risk" },
      ],
    },
  ],

  "Custom Built-Ins / Millwork": [
    {
      id: "type",
      label: "What are we building?",
      options: [
        { value: "shelving", label: "Bookcases / shelving", estimatorHint: "Built-in bookcases or shelving." },
        { value: "entertainment", label: "Entertainment centre", estimatorHint: "Built-in entertainment centre — include wire management." },
        { value: "mudroom", label: "Mudroom / lockers", estimatorHint: "Mudroom lockers and bench." },
        { value: "closet", label: "Closet system", estimatorHint: "Custom closet system." },
      ],
    },
    {
      id: "finish",
      label: "Painted or stained?",
      options: [
        { value: "painted", label: "Painted", estimatorHint: "Painted finish — paint-grade materials." },
        { value: "stained", label: "Stained", estimatorHint: "Stained finish — stain-grade hardwood, higher material cost." },
        { value: "mixed", label: "A mix", estimatorHint: "Mixed painted and stained finishes." },
      ],
    },
    {
      id: "scope",
      label: "How many rooms?",
      options: [
        { value: "one", label: "One", estimatorHint: "Single room of millwork." },
        { value: "multiple", label: "Several", estimatorHint: "Millwork across several rooms." },
      ],
    },
  ],
};

export function questionsForProjectType(projectType?: string | null): IntakeQuestion[] {
  return INTAKE_QUESTIONS[(projectType || "").trim()] || [];
}

export function hasBranchQuestions(projectType?: string | null): boolean {
  return questionsForProjectType(projectType).length > 0;
}

function resolveAnswers(
  projectType?: string | null,
  answers?: Record<string, string> | null
): Array<{ question: IntakeQuestion; option: IntakeOption }> {
  const questions = questionsForProjectType(projectType);
  if (!questions.length || !answers) return [];

  const resolved: Array<{ question: IntakeQuestion; option: IntakeOption }> = [];
  for (const question of questions) {
    const value = answers[question.id];
    if (!value) continue;
    const option = question.options.find((o) => o.value === value);
    if (option) resolved.push({ question, option });
  }
  return resolved;
}

/** Prompt fragment for the refinement pass. Empty when nothing was answered. */
export function estimatorHintsFor(
  projectType?: string | null,
  answers?: Record<string, string> | null
): string {
  const hints = resolveAnswers(projectType, answers).map(({ option }) => `- ${option.estimatorHint}`);
  return hints.length ? hints.join("\n") : "";
}

/** Flags raised by the answers themselves, de-duplicated. */
export function flagsForAnswers(
  projectType?: string | null,
  answers?: Record<string, string> | null
): LeadFlag[] {
  const flags = resolveAnswers(projectType, answers)
    .map(({ option }) => option.flag)
    .filter((flag): flag is LeadFlag => !!flag);
  return Array.from(new Set(flags));
}

/** "Moving any plumbing fixtures? — Full reconfigure" pairs, for the admin. */
export function describeAnswers(
  projectType?: string | null,
  answers?: Record<string, string> | null
): Array<{ label: string; answer: string }> {
  return resolveAnswers(projectType, answers).map(({ question, option }) => ({
    label: question.label,
    answer: option.label,
  }));
}
