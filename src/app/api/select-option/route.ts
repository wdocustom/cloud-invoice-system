import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("id");
    const category = searchParams.get("category");
    const value = searchParams.get("value");

    if (!invoiceId || !category || !value) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: invoice, error: fetchErr } = await supabase
      .from("invoices")
      .select("homeowner_selections, homeowner_options, homeowner_name, project_title, job_address, homeowner_email")
      .eq("id", invoiceId)
      .single();

    if (fetchErr || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const options = invoice.homeowner_options || [];
    const categoryExists = options.some((g: any) => g.category === category);
    if (!categoryExists) {
      return NextResponse.json({ error: "Category not found" }, { status: 400 });
    }

    const group = options.find((g: any) => g.category === category);
    const choiceLabels = (group?.choices || []).map((c: any) =>
      typeof c === "string" ? c : c.label
    );
    if (!choiceLabels.includes(value)) {
      return NextResponse.json({ error: "Choice not found" }, { status: 400 });
    }

    const updatedSelections = { ...(invoice.homeowner_selections || {}), [category]: value };
    const { error: updateErr } = await supabase
      .from("invoices")
      .update({ homeowner_selections: updatedSelections })
      .eq("id", invoiceId);

    if (updateErr) {
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    const totalCategories = options.length;
    const totalSelected = Object.keys(updatedSelections).length;

    try {
      const baseUrl = new URL(request.url).origin;
      await fetch(`${baseUrl}/api/notify-selection-made`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: invoiceId,
          category,
          selected_value: value,
          total_selected: totalSelected,
          total_categories: totalCategories,
        }),
      });
    } catch {}

    const portalUrl = `${new URL(request.url).origin}/invoice/${invoiceId}`;
    return NextResponse.redirect(`${portalUrl}?selection_confirmed=${encodeURIComponent(category)}`);
  } catch (err: any) {
    console.error("Select option error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
