import { NextResponse } from "next/server";
import { Resend } from "resend";
import { buildLeadNotificationHtml, buildEstimateConfirmationHtml } from "@/lib/email-templates";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, projectType, scopeLevel, size, zip, description, estimateLow, estimateHigh, timeline, token, estimateNumber } = body;

    const trimName = (name || "").trim();
    const trimEmail = (email || "").trim();
    const trimPhone = (phone || "").trim();

    if (!trimEmail && !trimPhone) {
      return NextResponse.json(
        { error: "Email or phone number is required to process this lead." },
        { status: 400 }
      );
    }

    if (!resend) {
      console.warn("Lead notification skipped — RESEND_API_KEY not set");
      return NextResponse.json({ success: true, skipped: true });
    }

    const emails: Promise<any>[] = [];

    emails.push(
      resend.emails.send({
        from: "WDO Custom <messages@wdocustom.com>",
        to: ["skyler@wdocustom.com"],
        subject: `New Estimate Lead${estimateNumber ? ` ${estimateNumber}` : ""}: ${trimName || trimEmail || trimPhone || "Unknown"} — ${projectType}`,
        html: buildLeadNotificationHtml({
          estimateNumber: estimateNumber || "",
          name: trimName || "",
          email: trimEmail || "",
          phone: trimPhone || "",
          projectType: projectType || "Not specified",
          scopeLevel: scopeLevel || "mid",
          size: size || "",
          zip: zip || "",
          description: description || "",
          estimateLow: estimateLow || "—",
          estimateHigh: estimateHigh || "—",
          timeline: timeline || "",
        }),
      })
    );

    if (trimEmail) {
      const consultationParams = new URLSearchParams();
      if (trimName) consultationParams.set("name", trimName);
      if (trimEmail) consultationParams.set("email", trimEmail);
      if (trimPhone) consultationParams.set("phone", trimPhone);
      if (projectType) consultationParams.set("project", projectType);
      const consultationUrl = `https://www.wdocustom.com/consultation?${consultationParams.toString()}`;

      emails.push(
        resend.emails.send({
          from: "WDO Custom <messages@wdocustom.com>",
          to: [trimEmail],
          subject: `Your ${projectType || "Remodeling"} Estimate — $${estimateLow} to $${estimateHigh}`,
          html: buildEstimateConfirmationHtml({
            estimateNumber: estimateNumber || "",
            name: trimName || "there",
            projectType: projectType || "Remodeling Project",
            estimateLow: estimateLow || "—",
            estimateHigh: estimateHigh || "—",
            timeline: timeline || "",
            consultationUrl,
          }),
        })
      );
    }

    await Promise.all(emails);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Lead notification email error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
