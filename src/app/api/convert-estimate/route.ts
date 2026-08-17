import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { describeDbError, insertTolerant, updateTolerant } from "@/lib/db";
import { toNum } from "@/lib/utils";
import {
  allocateDocumentNumber,
  documentNumberOf,
  estimateNumberFields,
  formatEstimateNumber,
  proposalNumberFields,
} from "@/lib/document-numbers";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/** "1234 Oak St, Omaha, NE 68022" from whatever pieces the lead actually has. */
function composeJobAddress(estimate: Record<string, any>): string {
  const street = (estimate.address || "").trim();
  const city = (estimate.city || "").trim();
  const state = (estimate.state || "").trim();
  const zip = (estimate.zip || "").trim();
  const region = [state, zip].filter(Boolean).join(" ");
  return [street, city, region].filter(Boolean).join(", ");
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
    if (!ed || typeof ed !== "object") {
      return NextResponse.json(
        { error: "This lead has no saved estimate data, so there are no line items to convert." },
        { status: 422 }
      );
    }

    // The AI estimate is free-form JSON — a missing or non-numeric low/high used
    // to produce NaN here, which serialises to null and gets rejected by the
    // not-null constraint on invoices.amount. toNum keeps every figure finite.
    const rawItems = Array.isArray(ed.line_items) ? ed.line_items : [];
    const items = rawItems.map((li: any) => {
      const low = toNum(li?.low);
      const high = toNum(li?.high);
      const mid = Math.round((low + high) / 2);
      const title = (li?.item || "").trim() || "Project line item";
      return {
        title,
        mid_description: li?.notes || "",
        mid_cost: mid,
        high_title: title,
        high_description: li?.notes || "",
        high_cost: high || mid,
      };
    });

    const midTotal = items.reduce((s: number, i: any) => s + toNum(i.mid_cost), 0);
    const jobAddress = composeJobAddress(estimate);

    // Internal lead notes stay internal: they land in contractor_notes hidden
    // from the homeowner portal, not in the customer-facing description.
    const leadNotes = (estimate.notes || "").trim();
    const contractorNotes = leadNotes
      ? [{ text: leadNotes, timestamp: new Date().toISOString(), visible: false }]
      : [];

    // The proposal keeps the lead's number: EST-2026-0007 becomes PRO-2026-0007
    // so the estimate the homeowner saw and the proposal they sign are visibly
    // the same job. Leads from before numbering existed have nothing to inherit,
    // so they draw a fresh number here and get it written back to the lead too.
    const inheritedNumber = documentNumberOf(estimate);
    const documentNumber = inheritedNumber ?? (await allocateDocumentNumber(supabase));
    const estimateNumber =
      estimate.estimate_number || (documentNumber ? formatEstimateNumber(documentNumber) : null);
    // Only stamp a number back onto a lead that has none. A lead already showing
    // EST-2026-0004 to a customer keeps it, even if its sequence columns are
    // missing — the label a customer was given must never be rewritten.
    const backfillLead = !inheritedNumber && !estimate.estimate_number;

    const { data: invoice, error: insertErr, dropped } = await insertTolerant<{ id: string }>(
      supabase,
      "invoices",
      {
        ...proposalNumberFields(documentNumber, estimateNumber),
        homeowner_name: estimate.name || "",
        homeowner_email: estimate.email || "",
        homeowner_phone: estimate.phone || "",
        job_address: jobAddress,
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
        contractor_notes: contractorNotes,
      },
      "id"
    );

    if (insertErr || !invoice) {
      console.error("Invoice creation error:", insertErr, { estimate_id, item_count: items.length, amount: midTotal });
      return NextResponse.json(
        { error: `Failed to create proposal: ${describeDbError(insertErr)}` },
        { status: 500 }
      );
    }

    const { error: linkErr } = await updateTolerant(
      supabase,
      "estimates",
      {
        status: "converted",
        converted_to_invoice_id: invoice.id,
        // Backfills the number on a lead that predates numbering.
        ...(backfillLead ? estimateNumberFields(documentNumber) : {}),
      },
      (q) => q.eq("id", estimate_id),
      "id"
    );

    if (linkErr) {
      console.error("Failed to link estimate to invoice:", linkErr);
    }

    return NextResponse.json({
      success: true,
      invoice_id: invoice.id,
      proposal_number: dropped.includes("proposal_number")
        ? null
        : proposalNumberFields(documentNumber).proposal_number ?? null,
      ...(dropped.length ? { dropped_columns: dropped } : {}),
      ...(linkErr ? { warning: `Proposal created, but the lead could not be marked converted: ${describeDbError(linkErr)}` } : {}),
    });
  } catch (err: any) {
    console.error("Convert estimate error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
