import { NextResponse } from "next/server";
import { describeContractForChangeOrder, normalizeAlreadyCovered } from "@/lib/change-orders";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is not configured." }, { status: 500 });
    }

    const body = await request.json();
    const prompt = body.prompt || "";
    const fileContext = body.fileContext || "";
    const address = body.address || "Project Address";
    const zipcode = body.zipcode || "Omaha";

    const hasFileContext = fileContext && fileContext.trim().length > 100;

    // Change-order mode: the caller passes the signed contract's lines. Without
    // them the generator prices from a blank slate and can re-price work the
    // homeowner already signed for. New proposals pass nothing and are unchanged.
    const isChangeOrder = Array.isArray(body.contractItems);
    const contractScope = isChangeOrder
      ? describeContractForChangeOrder(body.contractItems, Array.isArray(body.changeOrders) ? body.changeOrders : [])
      : "";

    const permitsRule = isChangeOrder
      ? `5. The contract already covers the permits for its original scope. Include a "Permits & Code Compliance" line ONLY if this added work needs a permit or inspection the contract doesn't already cover (e.g. new circuits, moved plumbing, structural changes). Mid and high cost/description should be identical for permits.`
      : `5. The FIRST line item must ALWAYS be "Permits & Code Compliance" covering Omaha municipal building permits, inspections, and any required engineering. Mid and high cost/description should be identical for permits (no markup on permits).`;

    const systemInstruction = `You are an elite residential remodeling cost estimator based in Omaha, NE with 20+ years of experience pricing renovation projects.

PROJECT LOCATION: ${address}, ${zipcode}

${hasFileContext ? `ATTACHED DOCUMENT/PACKAGE CONTENTS:\n${fileContext}\n` : ""}
${
  isChangeOrder
    ? `THIS IS A CHANGE ORDER against a contract the homeowner has already signed. Everything below is
ALREADY IN THE CONTRACT — the homeowner has signed for it at these prices:

${contractScope}

Price ONLY the genuinely new work in the contractor's notes. Never re-price, restate, or include work
listed above. If part of the request is already covered by a contract line, do not price it — list it
in "already_covered" instead, naming the contract line it matches, so the contractor can confirm.
`
    : ""
}
CONTRACTOR'S SCOPE NOTES:
${prompt}

YOUR TASK:
Parse the contractor's notes above carefully. They are written in shorthand — extract every distinct piece of work described.

GROUPING RULES:
1. Group related work by ROOM or AREA (e.g., "New Bedroom Build-Out", "Wine Room Conversion", "Exterior Repairs & Finish"). Each group becomes ONE line item.
2. Within each line item description, list ALL the specific tasks that fall under that scope area.
3. If the contractor mentions specific dimensions, materials, or quantities — include them exactly.
4. If obvious related work is missing (e.g., they mention adding a bedroom but don't mention electrical for it), include it and note it as "included" in the description.
${permitsRule}

PRICING RULES (Omaha, NE market rates):
- Price based on current Omaha residential remodeling labor + materials rates
- Mid-Tier: Standard contractor-grade materials, professional labor
- High-Tier: Premium/luxury materials, master craftsman labor, typically 25-40% above mid-tier depending on scope
- Never mention "markup", "multiplier", or percentage calculations in descriptions
- Be realistic — don't lowball or inflate

DESCRIPTION QUALITY:
- Mid-tier descriptions: specific, practical, mention actual materials and methods
- High-tier descriptions: emphasize premium materials, superior craftsmanship, upgraded finishes
- Both tiers: reference the actual work from the contractor's notes, don't be generic
- Keep descriptions 1-3 sentences, dense with detail

Respond ONLY with raw JSON matching this exact schema:
{
  "items": [
    {
      "title": "Short descriptive scope title",
      "mid_description": "Detailed mid-tier scope description with specific materials and methods...",
      "mid_cost": 0.00,
      "high_title": "Premium version of the scope title",
      "high_description": "Detailed high-tier scope description with premium materials and methods...",
      "high_cost": 0.00
    }
  ]${
    isChangeOrder
      ? `,
  "already_covered": [
    { "request": "the part of the notes already in the contract", "existing_title": "the contract line that covers it" }
  ]`
      : ""
  }
}${isChangeOrder ? `\n\n"already_covered" may be an empty array. "items" may be empty only if every part of the request is already covered.` : ""}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemInstruction }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      }
    );

    const data = await response.json();
    let rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (rawText.includes("```")) {
      rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    const startBracket = rawText.indexOf("{");
    const endBracket = rawText.lastIndexOf("}");
    if (startBracket !== -1 && endBracket !== -1) {
      rawText = rawText.slice(startBracket, endBracket + 1);
    }

    const parsedJson = JSON.parse(rawText);
    const finalItemsArray = Array.isArray(parsedJson) ? parsedJson : (parsedJson.items || []);

    return NextResponse.json({
      items: finalItemsArray,
      ...(isChangeOrder ? { already_covered: normalizeAlreadyCovered(parsedJson?.already_covered) } : {}),
    });
  } catch (error: any) {
    console.error("Estimator failure:", error);
    return NextResponse.json({ error: "AI estimation failed. Please try again." }, { status: 500 });
  }
}
