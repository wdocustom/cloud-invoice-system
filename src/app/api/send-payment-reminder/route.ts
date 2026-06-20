import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildPaymentReminderHtml } from "@/lib/email-templates";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

function formatMoney(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function POST(request: Request) {
  try {
    const { invoice_id, phase_name, phase_amount, total_remaining, base_url } =
      await request.json();

    if (!invoice_id || !phase_name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!resend) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
    }

    const { data: invoice, error: fetchErr } = await supabase
      .from("invoices")
      .select("homeowner_name, homeowner_email, project_title, job_address")
      .eq("id", invoice_id)
      .single();

    if (fetchErr || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (!invoice.homeowner_email) {
      return NextResponse.json({ error: "No email on file" }, { status: 400 });
    }

    const portalUrl = `${base_url}/invoice/${invoice_id}`;
    const projectLabel = invoice.project_title || invoice.job_address || "your project";

    await resend.emails.send({
      from: "WDO Custom <payments@wdocustom.com>",
      to: [invoice.homeowner_email],
      subject: `Payment reminder — $${formatMoney(phase_amount)} due for ${projectLabel}`,
      html: buildPaymentReminderHtml({
        homeowner_name: invoice.homeowner_name || "there",
        project_title: invoice.project_title,
        job_address: invoice.job_address || "",
        phase_name,
        phase_amount,
        total_remaining,
        portal_url: portalUrl,
      }),
    });

    return NextResponse.json({ success: true, sent_to: invoice.homeowner_email });
  } catch (err: any) {
    console.error("Payment reminder email error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
