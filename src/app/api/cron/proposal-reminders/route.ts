import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildReminderEmailHtml } from "@/lib/email-templates";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://cloud-invoice-system.vercel.app";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: invoices, error } = await supabase
      .from("invoices")
      .select("*")
      .is("parent_id", null)
      .neq("status", "approved")
      .not("proposal_expires_at", "is", null)
      .not("homeowner_email", "is", null);

    if (error) throw error;

    const now = Date.now();
    let sent = 0;

    for (const invoice of invoices || []) {
      const expiresAt = new Date(invoice.proposal_expires_at).getTime();
      const msLeft = expiresAt - now;

      if (msLeft <= 0) continue;

      const daysLeft = msLeft / 86400000;

      const emailHistory = Array.isArray(invoice.proposal_emails) ? invoice.proposal_emails : [];
      const remindersSent = emailHistory.filter((e: any) => e.type === "reminder").map((e: any) => e.tier);

      let shouldSend = false;
      let tier = "";

      if (daysLeft <= 1 && daysLeft > 0 && !remindersSent.includes("24h")) {
        shouldSend = true;
        tier = "24h";
      } else if (daysLeft <= 3 && daysLeft > 1 && !remindersSent.includes("3d")) {
        shouldSend = true;
        tier = "3d";
      }

      if (!shouldSend) continue;

      const daysRemaining = Math.ceil(daysLeft);
      const portalUrl = `${BASE_URL}/invoice/${invoice.id}`;

      const html = buildReminderEmailHtml({
        homeowner_name: invoice.homeowner_name || "Client",
        project_title: invoice.project_title,
        job_address: invoice.job_address || "",
        amount: invoice.amount || 0,
        portal_url: portalUrl,
        proposal_expires_at: invoice.proposal_expires_at,
        days_remaining: daysRemaining,
      });

      const projectLabel = invoice.project_title || invoice.job_address || "Your Project";

      const { error: sendError } = await resend.emails.send({
        from: "WDO Custom <proposals@wdocustom.com>",
        to: [invoice.homeowner_email],
        subject: `Reminder: Your proposal for ${projectLabel} ${tier === "24h" ? "expires tomorrow" : "expires soon"}`,
        html,
      });

      if (sendError) {
        console.error(`Reminder send failed for ${invoice.id}:`, sendError);
        continue;
      }

      const emailLog = {
        type: "reminder",
        tier,
        sent_at: new Date().toISOString(),
        to: invoice.homeowner_email,
      };
      await supabase
        .from("invoices")
        .update({ proposal_emails: [...emailHistory, emailLog] })
        .eq("id", invoice.id);

      sent++;
    }

    return NextResponse.json({ success: true, reminders_sent: sent });
  } catch (err: any) {
    console.error("Proposal reminder cron error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
