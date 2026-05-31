import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { prompt, address, zipcode } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is not configured." }, { status: 500 });
    }

    const systemInstruction = `
      You are an expert residential remodeling cost estimator. 
      Analyze the user prompt for a project at Address: ${address}, Zip Code: ${zipcode}.
      
      Generate a realistic, itemized list of construction line items for a contract. 
      For each item, provide a clear task description and estimate a realistic retail contractor price (labor + materials) based on regional standards for Omaha, NE.
      
      CRITICAL: You must respond ONLY with a raw JSON array matching this exact schema. No markdown, no triple backticks (\`\`\`), no conversational text.
      
      Schema configuration:
      [
        {
          "title": "Framing Perimeter & Partition Walls",
          "description": "Framing of all interior partition walls and exterior perimeter walls using 2x4 lumber per local building codes.",
          "cost": 3400.00
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
    
    // Clean up any rogue markdown wrappers if the AI accidentally adds them
    rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

    const parsedItems = JSON.parse(rawText);
    return NextResponse.json({ items: parsedItems });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to parse AI pricing layout: " + error.message }, { status: 500 });
  }
}