import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import {
  buildApprovalConfirmationHtml,
  buildContractorApprovalNotificationHtml,
} from "@/lib/email-templates";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

function formatMoney(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export async function POST(request: Request) {
  try {
    const { invoice_id, base_url } = await request.json();

    if (!invoice_id) {
      return NextResponse.json({ error: "Missing invoice_id" }, { status: 400 });
    }

    if (!resend) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
    }

    const { data: invoice, error: fetchErr } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .single();

    if (fetchErr || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const portalUrl = `${base_url}/invoice/${invoice_id}`;
    const workspaceUrl = `${base_url}/admin/projects/${invoice_id}`;
    const depositPct = invoice.deposit_percentage ?? 20;
    const depositAmount = (invoice.amount || 0) * (depositPct / 100);
    const projectLabel =
      invoice.project_title || invoice.job_address || "Your Project";

    const emailData = {
      homeowner_name: invoice.homeowner_name || "Client",
      project_title: invoice.project_title,
      job_address: invoice.job_address || "",
      amount: invoice.amount || 0,
      deposit_amount: depositAmount,
      deposit_percentage: depositPct,
      portal_url: portalUrl,
      estimated_start_date: invoice.estimated_start_date,
      project_length: invoice.project_length,
      signed_at: invoice.signed_at || new Date().toISOString(),
      signature_name: invoice.signature_name || "Client",
      items: (invoice.items || []).map((item: any) => ({
        title: item.title,
        cost: item.cost || item.mid_cost || 0,
      })),
    };

    const results: string[] = [];

    // 1. Send confirmation to homeowner
    if (invoice.homeowner_email) {
      try {
        await resend.emails.send({
          from: "WDO Custom <proposals@wdocustom.com>",
          to: [invoice.homeowner_email],
          subject: `Contract Signed — $${formatMoney(invoice.amount || 0)} confirmed for ${projectLabel}`,
          html: buildApprovalConfirmationHtml(emailData),
        });
        results.push(`homeowner:${invoice.homeowner_email}`);
      } catch (err) {
        console.error("Homeowner approval email failed:", err);
      }
    }

    // 2. Send notification to contractor
    const contractorEmail = "skyler@wdocustom.com";
    try {
      await resend.emails.send({
        from: "WDO Custom <proposals@wdocustom.com>",
        to: [contractorEmail],
        subject: `Proposal Approved — ${invoice.homeowner_name} signed $${formatMoney(invoice.amount || 0)}`,
        html: buildContractorApprovalNotificationHtml({
          ...emailData,
          portal_url: workspaceUrl,
        }),
      });
      results.push(`contractor:${contractorEmail}`);
    } catch (err) {
      console.error("Contractor notification email failed:", err);
    }

    return NextResponse.json({ success: true, sent_to: results });
  } catch (err: any) {
    console.error("Send approval email error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
