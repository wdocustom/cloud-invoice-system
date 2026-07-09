import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    const formData = await request.formData();
    const photos = formData.getAll("photos") as File[];
    const invoiceId = formData.get("invoice_id") as string;
    const category = formData.get("category") as string;

    console.log(`[scan-sample] Received ${photos.length} photo(s), sizes: ${photos.map(p => `${p.name}=${(p.size/1024).toFixed(0)}KB`).join(", ")}`);

    if (!photos.length || !invoiceId) {
      return NextResponse.json({ error: "Missing photos or invoice_id" }, { status: 400 });
    }

    const supabase = getSupabase();
    const uploadedUrls: string[] = [];
    const geminiParts: any[] = [];
    let storageError = "";

    for (const file of photos) {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const mimeType = file.type || "image/jpeg";

      const filePath = `selections/${invoiceId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage
        .from("project-photos")
        .upload(filePath, Buffer.from(arrayBuffer), { contentType: mimeType });

      if (uploadError) {
        console.error("Supabase storage upload error:", uploadError.message);
        storageError = uploadError.message;
      } else {
        const { data: urlData } = supabase.storage
          .from("project-photos")
          .getPublicUrl(filePath);
        uploadedUrls.push(urlData.publicUrl);
      }

      geminiParts.push({ inline_data: { mime_type: mimeType, data: base64 } });
    }

    const photoCount = photos.length;
    const prompt = `You are analyzing ${photoCount} photo${photoCount > 1 ? 's' : ''} of a physical material/finish sample used in residential remodeling (cabinet door, tile, countertop, flooring, paint chip, hardware, etc.).

${photoCount > 1 ? `Multiple photos are provided (image 1, image 2, etc.). One typically shows the actual color/texture/appearance and another has labels, text, and manufacturer info on the back. Use ALL photos together to identify the product.

IMPORTANT: Also identify which image (1-indexed) best shows the actual appearance/color/texture of the material — this will be used as the display thumbnail for the homeowner. The label/text side should NOT be the display image.` : 'Read any labels, text, stickers, brand markings, or manufacturer info visible on the sample.'}

Extract the following:

1. **product_name**: The full product name including color/finish name (e.g. "NeoMatte Riverstone Grey", "Sherwin-Williams Repose Gray SW 7015", "MSI Calacatta Laza Quartz")
2. **manufacturer**: The brand or manufacturer name (e.g. "Premiere Eurocase", "Sherwin-Williams", "MSI")
3. **material_type**: What type of material this is (e.g. "Cabinet Door Finish", "Paint Color", "Quartz Countertop", "Porcelain Tile", "Luxury Vinyl Plank", "Cabinet Hardware")
4. **color_description**: A brief description of the color/finish for the homeowner (e.g. "Warm light grey with matte finish", "Cool white with subtle veining")
5. **product_url**: If you can identify the exact manufacturer website from text on the sample, provide it. Otherwise return empty string.
${photoCount > 1 ? '6. **display_image**: The 1-indexed number of the photo that best shows the appearance/color (not the label side). e.g. 1 or 2' : ''}

${category ? `Context: This sample is for the "${category}" selection category.` : ""}

Respond ONLY with valid JSON, no markdown:
{"product_name":"...","manufacturer":"...","material_type":"...","color_description":"...","product_url":"..."${photoCount > 1 ? ',"display_image":1' : ''}}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              ...geminiParts,
            ],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error:", errText);
      return NextResponse.json({
        image_url: uploadedUrls[0] || "",
        all_image_urls: uploadedUrls,
        product_name: "",
        manufacturer: "",
        material_type: "",
        color_description: "",
        product_url: "",
        ai_error: "Could not analyze image",
      });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log(`[scan-sample] Gemini raw response:`, rawText);

    let parsed: any = { product_name: "", manufacturer: "", material_type: "", color_description: "", product_url: "" };
    try {
      const cleaned = rawText.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      const braceMatch = rawText.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        try { parsed = JSON.parse(braceMatch[0]); } catch { console.error("Failed to parse Gemini response:", rawText); }
      } else {
        console.error("No JSON found in Gemini response:", rawText);
      }
    }

    const displayIdx = Math.max(0, (parseInt(parsed.display_image) || 1) - 1);
    const displayUrl = uploadedUrls[displayIdx] || uploadedUrls[0] || "";

    return NextResponse.json({
      image_url: displayUrl,
      all_image_urls: uploadedUrls,
      product_name: parsed.product_name || "",
      manufacturer: parsed.manufacturer || "",
      material_type: parsed.material_type || "",
      color_description: parsed.color_description || "",
      product_url: parsed.product_url || "",
      ...(storageError && { storage_error: storageError }),
    });
  } catch (err: any) {
    console.error("Scan sample error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
