import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { insertTolerant } from "@/lib/db";
import { generateProposalPdfBuffer } from "@/lib/generate-pdf";
import { buildChangeOrderIssuedHtml } from "@/lib/email-templates";
import {
  cannotIssueChangeOrder,
  changeOrderAmount,
  changeOrderEmailFigures,
  changeOrderPdfInput,
  nextChangeOrderNumber,
  normalizeChangeOrderItems,
} from "@/lib/change-orders";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Postgres unique_violation — here, two change orders racing for one number.
const UNIQUE_VIOLATION = "23505";
const MAX_NUMBER_ATTEMPTS = 3;

/**
 * Issue a change order against a signed contract.
 *
 * This used to be a bare insert from the admin page, which meant three
 * problems: the number came from `changeOrders.length + 1` (colliding with the
 * unique index after any deletion), nothing told the homeowner a change order
 * existed, and nothing checked the contract was actually signed. Doing it here
 * fixes all three in one place.
 */
export async function POST(request: Request) {
  try {
    const { parent_id, description, items, schedule_impact, base_url } = await request.json();
    const supabase = getSupabase();

    const { data: contract } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", parent_id)
      .maybeSingle();

    const refusal = cannotIssueChangeOrder(contract);
    if (refusal) {
      return NextResponse.json({ error: refusal }, { status: contract ? 409 : 404 });
    }

    const cleanDescription = (description || "").toString().trim();
    if (!cleanDescription) {
      return NextResponse.json({ error: "Describe what this change order adds." }, { status: 400 });
    }

    const lines = normalizeChangeOrderItems(items);
    if (lines.length === 0) {
      return NextResponse.json({ error: "A change order needs at least one line item." }, { status: 400 });
    }

    // ── Insert, retrying if another change order claims the number first ──
    let changeOrder: Record<string, any> | null = null;
    let lastError: any = null;
    let dropped: string[] = [];

    for (let attempt = 0; attempt < MAX_NUMBER_ATTEMPTS && !changeOrder; attempt++) {
      const { data: siblings } = await supabase
        .from("invoices")
        .select("proposal_number")
        .eq("parent_id", parent_id);

      const number = nextChangeOrderNumber(
        contract!.proposal_number,
        (siblings || []).map((s: any) => s.proposal_number)
      );

      const result = await insertTolerant(supabase, "invoices", {
        parent_id,
        ...(number
          ? {
              proposal_number: number,
              sequence_year: contract!.sequence_year ?? null,
              sequence_no: contract!.sequence_no ?? null,
              estimate_number: contract!.estimate_number ?? null,
            }
          : {}),
        homeowner_name: contract!.homeowner_name,
        homeowner_email: contract!.homeowner_email,
        homeowner_phone: contract!.homeowner_phone ?? null,
        job_address: contract!.job_address,
        project_title: contract!.project_title,
        description: cleanDescription,
        items: lines,
        amount: changeOrderAmount(lines),
        schedule_impact: (schedule_impact || "").toString().trim() || null,
        status: "pending",
        deposit_percentage: 0,
        payment_phases: [{ name: "Full Payment", percentage: 100 }],
      });

      if (result.data) {
        changeOrder = result.data;
        dropped = result.dropped;
      } else {
        lastError = result.error;
        if (result.error?.code !== UNIQUE_VIOLATION) break;
      }
    }

    if (!changeOrder) {
      console.error("Change order insert failed:", lastError);
      return NextResponse.json(
        { error: lastError?.message || "Could not create the change order." },
        { status: 500 }
      );
    }

    // ── Tell the homeowner, with the document attached ──
    // Best effort: the change order exists either way, and the contractor is
    // told whether the email went so they can follow up by phone if it didn't.
    let emailed = false;
    let emailError: string | null = null;

    if (!contract!.homeowner_email) {
      emailError = "No email address on file for this client.";
    } else if (!resend) {
      emailError = "Email service not configured.";
    } else {
      try {
        const { data: allSiblings } = await supabase
          .from("invoices")
          .select("*")
          .eq("parent_id", parent_id);

        const origin = base_url || "https://www.wdocustom.com";
        const figures = changeOrderEmailFigures(changeOrder, contract, allSiblings || []);
        const { buffer, filename } = generateProposalPdfBuffer(
          changeOrderPdfInput(changeOrder, contract, allSiblings || [])
        );

        const { error } = await resend.emails.send({
          from: "WDO Custom <proposals@wdocustom.com>",
          to: [contract!.homeowner_email],
          replyTo: "skyler@wdocustom.com",
          subject: `Change order for your signature${figures.change_order_number ? ` — ${figures.change_order_number}` : ""}`,
          html: buildChangeOrderIssuedHtml({ ...figures, portal_url: `${origin}/invoice/${parent_id}` }),
          attachments: [{ filename, content: buffer }],
        });
        if (error) throw error;
        emailed = true;
      } catch (err: any) {
        console.error("Change order email failed:", err);
        emailError = err?.message || "Email failed to send.";
      }
    }

    return NextResponse.json({ change_order: changeOrder, emailed, email_error: emailError, dropped });
  } catch (err: any) {
    console.error("Create change order error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
