import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { depositAmountOf, depositPercentOf, displayPercent, resolvePhases } from "@/lib/payment-schedule";
import { buildDepositEmailHtml } from "@/lib/email-templates";
import { loadCertificateOfInsurance } from "@/lib/certificate-of-insurance";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    const { invoice_id, base_url, preview_only } = await request.json();

    if (!invoice_id) {
      return NextResponse.json({ error: "Missing invoice_id" }, { status: 400 });
    }

    const { data: invoice, error: fetchErr } = await supabase
      .from("invoices")
      .select("homeowner_name, homeowner_email, project_title, job_address, amount, deposit_percentage, deposit_amount, homeowner_options, homeowner_selections, proposal_number, signed_at, estimated_start_date, project_length, payment_phases")
      .eq("id", invoice_id)
      .single();

    if (fetchErr || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const depositAmount = depositAmountOf(invoice, invoice.amount);
    const coi = await loadCertificateOfInsurance(supabase);
    const portalUrl = `${base_url}/invoice/${invoice_id}`;

    const options = invoice.homeowner_options || [];
    const selections = invoice.homeowner_selections || {};
    const pendingSelections = options
      .filter((g: any) => !selections[g.category])
      .map((g: any) => g.category);

    const emailData = {
      homeowner_name: invoice.homeowner_name || "there",
      project_title: invoice.project_title,
      job_address: invoice.job_address || "",
      deposit_amount: depositAmount,
      total_amount: invoice.amount || 0,
      portal_url: portalUrl,
      deposit_percentage: displayPercent(depositPercentOf(invoice, invoice.amount)),
      proposal_number: invoice.proposal_number,
      signed_at: invoice.signed_at,
      estimated_start_date: invoice.estimated_start_date,
      project_length: invoice.project_length,
      // The deposit row reads off the deposit setting, so the two figures in
      // the email can never disagree.
      payment_phases: resolvePhases(invoice.payment_phases, invoice.amount).map((p, i) => ({
        name: p.name,
        percentage: i === 0 ? displayPercent(depositPercentOf(invoice, invoice.amount)) : displayPercent(p.percentage),
        amount: i === 0 ? depositAmount : p.amount,
      })),
      pending_selections: pendingSelections.length > 0 ? pendingSelections : undefined,
      coi_attached: !!coi,
    };

    const html = buildDepositEmailHtml(emailData);

    if (preview_only) {
      return NextResponse.json({ html, email_data: emailData, coi_attached: !!coi });
    }

    if (!invoice.homeowner_email) {
      return NextResponse.json({ error: "No email on file" }, { status: 400 });
    }

    if (!resend) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
    }

    const projectLabel = invoice.project_title || invoice.job_address || "your project";

    await resend.emails.send({
      from: "WDO Custom <payments@wdocustom.com>",
      to: [invoice.homeowner_email],
      subject: `Next step for ${projectLabel}: construction deposit`,
      html,
      ...(coi ? { attachments: [coi] } : {}),
    });

    return NextResponse.json({ success: true, sent_to: invoice.homeowner_email });
  } catch (err: any) {
    console.error("Deposit email error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
