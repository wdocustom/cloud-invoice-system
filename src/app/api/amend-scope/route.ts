import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { toNum } from "@/lib/utils";
import {
  categoryOf,
  highCostOf,
  midCostOf,
  normalizeOperations,
  previewAmendment,
  UNCATEGORIZED,
} from "@/lib/scope-amendment";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/** The current scope, numbered, as the model sees it. */
function describeScope(items: any[]): string {
  if (items.length === 0) return "(The proposal has no line items yet.)";

  return items
    .map((item, idx) => {
      const parts = [
        `[${idx}] CATEGORY: ${categoryOf(item)}`,
        `    TITLE: ${item.title || item.high_title || "Untitled"}`,
        `    STANDARD: $${midCostOf(item).toLocaleString()} — ${item.mid_description || item.description || "(no description)"}`,
      ];
      if (item.high_title || item.high_description) {
        parts.push(
          `    LUXURY: $${highCostOf(item).toLocaleString()} — ${item.high_description || "(no description)"}`
        );
      }
      return parts.join("\n");
    })
    .join("\n\n");
}

function buildPrompt(invoice: any, items: any[], request: string): string {
  const existingCategories = Array.from(new Set(items.map(categoryOf))).filter(
    (c) => c !== UNCATEGORIZED
  );

  return `You are an elite residential remodeling estimator in Omaha, NE with 20+ years of experience, working inside a contractor's proposal system.

A proposal has already been sent to the homeowner and is awaiting their approval. The contractor now wants to add scope to it. Your job is to fold the new work into the EXISTING proposal intelligently — not to blindly append lines.

PROJECT: ${invoice.project_title || invoice.description || "Residential remodel"}
ADDRESS: ${invoice.job_address || "Omaha, NE"}
CURRENT PROPOSAL TOTAL: $${toNum(invoice.amount).toLocaleString()}

CURRENT SCOPE — each line is numbered with the index you must reference:
${describeScope(items)}

WHAT THE CONTRACTOR WANTS TO ADD (their own shorthand):
${request}

YOUR TASK — for EVERY distinct piece of work in the contractor's notes, decide one of:

1. "merge" — the work belongs inside a line that already exists. This is the DEFAULT when the new
   work is the same trade in the same area as an existing line (e.g. more can lights when there is
   already an electrical line for that room; a second vanity when a bathroom fixtures line exists).
   Rewrite that line's title and descriptions so they cover BOTH the original scope and the new work,
   and raise mid_cost / high_cost to the new correct TOTAL for the combined line — never output just
   the increment. Never drop scope that was already in the line.

2. "add" — the work is genuinely new: a different trade, a different area, or large enough that the
   homeowner should see it priced on its own. Write a full line item with both tiers.

3. "recategorize" — an EXISTING line is filed under the wrong category and should move. Use this
   sparingly, only to tidy categories affected by this amendment. Do not restate its scope or price.

CATEGORY RULES:
- Every operation must carry a category. Group by trade or area — "Permits & Compliance",
  "Demolition", "Framing & Structural", "Electrical", "Plumbing", "HVAC", "Drywall & Paint",
  "Flooring", "Cabinetry & Millwork", "Fixtures & Finishes", "Exterior", "Final Clean & Punch".
- Reuse the categories already in use where they fit${existingCategories.length ? `: ${existingCategories.join(", ")}` : ""}.
- category_order lists every category the finished proposal should have, in the order a homeowner
  should read them — roughly the order the work happens on site.

PRICING RULES (Omaha, NE market rates):
- Price labor + materials at current Omaha residential remodeling rates. Be realistic; don't lowball or inflate.
- Luxury tier is premium materials and master craftsmanship, typically 25-40% above standard.
- On a merge, mid_cost is the FULL new cost of the combined line, including what it already covered.
- Never mention markup, multipliers, or percentages in any description.

WRITING RULES:
- Descriptions are 1-3 sentences, specific about materials and methods, never generic.
- Keep any dimensions, quantities, or materials the contractor specified, exactly.
- "reason" is one short sentence to the contractor explaining why you routed it that way.
- "addition" quotes the piece of their request this operation covers.

Respond ONLY with raw JSON matching this exact schema:
{
  "summary": "One or two sentences on what you changed and why.",
  "category_order": ["Category A", "Category B"],
  "operations": [
    {
      "action": "merge",
      "target_index": 0,
      "category": "Electrical",
      "title": "Line title covering the combined scope",
      "mid_description": "Standard-tier description of the FULL combined scope...",
      "mid_cost": 0.00,
      "high_title": "Premium version of the title",
      "high_description": "Luxury-tier description of the FULL combined scope...",
      "high_cost": 0.00,
      "reason": "Why this merged instead of standing alone.",
      "addition": "the part of the request this covers"
    }
  ]
}`;
}


export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI service not configured." }, { status: 500 });
    }

    const { invoice_id, request: scopeRequest } = await request.json();

    if (!invoice_id) {
      return NextResponse.json({ error: "Missing invoice_id" }, { status: 400 });
    }
    if (!scopeRequest || !scopeRequest.trim()) {
      return NextResponse.json({ error: "Describe what you'd like to add to the proposal." }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: invoice, error: fetchErr } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .single();

    if (fetchErr || !invoice) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    // Once the homeowner has signed, the scope is a contract. Added work belongs
    // in a change order they approve separately, which this system already has.
    if (invoice.status === "approved") {
      return NextResponse.json(
        {
          error:
            "This proposal is already approved. Added scope has to go through a change order so the homeowner approves it separately.",
        },
        { status: 409 }
      );
    }

    const items = Array.isArray(invoice.items) ? invoice.items : [];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(invoice, items, scopeRequest.trim()) }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      console.error(`Gemini API error ${response.status}:`, errBody);
      return NextResponse.json({ error: `AI service error (${response.status}). Please try again.` }, { status: 502 });
    }

    const data = await response.json();
    let rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!rawText) {
      console.error("Gemini returned no content:", JSON.stringify(data).slice(0, 500));
      return NextResponse.json({ error: "AI returned an empty response. Please try again." }, { status: 502 });
    }

    if (rawText.includes("```")) {
      rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    }
    const start = rawText.indexOf("{");
    const end = rawText.lastIndexOf("}");
    if (start !== -1 && end !== -1) rawText = rawText.slice(start, end + 1);

    const parsed = JSON.parse(rawText);
    const operations = normalizeOperations(parsed?.operations, items.length);

    if (operations.length === 0) {
      return NextResponse.json(
        { error: "The AI couldn't turn that into scope changes. Try describing the work in more detail." },
        { status: 422 }
      );
    }

    // The diff is computed here from the stored items, so what the contractor
    // reviews reflects the real proposal rather than the model's recollection.
    const previews = previewAmendment(items, operations);

    return NextResponse.json({
      summary: (parsed?.summary ?? "").toString().trim(),
      category_order: Array.isArray(parsed?.category_order)
        ? parsed.category_order.map((c: any) => (c ?? "").toString().trim()).filter(Boolean)
        : [],
      operations,
      previews,
      mid_delta: previews.reduce((sum, p) => sum + p.mid_delta, 0),
      high_delta: previews.reduce((sum, p) => sum + p.high_delta, 0),
    });
  } catch (err: any) {
    console.error("Scope amendment error:", err);
    return NextResponse.json({ error: err.message || "Scope amendment failed. Please try again." }, { status: 500 });
  }
}
