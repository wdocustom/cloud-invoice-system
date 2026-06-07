import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { invoice_id, device, browser, referrer, screen } = await request.json();

    if (!invoice_id) {
      return NextResponse.json({ error: "Missing invoice_id" }, { status: 400 });
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip") || "Unknown";

    const sessionPayload = {
      timestamp: new Date().toISOString(),
      ip,
      device,
      browser,
      referrer: referrer || null,
      screen: screen || null,
    };

    const { data, error: fetchError } = await supabase
      .from("invoices")
      .select("view_count, view_history")
      .eq("id", invoice_id)
      .single();

    if (fetchError || !data) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const updatedHistory = [...(data.view_history || []), sessionPayload];

    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        view_count: (data.view_count || 0) + 1,
        view_history: updatedHistory,
      })
      .eq("id", invoice_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ tracked: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
