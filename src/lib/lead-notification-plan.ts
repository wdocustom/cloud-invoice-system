/**
 * Who gets emailed when a lead unlocks their estimate, and what the subject
 * says.
 *
 * This is the branching that actually matters in /api/send-lead-notification —
 * whether the lead is referred out, which of the two homeowner emails to send,
 * what band prefixes Skyler's subject line — pulled out of the route so it can
 * be tested without standing up Supabase and Resend. The route stays
 * responsible for rendering each planned email and putting it on the wire.
 */

import { BAND_LABELS, scoreLead, type LeadFlag, type LeadScore } from "./lead-score";
import { findPartnerForProjectType, type ReferralPartner } from "./referral-partners";

export interface LeadNotificationInput {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  projectType?: string | null;
  scopeLevel?: string | null;
  size?: string | null;
  zip?: string | null;
  description?: string | null;
  estimateLow?: string | number | null;
  estimateHigh?: string | number | null;
  /** Project duration shown to the homeowner ("6-8 weeks") — display only. */
  timeline?: string | null;
  token?: string | null;
  estimateNumber?: string | null;
  /**
   * Tier B answers from the unlock gate. Named apart from `timeline` above,
   * which is the build duration and a different thing entirely. Passing these
   * through matters: without them the band in Skyler's subject line would be
   * computed from fewer signals than the score stored on the lead, and the
   * email would disagree with the ledger.
   */
  intakeTimeline?: string | null;
  budgetFit?: string | null;
  ownership?: string | null;
}

export type PlannedEmailKind = "admin" | "partner" | "homeowner_referral" | "homeowner_estimate";

export interface PlannedEmail {
  kind: PlannedEmailKind;
  to: string;
  subject: string;
}

export interface LeadNotificationPlan {
  /** Null when WDO keeps the lead. */
  partner: ReferralPartner | null;
  score: LeadScore;
  emails: PlannedEmail[];
  /** Whether the referral should be written back to the lead row. */
  recordReferral: boolean;
  /** Set when the lead can't be contacted at all; the route rejects on this. */
  error: string | null;
}

/** Strip formatting so "$92,400" from the client parses back to a number. */
export function parseMoney(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const digits = String(value ?? "").replace(/[^0-9.]/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

export const ADMIN_RECIPIENT = "skyler@wdocustom.com";

export function planLeadNotification(
  input: LeadNotificationInput,
  options: { dryRun?: boolean } = {}
): LeadNotificationPlan {
  const name = (input.name || "").trim();
  const email = (input.email || "").trim();
  const phone = (input.phone || "").trim();
  const projectType = (input.projectType || "").trim();
  const token = (input.token || "").trim();

  const partner = findPartnerForProjectType(projectType);
  const extraFlags: LeadFlag[] = partner ? ["referral"] : [];

  const score = scoreLead(
    {
      projectType,
      scopeLevel: input.scopeLevel,
      size: input.size,
      zip: input.zip,
      description: input.description,
      name,
      email,
      phone,
      estimateLow: parseMoney(input.estimateLow),
      estimateHigh: parseMoney(input.estimateHigh),
      timeline: input.intakeTimeline,
      budgetFit: input.budgetFit,
      ownership: input.ownership,
    },
    extraFlags
  );

  if (!email && !phone) {
    return {
      partner,
      score,
      emails: [],
      recordReferral: false,
      error: "Email or phone number is required to process this lead.",
    };
  }

  const who = name || email || phone || "Unknown";
  const numberSuffix = input.estimateNumber ? ` ${input.estimateNumber}` : "";
  const emails: PlannedEmail[] = [];

  // Skyler hears about every lead, referred or not.
  emails.push({
    kind: "admin",
    to: ADMIN_RECIPIENT,
    subject: partner
      ? `[Referred → ${partner.company}] New Estimate Lead${numberSuffix}: ${who} — ${projectType}`
      : `[${score.band} · ${BAND_LABELS[score.band]}] New Estimate Lead${numberSuffix}: ${who} — ${projectType}`,
  });

  if (partner) {
    if (!options.dryRun) {
      emails.push({
        kind: "partner",
        to: partner.email,
        subject: `Painting referral from WDO Custom: ${who}${input.zip ? ` (${input.zip})` : ""}`,
      });
    }
    if (email) {
      emails.push({
        kind: "homeowner_referral",
        to: email,
        subject: `Your ${projectType || "Painting"} Estimate — $${input.estimateLow} to $${input.estimateHigh}`,
      });
    }
  } else if (email) {
    emails.push({
      kind: "homeowner_estimate",
      to: email,
      subject: `Your ${projectType || "Remodeling"} Estimate — $${input.estimateLow} to $${input.estimateHigh}`,
    });
  }

  return {
    partner,
    score,
    emails,
    recordReferral: !!partner && !!token && !options.dryRun,
    error: null,
  };
}
