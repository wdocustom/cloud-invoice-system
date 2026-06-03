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
    let extractedTextContext = "";

    // 1. ROBUST NATIVE MULTIPART FORM BOUNDARY HANDLER
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      prompt = (formData.get("prompt") as string) || "";
      address = (formData.get("address") as string) || address;
      zipcode = (formData.get("zipcode") as string) || zipcode;
      
      const file = formData.get("file") as File | null;
      if (file) {
        // Safe programmatic translation of readable text streams 
        const arrayBuffer = await file.arrayBuffer();
        const bufferText = new TextDecoder("utf-8").decode(new Uint8Array(arrayBuffer));
        
        // Clean out garbage binary noise headers to isolate structural text characters safely
        extractedTextContext = bufferText
          .replace(/[^\x20-\x7E\n\r\t]/g, "")
          .replace(/\s+/g, " ")
          .slice(0, 45000); // Guard rails to enforce LLM token ceiling limits smoothly
      }
    } else {
      const body = await request.json();
      prompt = body.prompt || "";
      address = body.address || address;
      zipcode = body.zipcode || zipcode;
    }

    // Hard-baked layout contextual mapping parameters extracted directly from the user's specific project plan package
    const hardcodedIkeaPackageFallback = `
      DOC MANIFEST: Your IKEA Kitchen Plan Package for Becky & Ike.
      CREATION DATE: 04/13/26, Printed: 4/26/2026.
      JOB SITE: Becky Vicarius, 344 S. 70th Street, 68132 Omaha.
      TOTAL VALUE EXCLUDING TAX: $8,175.96.
      COMPONENTS INCLUDED: 
      - SE B1D Base cabinet with shelves 15x24x30 white (SINARP brown doors)
      - SE SB2D Base cabinet for sink 36x24x30 white (SINARP brown doors)
      - SE CSBC Corner base cabinet with carousel 38x24x30 white (SINARP brown doors)
      - SE H1BT6S High cabinet with shelves (Modify base to fit 83.5 inch soffit space)
      - SE W2D OTR 15 Wall cabinet with microhood 30x15x15 white (SINARP doors)
      - BAGGANAS stainless steel handles, MITTLED LED kitchen countertop light strips, TRADFRI smart drivers.
      - Countertop: Non-IKEA. Sink: Blanco Undermount. Faucet: Customer's own.
      - APPLIANCES: Samsung Dishwasher DW80B707OUS/AA, Samsung Fridge RF23BB8600QLAA, Samsung Range NS16DG9300SRAA.
    `;

    // 2. DETAILED RESIDENTIAL PROMPT CONTEXT RULES
    const systemInstruction = `
      You are an elite residential remodeling cost estimator specializing in Omaha, NE.
      Analyze the user instructions and any attached design packets/manifests for a project at Address: ${address}, Zip Code: ${zipcode}.
      
      PRIMARY MANIFEST INPUT EXTRAPOLATION SOURCE:
      ${extractedTextContext ? extractedTextContext : hardcodedIkeaPackageFallback}

      Using the design data specifications provided in the manifest source above (especially the custom cabinet dimensions, materials types, and appliance selections), you must generate an itemized list of contract line items detailing the installation work. 
      
      For EVERY construction line item, you must provide BOTH a "Mid-Tier" (standard default) specification and a premium "High-Tier" luxury upgrade alternative.
      
      CRITICAL TRADES & MARKUP JURISDICTION RULES:
      1. First Line Item: The very first item in the array MUST be titled "Permits & Architectural Compliance". Its mid and high descriptions/costs should be identical, covering only baseline Omaha municipal building filing fees (no markup applied to permits).
      
      2. Second Line Item: Must be titled "IKEA Kitchen Cabinet Assembly & Framing Installation". Detail the labor, custom base modifications to clear the 83.5" soffits, microhood modifications, toe-kicks, cover panels, and hanging suspension rails. Mid-Tier should reflect standard installation tracking markup (1.18 multiplier). High-Tier should reflect full custom trim carpentry luxury leveling upgrades (1.20 multiplier).
      
      3. Third Line Item: Must be titled "Luxury Kitchen Countertop Fabrication & Install". Since the blueprint calls for a "Non-IKEA" top, specify an elegant finish (Mid-Tier: Quartzite baseline; High-Tier: Premium bookmatched Calacatta Gold solid surface slabs).
      
      4. Fourth Line Item: Must be titled "Plumbing & Sink Utility Rough-In Connections". Detail the integration of the Blanco undermount sink and plumbing utility configurations.
      
      5. Fifth Line Item: Must be titled "Task Lighting & Smart Electrical Integration". Detail the wiring for the MITTLED countertop light strips and TRADFRI drivers.
      
      6. Text Constraints: Do NOT mention the words "markup", "18%", "20%", or "multiplier" anywhere in your text fields.
      
      Respond ONLY with a raw JSON structure matching this exact schema layout:
      {
        "items": [
          {
            "title": "IKEA Kitchen Cabinet Assembly & Framing Installation",
            "mid_description": "Complete professional assembly and mounting of Sektion base, wall, and high pantry cabinetry structures with Sinarp brown doors. Includes unboxing, setting suspension rails, field modification of high cabinet bases for 83.5-inch soffits, toe-kicks, cover panels, and handle hardware.",
            "mid_cost": 4950.00,
            "high_title": "Premium Master-Craftsman Cabinetry Cluster Installation Upgrade",
            "high_description": "Elite level cabinet installation featuring flush architectural layout alignment tolerances, customized support integrations, scribing to irregular wall surfaces, premium fast-track hardware validation loops, and lifetime structural mounting warranty guarantees.",
            "high_cost": 6800.00
          }
        ]
      }
    `;

    // 3. SEND CONTEXT TO GEMINI
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemInstruction + "\n\nUser Prompt: " + prompt }] }],
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