import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildEstimateReminderHtml } from "@/lib/email-templates";

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

    if (!estimate.email) {
      return NextResponse.json({ error: "No email address on file for this lead" }, { status: 400 });
    }

    if (!resend) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
    }

    const ed = estimate.estimate_data;
    const consultationParams = new URLSearchParams();
    if (estimate.name) consultationParams.set("name", estimate.name);
    if (estimate.email) consultationParams.set("email", estimate.email);
    if (estimate.phone) consultationParams.set("phone", estimate.phone);
    if (estimate.project_type) consultationParams.set("project", estimate.project_type);

    const estimateUrl = `https://www.wdocustom.com/estimate/${estimate.token}`;
    const consultationUrl = `https://www.wdocustom.com/consultation?${consultationParams.toString()}`;

    const { error: sendError } = await resend.emails.send({
      from: "WDO Custom <messages@wdocustom.com>",
      to: [estimate.email],
      subject: `Your ${estimate.project_type} — Schedule Your Free Consultation`,
      html: buildEstimateReminderHtml({
        name: estimate.name || "there",
        projectType: estimate.project_type,
        estimateLow: ed.total_projected_low?.toLocaleString("en-US", { maximumFractionDigits: 0 }) || "—",
        estimateHigh: ed.total_projected_high?.toLocaleString("en-US", { maximumFractionDigits: 0 }) || "—",
        estimateUrl,
        consultationUrl,
      }),
    });

    if (sendError) {
      console.error("Reminder send error:", sendError);
      return NextResponse.json({ error: "Failed to send reminder" }, { status: 500 });
    }

    const reminderLog = {
      type: "reminder",
      sent_at: new Date().toISOString(),
      to: estimate.email,
    };
    const currentReminders = Array.isArray(estimate.reminder_emails) ? estimate.reminder_emails : [];
    await supabase
      .from("estimates")
      .update({
        reminder_emails: [...currentReminders, reminderLog],
        status: estimate.status === "new" ? "contacted" : estimate.status,
      })
      .eq("id", estimate_id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Estimate reminder error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
