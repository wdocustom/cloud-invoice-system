import { NextResponse } from "next/server";
import { Resend } from "resend";
import { buildLeadNotificationHtml } from "@/lib/email-templates";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, projectType, scopeLevel, size, zip, description, estimateLow, estimateHigh, timeline } = body;

    if (!name && !phone) {
      return NextResponse.json({ error: "No contact info provided" }, { status: 400 });
    }

    if (!resend) {
      console.warn("Lead notification skipped — RESEND_API_KEY not set");
      return NextResponse.json({ success: true, skipped: true });
    }

    await resend.emails.send({
      from: "WDO Custom <messages@wdocustom.com>",
      to: ["skyler@wdocustom.com"],
      subject: `New Estimate Lead: ${name || "Unknown"} — ${projectType}`,
      html: buildLeadNotificationHtml({
        name: name || "",
        phone: phone || "",
        projectType: projectType || "Not specified",
        scopeLevel: scopeLevel || "mid",
        size: size || "",
        zip: zip || "",
        description: description || "",
        estimateLow: estimateLow || "—",
        estimateHigh: estimateHigh || "—",
        timeline: timeline || "",
      }),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Lead notification email error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
