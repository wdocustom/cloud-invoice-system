import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildSelectionMadeNotificationHtml } from "@/lib/email-templates";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const CONTRACTOR_EMAIL = "skyler@wdocustom.com";

export async function POST(request: Request) {
  try {
    const { invoice_id, category, selected_value, total_selected, total_categories } =
      await request.json();

    if (!invoice_id || !category || !selected_value) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!resend) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
    }

    const supabase = getSupabase();
    const { data: invoice, error: fetchErr } = await supabase
      .from("invoices")
      .select("homeowner_name, project_title, job_address")
      .eq("id", invoice_id)
      .single();

    if (fetchErr || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const projectLabel = invoice.project_title || invoice.job_address || "Project";
    const baseUrl = new URL(request.url).origin;
    const portalUrl = `${baseUrl}/admin/projects/${invoice_id}`;

    await resend.emails.send({
      from: "WDO Custom <messages@wdocustom.com>",
      to: [CONTRACTOR_EMAIL],
      subject: `Selection made — ${invoice.homeowner_name || "Client"} chose "${selected_value}" for ${category} on ${projectLabel}`,
      html: buildSelectionMadeNotificationHtml({
        homeowner_name: invoice.homeowner_name || "Client",
        project_title: invoice.project_title,
        job_address: invoice.job_address || "",
        category,
        selected_value,
        total_selected: total_selected || 0,
        total_categories: total_categories || 0,
        portal_url: portalUrl,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Selection notification error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
