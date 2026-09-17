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
import { BAND_LABELS, scoreLead, type LeadFlag } from "@/lib/lead-score";
import { findPartnerForProjectType, referralDryRun } from "@/lib/referral-partners";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/** Strip formatting so "$92,400" from the client parses back to a number. */
function parseMoney(value: unknown): number | null {
  if (typeof value === "number") return value;
  const digits = String(value ?? "").replace(/[^0-9.]/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

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

    // Painting is referred out; everything else stays with WDO.
    const partner = findPartnerForProjectType(projectType);

    // Score here too, so the subject line carries the band. This repeats the
    // calculation unlock-estimate persists rather than reading it back — the
    // scorer is pure and cheap, and a notification should not fail because a
    // DB read did.
    const extraFlags: LeadFlag[] = partner ? ["referral"] : [];
    const score = scoreLead(
      {
        projectType,
        scopeLevel,
        size,
        zip,
        description,
        name: trimName,
        email: trimEmail,
        phone: trimPhone,
        estimateLow: parseMoney(estimateLow),
        estimateHigh: parseMoney(estimateHigh),
      },
      extraFlags
    );

    if (!resend) {
      console.warn("Lead notification skipped — RESEND_API_KEY not set");
      return NextResponse.json({ success: true, skipped: true });
    }

    const emails: Promise<any>[] = [];

    // ── Skyler always hears about every lead, referred or not ──
    const subjectPrefix = partner
      ? `[Referred → ${partner.company}]`
      : `[${score.band} · ${BAND_LABELS[score.band]}]`;

    emails.push(
      resend.emails.send({
        from: "WDO Custom <messages@wdocustom.com>",
        to: ["skyler@wdocustom.com"],
        subject: `${subjectPrefix} New Estimate Lead${estimateNumber ? ` ${estimateNumber}` : ""}: ${trimName || trimEmail || trimPhone || "Unknown"} — ${projectType}`,
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

    // ── Referred leads: hand off to the partner, tell the homeowner who's calling ──
    if (partner) {
      const referralPayload = {
        from: "WDO Custom <messages@wdocustom.com>",
        to: [partner.email],
        replyTo: "skyler@wdocustom.com",
        subject: `Painting referral from WDO Custom: ${trimName || trimEmail || trimPhone || "New lead"}${zip ? ` (${zip})` : ""}`,
        html: buildPartnerReferralHtml({
          estimateNumber: estimateNumber || "",
          partnerContactName: partner.contactName,
          partnerCompany: partner.company,
          name: trimName || "",
          email: trimEmail || "",
          phone: trimPhone || "",
          projectType: projectType || "Interior Painting",
          scopeLevel: scopeLevel || "mid",
          size: size || "",
          zip: zip || "",
          description: description || "",
          estimateLow: estimateLow || "—",
          estimateHigh: estimateHigh || "—",
          timeline: timeline || "",
        }),
      };

      if (referralDryRun()) {
        console.info(`[referral dry run] would send to ${partner.email}: ${referralPayload.subject}`);
      } else {
        emails.push(resend.emails.send(referralPayload));
      }

      if (trimEmail) {
        emails.push(
          resend.emails.send({
            from: "WDO Custom <messages@wdocustom.com>",
            to: [trimEmail],
            subject: `Your ${projectType || "Painting"} Estimate — $${estimateLow} to $${estimateHigh}`,
            html: buildReferralHandoffHtml({
              estimateNumber: estimateNumber || "",
              name: trimName || "there",
              projectType: projectType || "Painting",
              estimateLow: estimateLow || "—",
              estimateHigh: estimateHigh || "—",
              timeline: timeline || "",
              partnerContactName: partner.contactName,
              partnerCompany: partner.company,
              partnerPhone: partner.phone,
              partnerBlurb: partner.blurb,
            }),
          })
        );
      }
    } else if (trimEmail) {
      // ── WDO's own leads: estimate plus a pre-filled consultation link ──
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

    // Record the handoff so the ledger shows it, not just the outbox. Best
    // effort: the emails have already gone out and a bookkeeping failure
    // shouldn't turn a delivered referral into an error response.
    if (partner && token && !referralDryRun()) {
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
