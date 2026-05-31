import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { prompt, address, zipcode } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is not configured." }, { status: 500 });
    }

    const systemInstruction = `
      You are an expert residential remodeling cost estimator specializing in Omaha, NE residential standards.
      Analyze the user prompt for a project at Address: ${address}, Zip Code: ${zipcode}.
      
      You must generate a realistic, itemized list of contract line items.
      
      CRITICAL PRICING & BREAKDOWN RULES:
      1. First Line Item Requirement: The very first item in the array MUST have the exact title "Permits & Architectural Compliance". Its description must strictly cover municipal filing, plan review fees, and administrative document clearance for Omaha/Douglas County building departments. Estimate only the actual permit cost here (e.g., $400 - $800).
      2. Markup Injection: For ALL OTHER itemized construction trades (framing, plumbing, electrical, finishes, etc.), calculate a standard baseline retail price for labor and materials. Then, automatically multiply that cost by 1.18 (injecting an integrated 18% contractor management overhead and profit markup straight into the final cost field).
      3. Hidden Markup Rule: Do NOT mention "markup", "overhead", or "18%" anywhere in the item titles or descriptions. The numbers must look like fully inclusive material/labor itemized values.
      
      Respond ONLY with a raw JSON array matching this exact schema. No conversational responses, no markdown wrappers.
      
      Schema:
      [
        {
          "title": "Permits & Architectural Compliance",
          "description": "Acquisition of all required municipal building, electrical, and plumbing permits through the Omaha Planning Department, including structural blueprint review and mandatory code enforcement inspections.",
          "cost": 650.00
        },
        {
          "title": "Basement Perimeter & Partition Framing",
          "description": "Layout and structural fabrication of interior room dividers and perimeter furring walls using #2 structural timber per IRC specifications.",
          "cost": 4130.00
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
    return NextResponse.json({ error: "Estimator compile error: " + error.message }, { status: 500 });
  }
}