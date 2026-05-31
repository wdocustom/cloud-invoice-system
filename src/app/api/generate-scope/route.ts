import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { prompt, address, zipcode } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is not configured." }, { status: 500 });
    }

    const systemInstruction = `
      You are an elite residential remodeling cost estimator specializing in Omaha, NE.
      Analyze the user prompt for a project at Address: ${address}, Zip Code: ${zipcode}.
      
      You must generate an itemized list of contract line items. For EVERY construction line item, you must provide BOTH a "Mid-Tier" (standard default) specification and a premium "High-Tier" luxury upgrade alternative.
      
      CRITICAL TRADES & MARKUP JURISDICTION RULES:
      1. First Line Item: The very first item in the array MUST be titled "Permits & Architectural Compliance". Its mid and high descriptions/costs should be identical, covering only baseline Omaha municipal building filing fees (no markup applied to permits).
      
      2. Mid-Tier Pricing (Default): Estimate a realistic mid-grade finish baseline (e.g., standard tile, stock double vanities, clean basic fixtures). Automatically multiply this baseline trade cost by 1.18 to embed an invisible 18% contractor overhead/profit markup.
      
      3. High-Tier Pricing (Upgrade): Estimate a premium, high-luxury grade finish alternative (e.g., custom quartz tops, designer double vanities, high-end frameless glass custom showers). Automatically multiply this high-end luxury baseline cost by 1.20 to embed an invisible 20% contractor overhead/profit markup.
      
      4. Text Constraints: Do NOT mention the words "markup", "18%", "20%", or "multiplier" anywhere in your text fields.
      
      Respond ONLY with a raw JSON array matching this exact schema:
      [
        {
          "title": "Bathroom Vanity Installation",
          "mid_description": "Supply and installation of a standard mid-grade double vanity cabinet with an engineered stone countertop, undermount porcelain bowls, and brushed nickel faucets.",
          "mid_cost": 2150.00,
          "high_title": "Luxury Custom Double Vanity Upgrade",
          "high_description": "Supply and custom installation of a premium solid wood double vanity suite with a custom-fabricated solid quartzite countertop, premium widespread brass fixtures, and integrated soft-close structural tracking hardware.",
          "high_cost": 3800.00
        }
      ]
    `;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemInstruction}\n\nUser Request: ${prompt}` }] }]
        })
      }
    );

    const data = await response.json();
    let rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsedItems = JSON.parse(rawText);

    return NextResponse.json({ items: parsedItems });
  } catch (error: any) {
    return NextResponse.json({ error: "Estimator build failure: " + error.message }, { status: 500 });
  }
}