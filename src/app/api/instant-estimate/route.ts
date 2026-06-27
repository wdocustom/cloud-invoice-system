import { NextResponse } from "next/server";
import laborRates from "@/lib/labor-rates.json";

function getRegionalMultiplier(zip: string): number {
  if (!zip || zip.length < 3) return laborRates.regional_multipliers.other;
  const prefix = zip.substring(0, 3);
  return (laborRates.regional_multipliers as Record<string, number>)[prefix] ?? laborRates.regional_multipliers.other;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI service not configured." }, { status: 500 });
    }

    const { projectType, scopeLevel, size, zip, description } = await request.json();

    if (!description || !projectType) {
      return NextResponse.json({ error: "Project type and description are required." }, { status: 400 });
    }

    const scopeLabels: Record<string, string> = {
      budget: "Budget / Builder Grade — basic materials, cost-effective finishes",
      mid: "Mid-Range / Standard — quality materials, professional finish",
      high: "High-End / Custom — premium materials, master craftsmanship",
    };

    const multiplier = getRegionalMultiplier(zip);
    const ratesContext = Object.entries(laborRates.rates_by_trade)
      .map(([trade, rate]) => `${trade}: $${Math.round(rate * multiplier)}/hr`)
      .join(", ");

    const prompt = `You are an elite residential remodeling cost estimator based in Omaha, NE with 20+ years of experience.

A homeowner is requesting a rough ballpark estimate for their project.

PROJECT DETAILS:
- Type: ${projectType}
- Material/Finish Level: ${scopeLabels[scopeLevel] || scopeLevel}
- Size/Scope: ${size || "Not specified"}
- ZIP Code: ${zip || "Omaha metro area"}
- Description: ${description}

REFERENCE LABOR RATES (adjusted for region, multiplier ${multiplier}x):
${ratesContext}

YOUR TASK:
Generate a realistic rough estimate broken into line items. This is for initial budgeting only — not a binding quote.

PRICING RULES (Omaha, NE market rates):
- Use the reference labor rates above as a baseline for labor cost calculations
- Layer materials cost on top of labor based on the finish level selected
- Be realistic — don't lowball or inflate
- Include a Permits & Inspections line item
- Include an Overhead & Profit line (15-20%)
- Include a Contingency line (8-12%)

Respond ONLY with raw JSON matching this exact schema:
{
  "project_title": "Short title for the project",
  "line_items": [
    {
      "item": "Line item description",
      "low": 0,
      "high": 0,
      "notes": "Brief note about what's included"
    }
  ],
  "subtotal_low": 0,
  "subtotal_high": 0,
  "overhead_profit_percent": 18,
  "contingency_percent": 10,
  "total_projected_low": 0,
  "total_projected_high": 0,
  "timeline_weeks": "X-Y",
  "disclaimers": [
    "This is a rough ballpark estimate for initial budgeting purposes only.",
    "Final pricing requires an on-site consultation to assess existing conditions.",
    "Material selections, structural conditions, and permit requirements may affect final cost.",
    "Estimate based on current Omaha, NE market rates."
  ]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
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

    const parsed = JSON.parse(rawText);
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Instant estimate error:", error);
    return NextResponse.json({ error: "Estimate generation failed. Please try again." }, { status: 500 });
  }
}
