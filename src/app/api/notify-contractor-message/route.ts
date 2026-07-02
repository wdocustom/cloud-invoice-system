import { NextResponse } from "next/server";
import { Resend } from "resend";
import { buildHomeownerMessageNotificationHtml } from "@/lib/email-templates";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const CONTRACTOR_EMAIL = "skyler@wdocustom.com";

export async function POST(request: Request) {
  try {
    const { homeowner_name, project_title, job_address, message_text, portal_url } =
      await request.json();

    if (!message_text) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!resend) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
    }

    const projectLabel = project_title || job_address || "a project";
    const clientName = homeowner_name || "A homeowner";

    await resend.emails.send({
      from: "WDO Custom <messages@wdocustom.com>",
      to: [CONTRACTOR_EMAIL],
      subject: `New message from ${clientName} — ${projectLabel}`,
      html: buildHomeownerMessageNotificationHtml({
        homeowner_name: clientName,
        project_title,
        job_address: job_address || "",
        portal_url,
        message_preview: message_text,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Contractor message notification error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
