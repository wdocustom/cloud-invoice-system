/**
 * Referral partners — trades WDO hands off rather than self-performs.
 *
 * A lead whose project type belongs to a partner is still captured, still
 * scored, and still gets its estimate. What changes is who follows up: the
 * partner is emailed the lead, and the homeowner is told by name who will be
 * calling them instead of being pointed at a WDO consultation booking.
 *
 * Routing is by exact project type as selected on /estimate. That is
 * intentional — a whole-home renovation involves painting but is WDO's job, and
 * only a homeowner who explicitly picked the painting tile is a painting lead.
 */

export interface ReferralPartner {
  id: string;
  /** Contact's name, used in the homeowner-facing handoff copy. */
  contactName: string;
  company: string;
  phone: string;
  email: string;
  /** Exact `PROJECT_TYPES` labels from the estimator form. */
  projectTypes: string[];
  /** One line the homeowner sees explaining the handoff. */
  blurb: string;
  active: boolean;
}

export const REFERRAL_PARTNERS: ReferralPartner[] = [
  {
    id: "nelson-brothers-painting",
    contactName: "Ben Nelson",
    company: "Nelson Brothers Painting",
    phone: "402-690-7909",
    email: "nelsonrei2@gmail.com",
    projectTypes: ["Interior Painting"],
    blurb:
      "Painting is the one trade we don't self-perform. Nelson Brothers Painting handles it for our clients across the Omaha metro.",
    active: true,
  },
];

/** The partner who owns this project type, or null when WDO keeps the lead. */
export function findPartnerForProjectType(projectType?: string | null): ReferralPartner | null {
  const needle = (projectType || "").trim().toLowerCase();
  if (!needle) return null;

  return (
    REFERRAL_PARTNERS.find(
      (partner) =>
        partner.active &&
        partner.projectTypes.some((type) => type.trim().toLowerCase() === needle)
    ) || null
  );
}

export function findPartnerById(id?: string | null): ReferralPartner | null {
  if (!id) return null;
  return REFERRAL_PARTNERS.find((partner) => partner.id === id) || null;
}

/**
 * Referral emails go out with everything else unless REFERRAL_DRY_RUN is set,
 * which logs the intended send instead. Useful when testing against real
 * partner addresses, since there is no staging inbox for them.
 */
export function referralDryRun(): boolean {
  return process.env.REFERRAL_DRY_RUN === "1" || process.env.REFERRAL_DRY_RUN === "true";
}
