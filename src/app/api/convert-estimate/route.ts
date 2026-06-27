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
    const supabase = getSupabase();
    const { estimate_id } = await request.json();

    if (!estimate_id) {
      return NextResponse.json({ error: "Missing estimate_id" }, { status: 400 });
    }

    const { data: estimate, error: fetchErr } = await supabase
      .from("estimates")
      .select("*")
      .eq("id", estimate_id)
      .single();

    if (fetchErr || !estimate) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    if (estimate.converted_to_invoice_id) {
      return NextResponse.json({ error: "Already converted", invoice_id: estimate.converted_to_invoice_id }, { status: 409 });
    }

    const ed = estimate.estimate_data;

    const items = (ed.line_items || []).map((li: any) => ({
      title: li.item,
      mid_description: li.notes || "",
      mid_cost: Math.round((li.low + li.high) / 2),
      high_title: li.item,
      high_description: li.notes || "",
      high_cost: li.high,
    }));

    const midTotal = items.reduce((s: number, i: any) => s + i.mid_cost, 0);

    const { data: invoice, error: insertErr } = await supabase
      .from("invoices")
      .insert({
        homeowner_name: estimate.name || "",
        homeowner_email: estimate.email || "",
        job_address: "",
        project_title: ed.project_title || estimate.project_type,
        description: estimate.description,
        amount: midTotal,
        items,
        status: "pending",
        deposit_percentage: 20,
        payment_phases: [
          { name: "Deposit", percentage: 20 },
          { name: "Framing & Rough-In", percentage: 24 },
          { name: "Drywall & Finishes", percentage: 24 },
          { name: "Final Completion", percentage: 32 },
        ],
        homeowner_options: [],
        homeowner_selections: {},
        view_count: 0,
        view_history: [],
        proposal_emails: [],
        daily_logs: [],
        questions: [],
        documents: [],
        payment_history: [],
      })
      .select("id")
      .single();

    if (insertErr || !invoice) {
      console.error("Invoice creation error:", insertErr);
      return NextResponse.json({ error: "Failed to create proposal" }, { status: 500 });
    }

    await supabase
      .from("estimates")
      .update({
        status: "converted",
        converted_to_invoice_id: invoice.id,
      })
      .eq("id", estimate_id);

    return NextResponse.json({ success: true, invoice_id: invoice.id });
  } catch (err: any) {
    console.error("Convert estimate error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
