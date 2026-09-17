import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import {
  buildLeadNotificationHtml,
  buildEstimateConfirmationHtml,
  buildPartnerReferralHtml,
  buildReferralHandoffHtml,
} from "@/lib/email-templates";
import { updateTolerant } from "@/lib/db";
import { planLeadNotification, type PlannedEmailKind } from "@/lib/lead-notification-plan";
import { referralDryRun } from "@/lib/referral-partners";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, projectType, scopeLevel, size, zip, description, estimateLow, estimateHigh, timeline, token, estimateNumber } = body;

    const dryRun = referralDryRun();
    const plan = planLeadNotification(body, { dryRun });

    if (plan.error) {
      return NextResponse.json({ error: plan.error }, { status: 400 });
    }

    if (!resend) {
      console.warn("Lead notification skipped — RESEND_API_KEY not set");
      return NextResponse.json({ success: true, skipped: true });
    }

    const trimName = (name || "").trim();
    const trimEmail = (email || "").trim();
    const trimPhone = (phone || "").trim();
    const partner = plan.partner;

    if (dryRun && partner) {
      console.info(`[referral dry run] would email ${partner.email} about ${trimName || trimEmail || trimPhone}`);
    }

    // Each planned email knows its recipient and subject; the body is rendered
    // per kind here.
    const renderers: Record<PlannedEmailKind, () => string> = {
      admin: () =>
        buildLeadNotificationHtml({
          estimateNumber: estimateNumber || "",
          name: trimName,
          email: trimEmail,
          phone: trimPhone,
          projectType: projectType || "Not specified",
          scopeLevel: scopeLevel || "mid",
          size: size || "",
          zip: zip || "",
          description: description || "",
          estimateLow: estimateLow || "—",
          estimateHigh: estimateHigh || "—",
          timeline: timeline || "",
        }),
      partner: () =>
        buildPartnerReferralHtml({
          estimateNumber: estimateNumber || "",
          partnerContactName: partner!.contactName,
          partnerCompany: partner!.company,
          name: trimName,
          email: trimEmail,
          phone: trimPhone,
          projectType: projectType || "Interior Painting",
          scopeLevel: scopeLevel || "mid",
          size: size || "",
          zip: zip || "",
          description: description || "",
          estimateLow: estimateLow || "—",
          estimateHigh: estimateHigh || "—",
          timeline: timeline || "",
        }),
      homeowner_referral: () =>
        buildReferralHandoffHtml({
          estimateNumber: estimateNumber || "",
          name: trimName || "there",
          projectType: projectType || "Painting",
          estimateLow: estimateLow || "—",
          estimateHigh: estimateHigh || "—",
          timeline: timeline || "",
          partnerContactName: partner!.contactName,
          partnerCompany: partner!.company,
          partnerPhone: partner!.phone,
          partnerBlurb: partner!.blurb,
        }),
      homeowner_estimate: () => {
        const consultationParams = new URLSearchParams();
        if (trimName) consultationParams.set("name", trimName);
        if (trimEmail) consultationParams.set("email", trimEmail);
        if (trimPhone) consultationParams.set("phone", trimPhone);
        if (projectType) consultationParams.set("project", projectType);

        return buildEstimateConfirmationHtml({
          estimateNumber: estimateNumber || "",
          name: trimName || "there",
          projectType: projectType || "Remodeling Project",
          estimateLow: estimateLow || "—",
          estimateHigh: estimateHigh || "—",
          timeline: timeline || "",
          consultationUrl: `https://www.wdocustom.com/consultation?${consultationParams.toString()}`,
        });
      },
    };

    await Promise.all(
      plan.emails.map((planned) =>
        resend.emails.send({
          from: "WDO Custom <messages@wdocustom.com>",
          to: [planned.to],
          ...(planned.kind === "partner" ? { replyTo: "skyler@wdocustom.com" } : {}),
          subject: planned.subject,
          html: renderers[planned.kind](),
        })
      )
    );

    // Record the handoff so the ledger shows it, not just the outbox. Best
    // effort: the emails have already gone out and a bookkeeping failure
    // shouldn't turn a delivered referral into an error response.
    if (plan.recordReferral && partner) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { error: referralErr } = await updateTolerant(
          supabase,
          "estimates",
          {
            referred_partner_id: partner.id,
            referred_at: new Date().toISOString(),
          },
          (query) => query.eq("token", token)
        );
        if (referralErr) {
          console.error("Failed to record referral (non-blocking):", referralErr);
        }

        // Advance the status only from 'new'. This endpoint can fire twice for
        // one lead (unlocking on /estimate and again on /estimate/[token]), and
        // a second pass must not walk a converted lead back to 'referred'.
        await supabase
          .from("estimates")
          .update({ status: "referred" })
          .eq("token", token)
          .eq("status", "new");
      } catch (dbErr) {
        console.error("Failed to record referral (non-blocking):", dbErr);
      }
    }

    return NextResponse.json({ success: true, referredTo: partner?.id ?? null });
  } catch (err: any) {
    console.error("Lead notification email error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
