import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { prompt, address, zipcode } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is not configured." }, { status: 500 });
    }

    const systemInstruction = `
      You are an elite residential building contractor specializing in home remodeling. 
      Your task is to draft a comprehensive, legally-sound, highly professional "Scope of Work" for an invoice/contract.
      
      Use the provided location context (Address: ${address}, Zip Code: ${zipcode}) to infer any regional building nuances, 
      typical housing styles for that area, or environmental conditions if relevant.
      
      Format the output beautifully using clear sections, bullet points, and professional construction terminology. 
      Break down:
      1. Demolition/Preparation
      2. Materials & Framing (if applicable)
      3. Rough-in & Finish Work
      4. Clean-up & Waste Removal
      
      Keep the tone firm, professional, and clear so it protects both the contractor and the homeowner. Do not include pricing or placeholder brackets.
    `;

    // Calling the native text generation pipeline directly
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `${systemInstruction}\n\nHomeowner Request: ${prompt}` }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();
    
    // Safely look up nested text values step-by-step
    const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      console.error("Raw API Error Object Payload Back From Google:", JSON.stringify(data));
      return NextResponse.json({ 
        error: data?.error?.message || "Response parsing fallback error. Check server logs." 
      }, { status: 500 });
    }

    return NextResponse.json({ text: generatedText });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}