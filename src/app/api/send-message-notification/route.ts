import { NextResponse } from "next/server";
import { Resend } from "resend";
import { buildMessageNotificationHtml } from "@/lib/email-templates";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST(request: Request) {
  try {
    const { homeowner_name, homeowner_email, project_title, job_address, message_text, portal_url } =
      await request.json();

    if (!homeowner_email || !message_text) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!resend) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
    }

    const projectLabel = project_title || job_address || "your project";

    await resend.emails.send({
      from: "WDO Custom <messages@wdocustom.com>",
      to: [homeowner_email],
      subject: `New message from Skyler — ${projectLabel}`,
      html: buildMessageNotificationHtml({
        homeowner_name: homeowner_name || "there",
        project_title,
        job_address: job_address || "",
        portal_url,
        message_preview: message_text,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Message notification email error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
