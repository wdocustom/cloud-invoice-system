import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildDepositEmailHtml } from "@/lib/email-templates";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

function formatMoney(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    const { invoice_id, base_url, preview_only } = await request.json();

    if (!invoice_id) {
      return NextResponse.json({ error: "Missing invoice_id" }, { status: 400 });
    }

    const { data: invoice, error: fetchErr } = await supabase
      .from("invoices")
      .select("homeowner_name, homeowner_email, project_title, job_address, amount, deposit_percentage, deposit_amount, homeowner_options, homeowner_selections")
      .eq("id", invoice_id)
      .single();

    if (fetchErr || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const depositAmount = invoice.deposit_amount ?? ((invoice.amount || 0) * ((invoice.deposit_percentage || 20) / 100));
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
      pending_selections: pendingSelections.length > 0 ? pendingSelections : undefined,
    };

    const html = buildDepositEmailHtml(emailData);

    if (preview_only) {
      return NextResponse.json({ html, email_data: emailData });
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
      subject: `Let's get started — construction deposit for ${projectLabel}`,
      html,
    });

    return NextResponse.json({ success: true, sent_to: invoice.homeowner_email });
  } catch (err: any) {
    console.error("Deposit email error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
