import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is not configured." }, { status: 500 });
    }

    const contentType = request.headers.get("content-type") || "";
    let prompt = "";
    let address = "Project Address";
    let zipcode = "Omaha";
    let base64File = "";
    let mimeType = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      prompt = (formData.get("prompt") as string) || "";
      address = (formData.get("address") as string) || address;
      zipcode = (formData.get("zipcode") as string) || zipcode;
      
      const file = formData.get("file") as File | null;
      if (file) {
        mimeType = file.type;
        const arrayBuffer = await file.arrayBuffer();
        base64File = Buffer.from(arrayBuffer).toString("base64");
      }
    } else {
      const body = await request.json();
      prompt = body.prompt || "";
      address = body.address || address;
      zipcode = body.zipcode || zipcode;
    }

    const systemInstruction = `
      You are an elite residential remodeling cost estimator specializing in Omaha, NE.
      Analyze the user instructions and any attached design packets/manifests for a project at Address: ${address}, Zip Code: ${zipcode}.
      
      If an attached package document (such as an IKEA planning document) is provided, systematically scan and parse its contents (materials values, lists of items, design configurations, cabinet parts, and totals) to map an itemized, custom contracting estimate row.
      
      You must generate an itemized list of contract line items. For EVERY construction line item, you must provide BOTH a "Mid-Tier" (standard default) specification and a premium "High-Tier" luxury upgrade alternative.
      
      CRITICAL TRADES & MARKUP JURISDICTION RULES:
      1. First Line Item: The very first item in the array MUST be titled "Permits & Architectural Compliance". Its mid and high descriptions/costs should be identical, covering only baseline Omaha municipal building filing fees (no markup applied to permits).
      
      2. Mid-Tier Pricing (Default): Estimate a realistic mid-grade finish baseline (e.g., standard tile, stock double vanities, clean basic fixtures, or assembly/installation labor for the specific materials provided in the document layout). Automatically multiply this baseline trade cost by 1.18 to embed an invisible 18% contractor overhead/profit markup.
      
      3. High-Tier Pricing (Upgrade): Estimate a premium, high-luxury grade finish alternative (e.g., custom quartz tops, designer double vanities, high-end frameless glass custom showers, premium panel modifications). Automatically multiply this high-end luxury baseline cost by 1.20 to embed an invisible 20% contractor overhead/profit markup.
      
      4. Text Constraints: Do NOT mention the words "markup", "18%", "20%", or "multiplier" anywhere in your text fields.
      
      Respond ONLY with a raw JSON structure matching this exact schema layout:
      {
        "items": [
          {
            "title": "Bathroom Vanity Installation",
            "mid_description": "Supply and installation of a standard mid-grade double vanity cabinet with an engineered stone countertop, undermount porcelain bowls, and brushed nickel faucets.",
            "mid_cost": 2150.00,
            "high_title": "Luxury Custom Double Vanity Upgrade",
            "high_description": "Supply and custom installation of a premium solid wood double vanity suite with a custom-fabricated solid quartzite countertop, premium widespread brass fixtures, and integrated soft-close structural tracking hardware.",
            "high_cost": 3800.00
          }
        ]
      }
    `;

    const contentsParts: any[] = [
      { text: `${systemInstruction}\n\nUser Context/Instructions: ${prompt}` }
    ];

    if (base64File && mimeType) {
      contentsParts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64File
        }
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: contentsParts }],
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

    const parsedJson = JSON.parse(rawText);
    const finalItemsArray = Array.isArray(parsedJson) ? parsedJson : (parsedJson.items || []);

    return NextResponse.json({ items: finalItemsArray });
  } catch (error: any) {
    console.error("Estimator failure trace:", error);
    return NextResponse.json({ error: "Estimator build failure: " + error.message }, { status: 500 });
  }
}