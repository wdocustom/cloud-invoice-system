import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { generateProposalPdfBuffer } from "@/lib/generate-pdf";
import { buildProposalEmailHtml } from "@/lib/email-templates";

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
    const { invoice_id, base_url } = await request.json();

    if (!invoice_id) {
      return NextResponse.json({ error: "Missing invoice_id" }, { status: 400 });
    }

    const { data: invoice, error: fetchErr } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .single();

    if (fetchErr || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (!invoice.homeowner_email) {
      return NextResponse.json({ error: "No email address on file for this client" }, { status: 400 });
    }

    const portalUrl = `${base_url}/invoice/${invoice_id}`;

    const { buffer, filename } = generateProposalPdfBuffer({
      homeowner_name: invoice.homeowner_name || "Client",
      homeowner_email: invoice.homeowner_email,
      job_address: invoice.job_address || "",
      project_title: invoice.project_title,
      amount: invoice.amount || 0,
      items: invoice.items || [],
      deposit_percentage: invoice.deposit_percentage,
      payment_phases: invoice.payment_phases,
      estimated_start_date: invoice.estimated_start_date,
      project_length: invoice.project_length,
      status: invoice.status || "pending",
      signature_name: invoice.signature_name,
      signed_at: invoice.signed_at,
    });

    const html = buildProposalEmailHtml({
      homeowner_name: invoice.homeowner_name || "Client",
      project_title: invoice.project_title,
      job_address: invoice.job_address || "",
      amount: invoice.amount || 0,
      portal_url: portalUrl,
      estimated_start_date: invoice.estimated_start_date,
      project_length: invoice.project_length,
      proposal_expires_at: invoice.proposal_expires_at,
    });

    const projectLabel = invoice.project_title || invoice.job_address || "Your Project";

    if (!resend) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
    }

    const { error: sendError } = await resend.emails.send({
      from: "WDO Custom <proposals@wdocustom.com>",
      to: [invoice.homeowner_email],
      subject: `Your Proposal from WDO Custom — ${projectLabel}`,
      html,
      attachments: [
        {
          filename,
          content: buffer,
        },
      ],
    });

    if (sendError) {
      console.error("Resend error:", sendError);
      return NextResponse.json({ error: "Failed to send email: " + sendError.message }, { status: 500 });
    }

    const emailLog = {
      type: "proposal",
      sent_at: new Date().toISOString(),
      to: invoice.homeowner_email,
    };
    const currentEmails = Array.isArray(invoice.proposal_emails) ? invoice.proposal_emails : [];
    await supabase
      .from("invoices")
      .update({ proposal_emails: [...currentEmails, emailLog] })
      .eq("id", invoice_id);

    return NextResponse.json({ success: true, sent_to: invoice.homeowner_email });
  } catch (err: any) {
    console.error("Send proposal email error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
