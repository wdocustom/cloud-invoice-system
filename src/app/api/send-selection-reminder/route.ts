import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildSelectionReminderHtml } from "@/lib/email-templates";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

function normalizeChoice(choice: any): { label: string; image_url?: string; product_url?: string } {
  if (typeof choice === "string") return { label: choice };
  return { label: choice.label, image_url: choice.image_url, product_url: choice.product_url };
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    const { invoice_id, base_url } = await request.json();

    if (!invoice_id) {
      return NextResponse.json({ error: "Missing invoice_id" }, { status: 400 });
    }

    if (!resend) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
    }

    const { data: invoice, error: fetchErr } = await supabase
      .from("invoices")
      .select("homeowner_name, homeowner_email, project_title, job_address, homeowner_options, homeowner_selections")
      .eq("id", invoice_id)
      .single();

    if (fetchErr || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (!invoice.homeowner_email) {
      return NextResponse.json({ error: "No email on file" }, { status: 400 });
    }

    const options = invoice.homeowner_options || [];
    const selections = invoice.homeowner_selections || {};

    const pendingCategories = options
      .filter((g: any) => !selections[g.category])
      .map((g: any) => ({
        category: g.category,
        choices: (g.choices || []).map((c: any) => {
          const norm = normalizeChoice(c);
          return {
            ...norm,
            select_url: `${base_url}/api/select-option?id=${invoice_id}&category=${encodeURIComponent(g.category)}&value=${encodeURIComponent(norm.label)}`,
          };
        }),
      }));

    if (pendingCategories.length === 0) {
      return NextResponse.json({ error: "All selections already made" }, { status: 400 });
    }

    const portalUrl = `${base_url}/invoice/${invoice_id}`;
    const projectLabel = invoice.project_title || invoice.job_address || "your project";

    await resend.emails.send({
      from: "WDO Custom <messages@wdocustom.com>",
      to: [invoice.homeowner_email],
      subject: `Action needed — ${pendingCategories.length} material ${pendingCategories.length === 1 ? 'selection' : 'selections'} pending for ${projectLabel}`,
      html: buildSelectionReminderHtml({
        homeowner_name: invoice.homeowner_name || "there",
        project_title: invoice.project_title,
        job_address: invoice.job_address || "",
        portal_url: portalUrl,
        pending_categories: pendingCategories,
      }),
    });

    return NextResponse.json({ success: true, sent_to: invoice.homeowner_email, pending_count: pendingCategories.length });
  } catch (err: any) {
    console.error("Selection reminder email error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
